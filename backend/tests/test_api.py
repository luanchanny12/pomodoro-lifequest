"""
Tests cho API endpoints cốt lõi đang hoạt động
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert "LIFE QUEST" in r.text


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_focus_goals():
    r = client.get("/api/focus/goals")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_focus_matrix():
    r = client.get("/api/focus/matrix")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_focus_galaxy():
    r = client.get("/api/focus/galaxy")
    assert r.status_code == 200
    data = r.json()
    assert "planets" in data


def test_focus_oracle():
    r = client.get("/api/focus/oracle")
    assert r.status_code == 200
    data = r.json()
    assert "projected_finish_date" in data or "target_hours" in data


def test_notifications_settings():
    r = client.get("/api/notifications/settings")
    assert r.status_code == 200
    data = r.json()
    assert "web_notifications_enabled" in data


def test_race_track():
    r = client.get("/api/race/track")
    assert r.status_code == 200
    data = r.json()
    assert "racers" in data
