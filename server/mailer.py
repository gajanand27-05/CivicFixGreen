# server/mailer.py
import smtplib
from email.message import EmailMessage
from email.utils import make_msgid


def send(cfg, to, subject, body, cc=None, attachments=(), in_reply_to=None):
    msg = EmailMessage()
    msg["From"] = f"CivicFix Green <{cfg.gmail_address}>"
    msg["To"] = to
    if cc:
        msg["Cc"] = cc
    msg["Subject"] = subject
    msg["Reply-To"] = cfg.gmail_address
    msg["Message-ID"] = make_msgid(domain="civicfix.green")
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to
    msg.set_content(body)
    for filename, data, mime in attachments:
        maintype, subtype = mime.split("/", 1)
        msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=filename)
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as s:
        s.login(cfg.gmail_address, cfg.gmail_app_password)
        s.send_message(msg)
    return msg["Message-ID"]
