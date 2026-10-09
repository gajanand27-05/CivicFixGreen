# 🌱 EcoSort: Snap a Garbage Dump, We Chase BBMP Until It's Clean

**AI PROMPTVERSE: AI for Sustainability**

See garbage dumped on a street corner? Take a photo. EcoSort:

1. **Traces the location**: device GPS, or the GPS stored in an uploaded photo; you can drag the pin.
2. **Checks the photo with Gemini**: confirms it is waste dumped in a public place (rejects selfies/spam), rates severity 1–5, estimates the pile weight and writes the complaint description.
3. **Raises a complaint with the nearest BBMP office**: shows you the exact complaint first, then emails it with the photo and a Google Maps link (when email is configured). It always appears on the officer dashboard.
4. **Keeps monitoring**:
   - BBMP replies by email **with a photo of the cleaned spot** → Gemini compares before/after → complaint **Closed**.
   - Reply without a photo → **In Progress**, and BBMP is asked for a photo when done.
   - **No response in 5 days** → reminders to the BBMP officer and the complainer (email + in-app), every 2 days, up to 3 times.
5. **Officers** can also set **Open / In Progress / Closed** from the dashboard (closing needs a cleanup photo, verified by AI). The complainer is notified on every change.

The City Board shows kg of waste cleared, complaints closed and average days to close.

## Architecture

```
Browser (PWA: js/, index.html) ──fetch──▶ FastAPI server (server/)
                                           ├─ /api/db/*         shared SQLite document store (all devices see the same data)
                                           ├─ /api/analyze      Gemini: is it a dump? severity, kg, description
                                           ├─ /api/complaints/* nearest office, preview, raise complaint (email optional)
                                           ├─ /api/verify-cleanup  Gemini before/after check
                                           └─ background job (every POLL_SECONDS)
                                                ├─ read BBMP replies (Gmail IMAP) → In Progress / Closed
                                                └─ overdue reminders
```

The Gemini key lives only on the server. Email is **optional**: without Gmail settings, complaints, reminders and notifications all still work inside the app.

## Run it

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows (Git Bash: source .venv/Scripts/activate)
pip install -r server/requirements.txt
copy server\.env.example server\.env   # then fill in GEMINI_API_KEY (and Gmail if you want email)
uvicorn server.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000. Use the quick-login buttons: Citizen, Officer, Admin.
Do **not** use `--reload`: it starts the background monitor twice.

**Phone demo:** camera and GPS need HTTPS. Run `ngrok http 8000`, open the https link on the phone, and set `PUBLIC_BASE_URL` in `.env` to that link.

### Settings (`server/.env`)
| Key | Meaning |
|---|---|
| `GEMINI_API_KEY` | from https://aistudio.google.com/apikey. Empty = labelled demo mode |
| `GEMINI_MODEL` | comma-separated, tried in order (default `gemini-3.8-flash,gemini-3.7-flash,gemini-2.5-flash`) |
| `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD` | sender mailbox (needs 2-Step Verification + App Password, IMAP on). Empty = in-app only |
| `DEMO_OFFICE_EMAIL` | team inbox that plays "BBMP officer"; each office becomes `name+bbmp-<zone>@…` |
| `SEND_TO_REAL_BBMP` | `false` by default. Real addresses are used only when `true` **and** `email_official` is filled in `server/bbmp_offices.json` from an official source |
| `REMINDER_AFTER_MINUTES` / `REMINDER_REPEAT_MINUTES` / `MAX_REMINDERS` | 7200 (5 days) / 2880 (2 days) / 3. Use e.g. 2 / 3 for a live demo |
| `POLL_SECONDS` | how often replies and reminders are checked (default 60) |

### Email per user (Profile → Email sending)
Each user can connect their own Gmail (address + 16-character App Password, with 2-Step Verification and IMAP on).
Their complaints are then emailed **from their own address**, and the server also reads their inbox for the office's reply.
The login is verified with Gmail when saved. The App Password is stored only in the server's private `mail_accounts`
table (in `server/ecosort.db`, git-ignored): it is never sent back to the browser and is not readable through `/api/db`.
Users without their own Gmail fall back to the shared `GMAIL_*` account in `.env`, or in-app tracking only.
Test it: Profile → Email sending → "Send test email", or `POST /api/email/test`.

### Tests
```bash
python -m pytest server/tests -q
```

## Notes
- Office coordinates in `server/bbmp_offices.json` are zone area centres. BBMP was restructured in 2025 into the Greater Bengaluru Authority's city corporations, so office names and official emails must be verified before real sending is enabled.
- Only a reply from the office address the complaint was sent to, with an AI-confirmed cleanup photo, can close a complaint by email.
