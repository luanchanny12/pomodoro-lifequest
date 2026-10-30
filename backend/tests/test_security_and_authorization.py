import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import StudyGoal, StudySessionLog, DailyMatrixTask
from app.models_auth import User
from app.routers.auth import hash_password, create_access_token

client = TestClient(app)


def test_security_headers_present_on_all_responses():
    """Kiểm tra toàn bộ HTTP Security Headers chuẩn OWASP đã được gắn vào mọi response"""
    res = client.get("/api/health")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert "max-age=31536000" in headers.get("Strict-Transport-Security", "")
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_unmounted_legacy_routes_return_404_no_500_crash():
    """Kiểm tra các router cũ bị bỏ hoang trả về 404 sạch sẽ thay vì văng lỗi 500 UndefinedTable"""
    for route in ["/courses", "/tasks", "/sprints", "/vocabulary", "/ipa", "/backlog", "/roadmaps"]:
        res = client.get(route)
        assert res.status_code == 404, f"Route {route} expected 404, got {res.status_code}"


def test_idor_goal_protection():
    """Kiểm tra chống lỗ hổng IDOR trên StudyGoal:
    - User B không thể sửa, xóa hay ghi đè 3D planet của User A (HTTP 403).
    - Khách vãng lai không có token không thể can thiệp (HTTP 401).
    - Đúng chủ sở hữu User A thao tác thành công (HTTP 200).
    """
    db = SessionLocal()
    alice_id, bob_id = None, None
    goal_id = None
    try:
        # Tạo User A (Alice)
        pwd_hash, salt = hash_password("AlicePass@123")
        alice = User(
            username="sec_alice_test",
            display_name="Alice Security",
            password_hash=pwd_hash,
            salt=salt,
            is_admin=False,
        )
        db.add(alice)

        # Tạo User B (Bob)
        pwd_hash_b, salt_b = hash_password("BobPass@123")
        bob = User(
            username="sec_bob_test",
            display_name="Bob Security",
            password_hash=pwd_hash_b,
            salt=salt_b,
            is_admin=False,
        )
        db.add(bob)
        db.commit()
        db.refresh(alice)
        db.refresh(bob)
        alice_id, bob_id = alice.id, bob.id

        alice_token = create_access_token(alice_id, alice.username)
        bob_token = create_access_token(bob_id, bob.username)

        # Alice tạo mục tiêu
        alice_goal = StudyGoal(
            user_id=alice_id,
            title="Mục tiêu bí mật của Alice",
            target_hours=50.0,
            current_hours=5.0,
            color="#FF5722",
            category="Security",
        )
        db.add(alice_goal)
        db.commit()
        db.refresh(alice_goal)
        goal_id = alice_goal.id

        # 1. Bob cố tình cập nhật mục tiêu của Alice -> Phải bị 403 Forbidden
        res_update = client.put(
            f"/api/focus/goals/{goal_id}",
            json={"title": "Hacked by Bob"},
            headers={"Authorization": f"Bearer {bob_token}"},
        )
        assert res_update.status_code == 403
        assert "quyền thao tác" in res_update.json()["detail"]

        # 2. Bob cố tình ghi đè bản đồ 3D Planet của Alice -> Phải bị 403 Forbidden
        res_planet = client.put(
            f"/api/focus/goals/{goal_id}/planet-build",
            json={"planet_data": "[{'name':'Hacked'}]"},
            headers={"Authorization": f"Bearer {bob_token}"},
        )
        assert res_planet.status_code == 403

        # 3. Khách không có token cố tình xóa mục tiêu của Alice -> Phải bị 401 Unauthorized
        res_guest_delete = client.delete(f"/api/focus/goals/{goal_id}")
        assert res_guest_delete.status_code == 401

        # 4. Bob cố tình xóa mục tiêu của Alice -> Phải bị 403 Forbidden
        res_bob_delete = client.delete(
            f"/api/focus/goals/{goal_id}",
            headers={"Authorization": f"Bearer {bob_token}"},
        )
        assert res_bob_delete.status_code == 403

        # 5. Alice xóa mục tiêu của chính mình -> Thành công 200 OK
        res_alice_delete = client.delete(
            f"/api/focus/goals/{goal_id}",
            headers={"Authorization": f"Bearer {alice_token}"},
        )
        assert res_alice_delete.status_code == 200

    finally:
        if alice_id:
            db.query(StudyGoal).filter(StudyGoal.user_id == alice_id).delete()
            db.query(User).filter(User.id == alice_id).delete()
        if bob_id:
            db.query(StudyGoal).filter(StudyGoal.user_id == bob_id).delete()
            db.query(User).filter(User.id == bob_id).delete()
        db.commit()
        db.close()


def test_idor_matrix_task_protection():
    """Kiểm tra chống lỗ hổng IDOR trên DailyMatrixTask:
    - User B không thể toggle, update, reflection hay delete task của User A.
    """
    db = SessionLocal()
    alice_id, bob_id = None, None
    task_id = None
    try:
        pwd_hash, salt = hash_password("AliceMatrix@123")
        alice = User(username="sec_alice_matrix", display_name="Alice Matrix", password_hash=pwd_hash, salt=salt)
        db.add(alice)

        pwd_hash_b, salt_b = hash_password("BobMatrix@123")
        bob = User(username="sec_bob_matrix", display_name="Bob Matrix", password_hash=pwd_hash_b, salt=salt_b)
        db.add(bob)
        db.commit()
        db.refresh(alice)
        db.refresh(bob)
        alice_id, bob_id = alice.id, bob.id

        alice_token = create_access_token(alice_id, alice.username)
        bob_token = create_access_token(bob_id, bob.username)

        # Alice tạo task ma trận
        task = DailyMatrixTask(
            user_id=alice_id,
            title="Nhiệm vụ riêng của Alice",
            quadrant=1,
            date=datetime.date.today(),
            order_index=0,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        task_id = task.id

        # 1. Bob cố toggle task của Alice -> 403
        res = client.patch(f"/api/focus/matrix/{task_id}/toggle", headers={"Authorization": f"Bearer {bob_token}"})
        assert res.status_code == 403

        # 2. Bob cố update task của Alice -> 403
        res = client.put(f"/api/focus/matrix/{task_id}", json={"title": "Hacked Title"}, headers={"Authorization": f"Bearer {bob_token}"})
        assert res.status_code == 403

        # 3. Bob cố sửa reflection -> 403
        res = client.patch(f"/api/focus/matrix/{task_id}/reflection", json={"reflection_note": "Hacked"}, headers={"Authorization": f"Bearer {bob_token}"})
        assert res.status_code == 403

        # 4. Bob cố delete -> 403
        res = client.delete(f"/api/focus/matrix/{task_id}", headers={"Authorization": f"Bearer {bob_token}"})
        assert res.status_code == 403

        # 5. Alice toggle task của chính mình -> 200 OK
        res = client.patch(f"/api/focus/matrix/{task_id}/toggle", headers={"Authorization": f"Bearer {alice_token}"})
        assert res.status_code == 200
        assert res.json()["is_completed"] is True

        # Alice xóa task của chính mình -> 200 OK
        res = client.delete(f"/api/focus/matrix/{task_id}", headers={"Authorization": f"Bearer {alice_token}"})
        assert res.status_code == 200

    finally:
        if alice_id:
            db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == alice_id).delete()
            db.query(User).filter(User.id == alice_id).delete()
        if bob_id:
            db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == bob_id).delete()
            db.query(User).filter(User.id == bob_id).delete()
        db.commit()
        db.close()


def test_idor_session_log_protection():
    """Kiểm tra chống lỗ hổng IDOR trên StudySessionLog:
    - User B không thể sửa hoặc xóa phiên học của User A.
    """
    db = SessionLocal()
    alice_id, bob_id = None, None
    session_id = None
    try:
        pwd_hash, salt = hash_password("AliceSession@123")
        alice = User(username="sec_alice_session", display_name="Alice Session", password_hash=pwd_hash, salt=salt)
        db.add(alice)

        pwd_hash_b, salt_b = hash_password("BobSession@123")
        bob = User(username="sec_bob_session", display_name="Bob Session", password_hash=pwd_hash_b, salt=salt_b)
        db.add(bob)
        db.commit()
        db.refresh(alice)
        db.refresh(bob)
        alice_id, bob_id = alice.id, bob.id

        alice_token = create_access_token(alice_id, alice.username)
        bob_token = create_access_token(bob_id, bob.username)

        # Alice tạo phiên học
        sess = StudySessionLog(
            user_id=alice_id,
            duration_minutes=50,
            duration_hours=0.83,
            session_date=datetime.date.today(),
            topic_note="Phiên học Toán của Alice",
            source="pomodoro",
        )
        db.add(sess)
        db.commit()
        db.refresh(sess)
        session_id = sess.id

        # 1. Bob cố sửa phiên học -> 403
        res = client.put(f"/api/focus/sessions/{session_id}", json={"duration_minutes": 10}, headers={"Authorization": f"Bearer {bob_token}"})
        assert res.status_code == 403

        # 2. Bob cố xóa phiên học -> 403
        res = client.delete(f"/api/focus/sessions/{session_id}", headers={"Authorization": f"Bearer {bob_token}"})
        assert res.status_code == 403

        # 3. Alice xóa phiên học của mình -> 200
        res = client.delete(f"/api/focus/sessions/{session_id}", headers={"Authorization": f"Bearer {alice_token}"})
        assert res.status_code == 200

    finally:
        if alice_id:
            db.query(StudySessionLog).filter(StudySessionLog.user_id == alice_id).delete()
            db.query(User).filter(User.id == alice_id).delete()
        if bob_id:
            db.query(StudySessionLog).filter(StudySessionLog.user_id == bob_id).delete()
            db.query(User).filter(User.id == bob_id).delete()
        db.commit()
        db.close()


def test_auth_login_rate_limiting_brute_force():
    """Kiểm tra giới hạn chống tấn công dò mật khẩu (Brute Force):
    - Đăng nhập sai 10 lần liên tục sẽ kích hoạt HTTP 429 Too Many Requests.
    """
    target_user = "brute_force_victim_user"
    for i in range(10):
        res = client.post("/api/auth/login", json={"username": target_user, "password": f"WrongPass_{i}"})
        assert res.status_code == 400

    # Lần thứ 11 phải bị block bởi Rate Limiter
    res_blocked = client.post("/api/auth/login", json={"username": target_user, "password": "WrongPass_11"})
    assert res_blocked.status_code == 429
    assert "quá nhiều lần" in res_blocked.json()["detail"]
