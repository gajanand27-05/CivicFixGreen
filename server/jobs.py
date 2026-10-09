# server/jobs.py
# Background monitor: check BBMP email replies (if email is configured) and send overdue reminders.
import threading
import time
from datetime import datetime, timezone

from . import complaints, inbox


def run_once(store, cfg):
    if cfg.email_enabled:
        try:
            for msg in inbox.fetch_unseen(cfg):
                result = complaints.handle_reply(store, cfg, msg)
                print(f"[jobs] reply {msg['ticket_id']} from {msg['from']}: {result}")
        except Exception as e:
            print("[jobs] inbox check failed:", e)
    sent = complaints.check_reminders(store, cfg, datetime.now(timezone.utc))
    if sent:
        print(f"[jobs] sent {sent} reminder(s)")


def start(store, cfg):
    def loop():
        while True:
            try:
                run_once(store, cfg)
            except Exception as e:
                print("[jobs] error:", e)
            time.sleep(cfg.poll_seconds)

    threading.Thread(target=loop, daemon=True, name="civicfix-monitor").start()
