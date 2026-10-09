# server/complaints.py
# Complaint lifecycle: register with the nearest office (email optional), react to email replies,
# send overdue reminders, and notify the complainer when an officer changes status.
import base64
import uuid
from datetime import datetime, timezone

from . import accounts, ai, emails, mailer, offices, reminders

STATUS_LABELS = {"open": "Open", "in_progress": "In Progress", "rejected": "Rejected", "resolved": "Closed"}
CLOSED = {"resolved", "rejected"}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def add_event(store, issue_id, action, note, actor_role="system"):
    store.put("issue_timeline", {
        "id": f"t_{action}_{issue_id}_{uuid.uuid4().hex[:12]}", "issue_id": issue_id, "actor_id": "system",
        "actor_role": actor_role, "action": action, "note": note, "created_at": now_iso(),
    })


def notify(store, user_id, title, message, type_, issue_id):
    if not user_id:
        return
    store.put("notifications", {
        "id": f"n_{uuid.uuid4().hex}", "user_id": user_id, "title": title, "message": message,
        "type": type_, "issue_id": issue_id, "created_at": now_iso(), "delivered": False,
    })


def find_by_ticket(store, ticket):
    return next((i for i in store.get_all("issues") if (i.get("complaint") or {}).get("ticket_id") == ticket), None)


def _next_ticket(store):
    meta = store.get("meta", "ticket_seq") or {"id": "ticket_seq", "value": 0}
    meta["value"] += 1
    store.put("meta", meta)
    return f"ECO-{meta['value']:04d}"


def _photo(issue, ticket, key="before_photo_url"):
    mime, data = ai.data_url_to_bytes(issue[key])
    return (f"{ticket}-{key.split('_')[0]}.jpg", data, mime)


def _try_mail(store, cfg, issue_id, to, subject, body, **kw):
    """Email is best-effort: returns the Message-ID, or None if email is off or failed."""
    if not cfg.email_enabled or not to:
        return None
    try:
        return mailer.send(cfg, to, subject, body, **kw)
    except Exception as e:
        add_event(store, issue_id, "email_failed", f"Email to {to} not sent: {e}")
        return None


def _mail_cfg(store, cfg, c):
    """Send follow-ups for a complaint from the same account that sent it (user's Gmail or the shared one)."""
    return accounts.cfg_for(store, cfg, c.get("sender_user_id")) if c.get("sender_user_id") else cfg


def _already_processed(store, message_id):
    """Remember handled reply Message-IDs so a reply seen in two monitored inboxes is processed once."""
    meta = store.get("meta", "processed_mail") or {"id": "processed_mail", "ids": []}
    if message_id in meta["ids"]:
        return True
    meta["ids"] = (meta["ids"] + [message_id])[-500:]
    store.put("meta", meta)
    return False


def email_problem(cfg, to):
    """Why a complaint email can't be sent (None when it can)."""
    if not cfg.email_enabled:
        return "Email is not set up: connect your Gmail in Profile (or add GMAIL_ADDRESS and GMAIL_APP_PASSWORD to server/.env)."
    if not to:
        return "No office email address is configured: set DEMO_OFFICE_EMAIL in server/.env."
    return None


def preview(cfg, issue, store=None, user_id=None):
    if store is not None:
        cfg = accounts.cfg_for(store, cfg, user_id)
    office = offices.nearest(issue["lat"], issue["lng"])
    to = offices.recipient(office, cfg)
    return {"to": to, "office": office, "email_enabled": cfg.email_enabled and bool(to),
            "email_problem": email_problem(cfg, to) or "", "sender": cfg.gmail_address,
            "subject": emails.complaint_subject("ECO-XXXX", issue),
            "body": emails.complaint_body("ECO-XXXX", {**issue, "id": issue.get("id", "new")}, office, cfg)}


def send_complaint(store, cfg, issue_id, complainer_email):
    issue = store.get("issues", issue_id)
    has_own = accounts.public_view(store, issue.get("reporter_id"))["configured"]
    cfg = accounts.cfg_for(store, cfg, issue.get("reporter_id"))  # send from the reporter's own Gmail if connected
    office = offices.nearest(issue["lat"], issue["lng"])
    to = offices.recipient(office, cfg)
    ticket = _next_ticket(store)

    message_id, email_error = None, email_problem(cfg, to)
    if not email_error:
        try:
            attachments = [_photo(issue, ticket)]
        except Exception as e:
            attachments = []
            add_event(store, issue_id, "email_failed", f"Photo could not be attached: {e}")
        try:
            message_id = mailer.send(cfg, to, emails.complaint_subject(ticket, issue),
                                     emails.complaint_body(ticket, issue, office, cfg),
                                     cc=complainer_email or None, attachments=attachments)
        except Exception as e:
            email_error = f"Sending failed: {e}"
            add_event(store, issue_id, "email_failed", f"Complaint email to {to} not sent: {e}")

    t = now_iso()
    issue["complaint"] = {
        "ticket_id": ticket, "office_id": office["id"], "office_name": office["name"], "office_email": to,
        "officer_user_id": office["officer_user_id"], "complainer_email": complainer_email,
        "sent_at": t, "message_id": message_id or "", "email_status": "sent" if message_id else "not_sent",
        "email_to": to if message_id else "", "email_cc": (complainer_email if message_id else ""),
        "email_error": email_error or "",
        "sender_user_id": issue.get("reporter_id") if has_own else "",
        "sender_email": cfg.gmail_address if message_id else "",
        "last_activity_at": t, "reminder_count": 0, "last_reminder_at": None, "replies": 0,
    }
    store.put("issues", issue)

    how = f"emailed to {office['name']} ({to})" if message_id else f"registered with {office['name']} (in-app; email not sent)"
    add_event(store, issue_id, "complaint_raised", f"Complaint {ticket} {how}.")
    notify(store, issue["reporter_id"], f"Complaint {ticket} raised", f"Your complaint was {how}.", "success", issue_id)
    notify(store, office["officer_user_id"], f"New complaint {ticket}", issue.get("title", ""), "warning", issue_id)
    return issue["complaint"]


def on_issue_changed(store, cfg, old, new):
    """Officer changed status in the dashboard: restart the reminder clock and tell the complainer."""
    c = new.get("complaint")
    if not c or old.get("status") == new.get("status"):
        return
    c["last_activity_at"] = now_iso()
    c["reminder_count"] = 0
    store.put("issues", new)
    label = STATUS_LABELS.get(new["status"], new["status"])
    ticket = c["ticket_id"]
    notify(store, new.get("reporter_id"), f"{ticket}: {label}", f"BBMP set your complaint to {label}.",
           "success" if new["status"] == "resolved" else "info", new["id"])
    if not c.get("complainer_email"):
        return
    cfg = _mail_cfg(store, cfg, c)
    if new["status"] == "resolved" and new.get("after_photo_url"):
        try:
            attachments = [_photo(new, ticket, "after_photo_url")]
        except Exception:
            attachments = []
        _try_mail(store, cfg, new["id"], c["complainer_email"], f"[{ticket}] Complaint closed",
                  emails.resolved_citizen(ticket, new, c["office_name"], "Closed by the officer with a cleanup photo."),
                  attachments=attachments)
    else:
        _try_mail(store, cfg, new["id"], c["complainer_email"], f"[{ticket}] Status: {label}",
                  emails.status_update(ticket, new, label, "Updated by the BBMP officer."))


def handle_reply(store, cfg, msg):
    # skip mail without a ticket and the system's own outgoing emails (complaint copies, reminders, auto-replies)
    if not msg["ticket_id"] or msg.get("message_id", "").strip().endswith("@ecosort.app>"):
        return "ignored"
    issue = find_by_ticket(store, msg["ticket_id"])
    if not issue:
        return "unknown_ticket"
    c, ticket = issue["complaint"], msg["ticket_id"]
    if not c.get("office_email") or offices.normalize_addr(msg["from"]) != offices.normalize_addr(c["office_email"]):
        add_event(store, issue["id"], "commented", f"Email from {msg['from']} ignored (not the assigned office).")
        return "not_from_office"
    if _already_processed(store, msg.get("message_id", "")):
        return "duplicate"
    ai_cfg, cfg = cfg, _mail_cfg(store, cfg, c)

    c["replies"] = c.get("replies", 0) + 1
    c["last_activity_at"] = now_iso()
    c["reminder_count"] = 0
    if issue["status"] in CLOSED:
        store.put("issues", issue)
        return "already_closed"

    if not msg["images"]:
        issue["status"] = "in_progress"
        issue["updated_at"] = now_iso()
        store.put("issues", issue)
        add_event(store, issue["id"], "bbmp_replied", f'BBMP replied: "{msg["text"][:200]}"', "authority")
        _try_mail(store, cfg, issue["id"], c["office_email"], f"Re: {msg['subject']}",
                  emails.ask_for_photo(ticket, "We've marked the complaint In Progress."), in_reply_to=msg["message_id"])
        notify(store, issue["reporter_id"], f"{ticket}: BBMP replied", msg["text"][:120] or "Work in progress.", "info", issue["id"])
        return "in_progress"

    mime, data = msg["images"][0]
    after_url = f"data:{mime};base64,{base64.b64encode(data).decode()}"
    v = ai.verify_cleanup(ai_cfg, issue["before_photo_url"], after_url)
    add_event(store, issue["id"], "cleanup_checked",
              f"Cleanup photo check: {v['reason']} (confidence {round(v['confidence'] * 100)}%)", "system")

    if v["is_resolved"] and v["confidence"] >= 0.7:
        t = now_iso()
        issue.update(status="resolved", resolved_at=t, updated_at=t, after_photo_url=after_url,
                     ai_resolution_validated=True, ai_resolution_confidence=v["confidence"])
        store.put("issues", issue)
        add_event(store, issue["id"], "resolved", "Closed via BBMP email reply with a verified cleanup photo.", "authority")
        notify(store, issue["reporter_id"], f"{ticket} closed", "BBMP cleaned the spot and the photo was verified.", "success", issue["id"])
        if c.get("complainer_email"):
            _try_mail(store, cfg, issue["id"], c["complainer_email"], f"[{ticket}] Complaint closed",
                      emails.resolved_citizen(ticket, issue, c["office_name"], v["reason"]),
                      attachments=[(f"{ticket}-after.jpg", data, mime)])
        return "resolved"

    store.put("issues", issue)
    add_event(store, issue["id"], "photo_rejected", f"Cleanup photo not accepted: {v['reason']}", "system")
    _try_mail(store, cfg, issue["id"], c["office_email"], f"Re: {msg['subject']}",
              emails.ask_for_photo(ticket, f"Our automated check could not confirm the cleanup: {v['reason']}"),
              in_reply_to=msg["message_id"])
    return "photo_rejected"


def check_reminders(store, cfg, now):
    sent = 0
    for issue in store.get_all("issues"):
        if not reminders.is_reminder_due(issue, now, cfg):
            continue
        c = issue["complaint"]
        mcfg = _mail_cfg(store, cfg, c)
        ticket, n = c["ticket_id"], c.get("reminder_count", 0) + 1
        days = max(1, (now - reminders.ts(c["sent_at"])).days)

        if c.get("email_status") == "sent":
            try:
                attachments = [_photo(issue, ticket)]
            except Exception:
                attachments = []
            _try_mail(store, mcfg, issue["id"], c["office_email"], f"REMINDER {n}: {emails.complaint_subject(ticket, issue)}",
                      emails.reminder_officer(ticket, issue, n, days), attachments=attachments,
                      in_reply_to=c.get("message_id") or None)
        if c.get("complainer_email"):
            _try_mail(store, mcfg, issue["id"], c["complainer_email"], f"[{ticket}] Reminder {n} sent to {c['office_name']}",
                      emails.reminder_citizen(ticket, issue, c["office_name"], n, days))

        c["reminder_count"] = n
        c["last_reminder_at"] = now.isoformat()
        store.put("issues", issue)
        add_event(store, issue["id"], "reminder_sent", f"Reminder {n} sent to {c['office_name']} (no resolution after {days} day(s)).")
        notify(store, issue["reporter_id"], f"{ticket}: reminder {n} sent", f"No response from {c['office_name']} yet.", "warning", issue["id"])
        notify(store, c.get("officer_user_id"), f"OVERDUE {ticket}", f"Reminder {n}: {issue.get('title', '')}", "danger", issue["id"])
        sent += 1
    return sent
