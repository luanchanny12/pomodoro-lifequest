"""
Tests cho API endpoints
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert "LIFE QUEST" in r.text


def test_goals():
    r = client.get("/api/goals")
    assert r.status_code == 200


def test_player():
    r = client.get("/api/player")
    assert r.status_code == 200
    data = r.json()
    assert "level" in data


def test_ai_planner():
    r = client.post("/api/ai/planner", json={})
    assert r.status_code == 200
    data = r.json()
    assert "summary" in data
    assert "blocks" in data


def test_ai_life_score():
    r = client.get("/api/ai/life-score")
    assert r.status_code == 200
    assert "score" in r.json()


def test_ai_predictions():
    r = client.get("/api/ai/predictions")
    assert r.status_code == 200


def test_ai_review():
    r = client.get("/api/ai/review/daily")
    assert r.status_code == 200


def test_ai_chat():
    r = client.post("/api/ai/chat", json={"message": "Hôm nay tôi mệt", "session_id": "test-1"})
    assert r.status_code == 200
    data = r.json()
    assert "reply" in data
    assert "session_id" in data
