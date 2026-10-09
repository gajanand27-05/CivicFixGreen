# server/main.py
# CivicFix Green server: shared DB, AI, complaints (email optional), monitoring jobs, and the frontend.
# Run from the repo root:  uvicorn server.main:app --port 8000   (no --reload: it would start the jobs twice)
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import ai, complaints, config, jobs, offices
from .store import Store

cfg = config.load()
ROOT = Path(__file__).resolve().parent.parent
store = Store(ROOT / "server" / "civicfix.db")

STORES = {"users", "issues", "verifications", "issue_timeline", "badges",
          "hotspot_predictions", "monthly_reports", "notifications", "meta"}
PUBLIC_FILES = {"index.html", "style.css", "manifest.json", "sw.js", "offline.html"}


@asynccontextmanager
async def lifespan(app):
    print(f"[civicfix] AI: {'Gemini ' + cfg.gemini_model if cfg.gemini_api_key else 'DEMO MODE (no GEMINI_API_KEY)'}")
    print(f"[civicfix] Email: {'ON via ' + cfg.gmail_address if cfg.email_enabled else 'OFF (complaints tracked in-app only)'}")
    print(f"[civicfix] Reminders after {cfg.reminder_after}, repeat every {cfg.reminder_repeat}, max {cfg.max_reminders}")
    jobs.start(store, cfg)
    yield


app = FastAPI(title="CivicFix Green", lifespan=lifespan)


def _check(name):
    if name not in STORES:
        raise HTTPException(404, f"Unknown store {name}")


# ---------- generic document DB (used by js/db.js) ----------
@app.get("/api/db/{name}")
def db_get_all(name: str):
    _check(name)
    return store.get_all(name)


@app.get("/api/db/{name}/{doc_id}")
def db_get(name: str, doc_id: str):
    _check(name)
    return store.get(name, doc_id)


@app.put("/api/db/{name}/{doc_id}")
def db_put(name: str, doc_id: str, doc: dict = Body(...)):
    _check(name)
    doc["id"] = doc_id
    old = store.get(name, doc_id) if name == "issues" else None
    store.put(name, doc)
    if name == "issues" and old:
        try:
            complaints.on_issue_changed(store, cfg, old, doc)
        except Exception as e:
            print("[hook] status change handling failed:", e)
    return doc


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
    return {"ai": bool(cfg.gemini_api_key), "email": cfg.email_enabled}


@app.get("/api/offices/nearest")
def api_nearest(lat: float = Query(...), lng: float = Query(...)):
    office = offices.nearest(lat, lng)
    to = offices.recipient(office, cfg)
    return {**office, "recipient": to, "email_enabled": cfg.email_enabled and bool(to)}


@app.post("/api/complaints/preview")
def api_preview(body: dict = Body(...)):
    return complaints.preview(cfg, body["issue"])


@app.post("/api/complaints/{issue_id}/send")
def api_send(issue_id: str, body: dict = Body(...)):
    if not store.get("issues", issue_id):
        raise HTTPException(404, "Issue not found")
    return complaints.send_complaint(store, cfg, issue_id, body.get("complainer_email", ""))


# ---------- frontend (only whitelisted files; never serve server/) ----------
app.mount("/js", StaticFiles(directory=ROOT / "js"), name="js")
app.mount("/assets", StaticFiles(directory=ROOT / "assets"), name="assets")


@app.get("/")
def index():
    return FileResponse(ROOT / "index.html")


@app.get("/{name}")
def public_file(name: str):
    if name not in PUBLIC_FILES:
        raise HTTPException(404)
    return FileResponse(ROOT / name)
