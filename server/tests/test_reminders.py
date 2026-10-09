from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from server.reminders import is_reminder_due

CFG = SimpleNamespace(reminder_after=timedelta(days=5), reminder_repeat=timedelta(days=2), max_reminders=3)
T0 = datetime(2026, 10, 1, tzinfo=timezone.utc)


def issue(status="open", count=0, last_rem=None, activity=T0):
    return {"status": status, "complaint": {"last_activity_at": activity.isoformat(),
            "reminder_count": count, "last_reminder_at": last_rem.isoformat() if last_rem else None}}


def test_not_due_before_5_days():
    assert not is_reminder_due(issue(), T0 + timedelta(days=4, hours=23), CFG)


def test_due_after_5_days():
    assert is_reminder_due(issue(), T0 + timedelta(days=5), CFG)


def test_repeat_uses_2_day_gap_after_first_reminder():
    i = issue(count=1, last_rem=T0 + timedelta(days=5))
    assert not is_reminder_due(i, T0 + timedelta(days=6), CFG)
    assert is_reminder_due(i, T0 + timedelta(days=7), CFG)


def test_stops_at_max_and_when_closed():
    assert not is_reminder_due(issue(count=3, last_rem=T0), T0 + timedelta(days=30), CFG)
    assert not is_reminder_due(issue(status="resolved"), T0 + timedelta(days=30), CFG)
    assert not is_reminder_due(issue(status="rejected"), T0 + timedelta(days=30), CFG)


def test_officer_activity_restarts_clock():
    assert not is_reminder_due(issue(activity=T0 + timedelta(days=4)), T0 + timedelta(days=6), CFG)


def test_issue_without_complaint_never_due():
    assert not is_reminder_due({"status": "open"}, T0 + timedelta(days=30), CFG)


def test_accepts_js_z_timestamps():
    i = {"status": "open", "complaint": {"last_activity_at": "2026-10-01T00:00:00.000Z", "reminder_count": 0, "last_reminder_at": None}}
    assert is_reminder_due(i, T0 + timedelta(days=5), CFG)
