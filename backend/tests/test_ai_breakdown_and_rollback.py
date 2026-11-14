import datetime
import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models import DailyMatrixTask, StudyGoal, AIBreakdownLog
from app.models_auth import User
from app.routers.auth import hash_password, create_access_token

client = TestClient(app)


@pytest.fixture
def test_user_headers():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "test_ai_breakdown_user").first()
    if not user:
        pwd_hash, salt = hash_password("PassAIBreakdown@123")
        user = User(
            username="test_ai_breakdown_user",
            display_name="AI Breakdown User",
            password_hash=pwd_hash,
            salt=salt,
            is_admin=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Clean up test user's data for isolation
    db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user.id).delete()
    db.query(StudyGoal).filter(StudyGoal.user_id == user.id).delete()
    db.query(AIBreakdownLog).filter(AIBreakdownLog.user_id == user.id).delete()
    db.commit()

    token = create_access_token(user.id, user.username)
    uid = user.id
    db.close()
    return {"Authorization": f"Bearer {token}", "user_id": uid}


def test_preview_ai_breakdown_does_not_save_to_db(test_user_headers):
    headers = {"Authorization": test_user_headers["Authorization"]}
    user_id = test_user_headers["user_id"]

    today = datetime.date.today()
    target = today + datetime.timedelta(days=4)

    # 1. Gọi preview
    res = client.post(
        "/api/focus/ai/breakdown-preview",
        json={
            "title": "Ôn thi Cuối Kỳ Thương Mại Điện Tử",
            "target_date": target.isoformat(),
            "daily_hours": 1.5,
            "notes_or_syllabus": "Chương 1 B2B; Chương 2 B2C; Chương 3 Ví điện tử; Chương 4 An toàn SSL",
            "quadrant": 1,
        },
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "explanation" in data
    assert len(data["explanation"]) > 10
    assert "tasks" in data
    assert data["days_count"] == 5
    assert len(data["tasks"]) == 5
    assert data["tasks"][0]["quadrant"] == 1

    # 2. XÁC MINH CHỐT CHẶN AN TOÀN: Database chưa hề lưu bất kỳ task hay log nào!
    db = SessionLocal()
    task_count = db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user_id).count()
    log_count = db.query(AIBreakdownLog).filter(AIBreakdownLog.user_id == user_id).count()
    db.close()

    assert task_count == 0, "Preview tuyệt đối không được phép tự ý lưu task vào database!"
    assert log_count == 0


def test_apply_ai_breakdown_and_rollback(test_user_headers):
    headers = {"Authorization": test_user_headers["Authorization"]}
    user_id = test_user_headers["user_id"]

    today = datetime.date.today()
    d1 = today.isoformat()
    d2 = (today + datetime.timedelta(days=1)).isoformat()
    d3 = (today + datetime.timedelta(days=2)).isoformat()

    tasks_payload = [
        {"title": "Ôn Chương 1-2 TMĐT", "date": d1, "quadrant": 1, "duration_minutes": 90, "notes": "Đọc slide"},
        {"title": "Ôn Chương 3 Thanh Toán", "date": d2, "quadrant": 1, "duration_minutes": 90, "notes": "Phân tích Momo"},
        {"title": "Thi thử 90 phút", "date": d3, "quadrant": 1, "duration_minutes": 90, "notes": "Bấm giờ"},
    ]

    # 1. Apply khi người dùng bấm đồng ý
    res_apply = client.post(
        "/api/focus/ai/apply-breakdown",
        json={
            "title": "Ôn thi Thương Mại Điện Tử",
            "target_date": d3,
            "explanation": "Lộ trình 3 ngày ôn tập.",
            "tasks": tasks_payload,
            "create_parent_goal": True,
        },
        headers=headers,
    )
    assert res_apply.status_code == 200
    body_apply = res_apply.json()
    assert body_apply["ok"] is True
    assert body_apply["count"] == 3
    batch_id = body_apply["batch_id"]
    assert batch_id.startswith("aibk_")

    # Kiểm tra DB đã có 3 task và 1 batch log
    db = SessionLocal()
    tasks_in_db = db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user_id).all()
    assert len(tasks_in_db) == 3
    assert all(t.quadrant == 1 for t in tasks_in_db)

    batch_log = db.query(AIBreakdownLog).filter(AIBreakdownLog.batch_id == batch_id).first()
    assert batch_log is not None
    assert batch_log.is_reverted is False
    created_task_ids = json.loads(batch_log.created_task_ids)
    assert len(created_task_ids) == 3
    db.close()

    # 2. Hoàn tác (Rollback)
    res_rollback = client.post(
        "/api/focus/ai/rollback-breakdown",
        json={"batch_id": batch_id},
        headers=headers,
    )
    assert res_rollback.status_code == 200
    body_rollback = res_rollback.json()
    assert body_rollback["ok"] is True
    assert body_rollback["deleted_count"] == 3

    # Kiểm tra DB sau khi rollback: Các task AI đã bị xóa sạch!
    db = SessionLocal()
    tasks_after = db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user_id).all()
    assert len(tasks_after) == 0, "Toàn bộ task của đợt chia này phải được xóa sạch sau khi hoàn tác!"

    batch_log_after = db.query(AIBreakdownLog).filter(AIBreakdownLog.batch_id == batch_id).first()
    assert batch_log_after.is_reverted is True
    assert batch_log_after.reverted_at is not None
    db.close()


def test_rollback_preserves_other_user_tasks(test_user_headers):
    """
    ĐẢM BẢO TUYỆT ĐỐI: Khi hoàn tác một đợt chia của AI,
    toàn bộ nhiệm vụ cũ khác của người dùng KHÔNG BAO GIỜ BỊ ẢNH HƯỞNG.
    """
    headers = {"Authorization": test_user_headers["Authorization"]}
    user_id = test_user_headers["user_id"]
    today = datetime.date.today()

    # 1. Tạo 1 task có sẵn của người dùng
    db = SessionLocal()
    pre_existing_task = DailyMatrixTask(
        user_id=user_id,
        title="Nhiệm vụ cá nhân quan trọng của tôi",
        date=today,
        quadrant=1,
        description="Không được phép xóa task này!",
        is_completed=False,
    )
    db.add(pre_existing_task)
    db.commit()
    db.refresh(pre_existing_task)
    original_id = pre_existing_task.id
    db.close()

    # 2. Áp dụng 1 đợt chia lịch AI
    res_apply = client.post(
        "/api/focus/ai/apply-breakdown",
        json={
            "title": "Môn học phụ AI chia",
            "target_date": (today + datetime.timedelta(days=2)).isoformat(),
            "tasks": [
                {"title": "Task AI 1", "date": today.isoformat(), "quadrant": 1},
                {"title": "Task AI 2", "date": (today + datetime.timedelta(days=1)).isoformat(), "quadrant": 1},
            ],
        },
        headers=headers,
    )
    batch_id = res_apply.json()["batch_id"]

    # 3. Người dùng bấm Hoàn tác đợt chia AI
    res_rollback = client.post(
        "/api/focus/ai/rollback-breakdown",
        json={"batch_id": batch_id},
        headers=headers,
    )
    assert res_rollback.status_code == 200

    # 4. Xác minh: Task ban đầu của người dùng VẪN CÒN NGUYÊN VẸN!
    db = SessionLocal()
    existing = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == original_id).first()
    assert existing is not None, "Dữ liệu cũ của người dùng phải được bảo toàn nguyên vẹn 100%!"
    assert existing.title == "Nhiệm vụ cá nhân quan trọng của tôi"
    db.close()


def test_bulk_import_and_history(test_user_headers):
    headers = {"Authorization": test_user_headers["Authorization"]}
    today = datetime.date.today()

    # 1. Import danh sách từ CSV/JSON
    import_res = client.post(
        "/api/focus/import/tasks",
        json={
            "title": "Import Thời Khóa Biểu Trường Phenikaa",
            "tasks": [
                {"title": "Lịch thi: Triết học Mác-Lênin", "date": today.isoformat(), "quadrant": 1, "notes": "Phòng A4-301"},
                {"title": "Lịch thi: Xác suất thống kê", "date": (today + datetime.timedelta(days=3)).isoformat(), "quadrant": 1, "notes": "Phòng A4-202"},
            ],
        },
        headers=headers,
    )
    assert import_res.status_code == 200
    body = import_res.json()
    assert body["ok"] is True
    assert body["count"] == 2
    import_batch_id = body["batch_id"]

    # 2. Xem lịch sử
    hist_res = client.get("/api/focus/ai/breakdown-history", headers=headers)
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert len(hist) >= 1
    assert any(h["batch_id"] == import_batch_id for h in hist)

    # 3. Hoàn tác cả đợt import
    rollback_res = client.post(
        "/api/focus/ai/rollback-breakdown",
        json={"batch_id": import_batch_id},
        headers=headers,
    )
    assert rollback_res.status_code == 200
    assert rollback_res.json()["deleted_count"] == 2
