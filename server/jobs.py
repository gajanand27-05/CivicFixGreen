# server/jobs.py
# Background monitor: check BBMP email replies (if email is configured) and send overdue reminders.
import threading
import time
from datetime import datetime, timezone

from . import accounts, complaints, inbox


def run_once(store, cfg):
    for box in accounts.inbox_configs(store, cfg):   # shared account + every user who connected Gmail
        try:
            for msg in inbox.fetch_unseen(box):
                result = complaints.handle_reply(store, cfg, msg)
                print(f"[jobs] {box.gmail_address}: reply {msg['ticket_id']} from {msg['from']}: {result}")
        except Exception as e:
            print(f"[jobs] inbox check failed for {box.gmail_address}:", e)
    sent = complaints.check_reminders(store, cfg, datetime.now(timezone.utc))
    if sent:
        print(f"[jobs] sent {sent} reminder(s)")


def maybe_tick(store, cfg):
    """Run the monitor at most once per POLL_SECONDS, triggered by requests (serverless mode)."""
    now = datetime.now(timezone.utc)
    meta = store.get("meta", "last_tick") or {"id": "last_tick", "at": None}
    if meta["at"] and (now - datetime.fromisoformat(meta["at"])).total_seconds() < cfg.poll_seconds:
        return False
    store.put("meta", {"id": "last_tick", "at": now.isoformat()})
    try:
        run_once(store, cfg)
    except Exception as e:
        print("[jobs] tick error:", e)
    return True


def start(store, cfg):
    def loop():
        while True:
            try:
                run_once(store, cfg)
            except Exception as e:
                print("[jobs] error:", e)
            time.sleep(cfg.poll_seconds)

    threading.Thread(target=loop, daemon=True, name="ecosort-monitor").start()
