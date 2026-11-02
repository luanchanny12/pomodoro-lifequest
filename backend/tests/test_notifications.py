import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models_auth import User
from app.routers.auth import hash_password, create_access_token

client = TestClient(app)


@pytest.fixture
def auth_headers():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "test_notifier_user").first()
    if not user:
        pwd_hash, salt = hash_password("NotifPass@123")
        user = User(
            username="test_notifier_user",
            display_name="Notifier User",
            password_hash=pwd_hash,
            salt=salt,
            is_admin=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token(user.id, user.username)
    db.close()
    return {"Authorization": f"Bearer {token}"}


def test_get_and_update_notification_settings(auth_headers):
    # 1. GET settings (guest can read defaults)
    get_res = client.get("/api/notifications/settings")
    assert get_res.status_code == 200
    data = get_res.json()
    assert "web_notifications_enabled" in data
    assert "pomodoro_end_enabled" in data
    assert "inactivity_reminder_minutes" in data
    assert "morning_reminder_time" in data

    # 2. PUT update settings without auth -> 401 Unauthorized
    unauth_res = client.put("/api/notifications/settings", json={
        "telegram_enabled": True,
    })
    assert unauth_res.status_code == 401

    # 3. PUT update settings with auth -> 200 OK
    update_res = client.put(
        "/api/notifications/settings",
        json={
            "inactivity_reminder_minutes": 30,
            "morning_reminder_time": "07:30",
            "evening_reminder_time": "22:00",
            "telegram_enabled": True,
            "app_public_url": "https://pomodoro-test.vercel.app",
        },
        headers=auth_headers,
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["inactivity_reminder_minutes"] == 30
    assert updated["morning_reminder_time"] == "07:30"
    assert updated["evening_reminder_time"] == "22:00"
    assert updated["telegram_enabled"] is True
    assert updated["app_public_url"] == "https://pomodoro-test.vercel.app"


def test_test_windows_notification(auth_headers):
    # Without auth -> 401
    assert client.post("/api/notifications/test-windows").status_code == 401

    # With auth -> 200
    res = client.post("/api/notifications/test-windows", headers=auth_headers)
    assert res.status_code == 200
    assert "success" in res.json()


def test_telegram_trigger_check():
    # Calling force=false is public keep-alive
    res = client.post("/api/notifications/telegram-trigger-check?force=false")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data

    # Calling force=true without secret or admin -> 403 Forbidden
    res_forced = client.post("/api/notifications/telegram-trigger-check?force=true")
    assert res_forced.status_code == 403


def test_test_telegram_validation(auth_headers):
    # Without auth -> 401
    assert client.post("/api/notifications/test-telegram", json={"bot_token": "", "chat_id": ""}).status_code == 401

    # With auth, missing tokens should fail with 400
    res = client.post(
        "/api/notifications/test-telegram",
        json={
            "bot_token": "",
            "chat_id": "",
        },
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_send_windows_notification_event(auth_headers):
    # Without auth -> 401
    assert client.post("/api/notifications/send-windows", json={"title": "T", "message": "M"}).status_code == 401

    # With auth -> 200
    res = client.post(
        "/api/notifications/send-windows",
        json={
            "title": "Test Title",
            "message": "Test Body",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert "success" in res.json()


def test_telegram_smart_task_reminder_settings(auth_headers):
    # Update settings with telegram interval and task reminder flag
    res = client.put(
        "/api/notifications/settings",
        json={
            "telegram_interval_hours": 2,
            "telegram_task_reminder_enabled": True,
            "morning_reminder_time": "08:30",
            "evening_reminder_time": "21:45",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["telegram_interval_hours"] == 2
    assert data["telegram_task_reminder_enabled"] is True
    assert data["morning_reminder_time"] == "08:30"
    assert data["evening_reminder_time"] == "21:45"

    # GET verifies persisted values
    get_res = client.get("/api/notifications/settings", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["telegram_interval_hours"] == 2
    assert get_res.json()["telegram_task_reminder_enabled"] is True


def test_format_telegram_task_message():
    from app.routers.notifications import format_telegram_task_message
    from unittest.mock import MagicMock

    task1 = MagicMock()
    task1.title = "Nộp báo cáo đồ án"
    task1.quadrant = 1
    task1.is_completed = False

    task2 = MagicMock()
    task2.title = "Học 2 tiếng Tiếng Anh"
    task2.quadrant = 2
    task2.is_completed = True

    tasks = [task1, task2]

    # Morning
    msg_morning = format_telegram_task_message(
        display_name="Luân",
        app_url="https://pomodoro-lifequest.vercel.app",
        tasks=tasks,
        today_hours=2.0,
        mode="morning",
        date_str="02/11/2026",
    )
    assert "Khởi Động Ngày Mới" in msg_morning
    assert "Nộp báo cáo đồ án" in msg_morning
    assert "Luân" in msg_morning

    # Evening
    msg_evening = format_telegram_task_message(
        display_name="Luân",
        app_url="https://pomodoro-lifequest.vercel.app",
        tasks=tasks,
        today_hours=2.0,
        mode="evening",
        date_str="02/11/2026",
    )
    assert "Tổng Kết Ngày" in msg_evening
    assert "Học 2 tiếng Tiếng Anh" in msg_evening
    assert "Nộp báo cáo đồ án" in msg_evening
    assert "50%" in msg_evening

    # Interval
    msg_interval = format_telegram_task_message(
        display_name="Luân",
        app_url="https://pomodoro-lifequest.vercel.app",
        tasks=tasks,
        today_hours=2.0,
        mode="interval",
        date_str="02/11/2026",
    )
    assert "Nhắc Nhở Công Việc Đang Chờ" in msg_interval
    assert "Nộp báo cáo đồ án" in msg_interval


def test_test_telegram_summary_endpoint(auth_headers):
    # Without auth -> 401
    assert client.post("/api/notifications/test-telegram-summary", json={"mode": "evening"}).status_code == 401

    # With auth but no telegram configured -> 400
    res = client.post(
        "/api/notifications/test-telegram-summary",
        json={"mode": "evening"},
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert "chưa lưu cấu hình" in res.json()["detail"].lower()
