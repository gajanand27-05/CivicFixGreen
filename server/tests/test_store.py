from server.store import Store


def test_put_get_roundtrip(tmp_path):
    s = Store(tmp_path / "t.db")
    s.put("issues", {"id": "i1", "title": "Dump"})
    assert s.get("issues", "i1") == {"id": "i1", "title": "Dump"}


def test_get_missing_is_none(tmp_path):
    assert Store(tmp_path / "t.db").get("issues", "nope") is None


def test_put_overwrites_and_get_all(tmp_path):
    s = Store(tmp_path / "t.db")
    s.put("issues", {"id": "i1", "v": 1})
    s.put("issues", {"id": "i1", "v": 2})
    s.put("issues", {"id": "i2", "v": 3})
    assert sorted(d["v"] for d in s.get_all("issues")) == [2, 3]


def test_stores_are_separate_and_clear(tmp_path):
    s = Store(tmp_path / "t.db")
    s.put("issues", {"id": "x"})
    s.put("users", {"id": "x"})
    s.clear("issues")
    assert s.get_all("issues") == []
    assert s.get("users", "x") == {"id": "x"}


def test_delete(tmp_path):
    s = Store(tmp_path / "t.db")
    s.put("issues", {"id": "i1"})
    s.delete("issues", "i1")
    assert s.get("issues", "i1") is None
