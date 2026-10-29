import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models_auth import User, VisitorLog, UserFeedback
from app.routers.auth import hash_password, create_access_token

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    yield db
    db.close()

@pytest.fixture
def admin_token(db_session):
    u = db_session.query(User).filter(User.username == "test_admin_analytics").first()
    if not u:
        pwd_hash, salt = hash_password("Admin@123456")
        u = User(
            username="test_admin_analytics",
            display_name="Admin Analytics",
            password_hash=pwd_hash,
            salt=salt,
            is_admin=True,
            is_active=True,
        )
        db_session.add(u)
        db_session.commit()
        db_session.refresh(u)
    else:
        u.is_admin = True
        u.is_active = True
        db_session.commit()
    return create_access_token(u.id, u.username)

@pytest.fixture
def normal_user_token(db_session):
    u = db_session.query(User).filter(User.username == "test_user_analytics").first()
    if not u:
        pwd_hash, salt = hash_password("Password@123")
        u = User(
            username="test_user_analytics",
            display_name="User Analytics",
            password_hash=pwd_hash,
            salt=salt,
            is_admin=False,
            is_active=True,
        )
        db_session.add(u)
        db_session.commit()
        db_session.refresh(u)
    else:
        u.is_admin = False
        u.is_active = True
        db_session.commit()
    return create_access_token(u.id, u.username)

def test_track_visit_guest_and_member(normal_user_token):
    # 1. Track guest visit
    res_guest = client.post("/api/analytics/track-visit", json={
        "visitor_id": "test_vis_guest_123",
        "is_member": False,
        "device_type": "mobile",
        "path": "/",
    })
    assert res_guest.status_code == 200
    data_guest = res_guest.json()
    assert data_guest["status"] == "ok"
    assert "total_visits" in data_guest

    # 2. Track member visit
    res_member = client.post(
        "/api/analytics/track-visit",
        headers={"Authorization": f"Bearer {normal_user_token}"},
        json={
            "visitor_id": "test_vis_member_456",
            "is_member": True,
            "device_type": "desktop",
            "path": "/focus",
        }
    )
    assert res_member.status_code == 200
    data_member = res_member.json()
    assert data_member["status"] == "ok"

def test_feedback_submission_guest_and_member(normal_user_token, admin_token):
    # 1. Guest feedback
    res1 = client.post("/api/feedback", json={
        "rating": 5,
        "category": "feature",
        "content": "Web rất đẹp, mong có thêm chế độ lofi!",
        "sender_name": "Khách Test",
        "sender_contact": "test@gmail.com",
    })
    assert res1.status_code == 200
    fb1 = res1.json()
    assert fb1["status"] == "ok"
    fb_id = fb1["id"]

    # 2. Member feedback
    res2 = client.post(
        "/api/feedback",
        headers={"Authorization": f"Bearer {normal_user_token}"},
        json={
            "rating": 4,
            "category": "ui",
            "content": "Giao diện di động cần nút to hơn một chút.",
        }
    )
    assert res2.status_code == 200

    # 3. Normal user cannot access admin feedbacks
    res_forbidden = client.get(
        "/api/admin/feedbacks",
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert res_forbidden.status_code == 403

    # 4. Admin can get feedbacks
    res_admin = client.get(
        "/api/admin/feedbacks",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin.status_code == 200
    feedbacks_data = res_admin.json()
    assert feedbacks_data["total"] >= 2
    assert "average_rating" in feedbacks_data
    assert len(feedbacks_data["items"]) >= 2

    # 5. Admin updates status
    res_update = client.put(
        f"/api/admin/feedbacks/{fb_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "resolved", "admin_note": "Đã thêm theme lofi rồi nhé!"}
    )
    assert res_update.status_code == 200
    assert res_update.json()["status"] == "ok"

def test_admin_overview_includes_traffic(admin_token):
    res = client.get("/api/admin/overview", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_visits" in data
    assert "guest_visits" in data
    assert "member_visits" in data
    assert "unique_guests" in data
    assert "unique_members" in data
    assert "today_visits" in data
    assert "mobile_visits" in data
    assert "desktop_visits" in data
    assert "traffic_trend_7days" in data
    assert len(data["traffic_trend_7days"]) == 7
    assert "total_feedbacks" in data
