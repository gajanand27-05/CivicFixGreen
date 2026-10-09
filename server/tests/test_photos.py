import base64

from server import ai, photos
from server.store import Store, open_store

JPEG = "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8fakejpeg").decode()


def make(tmp_path):
    s = Store(tmp_path / "t.db")
    photos.init(s)
    return s


def test_issue_photos_are_moved_out_of_the_document(tmp_path):
    s = make(tmp_path)
    issue = {"id": "i1", "media_urls": [JPEG, "https://example.com/x.jpg"], "before_photo_url": JPEG, "after_photo_url": None}
    out = photos.externalize(dict(issue))
    assert out["media_urls"][0].startswith("/api/photos/") and out["media_urls"][1] == "https://example.com/x.jpg"
    assert out["before_photo_url"].startswith("/api/photos/") and out["after_photo_url"] is None
    assert "base64" not in str(out)


def test_avatar_is_moved_and_loadable(tmp_path):
    s = make(tmp_path)
    out = photos.externalize({"id": "u1", "avatar_url": JPEG})
    mime, data = photos.load(out["avatar_url"].rsplit("/", 1)[1])
    assert mime == "image/jpeg" and data == b"\xff\xd8fakejpeg"


def test_ai_reads_stored_photos(tmp_path):
    make(tmp_path)
    url = photos.save_bytes("image/png", b"png-bytes")
    assert ai.data_url_to_bytes(url) == ("image/png", b"png-bytes")


def test_same_image_is_stored_once(tmp_path):
    s = make(tmp_path)
    a = photos.externalize({"id": "i1", "before_photo_url": JPEG})["before_photo_url"]
    b = photos.externalize({"id": "i2", "before_photo_url": JPEG})["before_photo_url"]
    assert a == b and len(s.get_all("photos")) == 1


def test_open_store_uses_sqlite_path_by_default(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("POSTGRES_URL", raising=False)
    monkeypatch.setenv("ECOSORT_DB_PATH", str(tmp_path / "x.db"))
    s = open_store(tmp_path / "default.db")
    s.put("meta", {"id": "k"})
    assert (tmp_path / "x.db").exists()
