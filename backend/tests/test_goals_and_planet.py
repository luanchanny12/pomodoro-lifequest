import pytest
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import StudyGoal, StudySessionLog, NotificationSetting
from app.models_auth import User

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(StudySessionLog).delete()
    db.query(StudyGoal).delete()
    db.commit()
    yield
    db.query(StudySessionLog).delete()
    db.query(StudyGoal).delete()
    db.commit()
    db.close()


def test_deadline_goal_and_sub_goals():
    # 1. Create a parent goal with deadline (30 days from now)
    future_date = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
    parent_res = client.post("/api/focus/goals", json={
        "title": "Chinh Phục IELTS 8.0",
        "goal_type": "deadline",
        "target_hours": 120.0,
        "current_hours": 0.0,
        "target_date": future_date,
        "planet_type": "earth",
        "color": "#4D96FF",
        "category": "Ngoại ngữ",
    })
    assert parent_res.status_code == 201
    parent = parent_res.json()
    assert parent["title"] == "Chinh Phục IELTS 8.0"
    assert parent["goal_type"] == "deadline"
    assert parent["days_left"] is not None
    assert parent["days_left"] >= 29
    assert parent["hours_per_day_needed"] is not None
    assert parent["hours_per_day_needed"] > 0
    parent_id = parent["id"]

    # 2. Create a sub-goal inside the parent goal
    sub_res = client.post("/api/focus/goals", json={
        "title": "Luyện Đề Reading & Listening",
        "goal_type": "hours",
        "target_hours": 30.0,
        "current_hours": 5.0,
        "parent_id": parent_id,
        "planet_type": "moon",
        "color": "#9D4EDD",
        "category": "IELTS",
    })
    assert sub_res.status_code == 201
    sub = sub_res.json()
    assert sub["parent_id"] == parent_id
    assert sub["parent_title"] == "Chinh Phục IELTS 8.0"

    # Verify parent now reports sub_goals_count = 1
    get_parent_res = client.get("/api/focus/goals")
    assert get_parent_res.status_code == 200
    all_goals = get_parent_res.json()
    p_goal = next(g for g in all_goals if g["id"] == parent_id)
    assert p_goal["sub_goals_count"] == 1


def test_planet_builder_update():
    # 1. Create an Earth goal
    goal_res = client.post("/api/focus/goals", json={
        "title": "1000 Giờ Học Tiếng Anh",
        "target_hours": 1000.0,
        "planet_type": "earth",
        "color": "#10B981",
    })
    assert goal_res.status_code == 201
    goal_id = goal_res.json()["id"]

    # 2. Update planet layout with items (forest, city, wonder)
    layout = [
        {"id": 0, "itemId": "forest"},
        {"id": 1, "itemId": "village"},
        {"id": 2, "itemId": "city"},
    ]
    import json
    update_res = client.put(f"/api/focus/goals/{goal_id}/planet-build", json={
        "planet_data": json.dumps(layout)
    })
    assert update_res.status_code == 200
    updated_goal = update_res.json()
    assert updated_goal["planet_data"] == json.dumps(layout)


def test_time_warp_oracle():
    # Create goal and log 2 hours
    goal_res = client.post("/api/focus/goals", json={
        "title": "Khoa Học Dữ Liệu",
        "target_hours": 50.0,
        "current_hours": 0.0,
        "color": "#F59E0B",
    })
    goal_id = goal_res.json()["id"]

    today_str = datetime.date.today().isoformat()
    client.post("/api/focus/sessions", json={
        "goal_id": goal_id,
        "duration_minutes": 120,
        "session_date": today_str,
        "topic_note": "Pandas & NumPy",
        "source": "manual",
    })

    # Call oracle with goal_id
    oracle_res = client.get(f"/api/focus/oracle?goal_id={goal_id}")
    assert oracle_res.status_code == 200
    oracle = oracle_res.json()
    assert "projected_finish_date" in oracle
    assert "scenarios" in oracle
    assert len(oracle["scenarios"]) == 3
    assert oracle["average_daily_hours"] is not None


def test_telegram_chat_id_single_user_constraint():
    db = SessionLocal()
    # Create 2 users
    db.query(NotificationSetting).delete()
    db.query(User).filter(User.username.in_(["user_tele_1", "user_tele_2"])).delete()
    db.commit()

    u1 = User(username="user_tele_1", display_name="User 1", password_hash="hash1", salt="salt1")
    u2 = User(username="user_tele_2", display_name="User 2", password_hash="hash2", salt="salt2")
    db.add_all([u1, u2])
    db.commit()
    db.refresh(u1)
    db.refresh(u2)

    # Set chat_id for u1
    set1 = NotificationSetting(user_id=u1.id, telegram_chat_id="99887766")
    db.add(set1)
    db.commit()

    # Authenticate as u2 and try to use the same chat_id "99887766"
    from app.routers.auth import create_access_token
    token_u2 = create_access_token(user_id=u2.id, username=u2.username)

    res = client.put(
        "/api/notifications/settings",
        json={"telegram_chat_id": "99887766", "telegram_enabled": True},
        headers={"Authorization": f"Bearer {token_u2}"}
    )
    assert res.status_code == 400
    assert "Telegram Chat ID này đã được liên kết" in res.json()["detail"]
    db.close()
