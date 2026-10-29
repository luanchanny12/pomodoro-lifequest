import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_auth_registration_and_login():
    # 0. Test validation errors: short password and invalid username
    short_pwd_res = client.post("/api/auth/register", json={
        "username": "valid_user_99",
        "display_name": "Test User",
        "password": "123",  # < 6 chars
        "racer_avatar": "rocket"
    })
    assert short_pwd_res.status_code in (400, 422)

    invalid_uname_res = client.post("/api/auth/register", json={
        "username": "user with spaces!",
        "display_name": "Test User",
        "password": "valid_password_123",
        "racer_avatar": "rocket"
    })
    assert invalid_uname_res.status_code in (400, 422)

    # 1. Register a new user
    reg_res = client.post("/api/auth/register", json={
        "username": "speed_racer_test",
        "display_name": "Tốc Độ Cao",
        "password": "secret_password_123",
        "racer_avatar": "cyber_car"
    })
    assert reg_res.status_code in [200, 400]
    
    if reg_res.status_code == 200:
        data = reg_res.json()
        assert "access_token" in data
        assert data["user"]["username"] == "speed_racer_test"
        assert data["user"]["racer_avatar"] == "cyber_car"
        assert data["user"]["level"] == 1

    # 2. Login with correct credentials
    login_res = client.post("/api/auth/login", json={
        "username": "speed_racer_test",
        "password": "secret_password_123"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # 3. Login with wrong password
    bad_login = client.post("/api/auth/login", json={
        "username": "speed_racer_test",
        "password": "wrong_password"
    })
    assert bad_login.status_code == 400

    # 4. Check /me endpoint
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "speed_racer_test"

    # 5. Update profile avatar
    update_res = client.put("/api/auth/profile", json={
        "racer_avatar": "lightning"
    }, headers={"Authorization": f"Bearer {token}"})
    assert update_res.status_code == 200
    assert update_res.json()["racer_avatar"] == "lightning"

def test_race_track_and_cheer():
    # 1. Get Race track status
    track_res = client.get("/api/race/track")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert "racers" in track_data
    assert len(track_data["racers"]) >= 1
    first_racer = track_data["racers"][0]
    assert "rank" in first_racer
    assert "track_progress_percent" in first_racer
    assert first_racer["rank"] == 1

    # 2. Cheer a racer
    target_id = first_racer["user_id"]
    cheer_res = client.post("/api/race/cheer", json={
        "target_user_id": target_id,
        "emoji": "🚀",
        "message": "Bứt phá đỉnh cao!"
    })
    assert cheer_res.status_code == 200
    assert cheer_res.json()["success"] is True
