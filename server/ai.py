# server/ai.py
# All Gemini calls live here. Every public function returns a safe dict and never raises.
import base64
import json

import requests

LABELS = {
    "illegal_dumping": "Illegal Garbage Dump",
    "overflowing_bin": "Overflowing Bin / Black Spot",
    "waste_burning": "Open Waste Burning",
    "construction_debris": "Construction Debris",
    "plastic_litter": "Plastic Litter",
    "e_waste": "Dumped E-Waste",
    "other": "Other Waste Issue",
}

ANALYZE_PROMPT = """You are an inspector for Bengaluru's solid waste management department.
Look at the photo and return JSON:
- is_dump: true only if it shows waste dumped, piled, overflowing or burning in a PUBLIC place (street corner, roadside, footpath, empty plot, lake or drain edge). false for selfies, clean streets, a single item at home, or unrelated photos.
- category: one of illegal_dumping, overflowing_bin, waste_burning, construction_debris, plastic_litter, e_waste, other.
- severity: integer 1-5 (5 = burning, hazardous/medical waste, or blocking a road or drain; 1 = small litter).
- est_weight_kg: your best estimate of the visible waste weight in kg.
- suggested_title: 5-8 words, e.g. "Garbage dumped at street corner near bus stop".
- description: 2-3 factual sentences for an official complaint: what waste is visible, approximate size, any hazard (smell, stray animals, blocking footpath, burning).
- confidence: 0 to 1."""

ANALYZE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "is_dump": {"type": "BOOLEAN"},
        "category": {"type": "STRING", "enum": list(LABELS)},
        "severity": {"type": "INTEGER"},
        "est_weight_kg": {"type": "NUMBER"},
        "suggested_title": {"type": "STRING"},
        "description": {"type": "STRING"},
        "confidence": {"type": "NUMBER"},
    },
    "required": ["is_dump", "category", "severity", "est_weight_kg", "suggested_title", "description", "confidence"],
}

VERIFY_PROMPT = """The first photo shows a garbage dump reported by a citizen. The second photo was sent by the municipal office as proof that the same spot has been cleaned.
Return JSON: is_resolved (true only if the waste is clearly removed AND it plausibly shows the same location), confidence (0 to 1), reason (one sentence)."""

VERIFY_SCHEMA = {
    "type": "OBJECT",
    "properties": {"is_resolved": {"type": "BOOLEAN"}, "confidence": {"type": "NUMBER"}, "reason": {"type": "STRING"}},
    "required": ["is_resolved", "confidence", "reason"],
}

HOTSPOT_PROMPT = """Analyze these waste-dumping complaints and predict 2 zones in Bengaluru where illegal dumping or waste burning is most likely in the next 30 days.
Return a JSON array of 2 objects: {"zone_polygon": {"type": "Polygon", "coordinates": [[[lng, lat], [lng, lat], [lng, lat], [lng, lat], [lng, lat]]]}, "predicted_category": one of illegal_dumping/overflowing_bin/waste_burning/construction_debris, "risk_score": 1-100, "historical_count": integer}.
Coordinates are [longitude, latitude] near lat 12.97, lng 77.64. Complaints: """

TRANSCRIBE_PROMPT = 'Transcribe this voice note from a citizen describing a garbage dump. Return JSON {"transcription": "..."} (max 500 characters).'


def _clamp(n, lo, hi):
    return max(lo, min(hi, n))


def _num(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def normalize_analysis(raw, is_mock=False):
    r = raw or {}
    category = r.get("category") if r.get("category") in LABELS else "other"
    return {
        "is_dump": r.get("is_dump") is True,
        "category": category,
        "severity": int(_clamp(round(_num(r.get("severity"), 1)), 1, 5)),
        "est_weight_kg": max(0.0, _num(r.get("est_weight_kg"))),
        "suggested_title": str(r.get("suggested_title") or LABELS[category]),
        "description": str(r.get("description") or ""),
        "confidence": _clamp(_num(r.get("confidence")), 0.0, 1.0),
        "is_mock": is_mock,
    }


def data_url_to_bytes(url):
    if url.startswith("data:"):
        header, b64 = url.split(",", 1)
        return header[5:].split(";")[0], base64.b64decode(b64)
    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    return resp.headers.get("Content-Type", "image/jpeg").split(";")[0], resp.content


def _models(cfg):
    """GEMINI_MODEL may list fallbacks, e.g. "gemini-3.8-flash,gemini-3.7-flash"."""
    return [m.strip() for m in cfg.gemini_model.split(",") if m.strip()]


def _gemini(cfg, prompt, media_urls=(), schema=None):
    parts = [{"text": prompt}]
    for url in media_urls:
        mime, data = data_url_to_bytes(url)
        parts.append({"inlineData": {"mimeType": mime, "data": base64.b64encode(data).decode()}})
    gen = {"responseMimeType": "application/json"}
    if schema:
        gen["responseSchema"] = schema
    models = _models(cfg)
    for i, model in enumerate(models):
        resp = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": cfg.gemini_api_key},
            json={"contents": [{"parts": parts}], "generationConfig": gen},
            timeout=60,
        )
        # unknown/retired model for this key -> try the next one
        if resp.status_code in (400, 404) and "model" in resp.text.lower() and i < len(models) - 1:
            print(f"[ai] model {model} unavailable ({resp.status_code}), trying {models[i + 1]}")
            continue
        break
    resp.raise_for_status()
    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    if text.startswith("```"):
        text = text.strip("`").removeprefix("json").strip()
    return json.loads(text)


def analyze_dump(cfg, image_data_url):
    if not cfg.gemini_api_key:
        return _mock_analysis()
    try:
        return normalize_analysis(_gemini(cfg, ANALYZE_PROMPT, [image_data_url], ANALYZE_SCHEMA))
    except Exception as e:
        print("[ai] analyze failed, demo mode:", e)
        return _mock_analysis()


def verify_cleanup(cfg, before, after):
    if not cfg.gemini_api_key:
        return {"is_resolved": True, "confidence": 0.9, "reason": "Demo mode: no AI key configured.", "is_mock": True}
    try:
        r = _gemini(cfg, VERIFY_PROMPT, [before, after], VERIFY_SCHEMA)
        return {"is_resolved": r.get("is_resolved") is True,
                "confidence": _clamp(_num(r.get("confidence")), 0.0, 1.0),
                "reason": str(r.get("reason", "")), "is_mock": False}
    except Exception as e:
        print("[ai] verify failed:", e)
        return {"is_resolved": False, "confidence": 0.0, "reason": f"AI check failed ({e}); needs manual review.", "is_mock": False}


def predict_hotspots(cfg, issues):
    slim = [{k: i.get(k) for k in ("category", "lat", "lng", "created_at", "ward")} for i in issues]
    if cfg.gemini_api_key:
        try:
            result = _gemini(cfg, HOTSPOT_PROMPT + json.dumps(slim))
            if isinstance(result, list) and result:
                return result
        except Exception as e:
            print("[ai] hotspots failed, demo mode:", e)
    return [
        {"zone_polygon": {"type": "Polygon", "coordinates": [[[77.635, 12.972], [77.639, 12.972], [77.639, 12.975], [77.635, 12.975], [77.635, 12.972]]]},
         "predicted_category": "illegal_dumping", "risk_score": 84, "historical_count": 9},
        {"zone_polygon": {"type": "Polygon", "coordinates": [[[77.642, 12.976], [77.646, 12.976], [77.646, 12.979], [77.642, 12.979], [77.642, 12.976]]]},
         "predicted_category": "waste_burning", "risk_score": 78, "historical_count": 6},
    ]


def transcribe(cfg, audio_data_url):
    if cfg.gemini_api_key and not audio_data_url.endswith("mock"):
        try:
            return {"transcription": str(_gemini(cfg, TRANSCRIBE_PROMPT, [audio_data_url]).get("transcription", ""))[:500]}
        except Exception as e:
            print("[ai] transcribe failed:", e)
    return {"transcription": "Garbage has been dumped at this corner for a week. Plastic and food waste are mixed and stray dogs spread it on the road."}


def _mock_analysis():
    return normalize_analysis({
        "is_dump": True, "category": "illegal_dumping", "severity": 4, "est_weight_kg": 40,
        "suggested_title": "Garbage dumped at street corner",
        "description": "A large pile of mixed household garbage and plastic bags is dumped at the roadside. It is spreading onto the footpath and attracting stray animals.",
        "confidence": 0.85,
    }, is_mock=True)
