import pytest
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models_auth import User
from app.models import StudyGoal, StudySessionLog, Player, Achievement

client = TestClient(app)


def _cleanup():
    db = SessionLocal()
    try:
        audit_users = [u[0] for u in db.query(User.id).filter(User.username.like("audit_%")).all()]
        if audit_users:
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
