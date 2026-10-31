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


def test_past_unfinished_tasks_cannot_be_toggled():
    from app.routers.focus_hub import vn_today
    today = vn_today()
    yesterday = today - datetime.timedelta(days=1)

    # 1. Tạo một công việc trong quá khứ (hôm qua) chưa hoàn thành
    db = SessionLocal()
    past_task = DailyMatrixTask(
        title="Bài tập chưa xong hôm qua",
        date=yesterday,
        quadrant=1,
        is_completed=False,
    )
    db.add(past_task)
    db.commit()
    db.refresh(past_task)
    past_task_id = past_task.id
    db.close()

    # 2. Cố gắng toggle hoàn thành nhiệm vụ hôm qua -> BỊ CHẶN VỚI MÃ LỖI 400
    toggle_res = client.patch(f"/api/focus/matrix/{past_task_id}/toggle")
    assert toggle_res.status_code == 400
    assert "quá khứ" in toggle_res.json()["detail"].lower()

    # 3. Cố gắng update is_completed = True qua endpoint update -> BỊ CHẶN 400
    update_res = client.put(f"/api/focus/matrix/{past_task_id}", json={"is_completed": True})
    assert update_res.status_code == 400
    assert "quá khứ" in update_res.json()["detail"].lower()


def test_auto_rollover_to_today_and_tomorrow():
    from app.routers.focus_hub import vn_today
    today = vn_today()
    yesterday = today - datetime.timedelta(days=1)
    tomorrow = today + datetime.timedelta(days=1)

    # 1. Tạo việc chưa xong ở ngày hôm qua
    db = SessionLocal()
    task_yesterday = DailyMatrixTask(
        title="Lập trình React Native",
        date=yesterday,
        quadrant=2,
        is_completed=False,
        description="Ôn lại navigation",
    )
    db.add(task_yesterday)
    db.commit()
    db.close()

    # 2. Gọi GET /matrix cho ngày hôm nay -> Việc của hôm qua phải tự động xuất hiện ở hôm nay!
    today_res = client.get(f"/api/focus/matrix?date={today.isoformat()}")
    assert today_res.status_code == 200
    today_tasks = today_res.json()
    matching = [t for t in today_tasks if t["title"] == "Lập trình React Native"]
    assert len(matching) == 1
    today_task = matching[0]
    assert today_task["date"] == today.isoformat()
    assert today_task["quadrant"] == 2
    assert today_task["is_completed"] is False
    assert "Tự động chuyển từ" in (today_task["reflection_note"] or "")

    # 3. Ngày hôm nay có thể toggle hoàn thành bình thường!
    toggle_res = client.patch(f"/api/focus/matrix/{today_task['id']}/toggle")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_completed"] is True

    # 4. Tạo việc chưa xong ở HÔM NAY
    create_res = client.post("/api/focus/matrix", json={
        "title": "Học 50 từ vựng Kanji",
        "quadrant": 1,
        "date": today.isoformat(),
    })
    assert create_res.status_code == 201
    kanji_task_id = create_res.json()["id"]

    # 5. Gọi GET /matrix cho NGÀY MAI -> Việc Kanji chưa xong của hôm nay tự động được chuyển sang ngày mai!
    tomorrow_res = client.get(f"/api/focus/matrix?date={tomorrow.isoformat()}")
    assert tomorrow_res.status_code == 200
    tomorrow_tasks = tomorrow_res.json()
    kanji_tomorrow = [t for t in tomorrow_tasks if t["title"] == "Học 50 từ vựng Kanji"]
    assert len(kanji_tomorrow) == 1
    assert kanji_tomorrow[0]["date"] == tomorrow.isoformat()

    # 6. Khi người dùng hoàn thành việc Kanji ở HÔM NAY -> bản sao ở ngày mai tự động dọn sạch
    done_today = client.patch(f"/api/focus/matrix/{kanji_task_id}/toggle")
    assert done_today.status_code == 200
    assert done_today.json()["is_completed"] is True

    # Kiểm tra lại ngày mai: bản sao Kanji đã được dọn sạch vì hôm nay đã hoàn thành!
    tomorrow_res_after = client.get(f"/api/focus/matrix?date={tomorrow.isoformat()}")
    assert tomorrow_res_after.status_code == 200
    tomorrow_tasks_after = tomorrow_res_after.json()
    assert not any(t["title"] == "Học 50 từ vựng Kanji" for t in tomorrow_tasks_after)
