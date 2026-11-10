import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models_auth import User
from app.routers.auth import hash_password, create_access_token
from app.routers.notifications import format_telegram_task_message

client = TestClient(app)

@pytest.fixture
def auth_headers():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "test_deadline_user").first()
    if not user:
        pwd_hash, salt = hash_password("DeadlinePass@123")
        user = User(
            username="test_deadline_user",
            display_name="Deadline User",
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

def test_get_deadlines_endpoint(auth_headers):
    # 1. Create a goal with target_date today
    today = datetime.date.today()
    tomorrow = today + datetime.timedelta(days=1)
    overdue_date = today - datetime.timedelta(days=2)

    # Goal 1: Today
    res1 = client.post(
        "/api/focus/goals",
        json={
            "title": "Nộp bài tập lớn AI",
            "goal_type": "deadline",
            "target_hours": 10.0,
            "target_date": today.isoformat(),
        },
        headers=auth_headers,
    )
    assert res1.status_code == 201

    # Goal 2: Overdue
    res2 = client.post(
        "/api/focus/goals",
        json={
            "title": "Báo cáo tiến độ đề tài",
            "goal_type": "deadline",
            "target_hours": 5.0,
            "target_date": overdue_date.isoformat(),
        },
        headers=auth_headers,
    )
    assert res2.status_code == 201

    # Goal 3: Tomorrow
    res3 = client.post(
        "/api/focus/goals",
        json={
            "title": "Thi thử chứng chỉ",
            "goal_type": "deadline",
            "target_hours": 8.0,
            "target_date": tomorrow.isoformat(),
        },
        headers=auth_headers,
    )
    assert res3.status_code == 201

    # Query deadlines endpoint
    res_deadlines = client.get("/api/focus/deadlines", headers=auth_headers)
    assert res_deadlines.status_code == 200
    data = res_deadlines.json()
    assert "items" in data
    assert "summary" in data

    summary = data["summary"]
    assert summary["overdue"] >= 1
    assert summary["today"] >= 1
    assert summary["total_active"] >= 3

    # Check order: overdue first, then today, then future
    items = data["items"]
    assert len(items) >= 3
    assert items[0]["days_left"] <= items[1]["days_left"]


def test_telegram_deadline_message_formatting():
    from unittest.mock import MagicMock

    goal1 = MagicMock()
    goal1.title = "Kỳ thi Cuối Kỳ Giải Tích"
    goal1.target_date = datetime.date.today()
    goal1.current_hours = 15.0
    goal1.target_hours = 20.0

    goal2 = MagicMock()
    goal2.title = "Nộp đồ án tốt nghiệp"
    goal2.target_date = datetime.date.today() - datetime.timedelta(days=1)
    goal2.current_hours = 25.0
    goal2.target_hours = 30.0

    deadlines = [goal1, goal2]

    # Test morning message with deadlines
    msg_morning = format_telegram_task_message(
        display_name="Luân",
        app_url="https://pomodoro-lifequest.vercel.app",
        tasks=[],
        today_hours=0.0,
        mode="morning",
        date_str="11/11/2026",
        include_task_details=True,
        deadlines=deadlines,
    )
    assert "DEADLINE CẦN CHÚ Ý" in msg_morning
    assert "Kỳ thi Cuối Kỳ Giải Tích" in msg_morning

    # Test evening message with deadlines
    msg_evening = format_telegram_task_message(
        display_name="Luân",
        app_url="https://pomodoro-lifequest.vercel.app",
        tasks=[],
        today_hours=3.5,
        mode="evening",
        date_str="11/11/2026",
        include_task_details=True,
        deadlines=deadlines,
    )
    assert "HẠN CHÓT SẮP ĐẾN" in msg_evening
    assert "Kỳ thi Cuối Kỳ Giải Tích" in msg_evening

    # Test interval message with urgent deadlines
    msg_interval = format_telegram_task_message(
        display_name="Luân",
        app_url="https://pomodoro-lifequest.vercel.app",
        tasks=[],
        today_hours=2.0,
        mode="interval",
        date_str="11/11/2026",
        include_task_details=True,
        deadlines=deadlines,
    )
    assert "DEADLINE GẤP CẦN XỬ LÝ" in msg_interval
    assert "Kỳ thi Cuối Kỳ Giải Tích" in msg_interval
