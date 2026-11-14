import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import StudyGoal, DailyMatrixTask
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
    # Clean up stale goals and tasks from previous runs to ensure test isolation
    db.query(StudyGoal).filter(StudyGoal.user_id == user.id).delete()
    db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user.id).delete()
    db.commit()
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


def test_telegram_deadline_nudge_and_vn_timezone():
    from unittest.mock import MagicMock

    ref_vn = datetime.date(2026, 11, 11)
    d_overdue = MagicMock(title="Nộp đề cương", target_date=datetime.date(2026, 11, 9), source="goal")
    d_today = MagicMock(title="Thi Giữa Kỳ", target_date=datetime.date(2026, 11, 11), source="matrix")
    d_tomorrow = MagicMock(title="Thuyết trình", target_date=datetime.date(2026, 11, 12), source="goal")

    msg_nudge = format_telegram_task_message(
        display_name="Luân",
        app_url="https://pomodoro-lifequest.vercel.app",
        tasks=[],
        today_hours=0.0,
        mode="deadline_nudge",
        date_str="11/11/2026",
        include_task_details=True,
        deadlines=[d_overdue, d_today, d_tomorrow],
        today_vn=ref_vn,
    )
    assert "Nhắc Nhở Quên Deadline" in msg_nudge
    assert "Quá hạn 2d" in msg_nudge
    assert "Hôm nay" in msg_nudge
    assert "Ngày mai - 12/11" in msg_nudge
    assert "Nộp đề cương" in msg_nudge
    assert "Thi Giữa Kỳ [Việc]" in msg_nudge

    # Interval with 0 matrix tasks but urgent deadline should not say "0 công việc"
    msg_interval_deadline_only = format_telegram_task_message(
        display_name="Luân",
        app_url="https://pomodoro-lifequest.vercel.app",
        tasks=[],
        today_hours=0.0,
        mode="interval",
        date_str="11/11/2026",
        include_task_details=True,
        deadlines=[d_today],
        today_vn=ref_vn,
    )
    assert "0 công việc" not in msg_interval_deadline_only
    assert "Deadline gấp" in msg_interval_deadline_only
    assert "DEADLINE GẤP CẦN XỬ LÝ" in msg_interval_deadline_only


def test_is_deadline_nudge_due_and_interval_with_urgent_deadlines():
    from types import SimpleNamespace
    from app.routers.notifications import _is_deadline_nudge_due, _is_interval_due

    vn_tz = datetime.timezone(datetime.timedelta(hours=7))
    at_15_10 = datetime.datetime(2026, 11, 11, 15, 10, tzinfo=vn_tz)
    at_12_00 = datetime.datetime(2026, 11, 11, 12, 0, tzinfo=vn_tz)

    setting = SimpleNamespace(
        telegram_deadline_reminder_enabled=True,
        last_deadline_nudge_date=None,
        telegram_interval_hours=2,
        morning_reminder_time="08:00",
        last_interval_sent_at=None,
    )

    assert _is_deadline_nudge_due(at_15_10, setting, True, "2026-11-11") is True
    assert _is_deadline_nudge_due(at_15_10, setting, False, "2026-11-11") is False
    assert _is_deadline_nudge_due(at_12_00, setting, True, "2026-11-11") is False

    # Deduplicated once sent today
    setting.last_deadline_nudge_date = "2026-11-11"
    assert _is_deadline_nudge_due(at_15_10, setting, True, "2026-11-11") is False

    # Respects disabled setting
    setting.last_deadline_nudge_date = None
    setting.telegram_deadline_reminder_enabled = False
    assert _is_deadline_nudge_due(at_15_10, setting, True, "2026-11-11") is False

    # Interval due when matrix tasks=0 but urgent deadline exists
    assert _is_interval_due(at_12_00, setting, uncompleted_count=0, urgent_deadlines_count=1) is True
    assert _is_interval_due(at_12_00, setting, uncompleted_count=0, urgent_deadlines_count=0) is False


def test_send_deadline_reminder_endpoint_and_settings(auth_headers, monkeypatch):
    from unittest.mock import MagicMock
    from app.routers import notifications as notif_module

    # Unauthenticated -> 401
    assert client.post("/api/notifications/send-deadline-reminder").status_code == 401

    # Save settings with unique chat_id + toggle telegram_deadline_reminder_enabled
    put_res = client.put(
        "/api/notifications/settings",
        json={
            "telegram_bot_token": "123456:TEST_DEADLINE_BOT",
            "telegram_chat_id": "9988776655",
            "telegram_enabled": True,
            "telegram_deadline_reminder_enabled": True,
        },
        headers=auth_headers,
    )
    assert put_res.status_code == 200
    assert put_res.json()["telegram_deadline_reminder_enabled"] is True

    # Ensure active matrix task exists for VN today
    vn_tz = datetime.timezone(datetime.timedelta(hours=7))
    vn_today_date = datetime.datetime.now(vn_tz).date()
    client.post(
        "/api/focus/matrix",
        json={
            "title": "Ôn tập Chương 4 Matrix",
            "date": vn_today_date.isoformat(),
            "quadrant": 1,
        },
        headers=auth_headers,
    )

    mock_send = MagicMock(return_value={"ok": True, "result": {"message_id": 42}})
    monkeypatch.setattr(notif_module, "send_telegram_msg", mock_send)

    # Trigger immediate deadline reminder endpoint
    send_res = client.post("/api/notifications/send-deadline-reminder", headers=auth_headers)
    assert send_res.status_code == 200
    body = send_res.json()
    assert body["ok"] is True
    assert body["count"] >= 1
    assert mock_send.called
    sent_text = mock_send.call_args[0][2]
    assert "Nhắc Nhở Quên Deadline" in sent_text
    assert "Ôn tập Chương 4 Matrix" in sent_text

    # Test summary endpoint also includes deadlines
    mock_send.reset_mock()
    summary_res = client.post(
        "/api/notifications/test-telegram-summary",
        json={"mode": "evening"},
        headers=auth_headers,
    )
    assert summary_res.status_code == 200
    assert "HẠN CHÓT SẮP ĐẾN" in mock_send.call_args[0][2]

    # Toggle off & verify persistence
    off_res = client.put(
        "/api/notifications/settings",
        json={"telegram_deadline_reminder_enabled": False},
        headers=auth_headers,
    )
    assert off_res.status_code == 200
    assert off_res.json()["telegram_deadline_reminder_enabled"] is False
    get_res = client.get("/api/notifications/settings", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["telegram_deadline_reminder_enabled"] is False
