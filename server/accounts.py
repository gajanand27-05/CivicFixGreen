# server/accounts.py
# Per-user Gmail accounts so each user's complaints are sent from (and replies read in) their own inbox.
# Stored in the server-only "mail_accounts" store: it is NOT exposed through /api/db, and the
# App Password is never returned to the browser.
import dataclasses
import re
from datetime import datetime, timezone

from . import mailer

STORE = "mail_accounts"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def public_view(store, user_id):
    acc = store.get(STORE, user_id)
    if not acc:
        return {"configured": False, "gmail_address": "", "verified_at": None}
    return {"configured": True, "gmail_address": acc["gmail_address"], "verified_at": acc.get("verified_at")}


def save(store, cfg, user_id, gmail_address, app_password):
    address = (gmail_address or "").strip().lower()
    password = (app_password or "").replace(" ", "")
    if not EMAIL_RE.match(address):
        raise ValueError("Enter a valid Gmail address.")
    if len(password) != 16:
        raise ValueError("The App Password is 16 characters (Google shows it in 4 groups of 4).")
    try:
        mailer.verify_login(dataclasses.replace(cfg, gmail_address=address, gmail_app_password=password))
    except (mailer.smtplib.SMTPAuthenticationError, mailer.smtplib.SMTPServerDisconnected):
        raise ValueError("Gmail rejected this address/App Password. Check 2-Step Verification is on and create a new App Password.")
    except Exception as e:
        raise ValueError(f"Could not reach Gmail to check the login: {e}")
    store.put(STORE, {"id": user_id, "gmail_address": address, "app_password": password,
                      "verified_at": datetime.now(timezone.utc).isoformat()})
    return public_view(store, user_id)


def delete(store, user_id):
    store.delete(STORE, user_id)


def cfg_for(store, cfg, user_id):
    """Config that sends as this user's Gmail if they connected one, otherwise the shared account."""
    acc = store.get(STORE, user_id) if user_id else None
    if not acc:
        return cfg
    return dataclasses.replace(cfg, gmail_address=acc["gmail_address"], gmail_app_password=acc["app_password"])


def inbox_configs(store, cfg):
    """Every inbox the monitor should read: the shared account (if set) plus each connected user account."""
    configs = [cfg] if cfg.email_enabled else []
    seen = {cfg.gmail_address.lower()} if cfg.email_enabled else set()
    for acc in store.get_all(STORE):
        if acc["gmail_address"] not in seen:
            seen.add(acc["gmail_address"])
            configs.append(dataclasses.replace(cfg, gmail_address=acc["gmail_address"], gmail_app_password=acc["app_password"]))
    return configs
