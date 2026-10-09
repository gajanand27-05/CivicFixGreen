from email.message import EmailMessage

from server.inbox import parse_message, strip_quoted


def _mail(subject, body, image=None, sender="Officer <team.officer@gmail.com>"):
    m = EmailMessage()
    m["From"], m["To"], m["Subject"], m["Message-ID"] = sender, "civic@gmail.com", subject, "<abc@x>"
    m.set_content(body)
    if image:
        m.add_attachment(image, maintype="image", subtype="jpeg", filename="clean.jpg")
    return m.as_bytes()


def test_parses_ticket_sender_and_image():
    p = parse_message(_mail("Re: [ECO-0007] Garbage dump complaint", "Cleaned today.", image=b"\xff\xd8jpeg"))
    assert p["ticket_id"] == "ECO-0007"
    assert p["from"] == "team.officer@gmail.com"
    assert p["images"] == [("image/jpeg", b"\xff\xd8jpeg")]
    assert p["text"] == "Cleaned today."
    assert p["message_id"] == "<abc@x>"


def test_no_ticket_and_no_image():
    p = parse_message(_mail("Hello", "hi"))
    assert p["ticket_id"] is None and p["images"] == []


def test_strip_quoted_removes_previous_thread():
    text = "Work started.\n\nOn Thu, 9 Oct 2026 at 10:00, EcoSort wrote:\n> old complaint"
    assert strip_quoted(text) == "Work started."
