import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models_auth import User
from app.models import StudyGoal, StudySessionLog, DailyMatrixTask
from app.routers.auth import hash_password, create_access_token

client = TestClient(app)

@pytest.fixture
def admin_and_normal_user():
    db = SessionLocal()
    try:
        # Create or update Admin User
        admin_u = db.query(User).filter(User.username == "test_admin_user").first()
        if not admin_u:
            pwd_hash, salt = hash_password("AdminPass123")
            admin_u = User(
                username="test_admin_user",
                display_name="Test Admin",
                password_hash=pwd_hash,
                salt=salt,
                racer_avatar="quantum_saucer",
                is_admin=True,
                is_active=True,
            )
            db.add(admin_u)
            db.commit()
            db.refresh(admin_u)
        else:
            admin_u.is_admin = True
            db.commit()

        # Create Normal User
        norm_u = db.query(User).filter(User.username == "test_normal_friend").first()
        if not norm_u:
            pwd_hash, salt = hash_password("FriendPass123")
            norm_u = User(
                username="test_normal_friend",
                display_name="Bạn Của Tôi",
                password_hash=pwd_hash,
                salt=salt,
                racer_avatar="cyber_car",
                is_admin=False,
                is_active=True,
            )
            db.add(norm_u)
            db.commit()
            db.refresh(norm_u)
        else:
            norm_u.is_admin = False
            norm_u.is_active = True
            db.commit()

            # Add Goal for friend
            g = StudyGoal(
                user_id=norm_u.id,
                title="Luyện IELTS 8.0",
                celestial_name="Polaris",
                target_hours=50.0,
                current_hours=12.5,
                color="#00F0FF",
                category="Tiếng Anh",
            )
            db.add(g)
            db.commit()
            db.refresh(g)

            # Add Session for friend
            s = StudySessionLog(
                user_id=norm_u.id,
                goal_id=g.id,
                duration_minutes=25,
                duration_hours=0.42,
                topic_note="Học từ vựng chủ đề Environment",
                source="pomodoro",
            )
            db.add(s)

            # Add Matrix Task for friend
            t = DailyMatrixTask(
                user_id=norm_u.id,
                title="Làm đề thi thử Reading Cam 18",
                quadrant=1,
                is_completed=True,
                reflection_note="Hoàn thành đúng giờ",
            )
            db.add(t)
            db.commit()

        admin_token = create_access_token(admin_u.id, admin_u.username)
        norm_token = create_access_token(norm_u.id, norm_u.username)

        yield {
            "admin": admin_u,
            "admin_token": admin_token,
            "normal_user": norm_u,
            "norm_token": norm_token,
        }
    finally:
        db.close()


def test_admin_access_control(admin_and_normal_user):
    data = admin_and_normal_user
    # Non-admin cannot access overview
    res_forbidden = client.get(
        "/api/admin/overview",
        headers={"Authorization": f"Bearer {data['norm_token']}"}
    )
    assert res_forbidden.status_code == 403

    # Admin can access overview
    res_ok = client.get(
        "/api/admin/overview",
        headers={"Authorization": f"Bearer {data['admin_token']}"}
    )
    assert res_ok.status_code == 200
    res_json = res_ok.json()
    assert "total_users" in res_json
    assert res_json["total_users"] >= 2
    assert "top_racers" in res_json


def test_admin_users_list_and_detail(admin_and_normal_user):
    data = admin_and_normal_user
    admin_token = data["admin_token"]
    norm_id = data["normal_user"].id

    # 1. Get Users list
    res_users = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_users.status_code == 200
    users_list = res_users.json()["items"]
    assert any(u["id"] == norm_id for u in users_list)

    # 2. Get User Detail
    res_detail = client.get(f"/api/admin/users/{norm_id}/detail", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["user"]["username"] == "test_normal_friend"
    assert len(detail["goals"]) >= 1
    assert detail["goals"][0]["title"] == "Luyện IELTS 8.0"
    assert len(detail["recent_sessions"]) >= 1
    assert "Environment" in detail["recent_sessions"][0]["topic_note"]
    assert len(detail["matrix_tasks"]) >= 1
    assert detail["matrix_tasks"][0]["quadrant"] == 1


def test_admin_reset_password_and_cheer(admin_and_normal_user):
    data = admin_and_normal_user
    admin_token = data["admin_token"]
    norm_u = data["normal_user"]

    # 1. Reset password
    res_reset = client.post(
        f"/api/admin/users/{norm_u.id}/reset-password",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"new_password": "NewFriendPassword999"},
    )
    assert res_reset.status_code == 200

    # Verify normal user can log in with new password
    res_login = client.post(
        "/api/auth/login",
        json={"username": norm_u.username, "password": "NewFriendPassword999"},
    )
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()

    # 2. Cheer user
    res_cheer = client.post(
        f"/api/admin/users/{norm_u.id}/cheer",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"emoji": "🚀", "message": "Tiếp tục phát huy nhé bạn ơi!"},
    )
    assert res_cheer.status_code == 200


def test_admin_update_role_and_status(admin_and_normal_user):
    data = admin_and_normal_user
    admin_token = data["admin_token"]
    norm_id = data["normal_user"].id

    # Toggle role
    res_role = client.put(
        f"/api/admin/users/{norm_id}/role",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_admin": True},
    )
    assert res_role.status_code == 200

    # Toggle status
    res_status = client.put(
        f"/api/admin/users/{norm_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": True},
    )
    assert res_status.status_code == 200
