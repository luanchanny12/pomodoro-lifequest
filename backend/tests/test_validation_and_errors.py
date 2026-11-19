import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import FinancialJar
from app.models_auth import User
from app.routers.auth import hash_password, create_access_token

client = TestClient(app)


@pytest.fixture
def auth_user():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "validator_user").first()
    if not user:
        pwd_hash, salt = hash_password("Validator@123")
        user = User(
            id=601,
            username="validator_user",
            display_name="Validator User",
            password_hash=pwd_hash,
            salt=salt,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id, user.username)
    headers = {"Authorization": f"Bearer {token}"}
    user_id = user.id
    db.close()
    return {"headers": headers, "user_id": user_id}


def test_expense_blocked_when_jar_balance_zero(auth_user):
    """Chặn chi tiêu khi hũ có 0đ, nêu rõ lỗi chi tiết."""
    db = SessionLocal()
    jar = FinancialJar(
        user_id=auth_user["user_id"],
        name="Hũ 0 Đồng",
        jar_type="CUSTOM",
        target_amount=1000000.0,
        current_balance=0.0,
    )
    db.add(jar)
    db.commit()
    db.refresh(jar)
    jar_id = jar.id
    db.close()

    res = client.post(
        "/api/finance/expense",
        headers=auth_user["headers"],
        json={
            "amount": 50000,
            "category": "an_uong",
            "description": "Ăn trưa cơm sườn",
            "jar_id": jar_id,
        },
    )
    assert res.status_code == 400
    detail = res.json()["detail"]
    assert "0đ (hết tiền)" in detail
    assert "Hũ 0 Đồng" in detail


def test_expense_blocked_when_amount_exceeds_balance(auth_user):
    """Chặn chi tiêu khi số tiền chi lớn hơn số dư trong hũ."""
    db = SessionLocal()
    jar = FinancialJar(
        user_id=auth_user["user_id"],
        name="Hũ Sinh Hoạt Ít Tiền",
        jar_type="LIVING",
        target_amount=1000000.0,
        current_balance=50000.0,
    )
    db.add(jar)
    db.commit()
    db.refresh(jar)
    jar_id = jar.id
    db.close()

    res = client.post(
        "/api/finance/expense",
        headers=auth_user["headers"],
        json={
            "amount": 110000,
            "category": "khac",
            "description": "cho lợn vay",
            "jar_id": jar_id,
        },
    )
    assert res.status_code == 400
    detail = res.json()["detail"]
    assert "50,000đ" in detail
    assert "110,000đ" in detail
    assert "không đủ để chi" in detail


def test_expense_blocked_on_invalid_amount(auth_user):
    """Chặn chi tiêu khi số tiền <= 0."""
    res = client.post(
        "/api/finance/expense",
        headers=auth_user["headers"],
        json={
            "amount": 0,
            "category": "an_uong",
            "description": "Test chi 0đ",
        },
    )
    assert res.status_code == 400
    assert "phải lớn hơn 0đ" in res.json()["detail"]


def test_gig_deposit_validation(auth_user):
    """Validate nạp ca chạy: số tiền > 0 và tổng tỷ lệ 100%."""
    # Amount <= 0
    res1 = client.post(
        "/api/finance/gig-deposit",
        headers=auth_user["headers"],
        json={"amount": 0, "tet_percent": 60, "living_percent": 40},
    )
    assert res1.status_code == 400
    assert "lớn hơn 0đ" in res1.json()["detail"]

    # Total percent != 100
    res2 = client.post(
        "/api/finance/gig-deposit",
        headers=auth_user["headers"],
        json={"amount": 200000, "tet_percent": 70, "living_percent": 50},
    )
    assert res2.status_code == 400
    assert "phải bằng đúng 100%" in res2.json()["detail"]


def test_tet_plan_validation(auth_user):
    """Validate cập nhật kế hoạch Tết: mục tiêu > 0, giờ ca hợp lý, tỷ lệ 100%."""
    # Target <= 0
    res1 = client.put(
        "/api/finance/tet-plan",
        headers=auth_user["headers"],
        json={"tet_target_amount": 0},
    )
    assert res1.status_code == 400
    assert "phải lớn hơn 0đ" in res1.json()["detail"]

    # Shift start >= end
    res2 = client.put(
        "/api/finance/tet-plan",
        headers=auth_user["headers"],
        json={"daily_shift_start": "16:00", "daily_shift_end": "10:00"},
    )
    assert res2.status_code == 400
    assert "phải sớm hơn giờ kết thúc ca" in res2.json()["detail"]

    # Split percent != 100
    res3 = client.put(
        "/api/finance/tet-plan",
        headers=auth_user["headers"],
        json={"default_tet_split_percent": 80, "default_living_split_percent": 30},
    )
    assert res3.status_code == 400
    assert "phải bằng đúng 100%" in res3.json()["detail"]


def test_school_schedule_validation(auth_user):
    """Validate thêm môn học: tên không rỗng, thứ 2..8, giờ học hợp lý."""
    # Empty course name
    res1 = client.post(
        "/api/finance/school-schedule",
        headers=auth_user["headers"],
        json={"course_name": "   ", "day_of_week": 2, "start_time": "07:00", "end_time": "09:40"},
    )
    assert res1.status_code == 400
    assert "không được để trống" in res1.json()["detail"]

    # Invalid day of week (e.g. 1 or 9)
    res2 = client.post(
        "/api/finance/school-schedule",
        headers=auth_user["headers"],
        json={"course_name": "Lập trình Python", "day_of_week": 9, "start_time": "07:00", "end_time": "09:40"},
    )
    assert res2.status_code == 400
    assert "từ Thứ 2 (2) đến Chủ Nhật (8)" in res2.json()["detail"]

    # Start time >= end time
    res3 = client.post(
        "/api/finance/school-schedule",
        headers=auth_user["headers"],
        json={"course_name": "Lập trình Python", "day_of_week": 4, "start_time": "12:00", "end_time": "09:00"},
    )
    assert res3.status_code == 400
    assert "phải sớm hơn giờ kết thúc" in res3.json()["detail"]


def test_goal_and_matrix_task_validation(auth_user):
    """Validate tạo mục tiêu và công việc ma trận không được có tiêu đề rỗng."""
    # Empty goal title
    res_goal = client.post(
        "/api/focus/goals",
        headers=auth_user["headers"],
        json={"title": "   ", "target_hours": 10},
    )
    assert res_goal.status_code == 400
    assert "không được để trống" in res_goal.json()["detail"]

    # Empty matrix task title
    res_task = client.post(
        "/api/focus/matrix",
        headers=auth_user["headers"],
        json={"title": "   ", "quadrant": 1},
    )
    assert res_task.status_code == 400
    assert "không được để trống" in res_task.json()["detail"]
