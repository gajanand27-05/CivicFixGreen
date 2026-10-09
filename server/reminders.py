# server/reminders.py
# When is a complaint overdue for a reminder? Any BBMP response restarts the clock.
from datetime import datetime

CLOSED = {"resolved", "rejected"}


def ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def is_reminder_due(issue, now, cfg):
    c = issue.get("complaint")
    if not c or issue.get("status") in CLOSED:
        return False
    count = c.get("reminder_count", 0)
    if count >= cfg.max_reminders:
        return False
    base = ts(c["last_activity_at"])
    if c.get("last_reminder_at"):
        base = max(base, ts(c["last_reminder_at"]))
    wait = cfg.reminder_after if count == 0 else cfg.reminder_repeat
    return now - base >= wait
