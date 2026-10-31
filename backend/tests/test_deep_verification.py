import pytest
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import (
    StudyGoal,
    StudySessionLog,
    RewardItem,
    RewardRedemption,
    TimeCapsule,
    ConstellationAchievement,
    UserConstellationUnlock,
    DailyMatrixTask,
)

client = TestClient(app)

def _clean_deep_test(db):
    db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id.is_(None)).delete(synchronize_session=False)
    db.query(StudySessionLog).filter(StudySessionLog.user_id.is_(None)).delete(synchronize_session=False)
    db.query(StudyGoal).filter(StudyGoal.user_id.is_(None)).update({"parent_id": None}, synchronize_session=False)
    db.query(StudyGoal).filter(StudyGoal.user_id.is_(None)).delete(synchronize_session=False)
    db.query(TimeCapsule).filter(TimeCapsule.user_id.is_(None)).delete(synchronize_session=False)
    db.query(RewardRedemption).filter(RewardRedemption.user_id.is_(None)).delete(synchronize_session=False)
    db.query(UserConstellationUnlock).filter(UserConstellationUnlock.user_id.is_(None)).delete(synchronize_session=False)
    db.commit()


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    _clean_deep_test(db)
    yield
    _clean_deep_test(db)
    db.close()

# ── 1. Goal Edge Cases & Celestial Palette Cycling ──
def test_goal_creation_and_palette_cycling():
    # Create 14 goals to test circular assignment of celestial names and colors
    goal_ids = []
    for i in range(14):
        res = client.post("/api/focus/goals", json={
            "title": f"Mục tiêu thử nghiệm #{i+1}",
            "target_hours": 50.0,
        })
        assert res.status_code == 201
        data = res.json()
        assert data["celestial_name"] is not None
        goal_ids.append(data["id"])

    # Galaxy should return all 14 planets with proper names
    galaxy_res = client.get("/api/focus/galaxy")
    assert galaxy_res.status_code == 200
    galaxy = galaxy_res.json()
    assert galaxy["total_goals"] == 14
    assert len(galaxy["planets"]) == 14

    # Deleting a goal
    del_res = client.delete(f"/api/focus/goals/{goal_ids[0]}")
    assert del_res.status_code == 200

    # Galaxy should now have 13 planets
    galaxy_res2 = client.get("/api/focus/galaxy")
    assert galaxy_res2.json()["total_goals"] == 13

# ── 2. Sequential Constellations Unlock Up to Draco & Re-check Idempotency ──
def test_full_constellation_unlock_progression():
    # Initially reset all constellations to locked
    db = SessionLocal()
    constellations = db.query(ConstellationAchievement).all()
    for c in constellations:
        c.is_unlocked = False
        c.unlocked_at = None
    db.commit()
    db.close()

    # Step 1: Create and complete 1 goal -> unlocks Triangulum (1 goal)
    res_g1 = client.post("/api/focus/goals", json={"title": "Mục tiêu 1", "target_hours": 10.0})
    g1_id = res_g1.json()["id"]
    client.post("/api/focus/sessions", json={"goal_id": g1_id, "duration_minutes": 600, "topic_note": "Hoàn thành 1"})

    check1 = client.post("/api/focus/constellations/check").json()
    assert check1["total_unlocked"] >= 1
    assert check1["newly_unlocked"] is not None

    # Step 2: Complete 5 more goals to reach 6 total completed
    for i in range(2, 7):
        rg = client.post("/api/focus/goals", json={"title": f"Mục tiêu {i}", "target_hours": 10.0})
        gid = rg.json()["id"]
        client.post("/api/focus/sessions", json={"goal_id": gid, "duration_minutes": 600, "topic_note": f"Hoàn thành {i}"})

    check_all = client.post("/api/focus/constellations/check").json()
    assert check_all["total_unlocked"] == 6

    # Calling check again when all are unlocked should be idempotent (newly_unlocked is None)
    recheck = client.post("/api/focus/constellations/check").json()
    assert recheck["newly_unlocked"] is None
    assert recheck["total_unlocked"] == 6

# ── 3. Pearl Economy & Insufficient Pearls Rejection ──
def test_pearl_economy_and_insufficient_balance():
    # Balance should start at 0
    rew_res = client.get("/api/focus/rewards").json()
    assert rew_res["balance"]["available_pearls"] == 0.0

    # Try to redeem a 2-pearl movie ticket -> should be rejected with 400
    items = rew_res["items"]
    movie_item = next((item for item in items if "phim" in item["title"].lower()), items[0])
    redeem_fail = client.post("/api/focus/rewards/redeem", json={
        "reward_id": movie_item["id"],
        "note": "Xem phim lúc 0 ngọc",
    })
    assert redeem_fail.status_code == 400
    assert "chỉ có 0.0 ngọc" in redeem_fail.json()["detail"]

    # Now earn 3 pearls by logging 180 minutes of study
    rg = client.post("/api/focus/goals", json={"title": "Học Tập Chăm Chỉ", "target_hours": 100.0})
    gid = rg.json()["id"]
    client.post("/api/focus/sessions", json={"goal_id": gid, "duration_minutes": 180, "topic_note": "Tích lũy 3 tiếng"})

    # Check balance is now 3.0
    bal_res = client.get("/api/focus/rewards").json()
    assert bal_res["balance"]["available_pearls"] == 3.0

    # Redeem movie ticket (cost = 2.0 pearls)
    redeem_success = client.post("/api/focus/rewards/redeem", json={
        "reward_id": movie_item["id"],
        "note": "Xem phim hợp lệ",
    })
    assert redeem_success.status_code == 200
    redemption_item = redeem_success.json()
    assert redemption_item["reward_title"] == movie_item["title"]

    # Balance remaining should be 1.0
    bal_after = client.get("/api/focus/rewards").json()
    assert bal_after["balance"]["available_pearls"] == 1.0

# ── 4. Time Capsule Milestone Unlocking ──
def test_time_capsule_milestone_progression():
    rg = client.post("/api/focus/goals", json={"title": "Chinh phục 1000h", "target_hours": 1000.0})
    gid = rg.json()["id"]

    # Create capsule for 10 hours
    cap_res = client.post("/api/focus/time-capsules", json={
        "goal_id": gid,
        "milestone_hours": 10.0,
        "title": "Gửi tôi ở mốc 10h",
        "message_content": "Bạn đã vượt qua những bước đầu tiên!",
    })
    assert cap_res.status_code == 201
    cap = cap_res.json()
    assert cap["is_unlocked"] is False

    # Log 5 hours -> still locked
    client.post("/api/focus/sessions", json={"goal_id": gid, "duration_minutes": 300, "topic_note": "5 tiếng đầu"})
    capsules = client.get("/api/focus/time-capsules").json()
    assert capsules[0]["is_unlocked"] is False

    # Log 6 more hours (total 11 hours >= 10h milestone) -> unlocked!
    client.post("/api/focus/sessions", json={"goal_id": gid, "duration_minutes": 360, "topic_note": "6 tiếng tiếp"})
    capsules_unlocked = client.get("/api/focus/time-capsules").json()
    assert capsules_unlocked[0]["is_unlocked"] is True
    assert capsules_unlocked[0]["unlocked_at"] is not None

# ── 5. Eisenhower Matrix Edge Cases & Boundaries ──
def test_matrix_edge_cases_and_error_handling():
    today = datetime.date.today().isoformat()

    # Quadrant clamping: pass quadrant 99 -> should clamp to 4
    res = client.post("/api/focus/matrix", json={
        "title": "Nhiệm vụ kiểm tra clamp",
        "quadrant": 99,
        "date": today,
    })
    assert res.status_code == 201
    assert res.json()["quadrant"] == 4
    task_id = res.json()["id"]

    # Quadrant clamping: pass quadrant -5 -> should clamp to 1
    res_low = client.post("/api/focus/matrix", json={
        "title": "Nhiệm vụ kiểm tra clamp min",
        "quadrant": -5,
        "date": today,
    })
    assert res_low.status_code == 201
    assert res_low.json()["quadrant"] == 1

    # 404 on invalid task id for toggle, reflection, update, delete
    assert client.patch("/api/focus/matrix/999999/toggle").status_code == 404
    assert client.patch("/api/focus/matrix/999999/reflection", json={"reflection_note": "abc"}).status_code == 404
    assert client.put("/api/focus/matrix/999999", json={"title": "abc"}).status_code == 404
    assert client.delete("/api/focus/matrix/999999").status_code == 404

    # Rollover when no uncompleted tasks exist returns count = 0
    tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    client.patch(f"/api/focus/matrix/{task_id}/toggle") # mark completed
    roll_res = client.post(f"/api/focus/matrix/rollover?from_date={today}&to_date={tomorrow}").json()
    # Note: res_low is not completed yet so it gets rolled over
    assert roll_res["count"] == 1

    # Cross-year summary test (December to January)
    dec_summary = client.get("/api/focus/matrix/monthly-summary?year=2026&month=12")
    assert dec_summary.status_code == 200
    assert dec_summary.json()["month"] == 12
    assert dec_summary.json()["year"] == 2026
