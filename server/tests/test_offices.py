from types import SimpleNamespace

from server import offices

OFF = [
    {"id": "a", "name": "A", "zone": "A", "lat": 12.97, "lng": 77.64, "email_official": "a@gov.in", "officer_user_id": "o1"},
    {"id": "b", "name": "B", "zone": "B", "lat": 13.10, "lng": 77.59, "email_official": "", "officer_user_id": "o2"},
]


def test_haversine_known_distance():
    assert abs(offices.haversine_km(12.97, 77.64, 12.98, 77.64) - 1.11) < 0.02


def test_nearest_picks_closest_and_reports_distance():
    o = offices.nearest(12.975, 77.641, OFF)
    assert o["id"] == "a" and o["distance_km"] < 1


def test_recipient_demo_mode_plus_addresses():
    cfg = SimpleNamespace(send_to_real_bbmp=False, demo_office_email="team.officer@gmail.com")
    assert offices.recipient(OFF[0], cfg) == "team.officer+bbmp-a@gmail.com"


def test_recipient_real_mode_uses_official_only_if_present():
    cfg = SimpleNamespace(send_to_real_bbmp=True, demo_office_email="team.officer@gmail.com")
    assert offices.recipient(OFF[0], cfg) == "a@gov.in"
    assert offices.recipient(OFF[1], cfg) == "team.officer+bbmp-b@gmail.com"


def test_recipient_empty_when_nothing_configured():
    cfg = SimpleNamespace(send_to_real_bbmp=False, demo_office_email="")
    assert offices.recipient(OFF[0], cfg) == ""


def test_normalize_addr_strips_plus_tag_and_case():
    assert offices.normalize_addr("Team.Officer+bbmp-a@Gmail.com") == "team.officer@gmail.com"
