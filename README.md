<p align="center">
  <img src="assets/ecosort-logo.png" alt="EcoSort logo" width="380">
</p>

<h3 align="center">Snap a garbage dump. We chase it until it's clean.</h3>

<p align="center">
  An AI agent that reports illegal dumping to the nearest municipal office<br>
  and follows up until AI confirms the spot has been cleaned.
</p>

<p align="center">
  <b>AI PROMPTVERSE 2026 · AI for Sustainability</b> · Team <b>SG-FORGE</b>
</p>

<p align="center">
  🌐 <b>Live demo:</b> <a href="https://ecosort-phi.vercel.app">ecosort-phi.vercel.app</a>
</p>

---

## The problem

Bengaluru generates around **6,000 tonnes of solid waste every day**, and hundreds of garbage black spots are still active across the city. Citizens do report them, but the complaint usually dies there:

- People don't know **which office** handles their street.
- **Nobody follows up.**
- "Resolved" is a status change, **not proof** that the spot is clean.

Meanwhile the dump gets burned, blocks a drain, or washes plastic into a lake. Reporting isn't the hard part. **The hard part is closing the loop.**

## The solution

EcoSort turns one photo into a tracked complaint with the nearest office, and checks the cleanup with AI.

| # | Step | What happens |
|---|---|---|
| 1 | **Snap** | Take a camera photo or upload one. The location comes from device GPS or the photo's EXIF data, and the pin can be dragged. |
| 2 | **AI check** | Gemini confirms it's waste dumped in a public place (rejects selfies and spam), rates severity 1–5, estimates the weight in kg and writes the complaint. |
| 3 | **Route** | Finds the nearest BBMP / city-corporation zonal office. |
| 4 | **Complain** | Shows the citizen the exact email first, then sends it with the photo and a Google Maps link. |
| 5 | **Verify** | When the office replies with a cleanup photo, Gemini compares before and after. If the check passes, the complaint is **Closed**. |

### The accountability loop

After the complaint is sent, the server keeps watching it:

- **Reply with a cleanup photo** → AI before/after check → **Closed**, and the kg are added to the City Board.
- **Reply without a photo** → **In Progress**, and the office is automatically asked to send a photo once the spot is cleaned.
- **No reply in 5 days** → reminders go to the officer **and** the citizen (email + in-app), every 2 days, up to 3 times.
- Any response from the office restarts the 5-day clock. Only the office the complaint was sent to, with an AI-confirmed photo, can close it by email.

## How AI is used

| Capability | What it does |
|---|---|
| **Dump detector** | Rejects photos that aren't public dumps, so officers only get real complaints. |
| **Severity + weight** | Rates severity 1–5 (burning, hazardous waste or blocked drains score 5) and estimates the pile weight in kg. |
| **Complaint writer** | Writes a factual, official-style title and description. Voice notes are transcribed. |
| **Cleanup verifier** | Compares the original photo with the one attached to the office's reply: is it the same spot, and is the waste gone? |
| **Hotspot prediction** | Uses past complaints to predict where dumping or burning is likely in the next 30 days. |
| **Safe by design** | Structured JSON output, model fallbacks, and a labelled demo mode. An AI failure never crashes the app. |

## Sustainability impact

- **Cleaner air:** dumps cleared sooner are less likely to be burned.
- **Cleaner water:** waste is removed before it blocks drains or carries plastic into lakes.
- **Less methane:** rotting organic waste goes to processing instead of sitting in open dumps.
- **Measured, not claimed:** the public City Board counts kg cleared only for AI-verified cleanups, along with complaints closed and the average number of days to close.
- **Prevention:** hotspot predictions show where to place bins and patrols before dumping starts.

## Features

| Citizen | Officer | City / Admin |
|---|---|---|
| Guided 5-step report flow | Dashboard with ticket, office, days open and reminders sent | Public City Board (kg cleared, closed, average days) |
| GPS / EXIF location, draggable pin | Overdue complaints flagged red | Map with heatmap + predicted hotspots |
| AI-filled complaint, voice notes | Open → In Progress → Closed | Monthly transparency PDF report |
| Preview of the exact email before it's sent | Closing requires an AI-verified cleanup photo | Manage officers and categories |
| Live status timeline + notifications | Complainer notified on every change | Installable PWA, works on any phone |
| Points, badges, leaderboard; nearby duplicates offered as a merge | | |

## Architecture

```
Browser (PWA: index.html, js/, css/)
        │ fetch
        ▼
FastAPI server (server/)
  ├─ /api/db/*, /api/db-batch     shared document store (SQLite locally, Postgres when DATABASE_URL is set)
  ├─ /api/analyze                 Gemini: is it a dump? severity, kg, description
  ├─ /api/verify-cleanup          Gemini before/after check
  ├─ /api/hotspots, /api/transcribe
  ├─ /api/offices/nearest         nearest zonal office
  ├─ /api/complaints/*            preview + send complaint (email optional)
  ├─ /api/users/{id}/email-settings  per-user Gmail sending
  └─ monitor: background loop locally, /api/cron/tick on Vercel
        ├─ read office replies (Gmail IMAP) → In Progress / Closed
        └─ send overdue reminders (Gmail SMTP + in-app)
```

**Tech stack:** vanilla JS PWA, Leaflet / OpenStreetMap, FastAPI, Google Gemini, Gmail SMTP/IMAP, SQLite or Postgres, Vercel.

The Gemini key stays on the server. Email is **optional**: without Gmail settings, complaints, reminders and notifications still work inside the app.

## Run it locally

```bash
python -m venv .venv
.venv\Scripts\activate                 # Windows (Git Bash: source .venv/Scripts/activate)
pip install -r server/requirements.txt
copy server\.env.example server\.env   # then fill in GEMINI_API_KEY (and Gmail if you want email)
uvicorn server.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000 and use the quick-login buttons: **Citizen**, **Officer**, **Admin**.
Don't use `--reload`: it starts the background monitor twice.

**Phone demo:** camera and GPS need HTTPS. Run `ngrok http 8000`, open the https link on the phone, and set `PUBLIC_BASE_URL` in `.env` to that link.

### Deploy on Vercel
Live at **https://ecosort-phi.vercel.app**.
`api/index.py` exposes the FastAPI app, and `vercel.json` sets up a daily cron on `/api/cron/tick` for checking replies and sending reminders.
Set the same variables as in `.env` in the Vercel project. Add `DATABASE_URL` (or `POSTGRES_URL`) for persistent storage; without it, data lives in `/tmp` and is lost. Optionally set `CRON_SECRET` to protect the cron endpoint.

### Settings (`server/.env`)
| Key | Meaning |
|---|---|
| `GEMINI_API_KEY` | From https://aistudio.google.com/apikey. Empty = labelled demo mode. |
| `GEMINI_MODEL` | Comma-separated, tried in order (default `gemini-3.8-flash,gemini-3.7-flash,gemini-2.5-flash`). |
| `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD` | Shared sender mailbox (needs 2-Step Verification, an App Password and IMAP on). Empty = in-app only. |
| `DEMO_OFFICE_EMAIL` | Inbox that plays the "BBMP officer"; each office becomes `name+bbmp-<zone>@…`. |
| `SEND_TO_REAL_BBMP` | `false` by default. Real addresses are used only when `true` **and** `email_official` is filled in `server/bbmp_offices.json` from an official source. |
| `REMINDER_AFTER_MINUTES` / `REMINDER_REPEAT_MINUTES` / `MAX_REMINDERS` | 7200 (5 days) / 2880 (2 days) / 3. Use e.g. 2 / 3 for a live demo. |
| `POLL_SECONDS` | How often replies and reminders are checked locally (default 60). |
| `PUBLIC_BASE_URL` | Public link used in emails (default `http://localhost:8000`). |
| `DATABASE_URL` / `POSTGRES_URL` | Optional Postgres connection; SQLite (`server/ecosort.db`) is used otherwise. |

### Email per user (Profile → Email sending)
Each user can connect their own Gmail (address + 16-character App Password). Their complaints are then sent **from their own address**, and the server reads their inbox for the office's reply.
The login is verified with Gmail when it's saved. The App Password is kept only in the server's private `mail_accounts` table. It is never sent back to the browser and can't be read through `/api/db`.
Users without their own Gmail fall back to the shared `GMAIL_*` account, or to in-app tracking only.
To test it, use Profile → Email sending → "Send test email", or `POST /api/email/test`.

### Tests
```bash
python -m pytest server/tests -q
```

## Project structure

```
index.html, js/, css/, style.css   PWA frontend (citizen, officer, admin, public pages)
assets/                            logo and icons
server/                            FastAPI app: AI, complaints, offices, inbox, reminders, store
server/bbmp_offices.json           zonal office directory
server/tests/                      pytest suite
api/index.py, vercel.json          Vercel deployment
```

## Notes
- Office coordinates in `server/bbmp_offices.json` are zone area centres. BBMP was restructured in 2025 into the Greater Bengaluru Authority's city corporations, so office names and official emails must be verified before real sending is turned on.
- Weight figures are AI estimates from photos, useful for tracking trends but not official weighbridge numbers.

## Team SG-FORGE
Ganesh · Gajanand · Gangadhara · Sharath
