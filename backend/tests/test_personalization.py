import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import SchoolClassSchedule, FinancialJar, TetEarningPlan
from app.models_auth import User
from app.routers.auth import hash_password, create_access_token

client = TestClient(app)


@pytest.fixture
def auth_users():
    db = SessionLocal()
    # User 1: Sinh viên bình thường, không chạy xe, học Bách Khoa
    user_bk = db.query(User).filter(User.username == "student_bachkhoa").first()
    if not user_bk:
        pwd_hash, salt = hash_password("Password@123")
        user_bk = User(
            id=501,
            username="student_bachkhoa",
            display_name="Sinh Viên Bách Khoa",
            password_hash=pwd_hash,
            salt=salt,
            is_active=True,
        )
        db.add(user_bk)
        db.commit()
        db.refresh(user_bk)

    # User 2: Người làm gia sư
    user_tutor = db.query(User).filter(User.username == "tutor_math").first()
    if not user_tutor:
        pwd_hash, salt = hash_password("Password@123")
        user_tutor = User(
            id=502,
            username="tutor_math",
            display_name="Gia Sư Toán",
            password_hash=pwd_hash,
            salt=salt,
            is_active=True,
        )
        db.add(user_tutor)
        db.commit()
        db.refresh(user_tutor)

    # User 3: Tài khoản Luân (user_id = 10)
    user_luan = db.query(User).filter(User.id == 10).first()
    if not user_luan:
        pwd_hash, salt = hash_password("Password@123")
        user_luan = User(
            id=10,
            username="luanchanny1211",
            display_name="Luân Đẹp Trai",
            password_hash=pwd_hash,
            salt=salt,
            is_active=True,
        )
        db.add(user_luan)
        db.commit()
        db.refresh(user_luan)

    token_bk = create_access_token(user_bk.id, user_bk.username)
    token_tutor = create_access_token(user_tutor.id, user_tutor.username)
    token_luan = create_access_token(user_luan.id, user_luan.username)

    db.close()
    return {
        "bk": {"token": token_bk, "id": user_bk.id},
        "tutor": {"token": token_tutor, "id": user_tutor.id},
        "luan": {"token": token_luan, "id": user_luan.id},
    }


def test_user_without_shift_has_no_gig_events(auth_users):
    """Người dùng mới có shift_enabled = False thì Lịch Deadline không bị chèn ca chạy xe."""
    headers = {"Authorization": f"Bearer {auth_users['bk']['token']}"}

    # Ban đầu gọi /deadlines
    res = client.get("/api/focus/deadlines", headers=headers)
    assert res.status_code == 200
    deadlines = res.json()["items"]

    # Không có bất kỳ event nào là gig_shift
    gig_items = [d for d in deadlines if d.get("type") == "gig_shift"]
    assert len(gig_items) == 0


def test_user_with_custom_shift(auth_users):
    """Người dùng có thể bật ca kiếm tiền riêng (ví dụ: Ca gia sư 18h-21h) và hiển thị đúng trên lịch."""
    headers = {"Authorization": f"Bearer {auth_users['tutor']['token']}"}

    # Cập nhật ca kiếm tiền
    update_res = client.put(
        "/api/finance/tet-plan",
        headers=headers,
        json={
            "plan_name": "Quỹ Mua Laptop Mới",
            "tet_target_amount": 20000000,
            "shift_enabled": True,
            "shift_name": "Ca gia sư buổi tối",
            "daily_shift_start": "18:00",
            "daily_shift_end": "21:00",
            "home_arrival_time": "21:30",
            "primary_skill_focus": "Luyện thi Olympic Toán",
        },
    )
    assert update_res.status_code == 200
    plan_data = update_res.json()
    assert plan_data["plan_name"] == "Quỹ Mua Laptop Mới"
    assert plan_data["shift_enabled"] is True
    assert plan_data["shift_name"] == "Ca gia sư buổi tối"

    # Kiểm tra /deadlines sinh đúng sự kiện theo tên ca riêng
    deadlines_res = client.get("/api/focus/deadlines", headers=headers)
    assert deadlines_res.status_code == 200
    deadlines = deadlines_res.json()["items"]
    gig_items = [d for d in deadlines if d.get("type") == "gig_shift"]
    assert len(gig_items) > 0
    assert "Ca gia sư buổi tối" in gig_items[0]["title"]
    assert "18:00 - 21:00" in gig_items[0]["title"]

    # Kiểm tra Dual-Coach Advice khuyên đúng theo ca gia sư
    advice_res = client.get("/api/finance/dual-coach-advice", headers=headers)
    assert advice_res.status_code == 200
    advice = advice_res.json()
    assert "Ca gia sư buổi tối" in advice["financial_advice"] or "Quỹ Mua Laptop Mới" in advice["financial_advice"]
    assert "Olympic Toán" in advice["study_skill_advice"] or any("Olympic Toán" in b.get("title", "") for b in advice["daily_schedule_summary"])


def test_apply_jar_templates(auth_users):
    """Kiểm tra áp dụng các mẫu Hũ tài chính (6 lọ Harv Eker, 3 hũ đơn giản)."""
    headers = {"Authorization": f"Bearer {auth_users['bk']['token']}"}

    # Áp dụng mẫu 6 lọ
    res_six = client.post("/api/finance/jars/apply-template", headers=headers, json={"template_type": "six_jars"})
    assert res_six.status_code == 200
    jars = res_six.json()
    assert len(jars) == 6
    names = [j["name"] for j in jars]
    assert any("Thiết Yếu" in n for n in names)
    assert any("Tiết Kiệm Dài Hạn" in n for n in names)
    assert any("Tự Do Tài Chính" in n for n in names)

    # Áp dụng mẫu 3 hũ đơn giản
    res_three = client.post("/api/finance/jars/apply-template", headers=headers, json={"template_type": "simple_three"})
    assert res_three.status_code == 200
    jars3 = res_three.json()
    assert len(jars3) == 3


def test_luan_account_preserves_shift_and_courses(auth_users):
    """Tài khoản Luân (user_id = 10) luôn được bảo toàn ca chạy xe và dữ liệu cá nhân."""
    headers = {"Authorization": f"Bearer {auth_users['luan']['token']}"}

    plan_res = client.get("/api/finance/tet-plan", headers=headers)
    assert plan_res.status_code == 200
    plan = plan_res.json()
    assert plan["shift_enabled"] is True
    assert plan["shift_name"] == "Ca chạy xe"
    assert plan["daily_shift_start"] == "10:00"
    assert plan["daily_shift_end"] == "14:00"
