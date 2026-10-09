from datetime import timedelta
from types import SimpleNamespace

from server import jobs
from server.store import Store


def test_maybe_tick_runs_at_most_once_per_poll_interval(tmp_path, monkeypatch):
    s = Store(tmp_path / "t.db")
    runs = []
    monkeypatch.setattr(jobs, "run_once", lambda store, cfg: runs.append(1))
    cfg = SimpleNamespace(poll_seconds=60)
    assert jobs.maybe_tick(s, cfg) is True
    assert jobs.maybe_tick(s, cfg) is False
    assert len(runs) == 1
