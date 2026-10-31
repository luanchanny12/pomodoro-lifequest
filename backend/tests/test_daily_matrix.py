import pytest
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import StudyGoal, DailyMatrixTask

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(DailyMatrixTask).delete()
    db.commit()
    yield
    db.query(DailyMatrixTask).delete()
    db.commit()
    db.close()

def test_daily_matrix_crud_and_reflection():
    today = datetime.date.today().isoformat()

    # 1. Create a task in Q1 (Làm ngay)
    res = client.post("/api/focus/matrix", json={
        "title": "Nộp báo cáo môn A",
        "description": "Deadline 23:59 hôm nay",
        "quadrant": 1,
        "date": today,
    })
    assert res.status_code == 201
    q1_task = res.json()
    assert q1_task["title"] == "Nộp báo cáo môn A"
    assert q1_task["quadrant"] == 1
    assert q1_task["is_completed"] is False
    task_id = q1_task["id"]

    # 2. Create a task in Q2 (Lên lịch) with reflection note
    res2 = client.post("/api/focus/matrix", json={
        "title": "Luyện thanh và đàn guitar",
        "quadrant": 2,
        "date": today,
        "reflection_note": "Cần tập 20 phút mỗi ngày",
    })
    assert res2.status_code == 201
    q2_task = res2.json()
    assert q2_task["quadrant"] == 2

    # 3. List tasks for today
    list_res = client.get(f"/api/focus/matrix?date={today}")
    assert list_res.status_code == 200
    tasks = list_res.json()
    assert len(tasks) == 2

    # 4. Toggle completed
    toggle_res = client.patch(f"/api/focus/matrix/{task_id}/toggle")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_completed"] is True
    assert toggle_res.json()["completed_at"] is not None

    # 5. Update reflection note (personal self-assessment)
    ref_res = client.patch(f"/api/focus/matrix/{task_id}/reflection", json={
        "reflection_note": "Đã nộp xong lúc 15:00, giáo viên khen tốt!",
    })
    assert ref_res.status_code == 200
    assert ref_res.json()["reflection_note"] == "Đã nộp xong lúc 15:00, giáo viên khen tốt!"

    # 6. Delete task
    del_res = client.delete(f"/api/focus/matrix/{task_id}")
    assert del_res.status_code == 200
    assert del_res.json()["id"] == task_id

def test_matrix_rollover_and_monthly_summary():
    today = datetime.date.today()
    tomorrow = today + datetime.timedelta(days=1)

    # Create uncompleted task today
    client.post("/api/focus/matrix", json={
        "title": "Quét dọn phòng học",
        "quadrant": 3,
        "date": today.isoformat(),
        "reflection_note": "Hôm nay bận chưa kịp dọn",
    })

    # Rollover to tomorrow
    roll_res = client.post(f"/api/focus/matrix/rollover?from_date={today.isoformat()}&to_date={tomorrow.isoformat()}")
    assert roll_res.status_code == 200
    assert roll_res.json()["count"] == 1

    # Check tomorrow has the task
    tomorrow_list = client.get(f"/api/focus/matrix?date={tomorrow.isoformat()}").json()
    assert len(tomorrow_list) == 1
    assert tomorrow_list[0]["title"] == "Quét dọn phòng học"

    # Check monthly summary
    summary_res = client.get(f"/api/focus/matrix/monthly-summary?year={today.year}&month={today.month}")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_tasks"] >= 1
    assert "reflection_logs" in summary
    assert len(summary["reflection_logs"]) >= 1

def test_ai_buddy_prompt():
    prompt_res = client.get("/api/focus/ai-buddy/prompt")
    assert prompt_res.status_code == 200
    data = prompt_res.json()
    assert "message" in data
    assert "action_type" in data
    assert "action_label" in data
