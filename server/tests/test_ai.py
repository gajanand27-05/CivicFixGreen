from server.ai import data_url_to_bytes, normalize_analysis


def test_defaults_for_empty():
    a = normalize_analysis(None)
    assert a["is_dump"] is False and a["category"] == "other"
    assert a["severity"] == 1 and a["confidence"] == 0 and a["est_weight_kg"] == 0
    assert a["is_mock"] is False


def test_clamps_and_unknown_category():
    a = normalize_analysis({"category": "pothole", "severity": 9, "confidence": 3, "est_weight_kg": -5})
    assert a["category"] == "other" and a["severity"] == 5
    assert a["confidence"] == 1 and a["est_weight_kg"] == 0


def test_is_dump_only_literal_true():
    assert normalize_analysis({"is_dump": "yes"})["is_dump"] is False
    assert normalize_analysis({"is_dump": True})["is_dump"] is True


def test_title_defaults_to_label():
    assert normalize_analysis({"category": "waste_burning"})["suggested_title"] == "Open Waste Burning"


def test_data_url_to_bytes():
    mime, data = data_url_to_bytes("data:image/png;base64,aGVsbG8=")
    assert mime == "image/png" and data == b"hello"


def test_falls_back_to_next_model(monkeypatch):
    from types import SimpleNamespace
    from server import ai

    calls = []

    class Resp:
        def __init__(self, code, text):
            self.status_code, self.text = code, text

        def raise_for_status(self):
            if self.status_code >= 400:
                raise RuntimeError(self.status_code)

        def json(self):
            return {"candidates": [{"content": {"parts": [{"text": '{"ok": true}'}]}}]}

    def fake_post(url, **kw):
        calls.append(url)
        return Resp(404, "models/new-model is not found") if "new-model" in url else Resp(200, "")

    monkeypatch.setattr(ai.requests, "post", fake_post)
    cfg = SimpleNamespace(gemini_model="new-model, old-model", gemini_api_key="k")
    assert ai._gemini(cfg, "hi") == {"ok": True}
    assert "new-model" in calls[0] and "old-model" in calls[1]
