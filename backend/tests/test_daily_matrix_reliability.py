import pytest
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import DailyMatrixTask
from app.models_auth import User
from app.routers.auth import create_access_token

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    u = db.query(User).filter(User.username == "test_matrix_user").first()
    if u:
        db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == u.id).delete(synchronize_session=False)
    db.query(DailyMatrixTask).filter(DailyMatrixTask.title.like("Nhiệm vụ kiểm thử %")).delete(synchronize_session=False)
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    u = db.query(User).filter(User.username == "test_matrix_user").first()
    if u:
        db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == u.id).delete(synchronize_session=False)
    db.query(DailyMatrixTask).filter(DailyMatrixTask.title.like("Nhiệm vụ kiểm thử %")).delete(synchronize_session=False)
    db.commit()
    db.close()


def test_create_15_tasks_and_toggle_no_crash():
    db = SessionLocal()
    # Create test user
    db.query(User).filter(User.username == "test_matrix_user").delete()
    db.commit()
    user = User(username="test_matrix_user", display_name="Test Matrix", password_hash="hash", salt="salt")
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user_id=user.id, username=user.username)
    headers = {"Authorization": f"Bearer {token}"}

    today_str = datetime.date.today().isoformat()
    created_ids = []

    # 1. Create 15 distinct tasks across quadrants 1, 2, 3, 4
    for i in range(1, 16):
        quad = (i % 4) + 1
        res = client.post(
            "/api/focus/matrix",
            json={
                "title": f"Nhiệm vụ kiểm thử #{i}",
                "quadrant": quad,
                "date": today_str,
                "description": f"Mô tả cho việc số {i}",
            },
            headers=headers,
        )
        assert res.status_code == 201, f"Failed at task {i}: {res.text}"
        data = res.json()
        assert data["order_index"] == 0
        assert data["is_completed"] is False
        created_ids.append(data["id"])

    assert len(created_ids) == 15

    # 2. Toggle "complete" on each task one by one - MUST NOT CRASH
    for tid in created_ids:
        toggle_res = client.patch(f"/api/focus/matrix/{tid}/toggle", headers=headers)
        assert toggle_res.status_code == 200, f"Toggle failed for task {tid}: {toggle_res.text}"
        data = toggle_res.json()
        assert data["is_completed"] is True
        assert data["order_index"] == 0
        assert data["completed_at"] is not None

    # 3. Fetch all tasks from GET /api/focus/matrix - MUST RETURN ALL 15 TASKS
    get_res = client.get(f"/api/focus/matrix?date={today_str}", headers=headers)
    assert get_res.status_code == 200
    all_tasks = get_res.json()
    assert len(all_tasks) == 15
    for t in all_tasks:
        assert t["is_completed"] is True
        assert t["order_index"] == 0

    # 4. Toggle back to uncompleted for task #1
    t1_id = created_ids[0]
    uncomplete_res = client.patch(f"/api/focus/matrix/{t1_id}/toggle", headers=headers)
    assert uncomplete_res.status_code == 200
    assert uncomplete_res.json()["is_completed"] is False
    assert uncomplete_res.json()["completed_at"] is None

    db.close()
