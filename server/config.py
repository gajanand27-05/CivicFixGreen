# server/config.py
import os
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


@dataclass(frozen=True)
class Config:
    gmail_address: str
    gmail_app_password: str
    gemini_api_key: str
    gemini_model: str
    demo_office_email: str
    send_to_real_bbmp: bool
    reminder_after: timedelta
    reminder_repeat: timedelta
    max_reminders: int
    poll_seconds: int
    public_base_url: str

    @property
    def email_enabled(self):
        """Email is optional: without Gmail credentials, complaints are tracked in-app only."""
        return bool(self.gmail_address and self.gmail_app_password)


def load():
    e = os.environ.get
    return Config(
        gmail_address=e("GMAIL_ADDRESS", "").strip(),
        gmail_app_password=e("GMAIL_APP_PASSWORD", "").replace(" ", ""),
        gemini_api_key=e("GEMINI_API_KEY", "").strip(),
        gemini_model=e("GEMINI_MODEL", "gemini-2.5-flash").strip(),
        demo_office_email=e("DEMO_OFFICE_EMAIL", "").strip(),
        send_to_real_bbmp=e("SEND_TO_REAL_BBMP", "false").lower() == "true",
        reminder_after=timedelta(minutes=float(e("REMINDER_AFTER_MINUTES", "7200"))),
        reminder_repeat=timedelta(minutes=float(e("REMINDER_REPEAT_MINUTES", "2880"))),
        max_reminders=int(e("MAX_REMINDERS", "3")),
        poll_seconds=int(e("POLL_SECONDS", "60")),
        public_base_url=e("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/"),
    )
