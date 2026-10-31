import pytest
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models_auth import User
from app.models import StudyGoal, StudySessionLog, Player, Achievement, UserConstellationUnlock
from app.routers.auth import _RATE_LIMIT_STORE, create_access_token, hash_password

client = TestClient(app)


def _cleanup():
    _RATE_LIMIT_STORE.clear()
    db = SessionLocal()
    try:
        audit_users = [u[0] for u in db.query(User.id).filter(User.username.like("audit_%")).all()]
        if audit_users:
            db.query(UserConstellationUnlock).filter(UserConstellationUnlock.user_id.in_(audit_users)).delete(synchronize_session=False)
            db.query(StudySessionLog).filter(StudySessionLog.user_id.in_(audit_users)).delete(synchronize_session=False)
            db.query(StudyGoal).filter(StudyGoal.user_id.in_(audit_users)).update({"parent_id": None}, synchronize_session=False)
            db.query(StudyGoal).filter(StudyGoal.user_id.in_(audit_users)).delete(synchronize_session=False)
            p_ids = [p[0] for p in db.query(Player.id).filter(Player.user_id.in_(audit_users)).all()]
            if p_ids:
                db.query(Achievement).filter(Achievement.player_id.in_(p_ids)).delete(synchronize_session=False)
                db.query(Player).filter(Player.id.in_(p_ids)).delete(synchronize_session=False)
            db.query(User).filter(User.id.in_(audit_users)).delete(synchronize_session=False)
            db.commit()
    finally:
        db.close()


@pytest.fixture(autouse=True)
def clean_audit_env():
    _cleanup()
    yield
    _cleanup()


def _register(username, display_name="Audit Tester", password="Password123!"):
    res = client.post(
        "/api/auth/register",
        json={"username": username, "display_name": display_name, "password": password},
    )
    assert res.status_code == 200
    return res.json()["access_token"], res.json()["user"]


def test_c1_block_infinite_and_nan_goals():
    """
    CRITICAL C1: Kiểm tra chặn đứng 100% payload số thực vô hạn 1e400 hoặc NaN
    Không cho phép ghi vào DB gây lỗi 500 vĩnh viễn cho hệ thống.
    """
    # 1. Test 1e400 (JSON Infinity được truyền dưới dạng chuỗi JSON thô từ hacker)
    res_inf = client.post(
        "/api/focus/goals",
        content='{"title": "Mục tiêu vô hạn", "target_hours": 1e400}',
        headers={"Content-Type": "application/json"},
    )
    # Pydantic confloat(allow_inf_nan=False) phải từ chối 422 Unprocessable Entity
    assert res_inf.status_code == 422

    # 2. Test âm hoặc 0 giờ
    res_zero = client.post(
        "/api/focus/goals",
        content='{"title": "Mục tiêu 0 giờ", "target_hours": 0.0}',
        headers={"Content-Type": "application/json"},
    )
    assert res_zero.status_code == 422


def test_c1_session_duration_clamped():
    """
    Kiểm tra ràng buộc duration_minutes trong khoảng [1, 1440].
    """
    token, _ = _register("audit_dur_user")

    # 0 phút -> 422
    res_0 = client.post(
        "/api/focus/sessions",
        headers={"Authorization": f"Bearer {token}"},
        json={"duration_minutes": 0},
    )
    assert res_0.status_code in (400, 422)

    # 1500 phút (>24h) -> 422
    res_huge = client.post(
        "/api/focus/sessions",
        headers={"Authorization": f"Bearer {token}"},
        json={"duration_minutes": 1500},
    )
    assert res_huge.status_code in (400, 422)


def test_h6_goal_parent_cycle_detection():
    """
    HIGH H6: Chặn đứng tạo chu kỳ mục tiêu cha-con (A -> B -> A).
    """
    token, user = _register("audit_cycle_user")
    headers = {"Authorization": f"Bearer {token}"}

    # Tạo Goal A
    res_a = client.post(
        "/api/focus/goals",
        headers=headers,
        json={"title": "Goal A", "target_hours": 50.0},
    )
    assert res_a.status_code == 201
    goal_a_id = res_a.json()["id"]

    # Tạo Goal B con của Goal A
    res_b = client.post(
        "/api/focus/goals",
        headers=headers,
        json={"title": "Goal B", "parent_id": goal_a_id, "target_hours": 20.0},
    )
    assert res_b.status_code == 201
    goal_b_id = res_b.json()["id"]

    # Cố gắng đặt Goal A làm con của Goal B (tạo chu kỳ A -> B -> A) -> Bị chặn 400!
    res_cycle = client.put(
        f"/api/focus/goals/{goal_a_id}",
        headers=headers,
        json={"parent_id": goal_b_id},
    )
    assert res_cycle.status_code == 400
    assert "cycle" in res_cycle.json()["detail"].lower() or "vòng lặp" in res_cycle.json()["detail"].lower()


def test_h7_invalid_token_raises_401_no_silent_downgrade():
    """
    HIGH H7: Header Authorization có mặt nhưng token hết hạn hoặc sai cú pháp
    phải ném HTTP 401 Unauthorized, KHÔNG ĐƯỢC âm thầm biến thành khách (guest)
    khiến dữ liệu bị lưu nhầm vào bucket dùng chung toàn cục.
    """
    res = client.get(
        "/api/focus/goals",
        headers={"Authorization": "Bearer token_hoan_toan_vo_nghia_hoac_da_het_han.12345"},
    )
    assert res.status_code == 401
    assert "WWW-Authenticate" in res.headers


def test_m9_large_body_payload_blocked():
    """
    MEDIUM M9: HTTP Body Size Limiter Middleware ngăn chặn DoS cạn kiệt RAM.
    Payload > 10MB bị từ chối 413 Payload Too Large.
    """
    # Gửi body vượt quá 10MB
    huge_data = "a" * (11 * 1024 * 1024)
    res = client.post(
        "/api/focus/goals",
        headers={"Content-Length": str(len(huge_data))},
        content=huge_data,
    )
    assert res.status_code == 413


def test_b1_admin_delete_goal_deducts_parent_rollup_and_reconciles():
    """
    B1 — HIGH: Khi admin xóa goal con, số giờ đã rollup vào goal cha phải được
    khấu trừ (_propagate_goal_hours), và _reconcile_parent_goals không được
    dùng max(...) giữ lại giờ ma (phantom hours).
    """
    token, user = _register("audit_b1_user")
    headers = {"Authorization": f"Bearer {token}"}

    # Tạo tài khoản admin
    db = SessionLocal()
    try:
        p_hash, salt = hash_password("AdminPass123!")
        admin_u = User(
            username="audit_b1_admin",
            display_name="Admin B1",
            password_hash=p_hash,
            salt=salt,
            is_admin=True,
            is_active=True,
        )
        db.add(admin_u)
        db.commit()
        db.refresh(admin_u)
        admin_token = create_access_token(admin_u.id, admin_u.username, admin_u.salt)
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
    finally:
        db.close()

    # 1. User tạo Parent Goal (target: 10h)
    res_p = client.post("/api/focus/goals", headers=headers, json={"title": "Goal Cha", "target_hours": 10.0})
    assert res_p.status_code == 201
    parent_id = res_p.json()["id"]

    # 2. User tạo Child Goal (target: 5h, parent_id=parent_id)
    res_c = client.post("/api/focus/goals", headers=headers, json={"title": "Goal Con", "target_hours": 5.0, "parent_id": parent_id})
    assert res_c.status_code == 201
    child_id = res_c.json()["id"]

    # 3. User học 2.0 giờ vào Goal Con
    now_str = datetime.datetime.utcnow().isoformat()
    res_s = client.post(
        "/api/focus/sessions",
        headers=headers,
        json={
            "duration_minutes": 120,
            "session_type": "pomodoro",
            "goal_id": child_id,
            "completed_at": now_str,
        },
    )
    assert res_s.status_code == 201

    # Kiểm tra Goal Cha đã được rollup 2.0 giờ
    db = SessionLocal()
    try:
        parent_goal = db.query(StudyGoal).filter(StudyGoal.id == parent_id).first()
        assert parent_goal.current_hours == 2.0
    finally:
        db.close()

    # 4. Admin xóa Goal Con bằng DELETE /api/admin/goals/{child_id}
    res_del = client.delete(f"/api/admin/goals/{child_id}", headers=admin_headers)
    assert res_del.status_code == 200

    # 5. Kiểm tra Goal Cha đã được khấu trừ 2.0 giờ -> về 0.0
    db = SessionLocal()
    try:
        parent_goal = db.query(StudyGoal).filter(StudyGoal.id == parent_id).first()
        assert parent_goal.current_hours == 0.0
    finally:
        db.close()

    # 6. Gọi GET /api/focus/goals (nơi chạy _reconcile_parent_goals)
    res_list = client.get("/api/focus/goals", headers=headers)
    assert res_list.status_code == 200
    goals = res_list.json()
    p_in_list = next((g for g in goals if g["id"] == parent_id), None)
    assert p_in_list is not None
    assert p_in_list["current_hours"] == 0.0


def test_b2_registration_rate_limit_enforced():
    """
    B2 — HIGH: Rate limit đăng ký tài khoản (tối đa 5 lần trong 10 phút / IP).
    Lần thứ 6 phải bị chặn với mã lỗi HTTP 429 Too Many Requests.
    """
    _RATE_LIMIT_STORE.clear()

    # Gửi 5 lần đăng ký thành công
    for i in range(1, 6):
        res = client.post(
            "/api/auth/register",
            json={
                "username": f"audit_reg_{i}",
                "display_name": f"Tester {i}",
                "password": "Password123!",
            },
        )
        assert res.status_code == 200, f"Attempt {i} failed: {res.text}"

    # Lần thứ 6 phải bị chặn 429
    res_6 = client.post(
        "/api/auth/register",
        json={
            "username": "audit_reg_6",
            "display_name": "Tester 6",
            "password": "Password123!",
        },
    )
    assert res_6.status_code == 429
    assert "quá nhiều" in res_6.json()["detail"].lower()


def test_b3_constellation_unlock_persists_after_goal_uncompleted():
    """
    B3 — MEDIUM: total_unlocked và trạng thái mở khóa chòm sao được bảo toàn vĩnh viễn
    trong UserConstellationUnlock, không bị mất sao khi un-complete mục tiêu.
    """
    token, user = _register("audit_b3_user")
    headers = {"Authorization": f"Bearer {token}"}

    # Tạo 1 mục tiêu với target 1.0 giờ
    res_g = client.post("/api/focus/goals", headers=headers, json={"title": "Chinh Phục Sao", "target_hours": 1.0})
    assert res_g.status_code == 201
    goal_id = res_g.json()["id"]

    # Học 60 phút để hoàn thành mục tiêu (1.0 giờ)
    now_str = datetime.datetime.utcnow().isoformat()
    res_s = client.post(
        "/api/focus/sessions",
        headers=headers,
        json={
            "duration_minutes": 60,
            "session_type": "pomodoro",
            "goal_id": goal_id,
            "completed_at": now_str,
        },
    )
    assert res_s.status_code == 201

    # Kiểm tra mở khóa chòm sao: phải mở được ít nhất 1 chòm sao
    res_check = client.post("/api/focus/constellations/check", headers=headers)
    assert res_check.status_code == 200
    data_check = res_check.json()
    assert data_check["total_unlocked"] >= 1
    unlocked_before = data_check["total_unlocked"]

    # Giờ un-complete mục tiêu bằng cách xóa session hoặc cập nhật current_hours về 0
    db = SessionLocal()
    try:
        g = db.query(StudyGoal).filter(StudyGoal.id == goal_id).first()
        g.is_completed = False
        g.completed_at = None
        g.current_hours = 0.0
        db.commit()
    finally:
        db.close()

    # Kiểm tra lại /constellations/check: total_unlocked VẪN PHẢI BẢO TOÀN (>= 1)
    res_check_again = client.post("/api/focus/constellations/check", headers=headers)
    assert res_check_again.status_code == 200
    data_check_again = res_check_again.json()
    assert data_check_again["total_unlocked"] == unlocked_before

    # Kiểm tra GET /constellations: chòm sao đã mở vẫn có is_unlocked == True và progress == 100.0
    res_list = client.get("/api/focus/constellations", headers=headers)
    assert res_list.status_code == 200
    constellations = res_list.json()
    unlocked_items = [c for c in constellations if c["is_unlocked"]]
    assert len(unlocked_items) == unlocked_before
    for u_item in unlocked_items:
        assert u_item["progress_percent"] == 100.0
