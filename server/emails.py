# server/emails.py
# Every email the system sends. The ticket ID must stay in the subject so replies can be matched.


def _maps(issue):
    return f"https://www.google.com/maps?q={issue['lat']},{issue['lng']}"


def complaint_subject(ticket, issue):
    return f"[{ticket}] Garbage dump complaint - {issue.get('address', '')[:60]}"


def complaint_body(ticket, issue, office, cfg):
    return f"""To,
The Officer-in-charge, Solid Waste Management
{office['name']}

Subject: Complaint regarding illegal garbage dumping - Ticket {ticket}

Respected Sir/Madam,

I wish to report waste dumped at a public place in your jurisdiction.

Location : {issue.get('address', '')}
Map      : {_maps(issue)}
Category : {issue.get('category', '').replace('_', ' ').title()}
Severity : {issue.get('severity')}/5
Estimated waste : about {round(issue.get('est_weight_kg') or 0)} kg

Details:
{issue.get('description', '')}

A photo of the site is attached. I request you to kindly arrange for the waste to be cleared at the earliest.

HOW TO CLOSE THIS COMPLAINT: reply to this email (keep "{ticket}" in the subject) and attach a photo of the cleaned area.
If no response is received within 5 days, an automatic reminder will be sent.

Thank you,
A concerned citizen (via EcoSort)
Track status: {cfg.public_base_url}/#/issue/{issue.get('id', '')}
"""


def ask_for_photo(ticket, reason):
    return f"""Thank you for your response on complaint {ticket}.

{reason}

To close this complaint, please reply to this email with a clear photo of the SAME spot after cleaning.

- EcoSort (automated)"""


def reminder_officer(ticket, issue, n, days):
    return f"""REMINDER {n}: Complaint {ticket} has had no resolution for {days} day(s).

Location: {issue.get('address', '')}
Map: {_maps(issue)}

The original photo is attached. Please arrange cleaning and reply to this email with a photo of the cleaned area to close the complaint.

- EcoSort (automated)"""


def reminder_citizen(ticket, issue, office, n, days):
    return f"""Your complaint {ticket} ({issue.get('title', '')}) has not been resolved by {office} after {days} day(s).

We have sent reminder {n} to the office. You'll be notified as soon as they respond.

- EcoSort"""


def status_update(ticket, issue, status_label, note):
    return f"""Update on your complaint {ticket} ({issue.get('title', '')}):

Status: {status_label}
{note}

- EcoSort"""


def resolved_citizen(ticket, issue, office, reason):
    return f"""Good news! Your complaint {ticket} ({issue.get('title', '')}) has been CLOSED.

{office} sent a photo of the cleaned area (attached). Verification: {reason}

Thank you for helping keep Bengaluru clean.
- EcoSort"""
