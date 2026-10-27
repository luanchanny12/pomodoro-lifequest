import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import StudyGoal, StudySessionLog, RewardItem, RewardRedemption, TimeCapsule

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(RewardRedemption).delete()
    db.query(RewardItem).delete()
    db.query(TimeCapsule).delete()
    db.query(StudySessionLog).delete()
    db.query(StudyGoal).delete()
    db.commit()
    yield
    db.query(RewardRedemption).delete()
    db.query(RewardItem).delete()
    db.query(TimeCapsule).delete()
    db.query(StudySessionLog).delete()
    db.query(StudyGoal).delete()
    db.commit()
    db.close()


def test_rewards_and_pearls_redemption():
    # 1. Initially user has 0 pearls
    res = client.get("/api/focus/rewards")
    assert res.status_code == 200
    data = res.json()
    assert data["balance"]["available_pearls"] == 0.0
    assert len(data["items"]) >= 5  # default seeded rewards exist

    movie_reward = next(r for r in data["items"] if "phim" in r["title"].lower())
    assert movie_reward["pearl_cost"] == 2.0

    # 2. Try to redeem movie pass with 0 pearls -> 400 error
    redeem_fail = client.post("/api/focus/rewards/redeem", json={"reward_id": movie_reward["id"]})
    assert redeem_fail.status_code == 400

    # 3. Log 3.0 hours of study (e.g. 180 minutes) -> earn 3.0 pearls
    client.post("/api/focus/sessions", json={
        "duration_minutes": 180,
        "topic_note": "Nói tiếng Anh chủ đề Du lịch",
    })

    # Check updated balance -> 3.0 pearls
    res_after_study = client.get("/api/focus/rewards").json()
    assert res_after_study["balance"]["available_pearls"] == 3.0

    # 4. Redeem movie pass (costs 2.0 pearls)
    redeem_res = client.post("/api/focus/rewards/redeem", json={
        "reward_id": movie_reward["id"],
        "note": "Xem tập phim Inception cuối tuần",
    })
    assert redeem_res.status_code == 200
    redemption = redeem_res.json()
    assert redemption["reward_title"] == movie_reward["title"]
    assert redemption["pearls_spent"] == 2.0

    # 5. Check remaining pearls -> 1.0 pearl left
    res_after_redeem = client.get("/api/focus/rewards").json()
    assert res_after_redeem["balance"]["available_pearls"] == 1.0
    assert res_after_redeem["balance"]["spent_pearls"] == 2.0


def test_custom_reward_creation():
    create_res = client.post("/api/focus/rewards", json={
        "title": "Mua tai nghe bluetooth mới",
        "pearl_cost": 25.0,
        "icon": "🎧",
        "category": "quà tặng",
        "description": "Tự thưởng đôi tai nghe khi học đủ 25 tiếng!",
    })
    assert create_res.status_code == 201
    reward = create_res.json()
    assert reward["title"] == "Mua tai nghe bluetooth mới"
    assert reward["pearl_cost"] == 25.0
    assert reward["is_custom"] is True


def test_topic_galaxy():
    # Create 2 goals: "Du lịch" and "Công nghệ"
    g1 = client.post("/api/focus/goals", json={"title": "Du lịch thế giới", "target_hours": 10.0, "current_hours": 2.0}).json()
    g2 = client.post("/api/focus/goals", json={"title": "Công nghệ tương lai", "target_hours": 10.0, "current_hours": 1.0}).json()

    # Log session for goal 2
    client.post("/api/focus/sessions", json={"goal_id": g2["id"], "duration_minutes": 30, "topic_note": "Chủ đề Công nghệ"})

    galaxy_res = client.get("/api/focus/galaxy")
    assert galaxy_res.status_code == 200
    galaxy = galaxy_res.json()
    assert galaxy["total_goals"] >= 2
    assert "sun_stats" in galaxy

    p1 = next(p for p in galaxy["planets"] if p["goal_id"] == g1["id"])
    assert p1["real_title"] == "Du lịch thế giới"
    assert p1["current_hours"] == 2.0

    p2 = next(p for p in galaxy["planets"] if p["goal_id"] == g2["id"])
    assert p2["real_title"] == "Công nghệ tương lai"
    assert p2["is_recent"] is True


def test_time_capsule_unlock():
    # Create a time capsule for milestone 1.0 hour
    capsule_res = client.post("/api/focus/time-capsules", json={
        "milestone_hours": 1.0,
        "title": "Gửi tôi ở mốc 1 giờ",
        "message_content": "Bạn đã hoàn thành 1 tiếng đầu tiên!",
    })
    assert capsule_res.status_code == 201
    capsule = capsule_res.json()
    assert capsule["is_unlocked"] is False

    # Log 60 minutes
    client.post("/api/focus/sessions", json={"duration_minutes": 60, "topic_note": "Phiên 1 giờ"})

    # Fetch capsules -> should be unlocked now
    capsules = client.get("/api/focus/time-capsules").json()
    assert capsules[0]["is_unlocked"] is True
    assert capsules[0]["unlocked_at"] is not None
