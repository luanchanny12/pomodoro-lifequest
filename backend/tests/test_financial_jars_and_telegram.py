import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models_auth import User
from app.models import NotificationSetting, FinancialJar, JarTransaction, TetEarningPlan, SchoolClassSchedule
from app.routers.auth import hash_password, create_access_token

client = TestClient(app)


@pytest.fixture
def auth_headers():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "test_finance_user").first()
    if not user:
        pwd_hash, salt = hash_password("FinancePass@123")
        user = User(
            username="test_finance_user",
            display_name="Finance Tester",
            password_hash=pwd_hash,
            salt=salt,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Đảm bảo có notification_settings để test Telegram
    notif = db.query(NotificationSetting).filter(NotificationSetting.user_id == user.id).first()
    if not notif:
        notif = NotificationSetting(
            user_id=user.id,
            telegram_bot_token="fake_bot_token_12345",
            telegram_chat_id="999888777",
            telegram_enabled=True,
        )
        db.add(notif)
        db.commit()

    token = create_access_token(user.id, user.username)
    db.close()
    return {"Authorization": f"Bearer {token}"}


def test_get_or_create_default_jars(auth_headers):
    # Lấy danh sách hũ, nếu chưa có sẽ tự tạo 4 hũ mặc định
    res = client.get("/api/finance/jars", headers=auth_headers)
    assert res.status_code == 200
    jars = res.json()
    assert len(jars) >= 4
    jar_types = [j["jar_type"] for j in jars]
    assert "TET" in jar_types
    assert "LIVING" in jar_types
    assert "SKILL" in jar_types
    assert "EMERGENCY" in jar_types


def test_create_and_update_custom_jar(auth_headers):
    # Tạo hũ tùy chỉnh
    create_res = client.post(
        "/api/finance/jars",
        headers=auth_headers,
        json={
            "name": "Hũ Mua Xe Mới",
            "jar_type": "CUSTOM",
            "target_amount": 20000000.0,
            "current_balance": 1000000.0,
            "icon": "🏍️",
            "color": "#3B82F6",
            "note": "Tiền đổi xe mới đi làm",
        },
    )
    assert create_res.status_code == 200
    jar_data = create_res.json()
    assert jar_data["name"] == "Hũ Mua Xe Mới"
    assert jar_data["target_amount"] == 20000000.0
    assert jar_data["current_balance"] == 1000000.0
    jar_id = jar_data["id"]

    # Cập nhật hũ
    update_res = client.put(
        f"/api/finance/jars/{jar_id}",
        headers=auth_headers,
        json={"target_amount": 25000000.0, "icon": "⚡"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["target_amount"] == 25000000.0
    assert update_res.json()["icon"] == "⚡"

    # Xóa hũ tùy chỉnh
    del_res = client.delete(f"/api/finance/jars/{jar_id}", headers=auth_headers)
    assert del_res.status_code == 200


def test_fast_expense_deduction(auth_headers):
    # Ghi nhận chi tiêu
    res = client.post(
        "/api/finance/expense",
        headers=auth_headers,
        json={
            "amount": 45000.0,
            "category": "an_uong",
            "description": "Ăn trưa cơm sườn",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["transaction"]["amount"] == -45000.0
    assert "Ăn trưa cơm sườn" in data["transaction"]["description"]
    assert "advice" in data


def test_gig_deposit_and_auto_allocation(auth_headers):
    # Nạp thu nhập ca chạy 10h-14h (260.000đ)
    res = client.post(
        "/api/finance/gig-deposit",
        headers=auth_headers,
        json={
            "amount": 260000.0,
            "tet_percent": 60.0,
            "living_percent": 40.0,
            "description": "Thu nhập chạy xe 10h-14h",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_amount"] == 260000.0
    assert data["tet_deposited"] == 156000.0
    assert data["living_deposited"] == 104000.0
    assert "Thành công" in data["message"] or "nạp thành công" in data["message"].lower() or "xuất sắc" in data["message"].lower()


def test_tet_plan_and_dual_coach(auth_headers):
    # Lấy kế hoạch Tết
    plan_res = client.get("/api/finance/tet-plan", headers=auth_headers)
    assert plan_res.status_code == 200
    plan = plan_res.json()
    assert plan["daily_shift_start"] == "10:00"
    assert plan["daily_shift_end"] == "14:00"
    assert plan["home_arrival_time"] == "15:00"
    assert plan["days_remaining"] > 0
    assert plan["daily_target_needed"] > 0

    # Lấy lời khuyên Dual-Coach AI
    advice_res = client.get("/api/finance/dual-coach-advice", headers=auth_headers)
    assert advice_res.status_code == 200
    advice = advice_res.json()
    assert "10:00" in advice["financial_advice"] or "10h" in advice["financial_advice"] or "chỉ tiêu" in advice["financial_advice"].lower()
    assert "14h" in advice["study_skill_advice"] or "15h" in advice["study_skill_advice"] or "kỷ luật" in advice["study_skill_advice"].lower()
    assert len(advice["daily_schedule_summary"]) >= 3


def test_school_schedule_and_calendar_deadlines(auth_headers):
    # Thêm môn học vào thời khóa biểu
    sched_res = client.post(
        "/api/finance/school-schedule",
        headers=auth_headers,
        json={
            "course_code": "IT101",
            "course_name": "Lập Trình Web Nâng Cao",
            "day_of_week": 2,  # Thứ 2
            "start_time": "07:00",
            "end_time": "09:15",
            "room": "A7-302",
            "lecturer": "Thầy Nam",
            "semester": "Kỳ 1 2026-2027",
        },
    )
    assert sched_res.status_code == 200
    sched_id = sched_res.json()["id"]

    # Kiểm tra danh sách thời khóa biểu
    list_res = client.get("/api/finance/school-schedule", headers=auth_headers)
    assert list_res.status_code == 200
    courses = [c["course_name"] for c in list_res.json()]
    assert "Lập Trình Web Nâng Cao" in courses

    # Kích hoạt ca làm việc để kiểm tra chiếu lên lịch
    client.put("/api/finance/tet-plan", headers=auth_headers, json={"shift_enabled": True})

    # Kiểm tra deadlines feed (chiếu lên lịch tháng và thẻ ngày)
    deadlines_res = client.get("/api/focus/deadlines", headers=auth_headers)
    assert deadlines_res.status_code == 200
    deadlines = deadlines_res.json()["items"]
    types = [d["type"] for d in deadlines]
    assert "school_class" in types
    assert "gig_shift" in types

    # Cleanup môn học
    del_res = client.delete(f"/api/finance/school-schedule/{sched_id}", headers=auth_headers)
    assert del_res.status_code == 200


def test_bank_sepay_webhook():
    # Webhook nhận tiền vào (thu nhập ca chạy)
    in_payload = {
        "id": 999123,
        "gateway": "Vietcombank",
        "transferType": "in",
        "transferAmount": 270000.0,
        "content": "Nhan thu nhap chay xe",
    }
    in_res = client.post("/api/finance/webhook/sepay", json=in_payload)
    assert in_res.status_code == 200
    assert in_res.json()["success"] is True

    # Webhook chuyển tiền ra (chi tiêu)
    out_payload = {
        "id": 999124,
        "gateway": "MBBank",
        "transferType": "out",
        "transferAmount": 55000.0,
        "content": "Chuyen khoan com trua",
    }
    out_res = client.post("/api/finance/webhook/sepay", json=out_payload)
    assert out_res.status_code == 200
    assert out_res.json()["success"] is True


def test_telegram_interactive_webhook():
    # Giả lập lệnh /start
    start_payload = {
        "update_id": 10001,
        "message": {
            "message_id": 1,
            "chat": {"id": 999888777},
            "text": "/start",
        },
    }
    res_start = client.post("/api/notifications/telegram-webhook", json=start_payload)
    assert res_start.status_code == 200
    assert res_start.json()["ok"] is True

    # Giả lập lệnh /hu
    hu_payload = {
        "update_id": 10002,
        "message": {
            "message_id": 2,
            "chat": {"id": 999888777},
            "text": "/hu",
        },
    }
    res_hu = client.post("/api/notifications/telegram-webhook", json=hu_payload)
    assert res_hu.status_code == 200

    # Giả lập bấm nút chọn danh mục chi tiêu: cat_an_uong_50000
    cb_payload = {
        "update_id": 10003,
        "callback_query": {
            "id": "cq_12345",
            "data": "cat_an_uong_50000",
            "message": {
                "message_id": 10,
                "chat": {"id": 999888777},
            },
        },
    }
    res_cb = client.post("/api/notifications/telegram-webhook", json=cb_payload)
    assert res_cb.status_code == 200

    # Giả lập bấm nút nạp ca chạy: gig_split_250000
    cb_gig = {
        "update_id": 10004,
        "callback_query": {
            "id": "cq_12346",
            "data": "gig_split_250000",
            "message": {
                "message_id": 11,
                "chat": {"id": 999888777},
            },
        },
    }
    res_gig = client.post("/api/notifications/telegram-webhook", json=cb_gig)
    assert res_gig.status_code == 200
