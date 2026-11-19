import pytest
from datetime import timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models_auth import User
from app.models import PhenikaaSyncSetting, SchoolClassSchedule, NotificationSetting
from app.routers.auth import hash_password, create_access_token
from app.routers.focus.common import vn_today, vn_now
from app.services.phenikaa_sync import (
    get_or_create_sync_setting,
    check_if_sync_due,
    diff_and_update_schedule,
    trigger_phenikaa_sync,
    check_and_run_all_due_phenikaa_syncs,
)

client = TestClient(app)


@pytest.fixture
def auth_headers():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "test_phenikaa_sync_user").first()
    if not user:
        pwd_hash, salt = hash_password("SyncPass@123")
        user = User(
            username="test_phenikaa_sync_user",
            display_name="Phenikaa Sync Tester",
            password_hash=pwd_hash,
            salt=salt,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id, user.username)
    db.close()
    return {"Authorization": f"Bearer {token}"}


def test_get_or_create_sync_setting():
    db = SessionLocal()
    try:
        setting = get_or_create_sync_setting(db, user_id=9999)
        assert setting.student_id == "23010720"
        assert setting.auto_sync_enabled is True
        assert setting.sync_interval_days == 14
        assert setting.next_sync_date is not None
        assert setting.last_sync_status == "SUCCESS"
    finally:
        db.close()


def test_check_if_sync_due():
    db = SessionLocal()
    try:
        setting = get_or_create_sync_setting(db, user_id=9998)
        # Khi vừa tạo, next_sync_date là +14 ngày -> chưa đến hạn
        assert check_if_sync_due(setting) is False

        # Giả lập lùi ngày đồng bộ về quá khứ 15 ngày trước -> Đến hạn!
        setting.last_synced_at = vn_now() - timedelta(days=15)
        setting.next_sync_date = vn_today() - timedelta(days=1)
        db.commit()
        assert check_if_sync_due(setting) is True

        # Nếu tắt tự động đồng bộ -> Không kích hoạt
        setting.auto_sync_enabled = False
        db.commit()
        assert check_if_sync_due(setting) is False
    finally:
        db.close()


def test_diff_and_update_schedule():
    db = SessionLocal()
    try:
        user_id = 9997
        # Xóa dữ liệu cũ nếu có
        db.query(SchoolClassSchedule).filter(SchoolClassSchedule.user_id == user_id).delete()
        db.commit()

        initial_courses = [
            {
                "course_name": "Lập trình Python",
                "course_code": "CSE101",
                "day_of_week": 2,
                "start_time": "15:35",
                "end_time": "18:15",
                "room": "A4-203",
                "lecturer": "Thầy Tuấn",
            }
        ]
        diff_and_update_schedule(db, user_id, initial_courses)
        course = db.query(SchoolClassSchedule).filter(
            SchoolClassSchedule.user_id == user_id,
            SchoolClassSchedule.course_code == "CSE101"
        ).first()
        assert course is not None
        assert course.room == "A4-203"

        # Cập nhật lịch mới có đổi phòng học
        updated_courses = [
            {
                "course_name": "Lập trình Python",
                "course_code": "CSE101",
                "day_of_week": 2,
                "start_time": "15:35",
                "end_time": "18:15",
                "room": "A6-201 (PC)",
                "lecturer": "Thầy Tuấn",
            }
        ]
        changes = diff_and_update_schedule(db, user_id, updated_courses)
        db.refresh(course)
        assert course.room == "A6-201 (PC)"
        assert len(changes) == 1
        assert "Đổi phòng" in changes[0]
    finally:
        db.close()


def test_phenikaa_sync_api_endpoints(auth_headers):
    # 1. GET /api/finance/phenikaa/sync-status
    res = client.get("/api/finance/phenikaa/sync-status", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["auto_sync_enabled"] is True
    assert data["sync_interval_days"] == 14
    assert data["student_id"] == "23010720"
    assert "days_until_next_sync" in data

    # 2. PUT /api/finance/phenikaa/configure-sync
    put_res = client.put(
        "/api/finance/phenikaa/configure-sync",
        headers=auth_headers,
        json={"sync_interval_days": 14, "auto_sync_enabled": True},
    )
    assert put_res.status_code == 200
    assert put_res.json()["sync_interval_days"] == 14

    # 3. POST /api/finance/phenikaa/trigger-sync
    trigger_res = client.post("/api/finance/phenikaa/trigger-sync", headers=auth_headers)
    assert trigger_res.status_code == 200
    res_data = trigger_res.json()
    assert res_data["success"] is True
    assert res_data["synced_count"] >= 1
    assert "next_sync_date" in res_data
