# server/offices.py
# Office directory, nearest-office lookup and safe recipient routing.
# Coordinates are zone area centres; email_official stays "" until copied from an official BBMP/GBA source.
import json
import math
from pathlib import Path

OFFICES = json.loads((Path(__file__).parent / "bbmp_offices.json").read_text(encoding="utf-8"))


def haversine_km(lat1, lng1, lat2, lng2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(a))


def nearest(lat, lng, offices=None):
    offices = offices or OFFICES
    best = min(offices, key=lambda o: haversine_km(lat, lng, o["lat"], o["lng"]))
    return {**best, "distance_km": round(haversine_km(lat, lng, best["lat"], best["lng"]), 2)}


def recipient(office, cfg):
    """Real official address only when explicitly enabled; otherwise the team's demo inbox ("" if none)."""
    if cfg.send_to_real_bbmp and office.get("email_official"):
        return office["email_official"]
    base = cfg.demo_office_email or getattr(cfg, "gmail_address", "")  # single-account demo: route to the sender inbox
    if not base:
        return ""
    user, domain = base.split("@")
    return f"{user}+bbmp-{office['id']}@{domain}"


def normalize_addr(addr):
    user, _, domain = addr.strip().lower().partition("@")
    return f"{user.split('+')[0]}@{domain}"
