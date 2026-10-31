import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import StudyGoal, StudySessionLog

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(StudySessionLog).filter(StudySessionLog.user_id.is_(None)).delete(synchronize_session=False)
    db.query(StudyGoal).filter(StudyGoal.user_id.is_(None)).update({"parent_id": None}, synchronize_session=False)
    db.query(StudyGoal).filter(StudyGoal.user_id.is_(None)).delete(synchronize_session=False)
    db.commit()
    yield
    db.query(StudySessionLog).filter(StudySessionLog.user_id.is_(None)).delete(synchronize_session=False)
    db.query(StudyGoal).filter(StudyGoal.user_id.is_(None)).update({"parent_id": None}, synchronize_session=False)
    db.query(StudyGoal).filter(StudyGoal.user_id.is_(None)).delete(synchronize_session=False)
    db.commit()
    db.close()


def test_create_and_log_manual_session():
    # 1. Create a 1000-hour English goal
    create_goal_res = client.post("/api/focus/goals", json={
        "title": "1000 Giờ Học Tiếng Anh",
        "target_hours": 1000.0,
        "color": "#E24A4A",
        "category": "Tiếng Anh",
        "notes": "Mục tiêu 1000 giờ"
    })
    assert create_goal_res.status_code == 201
    goal = create_goal_res.json()
    assert goal["title"] == "1000 Giờ Học Tiếng Anh"
    assert goal["target_hours"] == 1000.0
    assert goal["current_hours"] == 0.0
    assert goal["is_completed"] is False
    goal_id = goal["id"]

    # 2. Add manual session: 30 minutes speaking English
    session_res = client.post("/api/focus/sessions", json={
        "goal_id": goal_id,
        "duration_minutes": 30,
        "session_date": "2026-10-26",
        "topic_note": "Nói tiếng Anh 30 phút chủ đề Du lịch",
        "source": "manual"
    })
    assert session_res.status_code == 201
    session_data = session_res.json()
    assert session_data["duration_minutes"] == 30
    assert session_data["duration_hours"] == 0.5
    assert session_data["topic_note"] == "Nói tiếng Anh 30 phút chủ đề Du lịch"
    assert session_data["source"] == "manual"
    assert session_data["goal_title"] == "1000 Giờ Học Tiếng Anh"

    # 3. Verify goal was updated with 0.5 hours
    goals_res = client.get("/api/focus/goals")
    assert goals_res.status_code == 200
    goals = goals_res.json()
    assert len(goals) == 1
    assert goals[0]["current_hours"] == 0.5
    assert goals[0]["is_completed"] is False


def test_goal_reaches_target_marks_done():
    # 1. Create a 1.0 hour test goal
    create_goal_res = client.post("/api/focus/goals", json={
        "title": "Mục tiêu test 1 giờ",
        "target_hours": 1.0,
        "color": "#38858A"
    })
    goal_id = create_goal_res.json()["id"]

    # 2. Log 60 minutes
    client.post("/api/focus/sessions", json={
        "goal_id": goal_id,
        "duration_minutes": 60,
        "topic_note": "Đạt 1 giờ",
        "source": "pomodoro"
    })

    # 3. Verify is_completed is True
    goals = client.get("/api/focus/goals").json()
    assert goals[0]["is_completed"] is True
    assert goals[0]["current_hours"] == 1.0


def test_delete_session_reverts_goal_hours():
    # Create goal with 2.0 hours target
    g = client.post("/api/focus/goals", json={"title": "Test Revert", "target_hours": 2.0}).json()
    s = client.post("/api/focus/sessions", json={"goal_id": g["id"], "duration_minutes": 60}).json()

    # Verify goal is 1.0 hr
    assert client.get("/api/focus/goals").json()[0]["current_hours"] == 1.0

    # Delete session
    del_res = client.delete(f"/api/focus/sessions/{s['id']}")
    assert del_res.status_code == 200

    # Verify goal is reverted back to 0.0 hr
    assert client.get("/api/focus/goals").json()[0]["current_hours"] == 0.0
