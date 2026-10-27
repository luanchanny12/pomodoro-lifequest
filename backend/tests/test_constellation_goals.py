import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_goal_centric_galaxy():
    # Create a goal
    goal_res = client.post("/api/focus/goals", json={
        "title": "Chinh phục 1000 giờ Tiếng Anh",
        "target_hours": 1000.0,
        "current_hours": 50.0,
        "color": "#3B82F6",
        "category": "Ngoại ngữ",
    })
    assert goal_res.status_code == 201
    goal = goal_res.json()
    assert "celestial_name" in goal
    assert goal["is_completed"] is False

    # Check galaxy endpoint
    galaxy_res = client.get("/api/focus/galaxy")
    assert galaxy_res.status_code == 200
    galaxy = galaxy_res.json()
    assert galaxy["total_goals"] >= 1

    # Verify planet has celestial name and real title
    planet = next(p for p in galaxy["planets"] if p["goal_id"] == goal["id"])
    assert planet["real_title"] == "Chinh phục 1000 giờ Tiếng Anh"
    assert "Polaris" in planet["name"] or len(planet["name"]) > 0
    assert planet["is_completed"] is False
    assert planet["current_hours"] == 50.0
    assert planet["target_hours"] == 1000.0


def test_constellation_unlock_on_completed_goal():
    # Create a goal that is 100% completed
    goal_res = client.post("/api/focus/goals", json={
        "title": "Đọc xong 10 cuốn sách Triết học",
        "target_hours": 10.0,
        "current_hours": 10.0,
        "color": "#10B981",
        "category": "Đọc sách",
    })
    assert goal_res.status_code == 201
    completed_goal = goal_res.json()
    assert completed_goal["is_completed"] is True

    # Check constellation unlock
    check_res = client.post("/api/focus/constellations/check")
    assert check_res.status_code == 200
    data = check_res.json()
    assert data["total_unlocked"] >= 1
    assert data["total_constellations"] == 6

    # Verify constellation details
    constellations_res = client.get("/api/focus/constellations")
    assert constellations_res.status_code == 200
    constellations = constellations_res.json()
    assert len(constellations) == 6

    tier1 = constellations[0]
    assert tier1["code"] == "triangulum"
    assert tier1["is_unlocked"] is True
    assert "Triết học" in tier1["ai_interpretation"] or "Đọc xong" in tier1["ai_interpretation"]
    assert "Triết học" in tier1["narration_script"] or "Đọc xong" in tier1["narration_script"]
