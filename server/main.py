# server/main.py
# EcoSort server: shared DB, AI, complaints (email optional), monitoring jobs, and the frontend.
# Run from the repo root:  uvicorn server.main:app --port 8000   (no --reload: it would start the jobs twice)
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Body, FastAPI, Header, HTTPException, Query
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from . import accounts, ai, complaints, config, jobs, mailer, offices, photos
from .store import open_store

cfg = config.load()
ROOT = Path(__file__).resolve().parent.parent
ON_VERCEL = bool(os.environ.get("VERCEL"))
store = open_store(ROOT / "server" / "ecosort.db")
photos.init(store)

STORES = {"users", "issues", "verifications", "issue_timeline", "badges",
          "hotspot_predictions", "monthly_reports", "notifications", "meta"}
PUBLIC_FILES = {"index.html", "style.css", "manifest.json", "sw.js", "offline.html"}


@asynccontextmanager
async def lifespan(app):
    print(f"[ecosort] AI: {'Gemini ' + cfg.gemini_model if cfg.gemini_api_key else 'DEMO MODE (no GEMINI_API_KEY)'}")
    print(f"[ecosort] Email: {'ON via ' + cfg.gmail_address if cfg.email_enabled else 'OFF (complaints tracked in-app only)'}")
    print(f"[ecosort] Reminders after {cfg.reminder_after}, repeat every {cfg.reminder_repeat}, max {cfg.max_reminders}")
    if not ON_VERCEL:
        jobs.start(store, cfg)   # serverless hosts can't keep a thread alive: see maybe_tick / /api/cron/tick
    yield


app = FastAPI(title="EcoSort", lifespan=lifespan)


def _check(name):
    if name not in STORES:
        raise HTTPException(404, f"Unknown store {name}")


# ---------- generic document DB (used by js/db.js) ----------
@app.get("/api/db/{name}")
def db_get_all(name: str):
    _check(name)
    if name == "notifications" and ON_VERCEL:
        jobs.maybe_tick(store, cfg)   # every open app polls this ~15 s, which drives replies/reminders on Vercel
    return store.get_all(name)


@app.get("/api/db/{name}/{doc_id}")
def db_get(name: str, doc_id: str):
    _check(name)
    return store.get(name, doc_id)


@app.put("/api/db/{name}/{doc_id}")
def db_put(name: str, doc_id: str, doc: dict = Body(...)):
    _check(name)
    doc["id"] = doc_id
    if name in ("issues", "users"):
        photos.externalize(doc)       # keep records small: images become /api/photos/<id>
    old = store.get(name, doc_id) if name == "issues" else None
    store.put(name, doc)
    if name == "issues" and old:
        try:
            complaints.on_issue_changed(store, cfg, old, doc)
        except Exception as e:
            print("[hook] status change handling failed:", e)
    return doc


@app.post("/api/db-batch")
def db_batch(body: dict = Body(...)):
    """Apply many writes in one request (used to seed demo data quickly on remote hosts)."""
    ops = body.get("ops") or []
    for op in ops:
        _check(op.get("store"))
    for op in ops:
        if op.get("op") == "clear":
            store.clear(op["store"])
        elif op.get("op") == "put":
            doc = op["doc"]
            if op["store"] in ("issues", "users"):
                photos.externalize(doc)
            store.put(op["store"], doc)
        else:
            raise HTTPException(400, f"Unknown op {op.get('op')}")
    return {"ok": True, "applied": len(ops)}


@app.delete("/api/db/{name}/{doc_id}")
def db_delete(name: str, doc_id: str):
    _check(name)
    store.delete(name, doc_id)
    return {"ok": True}


@app.post("/api/db/{name}/clear")
def db_clear(name: str):
    _check(name)
    store.clear(name)
    return {"ok": True}


# ---------- AI ----------
@app.post("/api/analyze")
def api_analyze(body: dict = Body(...)):
    return ai.analyze_dump(cfg, body["image"])


@app.post("/api/verify-cleanup")
def api_verify(body: dict = Body(...)):
    return ai.verify_cleanup(cfg, body["before"], body["after"])


@app.post("/api/hotspots")
def api_hotspots(body: dict = Body(...)):
    return ai.predict_hotspots(cfg, body.get("issues", []))


@app.post("/api/transcribe")
def api_transcribe(body: dict = Body(...)):
    return ai.transcribe(cfg, body["audio"])


# ---------- offices & complaints ----------
@app.get("/api/status")
def api_status():
    return {"ai": bool(cfg.gemini_api_key), "email": cfg.email_enabled, "sender": cfg.gmail_address,
            "office_inbox": cfg.demo_office_email or cfg.gmail_address, "real_bbmp": cfg.send_to_real_bbmp}


@app.post("/api/email/test")
def api_email_test(body: dict = Body(default={})):
    """Send a test email (from a user's connected Gmail if user_id is given) to confirm the setup works."""
    send_cfg = accounts.cfg_for(store, cfg, body.get("user_id"))
    to = (body.get("to") or send_cfg.gmail_address or cfg.demo_office_email).strip()
    problem = complaints.email_problem(send_cfg, to)
    if problem:
        return {"ok": False, "error": problem}
    try:
        mailer.send(send_cfg, to, "EcoSort test email", "If you can read this, EcoSort email is working.")
        return {"ok": True, "to": to, "from": send_cfg.gmail_address}
    except Exception as e:
        return {"ok": False, "error": f"Sending failed: {e}"}


@app.get("/api/offices/nearest")
def api_nearest(lat: float = Query(...), lng: float = Query(...)):
    office = offices.nearest(lat, lng)
    to = offices.recipient(office, cfg)
    return {**office, "recipient": to, "email_enabled": cfg.email_enabled and bool(to)}


@app.post("/api/complaints/preview")
def api_preview(body: dict = Body(...)):
    return complaints.preview(cfg, body["issue"], store, body.get("user_id"))


# ---------- per-user Gmail (App Password is write-only: never returned) ----------
def _check_user(user_id):
    if not store.get("users", user_id):
        raise HTTPException(404, "User not found")


@app.get("/api/users/{user_id}/email-settings")
def api_email_settings(user_id: str):
    _check_user(user_id)
    return accounts.public_view(store, user_id)


@app.put("/api/users/{user_id}/email-settings")
def api_save_email_settings(user_id: str, body: dict = Body(...)):
    _check_user(user_id)
    try:
        return accounts.save(store, cfg, user_id, body.get("gmail_address", ""), body.get("app_password", ""))
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.delete("/api/users/{user_id}/email-settings")
def api_delete_email_settings(user_id: str):
    _check_user(user_id)
    accounts.delete(store, user_id)
    return accounts.public_view(store, user_id)


@app.post("/api/complaints/{issue_id}/send")
def api_send(issue_id: str, body: dict = Body(...)):
    if not store.get("issues", issue_id):
        raise HTTPException(404, "Issue not found")
    return complaints.send_complaint(store, cfg, issue_id, body.get("complainer_email", ""))


@app.get("/api/photos/{photo_id}")
def api_photo(photo_id: str):
    try:
        mime, data = photos.load(photo_id)
    except KeyError:
        raise HTTPException(404, "Photo not found")
    return Response(content=data, media_type=mime, headers={"Cache-Control": "public, max-age=31536000, immutable"})


@app.get("/api/cron/tick")
def api_cron_tick(authorization: str = Header(default="")):
    """Vercel Cron entry point: check BBMP replies and send due reminders."""
    secret = os.environ.get("CRON_SECRET")
    if secret and authorization != f"Bearer {secret}":
        raise HTTPException(401, "Unauthorized")
    jobs.run_once(store, cfg)
    return {"ok": True}


# ---------- frontend (only whitelisted folders/files; never serve server/) ----------
# Vercel runs this as a FastAPI backend app, so the app serves the static frontend there too.
for folder in ("js", "assets", "css"):
    if (ROOT / folder).is_dir():
        app.mount(f"/{folder}", StaticFiles(directory=ROOT / folder), name=folder)


@app.get("/")
def index():
    return FileResponse(ROOT / "index.html")


@app.get("/{name}")
def public_file(name: str):
    if name not in PUBLIC_FILES:
        raise HTTPException(404)
    return FileResponse(ROOT / name)
