import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db, SessionLocal
from app.models_auth import User
from app.models import Player, StudyGoal, StudySessionLog, DailyMatrixTask, Achievement
from app.routers.auth import hash_password, create_access_token


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(db_session: Session):
    username = f"streak_user_{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    pwd_hash, salt = hash_password("Pass@123456")
    user = User(
        username=username,
        display_name="Streak Master",
        password_hash=pwd_hash,
        salt=salt,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    player = Player(user_id=user.id, level=1, exp=0, coins=0, streak=0)
    db_session.add(player)
    db_session.commit()
    db_session.refresh(player)

    return user


@pytest.fixture
def auth_headers(test_user: User):
    token = create_access_token(user_id=test_user.id, username=test_user.username, salt=test_user.salt)
    return {"Authorization": f"Bearer {token}"}


def test_parent_goal_rollup_on_create_update_delete_session(auth_headers, test_user, db_session: Session):
    client = TestClient(app)

    # 1. Tạo mục tiêu lớn (Parent Goal) 100 giờ
    res_parent = client.post(
        "/api/focus/goals",
        headers=auth_headers,
        json={"title": "Mục Tiêu Lớn Năm 2026", "target_hours": 100.0, "current_hours": 0.0},
    )
    assert res_parent.status_code == 201
    parent_id = res_parent.json()["id"]

    # 2. Tạo mục tiêu con (Sub-Goal) 20 giờ gắn với Parent Goal
    res_sub = client.post(
        "/api/focus/goals",
        headers=auth_headers,
        json={"title": "Học Tiếng Anh IELTS", "target_hours": 20.0, "current_hours": 0.0, "parent_id": parent_id},
    )
    assert res_sub.status_code == 201
    sub_id = res_sub.json()["id"]

    # 3. Tạo phiên học 120 phút (2.0 giờ) cho mục tiêu con
    res_session = client.post(
        "/api/focus/sessions",
        headers=auth_headers,
        json={"goal_id": sub_id, "duration_minutes": 120, "topic_note": "Listening & Speaking"},
    )
    assert res_session.status_code == 201
    session_id = res_session.json()["id"]
    assert res_session.json()["duration_hours"] == 2.0

    # Kiểm tra: Cả mục tiêu con và mục tiêu lớn đều nhận được 2.0 giờ!
    parent_goal = db_session.query(StudyGoal).filter(StudyGoal.id == parent_id).first()
    sub_goal = db_session.query(StudyGoal).filter(StudyGoal.id == sub_id).first()
    assert sub_goal.current_hours == 2.0
    assert parent_goal.current_hours == 2.0

    # 4. Cập nhật phiên học tăng lên 180 phút (3.0 giờ)
    res_update = client.put(
        f"/api/focus/sessions/{session_id}",
        headers=auth_headers,
        json={"duration_minutes": 180},
    )
    assert res_update.status_code == 200
    db_session.refresh(parent_goal)
    db_session.refresh(sub_goal)
    assert sub_goal.current_hours == 3.0
    assert parent_goal.current_hours == 3.0

    # 5. Xóa phiên học: Cả 2 mục tiêu phải được khấu trừ về 0.0 giờ
    res_delete = client.delete(
        f"/api/focus/sessions/{session_id}",
        headers=auth_headers,
    )
    assert res_delete.status_code == 200
    db_session.refresh(parent_goal)
    db_session.refresh(sub_goal)
    assert sub_goal.current_hours == 0.0
    assert parent_goal.current_hours == 0.0


def test_streak_calculation_and_daily_rewards(auth_headers, test_user, db_session: Session):
    client = TestClient(app)

    # Ban đầu streak = 0
    player = db_session.query(Player).filter(Player.user_id == test_user.id).first()
    assert player.streak == 0
    initial_exp = player.exp

    # 1. Học 1 phiên Pomodoro hôm nay
    today_str = datetime.date.today().isoformat()
    res = client.post(
        "/api/focus/sessions",
        headers=auth_headers,
        json={"duration_minutes": 25, "topic_note": "Pomodoro Focus 1", "session_date": today_str},
    )
    assert res.status_code == 201

    db_session.refresh(player)
    assert player.streak == 1
    assert player.last_streak_date == datetime.date.today()
    assert player.exp == initial_exp + 50  # Thưởng 50 EXP

    # 2. Học thêm 1 phiên nữa trong cùng ngày -> streak không tăng lặp
    res2 = client.post(
        "/api/focus/sessions",
        headers=auth_headers,
        json={"duration_minutes": 25, "topic_note": "Pomodoro Focus 2", "session_date": today_str},
    )
    assert res2.status_code == 201
    db_session.refresh(player)
    assert player.streak == 1  # Vẫn là 1

    # 3. Giả lập hôm qua đã học (streak = 6), hôm nay học tiếp -> đạt mốc 7 ngày!
    yesterday = datetime.date.today() - datetime.timedelta(days=1)
    player.last_streak_date = yesterday
    player.streak = 6
    player.exp = 300
    db_session.commit()

    # Hoàn thành 1 task ma trận hôm nay -> streak phải lên 7
    res_task = client.post(
        "/api/focus/matrix",
        headers=auth_headers,
        json={"title": "Ôn từ vựng 15 phút", "quadrant": 2, "date": today_str},
    )
    assert res_task.status_code == 201
    task_id = res_task.json()["id"]

    res_toggle = client.patch(
        f"/api/focus/matrix/{task_id}/toggle",
        headers=auth_headers,
    )
    assert res_toggle.status_code == 200
    assert res_toggle.json()["is_completed"] is True

    db_session.refresh(player)
    assert player.streak == 7
    assert player.last_streak_date == datetime.date.today()
    # Thưởng 50 EXP + 300 EXP thưởng mốc 7 ngày = 300 + 350 = 650
    assert player.exp == 650

    # Kiểm tra huy hiệu STREAK_7 được tự động khai mở
    ach = db_session.query(Achievement).filter(Achievement.player_id == player.id, Achievement.code == "STREAK_7").first()
    assert ach is not None
    assert ach.name == "Kiên Trì"


def test_auto_reconciliation_for_legacy_parent_goals(auth_headers, test_user, db_session: Session):
    client = TestClient(app)

    # Tạo Parent Goal với current_hours = 0.0 (giả lập dữ liệu cũ)
    parent = StudyGoal(
        user_id=test_user.id,
        title="Mục Tiêu Lớn Dữ Liệu Cũ",
        target_hours=50.0,
        current_hours=0.0,
        is_completed=False,
    )
    db_session.add(parent)
    db_session.commit()
    db_session.refresh(parent)

    # Tạo Sub-goal với current_hours = 15.0 đã có từ trước
    sub = StudyGoal(
        user_id=test_user.id,
        title="Mục Tiêu Con Đã Học 15h",
        target_hours=20.0,
        current_hours=15.0,
        parent_id=parent.id,
    )
    db_session.add(sub)
    db_session.commit()

    # Gọi get_goals: Hệ thống phải tự động đối soát và rollup 15h vào parent!
    res_goals = client.get("/api/focus/goals", headers=auth_headers)
    assert res_goals.status_code == 200
    data = res_goals.json()

    parent_in_res = next((g for g in data if g["id"] == parent.id), None)
    assert parent_in_res is not None
    assert parent_in_res["current_hours"] == 15.0
