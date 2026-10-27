import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_and_update_notification_settings():
    # 1. GET settings
    get_res = client.get("/api/notifications/settings")
    assert get_res.status_code == 200
    data = get_res.json()
    assert "web_notifications_enabled" in data
    assert "pomodoro_end_enabled" in data
    assert "inactivity_reminder_minutes" in data
    assert "morning_reminder_time" in data

    # 2. PUT update settings
    update_res = client.put("/api/notifications/settings", json={
        "inactivity_reminder_minutes": 30,
        "morning_reminder_time": "07:30",
        "evening_reminder_time": "22:00",
        "telegram_enabled": True,
        "app_public_url": "https://pomodoro-test.vercel.app",
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["inactivity_reminder_minutes"] == 30
    assert updated["morning_reminder_time"] == "07:30"
    assert updated["evening_reminder_time"] == "22:00"
    assert updated["telegram_enabled"] is True
    assert updated["app_public_url"] == "https://pomodoro-test.vercel.app"

def test_test_windows_notification():
    res = client.post("/api/notifications/test-windows")
    assert res.status_code == 200
    assert "success" in res.json()

def test_telegram_trigger_check():
    res = client.post("/api/notifications/telegram-trigger-check?force=false")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data

def test_test_telegram_validation():
    # Missing tokens should fail with 400
    res = client.post("/api/notifications/test-telegram", json={
        "bot_token": "",
        "chat_id": "",
    })
    assert res.status_code == 400
