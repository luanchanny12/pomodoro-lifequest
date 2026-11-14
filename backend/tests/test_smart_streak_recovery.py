import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models import Player, DailyMatrixTask, StudySessionLog, Achievement
from app.models_auth import User
from app.services.streak import vn_today, calculate_real_user_streak, update_user_streak
from app.routers.auth import create_access_token


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_smart_streak_recovery_and_grace_shield(db_session: Session):
    client = TestClient(app)

    # Tạo user test với lịch sử học 5 ngày liên tiếp
    u = User(
        username=f"streak_test_{int(datetime.datetime.utcnow().timestamp())}",
        password_hash="fakehash",
        salt="fakesalt",
        display_name="Test Streak User",
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)

    today = vn_today()

    # Giả lập hoàn thành task trong 5 ngày liên tục trong quá khứ (Day -6 đến Day -2)
    # Day -1 bị trống (ví dụ bận thi hoặc học muộn sau 00:00)
    for days_ago in range(6, 1, -1):
        d = today - datetime.timedelta(days=days_ago)
        task = DailyMatrixTask(
            user_id=u.id,
            title=f"Task ngày {d}",
            date=d,
            is_completed=True,
            completed_at=datetime.datetime.combine(d, datetime.time(20, 0)),
        )
        db_session.add(task)

    db_session.commit()

    # 1. Tại Day -2: Real streak phải là 5 ngày
    real_s, last_d = calculate_real_user_streak(db_session, u.id, target_date=today - datetime.timedelta(days=2))
    assert real_s == 5
    assert last_d == today - datetime.timedelta(days=2)

    # 2. Hôm nay (Day 0) user quay lại hoàn thành task:
    # Nhờ cơ chế Smart Grace Buffer (bảo vệ 1 ngày gián đoạn), streak không bị reset về 1 mà nối tiếp thành 6!
    today_task = DailyMatrixTask(
        user_id=u.id,
        title="Task hôm nay",
        date=today,
        is_completed=True,
        completed_at=datetime.datetime.utcnow(),
    )
    db_session.add(today_task)
    db_session.commit()

    player = update_user_streak(db_session, u.id, today)
    assert player.streak == 7
    assert player.last_streak_date == today

    # 3. Giả sử do lỗi trước đó streak bị lưu là 1:
    player.streak = 1
    db_session.commit()

    # Khi gọi /api/auth/me -> Hệ thống tự động phát hiện và chữa lành (self-healing)
    token = create_access_token(u.id, u.username, u.salt)
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    user_data = res.json()
    assert user_data["streak"] == 7

    # Refresh DB player để kiểm tra DB cũng được tự động hồi phục
    db_session.refresh(player)
    assert player.streak == 7
