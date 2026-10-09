# server/inbox.py
# Read BBMP replies from the system Gmail inbox over IMAP.
import email
import imaplib
import re
from email import policy
from email.utils import parseaddr

TICKET_RE = re.compile(r"ECO-\d{4,}")


def strip_quoted(text):
    kept = []
    for line in text.splitlines():
        if line.startswith(">") or re.match(r"^On .+wrote:\s*$", line.strip()):
            break
        kept.append(line)
    return "\n".join(kept).strip()[:500]


def parse_message(raw):
    msg = email.message_from_bytes(raw, policy=policy.default)
    subject = str(msg.get("Subject", ""))
    match = TICKET_RE.search(subject)
    body = msg.get_body(preferencelist=("plain", "html"))
    text = body.get_content() if body else ""
    images = [(p.get_content_type(), p.get_payload(decode=True))
              for p in msg.walk() if p.get_content_maintype() == "image"]
    return {
        "from": parseaddr(str(msg.get("From", "")))[1].lower(),
        "subject": subject,
        "ticket_id": match.group(0) if match else None,
        "text": strip_quoted(text),
        "images": images,
        "message_id": str(msg.get("Message-ID", "")),
    }


def fetch_unseen(cfg):
    out = []
    with imaplib.IMAP4_SSL("imap.gmail.com") as imap:
        imap.login(cfg.gmail_address, cfg.gmail_app_password)
        imap.select("INBOX")
        _, data = imap.search(None, '(UNSEEN SUBJECT "ECO-")')
        for num in data[0].split():
            _, msg_data = imap.fetch(num, "(RFC822)")  # fetching marks it \Seen
            out.append(parse_message(msg_data[0][1]))
    return out
