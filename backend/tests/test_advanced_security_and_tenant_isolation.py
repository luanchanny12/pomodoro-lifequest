import pytest
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models_auth import User, VisitorLog
from app.models import (
    StudyGoal,
    StudySessionLog,
    DailyMatrixTask,
    NotificationSetting,
    TimeCapsule,
    RewardItem,
    RewardRedemption,
    Player,
    Achievement,
    UserConstellationUnlock,
)
from app.routers.auth import _RATE_LIMIT_STORE

client = TestClient(app)


def _cleanup(db):
    _RATE_LIMIT_STORE.clear()
    test_user_ids = [u[0] for u in db.query(User.id).filter(User.username.like("user%") | User.username.like("admin_zero_loss%")).all()]
    if test_user_ids:
        db.query(VisitorLog).filter(VisitorLog.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(UserConstellationUnlock).filter(UserConstellationUnlock.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(RewardRedemption).filter(RewardRedemption.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(RewardItem).filter(RewardItem.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(TimeCapsule).filter(TimeCapsule.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(StudySessionLog).filter(StudySessionLog.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(StudyGoal).filter(StudyGoal.user_id.in_(test_user_ids)).update({"parent_id": None}, synchronize_session=False)
        db.query(StudyGoal).filter(StudyGoal.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(NotificationSetting).filter(NotificationSetting.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        p_ids = [p[0] for p in db.query(Player.id).filter(Player.user_id.in_(test_user_ids)).all()]
        if p_ids:
            db.query(Achievement).filter(Achievement.player_id.in_(p_ids)).delete(synchronize_session=False)
            db.query(Player).filter(Player.id.in_(p_ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(test_user_ids)).delete(synchronize_session=False)
    db.query(VisitorLog).filter(VisitorLog.visitor_id.like("unique_visitor%")).delete(synchronize_session=False)
    db.commit()


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _cleanup(db)
    finally:
        db.close()
    yield
    db = SessionLocal()
    try:
        _cleanup(db)
    finally:
        db.close()


@pytest.fixture(autouse=True)
def ensure_admin():
    # TestClient(app) không chạy lifespan nên admin mặc định không được seed vào DB test.
    # Tạo sẵn tài khoản admin với mật khẩu mặc định để các test đăng nhập admin hoạt động.
    from app.routers.auth import hash_password
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            pwd_hash, salt = hash_password("Admin@123456")
            admin = User(
                username="admin",
                display_name="Quản Trị Viên",
                password_hash=pwd_hash,
                salt=salt,
                is_admin=True,
                is_active=True,
            )
            db.add(admin)
        else:
            admin.is_admin = True
            admin.is_active = True
        db.commit()
    finally:
        db.close()
    yield


def _register(username, display_name, password="Password123!"):
    res = client.post(
        "/api/auth/register",
        json={"username": username, "display_name": display_name, "password": password},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"], res.json()["user"]


def _login(username, password="Password123!"):
    res = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"], res.json()["user"]


def test_matrix_tenant_isolation():
    token_a, user_a = _register("usera_matrix", "User A")
    token_b, user_b = _register("userb_matrix", "User B")

    today = datetime.date.today().isoformat()

    # User A creates task
    res_a = client.post(
        "/api/focus/matrix",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"title": "Việc riêng của User A", "quadrant": 1, "date": today},
    )
    assert res_a.status_code == 201

    # User B creates task
    res_b = client.post(
        "/api/focus/matrix",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"title": "Việc riêng của User B", "quadrant": 2, "date": today},
    )
    assert res_b.status_code == 201

    # Guest creates task
    res_guest = client.post(
        "/api/focus/matrix",
        json={"title": "Việc của Khách Vãng Lai", "quadrant": 3, "date": today},
    )
    assert res_guest.status_code == 201

    # 1. User A queries matrix
    tasks_a = client.get(
        f"/api/focus/matrix?date={today}",
        headers={"Authorization": f"Bearer {token_a}"},
    ).json()
    titles_a = [t["title"] for t in tasks_a]
    assert "Việc riêng của User A" in titles_a
    assert "Việc riêng của User B" not in titles_a
    assert "Việc của Khách Vãng Lai" not in titles_a

    # 2. User B queries matrix
    tasks_b = client.get(
        f"/api/focus/matrix?date={today}",
        headers={"Authorization": f"Bearer {token_b}"},
    ).json()
    titles_b = [t["title"] for t in tasks_b]
    assert "Việc riêng của User B" in titles_b
    assert "Việc riêng của User A" not in titles_b
    assert "Việc của Khách Vãng Lai" not in titles_b

    # 3. Guest queries matrix (Must NOT leak User A or User B tasks!)
    tasks_guest = client.get(f"/api/focus/matrix?date={today}").json()
    titles_guest = [t["title"] for t in tasks_guest]
    assert "Việc của Khách Vãng Lai" in titles_guest
    assert "Việc riêng của User A" not in titles_guest
    assert "Việc riêng của User B" not in titles_guest


def test_cross_user_goal_tampering_blocked():
    token_a, user_a = _register("usera_tamper", "User A")
    token_b, user_b = _register("userb_tamper", "User B")

    # User A creates a Goal
    res_goal = client.post(
        "/api/focus/goals",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"title": "Mục tiêu 100h Tiếng Anh", "target_hours": 100.0, "current_hours": 0.0},
    )
    assert res_goal.status_code == 201
    goal_a_id = res_goal.json()["id"]

    # User B tries to link a Pomodoro session to User A's goal -> Must be 403 Forbidden!
    res_hack_session = client.post(
        "/api/focus/sessions",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"goal_id": goal_a_id, "duration_minutes": 50, "topic_note": "Hack tăng giờ của A"},
    )
    assert res_hack_session.status_code == 403

    # User B tries to create a matrix task with User A's goal -> Must be 403 Forbidden!
    res_hack_matrix = client.post(
        "/api/focus/matrix",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"title": "Nhiệm vụ gắn goal của A", "goal_id": goal_a_id, "quadrant": 1},
    )
    assert res_hack_matrix.status_code == 403

    # User B creates own matrix task, then tries to update goal_id to User A's goal -> Must be 403 Forbidden!
    res_own_matrix = client.post(
        "/api/focus/matrix",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"title": "Nhiệm vụ của B", "quadrant": 2},
    )
    assert res_own_matrix.status_code == 201
    task_b_id = res_own_matrix.json()["id"]

    res_hack_update = client.put(
        f"/api/focus/matrix/{task_b_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"goal_id": goal_a_id},
    )
    assert res_hack_update.status_code == 403


def test_notification_settings_isolation():
    token_a, user_a = _register("usera_tele", "User A")
    token_b, user_b = _register("userb_tele", "User B")

    # User A updates notification settings with secret token
    res_save_a = client.put(
        "/api/notifications/settings",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "telegram_bot_token": "SECRET_BOT_TOKEN_AAA",
            "telegram_chat_id": "CHAT_ID_111111",
            "telegram_enabled": True,
        },
    )
    assert res_save_a.status_code == 200

    # User B gets settings -> Must NOT receive User A's token or chat_id!
    res_get_b = client.get(
        "/api/notifications/settings",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_get_b.status_code == 200
    data_b = res_get_b.json()
    assert data_b["telegram_bot_token"] is None or data_b["telegram_bot_token"] != "SECRET_BOT_TOKEN_AAA"
    assert data_b["telegram_chat_id"] is None or data_b["telegram_chat_id"] != "CHAT_ID_111111"

    # User A still has their settings intact
    res_get_a = client.get(
        "/api/notifications/settings",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_get_a.status_code == 200
    assert res_get_a.json()["telegram_bot_token"] == "SECRET_BOT_TOKEN_AAA"
    assert res_get_a.json()["telegram_chat_id"] == "CHAT_ID_111111"


def test_time_capsule_privacy():
    token_a, user_a = _register("usera_capsule", "User A")
    token_b, user_b = _register("userb_capsule", "User B")

    # User A creates a private time capsule
    res_cap = client.post(
        "/api/focus/time-capsules",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "milestone_hours": 10.0,
            "title": "Bí mật gửi tương lai của User A",
            "message_content": "Đây là tâm sự tuyệt mật không ai được xem!",
        },
    )
    assert res_cap.status_code == 201

    # User B views time capsules -> Must be empty
    res_view_b = client.get(
        "/api/focus/time-capsules",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_view_b.status_code == 200
    assert len(res_view_b.json()) == 0

    # Guest views time capsules -> Must be empty
    res_view_guest = client.get("/api/focus/time-capsules")
    assert res_view_guest.status_code == 200
    assert len(res_view_guest.json()) == 0


def test_rewards_pearls_isolation():
    token_a, user_a = _register("usera_pearls", "User A")
    token_b, user_b = _register("userb_pearls", "User B")

    # User A logs 3 hours (3 pearls)
    client.post(
        "/api/focus/sessions",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"duration_minutes": 180, "topic_note": "Học 3 tiếng"},
    )

    # Check User A balance -> 3 pearls
    bal_a = client.get("/api/focus/rewards", headers={"Authorization": f"Bearer {token_a}"}).json()["balance"]
    assert bal_a["available_pearls"] == 3.0

    # Check User B balance -> 0 pearls
    bal_b = client.get("/api/focus/rewards", headers={"Authorization": f"Bearer {token_b}"}).json()["balance"]
    assert bal_b["available_pearls"] == 0.0

    # User B tries to redeem 1-pearl reward -> Rejected (HTTP 400)!
    items = client.get("/api/focus/rewards").json()["items"]
    one_pearl_reward = next(it for it in items if it["pearl_cost"] == 1.0)

    res_redeem_b = client.post(
        "/api/focus/rewards/redeem",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"reward_id": one_pearl_reward["id"], "note": "B thử đổi trộm"},
    )
    assert res_redeem_b.status_code == 400

    # User A redeems 1-pearl reward -> Success!
    res_redeem_a = client.post(
        "/api/focus/rewards/redeem",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"reward_id": one_pearl_reward["id"], "note": "A tự thưởng"},
    )
    assert res_redeem_a.status_code == 200

    # User A now has 2 pearls left
    bal_a_after = client.get("/api/focus/rewards", headers={"Authorization": f"Bearer {token_a}"}).json()["balance"]
    assert bal_a_after["available_pearls"] == 2.0

    # User B checks redemption history -> Does NOT see User A's redemption!
    history_b = client.get("/api/focus/rewards/history", headers={"Authorization": f"Bearer {token_b}"}).json()
    assert len(history_b) == 0


def test_admin_delete_goal_zero_data_loss():
    token_user, user_info = _register("user_goal_loss", "User Goal Test")
    
    db = SessionLocal()
    admin_u = db.query(User).filter(User.username == "admin_zero_loss_tester").first()
    if not admin_u:
        from app.routers.auth import hash_password
        p_hash, salt = hash_password("AdminPass123!")
        admin_u = User(username="admin_zero_loss_tester", display_name="Admin Zero Loss", password_hash=p_hash, salt=salt, is_admin=True)
        db.add(admin_u)
        db.commit()
        db.refresh(admin_u)
    from app.routers.auth import create_access_token
    admin_token = create_access_token(user_id=admin_u.id, username=admin_u.username, salt=admin_u.salt)

    # User creates a goal
    res_goal = client.post(
        "/api/focus/goals",
        headers={"Authorization": f"Bearer {token_user}"},
        json={"title": "Mục tiêu quan trọng cần bảo vệ", "target_hours": 20.0},
    )
    assert res_goal.status_code == 201
    goal_id = res_goal.json()["id"]

    # User creates a 2-hour Pomodoro session linked to that goal
    res_session = client.post(
        "/api/focus/sessions",
        headers={"Authorization": f"Bearer {token_user}"},
        json={"goal_id": goal_id, "duration_minutes": 120, "topic_note": "Buổi học quý giá 2 tiếng"},
    )
    assert res_session.status_code == 201
    session_id = res_session.json()["id"]

    # User creates a matrix task linked to that goal
    res_task = client.post(
        "/api/focus/matrix",
        headers={"Authorization": f"Bearer {token_user}"},
        json={"title": "Công việc ma trận gắn goal", "goal_id": goal_id, "quadrant": 1},
    )
    assert res_task.status_code == 201
    task_id = res_task.json()["id"]

    # Admin deletes the goal
    res_del = client.delete(
        f"/api/admin/goals/{goal_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_del.status_code == 200

    # Verify Goal is gone
    db = SessionLocal()
    assert db.query(StudyGoal).filter(StudyGoal.id == goal_id).first() is None

    # CRITICAL VERIFICATION: Session log must STILL EXIST with goal_id = None! (Zero Data Loss)
    saved_session = db.query(StudySessionLog).filter(StudySessionLog.id == session_id).first()
    assert saved_session is not None
    assert saved_session.duration_hours == 2.0
    assert saved_session.goal_id is None

    # CRITICAL VERIFICATION: Matrix task must STILL EXIST with goal_id = None!
    saved_task = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == task_id).first()
    assert saved_task is not None
    assert saved_task.title == "Công việc ma trận gắn goal"
    assert saved_task.goal_id is None
    db.close()


def test_analytics_rate_limiting():
    # Send first visit
    r1 = client.post(
        "/api/analytics/track-visit",
        json={"visitor_id": "unique_visitor_xyz_123", "path": "/"},
    )
    assert r1.status_code == 200
    assert r1.json().get("cached") is not True

    # Send immediately again from same visitor_id
    r2 = client.post(
        "/api/analytics/track-visit",
        json={"visitor_id": "unique_visitor_xyz_123", "path": "/"},
    )
    assert r2.status_code == 200
    assert r2.json().get("cached") is True

    # Total visits in DB should only have 1 row for this visitor
    db = SessionLocal()
    count = db.query(VisitorLog).filter(VisitorLog.visitor_id == "unique_visitor_xyz_123").count()
    db.close()
    assert count == 1
