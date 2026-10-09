# server/photos.py
# Photos are stored as separate documents and referenced by URL (/api/photos/<id>), so issue and user
# records stay small (serverless hosts such as Vercel cap response sizes at ~4.5 MB).
import base64
import hashlib

STORE = "photos"
PREFIX = "/api/photos/"
_store = None


def init(store):
    global _store
    _store = store


def save_bytes(mime, data):
    photo_id = hashlib.sha256(data).hexdigest()[:24]   # same image -> same id, stored once
    if _store.get(STORE, photo_id) is None:
        _store.put(STORE, {"id": photo_id, "mime": mime, "b64": base64.b64encode(data).decode()})
    return PREFIX + photo_id


def load(photo_id):
    doc = _store.get(STORE, photo_id) if _store else None
    if not doc:
        raise KeyError(photo_id)
    return doc["mime"], base64.b64decode(doc["b64"])


def _externalize_url(url):
    if not isinstance(url, str) or not url.startswith("data:image/") or "," not in url:
        return url
    header, b64 = url.split(",", 1)
    return save_bytes(header[5:].split(";")[0], base64.b64decode(b64))


def externalize(doc):
    """Replace embedded data: images in an issue/user document with photo URLs."""
    if _store is None:
        return doc
    for key in ("before_photo_url", "after_photo_url", "avatar_url"):
        if key in doc:
            doc[key] = _externalize_url(doc[key])
    if isinstance(doc.get("media_urls"), list):
        doc["media_urls"] = [_externalize_url(u) for u in doc["media_urls"]]
    return doc
