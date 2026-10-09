from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from server import complaints
from server.store import Store

PHOTO = "data:image/jpeg;base64,aGVsbG8="


def cfg(email=False, **kw):
    base = dict(
        gmail_address="sys@gmail.com" if email else "", gmail_app_password="pw" if email else "",
        gemini_api_key="", gemini_model="m", demo_office_email="team.officer@gmail.com" if email else "",
        send_to_real_bbmp=False, reminder_after=timedelta(days=5), reminder_repeat=timedelta(days=2),
        max_reminders=3, poll_seconds=60, public_base_url="http://x",
    )
    base.update(kw)
    c = SimpleNamespace(**base)
    c.email_enabled = bool(c.gmail_address and c.gmail_app_password)
    return c


def seed_issue(store, **kw):
    issue = {"id": "i1", "title": "Dump", "description": "Pile", "category": "illegal_dumping", "severity": 4,
             "status": "open", "lat": 12.9716, "lng": 77.6412, "address": "100 Feet Rd", "reporter_id": "citizen_1",
             "est_weight_kg": 40, "before_photo_url": PHOTO, "created_at": "2026-10-09T08:00:00Z"}
    issue.update(kw)
    store.put("issues", issue)
    return issue


def notes(store, user_id):
    return [n for n in store.get_all("notifications") if n["user_id"] == user_id]


def test_send_without_email_registers_complaint_in_app(tmp_path):
    store = Store(tmp_path / "t.db")
    seed_issue(store)
    c = complaints.send_complaint(store, cfg(email=False), "i1", "")
    assert c["ticket_id"] == "ECO-0001"
    assert c["email_status"] == "not_sent"
    assert c["office_id"] == "east"
    assert store.get("issues", "i1")["complaint"]["ticket_id"] == "ECO-0001"
    assert notes(store, "citizen_1") and notes(store, "officer_1")


def test_send_with_email_records_message_id(tmp_path, monkeypatch):
    store = Store(tmp_path / "t.db")
    seed_issue(store)
    sent = []
    monkeypatch.setattr(complaints.mailer, "send", lambda cfg, to, subject, body, **kw: sent.append((to, subject, kw)) or "<m1@x>")
    c = complaints.send_complaint(store, cfg(email=True), "i1", "citizen@example.com")
    assert c["email_status"] == "sent" and c["message_id"] == "<m1@x>"
    assert sent[0][0] == "team.officer+bbmp-east@gmail.com"
    assert "ECO-0001" in sent[0][1]
    assert sent[0][2]["cc"] == "citizen@example.com"


def test_email_failure_does_not_lose_complaint(tmp_path, monkeypatch):
    store = Store(tmp_path / "t.db")
    seed_issue(store)

    def boom(*a, **kw):
        raise OSError("smtp down")

    monkeypatch.setattr(complaints.mailer, "send", boom)
    c = complaints.send_complaint(store, cfg(email=True), "i1", "")
    assert c["email_status"] == "not_sent"
    assert any(t["action"] == "email_failed" for t in store.get_all("issue_timeline"))


def test_tickets_increment(tmp_path):
    store = Store(tmp_path / "t.db")
    seed_issue(store)
    seed_issue(store, id="i2")
    assert complaints.send_complaint(store, cfg(), "i1", "")["ticket_id"] == "ECO-0001"
    assert complaints.send_complaint(store, cfg(), "i2", "")["ticket_id"] == "ECO-0002"


def test_reminders_work_without_email(tmp_path):
    store = Store(tmp_path / "t.db")
    seed_issue(store)
    complaints.send_complaint(store, cfg(), "i1", "")
    now = datetime.now(timezone.utc) + timedelta(days=5, minutes=1)
    assert complaints.check_reminders(store, cfg(), now) == 1
    issue = store.get("issues", "i1")
    assert issue["complaint"]["reminder_count"] == 1
    assert any("reminder" in n["title"].lower() for n in notes(store, "citizen_1"))
    assert any("OVERDUE" in n["title"] for n in notes(store, "officer_1"))
    assert complaints.check_reminders(store, cfg(), now) == 0  # not again until repeat gap


def test_officer_status_change_restarts_clock_and_notifies(tmp_path):
    store = Store(tmp_path / "t.db")
    seed_issue(store)
    complaints.send_complaint(store, cfg(), "i1", "")
    old = store.get("issues", "i1")
    old["complaint"]["reminder_count"] = 2
    store.put("issues", old)
    new = {**old, "status": "in_progress", "complaint": dict(old["complaint"])}
    store.put("issues", new)
    complaints.on_issue_changed(store, cfg(), old, new)
    saved = store.get("issues", "i1")
    assert saved["complaint"]["reminder_count"] == 0
    assert any("In Progress" in n["title"] for n in notes(store, "citizen_1"))


def _reply(ticket, sender="team.officer@gmail.com", images=()):
    return {"from": sender, "subject": f"Re: [{ticket}] Garbage", "ticket_id": ticket,
            "text": "Done", "images": list(images), "message_id": "<r1@x>"}


def _email_issue(store, monkeypatch):
    seed_issue(store)
    monkeypatch.setattr(complaints.mailer, "send", lambda *a, **kw: "<m@x>")
    complaints.send_complaint(store, cfg(email=True), "i1", "")


def test_reply_from_stranger_is_ignored(tmp_path, monkeypatch):
    store = Store(tmp_path / "t.db")
    _email_issue(store, monkeypatch)
    assert complaints.handle_reply(store, cfg(email=True), _reply("ECO-0001", sender="evil@x.com")) == "not_from_office"
    assert store.get("issues", "i1")["status"] == "open"


def test_reply_without_photo_sets_in_progress(tmp_path, monkeypatch):
    store = Store(tmp_path / "t.db")
    _email_issue(store, monkeypatch)
    assert complaints.handle_reply(store, cfg(email=True), _reply("ECO-0001")) == "in_progress"
    assert store.get("issues", "i1")["status"] == "in_progress"


def test_reply_with_verified_photo_closes(tmp_path, monkeypatch):
    store = Store(tmp_path / "t.db")
    _email_issue(store, monkeypatch)
    monkeypatch.setattr(complaints.ai, "verify_cleanup", lambda *a: {"is_resolved": True, "confidence": 0.9, "reason": "clean", "is_mock": False})
    assert complaints.handle_reply(store, cfg(email=True), _reply("ECO-0001", images=[("image/jpeg", b"x")])) == "resolved"
    issue = store.get("issues", "i1")
    assert issue["status"] == "resolved" and issue["after_photo_url"].startswith("data:image/jpeg;base64,")


def test_reply_with_bad_photo_stays_open(tmp_path, monkeypatch):
    store = Store(tmp_path / "t.db")
    _email_issue(store, monkeypatch)
    monkeypatch.setattr(complaints.ai, "verify_cleanup", lambda *a: {"is_resolved": False, "confidence": 0.2, "reason": "selfie", "is_mock": False})
    assert complaints.handle_reply(store, cfg(email=True), _reply("ECO-0001", images=[("image/jpeg", b"x")])) == "photo_rejected"
    assert store.get("issues", "i1")["status"] == "open"


def test_not_configured_reason_is_recorded(tmp_path):
    store = Store(tmp_path / "t.db")
    seed_issue(store)
    c = complaints.send_complaint(store, cfg(email=False), "i1", "")
    assert c["email_status"] == "not_sent"
    assert "GMAIL_ADDRESS" in c["email_error"]


def test_send_failure_reason_is_recorded(tmp_path, monkeypatch):
    store = Store(tmp_path / "t.db")
    seed_issue(store)

    def boom(*a, **kw):
        raise OSError("535 bad credentials")

    monkeypatch.setattr(complaints.mailer, "send", boom)
    c = complaints.send_complaint(store, cfg(email=True), "i1", "")
    assert "535 bad credentials" in c["email_error"]


def test_sent_records_to_and_cc(tmp_path, monkeypatch):
    store = Store(tmp_path / "t.db")
    seed_issue(store)
    monkeypatch.setattr(complaints.mailer, "send", lambda *a, **kw: "<m@x>")
    c = complaints.send_complaint(store, cfg(email=True), "i1", "me@example.com")
    assert c["email_to"] == "team.officer+bbmp-east@gmail.com" and c["email_cc"] == "me@example.com"
    assert c["email_error"] == ""


def test_single_account_mode_accepts_human_reply_but_ignores_own_system_mail(tmp_path, monkeypatch):
    store = Store(tmp_path / "t.db")
    seed_issue(store)
    monkeypatch.setattr(complaints.mailer, "send", lambda *a, **kw: "<m@x>")
    single = cfg(email=True, demo_office_email="")          # office mail falls back to the sender account
    c = complaints.send_complaint(store, single, "i1", "")
    assert c["office_email"] == "sys+bbmp-east@gmail.com"
    own_system_copy = {"from": "sys@gmail.com", "subject": "[ECO-0001] Garbage", "ticket_id": "ECO-0001",
                       "text": "", "images": [], "message_id": "<123@ecosort.app>"}
    assert complaints.handle_reply(store, single, own_system_copy) == "ignored"
    human_reply = {**own_system_copy, "subject": "Re: [ECO-0001] Garbage", "text": "On it", "message_id": "<abc@mail.gmail.com>"}
    assert complaints.handle_reply(store, single, human_reply) == "in_progress"
