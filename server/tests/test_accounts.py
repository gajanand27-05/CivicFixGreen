from datetime import timedelta
from types import SimpleNamespace

import pytest

from server import accounts, complaints
from server.config import Config
from server.store import Store

PHOTO = "data:image/jpeg;base64,aGVsbG8="


def base_cfg(**kw):
    values = dict(gmail_address="", gmail_app_password="", gemini_api_key="", gemini_model="m", demo_office_email="",
                  send_to_real_bbmp=False, reminder_after=timedelta(days=5), reminder_repeat=timedelta(days=2),
                  max_reminders=3, poll_seconds=60, public_base_url="http://x")
    values.update(kw)
    return Config(**values)


@pytest.fixture
def store(tmp_path, monkeypatch):
    monkeypatch.setattr(accounts.mailer, "verify_login", lambda cfg: None)
    s = Store(tmp_path / "t.db")
    s.put("issues", {"id": "i1", "title": "Dump", "description": "Pile", "category": "illegal_dumping", "severity": 4,
                     "status": "open", "lat": 12.9716, "lng": 77.6412, "address": "100 Feet Rd", "reporter_id": "citizen_1",
                     "est_weight_kg": 40, "before_photo_url": PHOTO, "created_at": "2026-10-09T08:00:00Z"})
    return s


def test_save_and_public_view_never_contains_password(store):
    accounts.save(store, base_cfg(), "citizen_1", "Me@Gmail.com", "abcd efgh ijkl mnop")
    view = accounts.public_view(store, "citizen_1")
    assert view == {"configured": True, "gmail_address": "me@gmail.com", "verified_at": view["verified_at"]}
    assert "app_password" not in view and "abcdefghijklmnop" not in str(view)


def test_public_view_when_missing(store):
    assert accounts.public_view(store, "nobody") == {"configured": False, "gmail_address": "", "verified_at": None}


def test_save_rejects_bad_input(store):
    with pytest.raises(ValueError):
        accounts.save(store, base_cfg(), "citizen_1", "not-an-email", "abcdabcdabcdabcd")
    with pytest.raises(ValueError):
        accounts.save(store, base_cfg(), "citizen_1", "me@gmail.com", "short")


def test_save_surfaces_login_failure(store, monkeypatch):
    def bad(cfg):
        raise accounts.mailer.smtplib.SMTPAuthenticationError(535, b"Username and Password not accepted")
    monkeypatch.setattr(accounts.mailer, "verify_login", bad)
    with pytest.raises(ValueError, match="Gmail rejected"):
        accounts.save(store, base_cfg(), "citizen_1", "me@gmail.com", "abcdabcdabcdabcd")
    assert accounts.public_view(store, "citizen_1")["configured"] is False


def test_cfg_for_user_overrides_sender_and_falls_back(store):
    cfg = base_cfg(gmail_address="system@gmail.com", gmail_app_password="sysp")
    assert accounts.cfg_for(store, cfg, "citizen_1").gmail_address == "system@gmail.com"
    accounts.save(store, cfg, "citizen_1", "me@gmail.com", "abcdabcdabcdabcd")
    user_cfg = accounts.cfg_for(store, cfg, "citizen_1")
    assert user_cfg.gmail_address == "me@gmail.com" and user_cfg.gmail_app_password == "abcdabcdabcdabcd"
    assert user_cfg.email_enabled


def test_delete(store):
    accounts.save(store, base_cfg(), "citizen_1", "me@gmail.com", "abcdabcdabcdabcd")
    accounts.delete(store, "citizen_1")
    assert accounts.public_view(store, "citizen_1")["configured"] is False


def test_complaint_is_sent_from_reporters_own_gmail(store, monkeypatch):
    accounts.save(store, base_cfg(), "citizen_1", "me@gmail.com", "abcdabcdabcdabcd")
    sent = []
    monkeypatch.setattr(complaints.mailer, "send", lambda cfg, to, subject, body, **kw: sent.append((cfg.gmail_address, to)) or "<m@x>")
    c = complaints.send_complaint(store, base_cfg(), "i1", "me@gmail.com")
    assert c["email_status"] == "sent" and c["sender_email"] == "me@gmail.com" and c["sender_user_id"] == "citizen_1"
    assert sent[0] == ("me@gmail.com", "me+bbmp-east@gmail.com")   # no officer inbox set -> reporter's own inbox


def test_same_reply_seen_in_two_inboxes_is_processed_once(store, monkeypatch):
    monkeypatch.setattr(complaints.mailer, "send", lambda *a, **kw: "<m@x>")
    cfg = base_cfg(gmail_address="sys@gmail.com", gmail_app_password="p", demo_office_email="officer@gmail.com")
    complaints.send_complaint(store, cfg, "i1", "")
    reply = {"from": "officer@gmail.com", "subject": "Re: [ECO-0001] Garbage", "ticket_id": "ECO-0001",
             "text": "On it", "images": [], "message_id": "<r1@mail.gmail.com>"}
    assert complaints.handle_reply(store, cfg, reply) == "in_progress"
    assert complaints.handle_reply(store, cfg, reply) == "duplicate"
    assert store.get("issues", "i1")["complaint"]["replies"] == 1


def test_inbox_configs_lists_system_and_user_accounts(store):
    cfg = base_cfg(gmail_address="sys@gmail.com", gmail_app_password="p")
    accounts.save(store, cfg, "citizen_1", "me@gmail.com", "abcdabcdabcdabcd")
    assert sorted(c.gmail_address for c in accounts.inbox_configs(store, cfg)) == ["me@gmail.com", "sys@gmail.com"]


def test_gmail_dropping_connection_counts_as_rejected(store, monkeypatch):
    def drop(cfg):
        raise accounts.mailer.smtplib.SMTPServerDisconnected("Connection unexpectedly closed")
    monkeypatch.setattr(accounts.mailer, "verify_login", drop)
    with pytest.raises(ValueError, match="Gmail rejected"):
        accounts.save(store, base_cfg(), "citizen_1", "me@gmail.com", "abcdabcdabcdabcd")
