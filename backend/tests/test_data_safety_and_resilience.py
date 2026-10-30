import datetime
import pytest
from app.database import SessionLocal, get_db
from app.models import StudyGoal, StudySessionLog, DailyMatrixTask, TimeCapsule
from app.models_auth import User
from app.schemas import (
    StudyGoalResponse,
    StudySessionLogResponse,
    DailyMatrixTaskResponse,
    ConstellationAchievementResponse,
)
from app.routers.auth import UserResponse
from app.routers.focus_hub import delete_goal, toggle_matrix_task, create_matrix_task
from app.schemas import DailyMatrixTaskCreate


def test_schema_null_fallbacks():
    """Kiểm tra Pydantic schemas không bao giờ raise ValidationError khi DB chứa NULL"""
    # 1. StudyGoalResponse with nulls - Phải validate thành công 100% không văng exception
    goal_data = {
        "id": 9999,
        "title": "Mục tiêu kiểm thử fallback",
        "celestial_name": None,
        "goal_type": None,
        "target_hours": 0.0,
        "current_hours": 0.0,
        "target_date": None,
        "parent_id": None,
        "parent_title": None,
        "planet_type": None,
        "planet_data": None,
        "sub_goals_count": 0,
        "days_left": None,
        "hours_per_day_needed": None,
        "color": None,
        "category": None,
        "is_completed": False,
        "completed_at": None,
        "notes": None,
        "created_at": None,
        "updated_at": None,
        "progress_percent": 0.0,
        "remaining_hours": 0.0,
    }
    resp_goal = StudyGoalResponse(**goal_data)
    assert resp_goal.id == 9999
    assert resp_goal.title == "Mục tiêu kiểm thử fallback"

    # Khi không truyền color và category, schema tự dùng default fallback an toàn
    default_resp_goal = StudyGoalResponse(id=1, title="Mục tiêu mới")
    assert default_resp_goal.color == "#E24A4A"
    assert default_resp_goal.category == "Học tập"
    assert default_resp_goal.planet_type == "earth"

    # 2. StudySessionLogResponse with nulls
    session_data = {
        "id": 8888,
        "goal_id": None,
        "goal_title": None,
        "goal_color": None,
        "duration_minutes": 25,
        "duration_hours": 0.42,
        "session_date": None,
        "topic_note": None,
        "source": None,
        "created_at": None,
    }
    resp_session = StudySessionLogResponse(**session_data)
    assert resp_session.id == 8888
    assert resp_session.duration_minutes == 25

    default_session = StudySessionLogResponse(id=2)
    assert default_session.source == "manual"
    assert default_session.duration_hours == 0.0

    # 3. DailyMatrixTaskResponse with nulls
    task_data = {
        "id": 7777,
        "title": "Task test fallback",
        "description": None,
        "date": None,
        "quadrant": 2,
        "goal_id": None,
        "goal_title": None,
        "goal_color": None,
        "is_completed": False,
        "completed_at": None,
        "reflection_note": None,
        "order_index": None,
        "created_at": None,
        "updated_at": None,
    }
    resp_task = DailyMatrixTaskResponse(**task_data)
    assert resp_task.id == 7777
    assert resp_task.quadrant == 2

    default_task = DailyMatrixTaskResponse(id=3, title="Default Task")
    assert default_task.order_index == 0
    assert default_task.quadrant == 1
    assert default_task.is_completed is False

    # 4. UserResponse with nulls
    user_data = {
        "id": 6666,
        "username": "tester",
        "display_name": "Tester Fallback",
        "racer_avatar": None,
        "cheer_count": None,
        "is_admin": False,
        "level": 1,
        "exp": 0,
        "coins": 0,
        "streak": 0,
    }
    resp_user = UserResponse(**user_data)
    assert resp_user.id == 6666
    assert resp_user.username == "tester"

    default_user = UserResponse(id=7, username="u7", display_name="User 7")
    assert default_user.racer_avatar == "rocket"
    assert default_user.cheer_count == 0


def test_safe_goal_deletion_and_zero_data_loss():
    """Kiểm tra khi xóa StudyGoal:
    - StudySessionLog KHÔNG bị xóa (bảo toàn 100% giờ học).
    - DailyMatrixTask KHÔNG bị xóa (bảo toàn nhiệm vụ 4 ô).
    - Sub-goal không bị crash (chuyển thành goal độc lập).
    - TimeCapsule không bị crash.
    """
    db = SessionLocal()
    try:
        # Tạo test parent goal
        parent_goal = StudyGoal(
            title="Mục tiêu cha an toàn",
            target_hours=100.0,
            current_hours=10.0,
            color="#FF5722",
            category="Test",
        )
        db.add(parent_goal)
        db.commit()
        db.refresh(parent_goal)
        parent_id = parent_goal.id

        # Tạo sub-goal
        sub_goal = StudyGoal(
            title="Mục tiêu con an toàn",
            target_hours=20.0,
            parent_id=parent_id,
            color="#00BCD4",
            category="Test",
        )
        db.add(sub_goal)

        # Tạo session log liên kết
        session_log = StudySessionLog(
            goal_id=parent_id,
            duration_minutes=60,
            duration_hours=1.0,
            session_date=datetime.date.today(),
            topic_note="Phiên học quan trọng không được mất",
            source="pomodoro",
        )
        db.add(session_log)

        # Tạo matrix task liên kết
        matrix_task = DailyMatrixTask(
            title="Việc quan trọng liên kết mục tiêu",
            quadrant=1,
            date=datetime.date.today(),
            goal_id=parent_id,
            order_index=0,
        )
        db.add(matrix_task)

        # Tạo time capsule liên kết
        time_capsule = TimeCapsule(
            title="Hộp thời gian",
            message_content="Bức thư gửi tương lai",
            milestone_hours=50.0,
            goal_id=parent_id,
        )
        db.add(time_capsule)

        db.commit()
        db.refresh(sub_goal)
        db.refresh(session_log)
        db.refresh(matrix_task)
        db.refresh(time_capsule)

        session_id = session_log.id
        matrix_task_id = matrix_task.id
        sub_goal_id = sub_goal.id
        capsule_id = time_capsule.id

        # THỰC HIỆN XÓA MỤC TIÊU CHA
        res = delete_goal(parent_id, db)
        assert "bảo toàn" in res["message"]

        # XÁC MINH ZERO DATA LOSS
        # 1. Mục tiêu cha đã xóa
        assert db.query(StudyGoal).filter(StudyGoal.id == parent_id).first() is None

        # 2. Phiên học vẫn còn 100% trong DB nhưng goal_id = None
        survived_session = db.query(StudySessionLog).filter(StudySessionLog.id == session_id).first()
        assert survived_session is not None
        assert survived_session.goal_id is None
        assert survived_session.duration_minutes == 60

        # 3. Task ma trận vẫn còn 100% trong DB nhưng goal_id = None
        survived_task = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == matrix_task_id).first()
        assert survived_task is not None
        assert survived_task.goal_id is None
        assert survived_task.title == "Việc quan trọng liên kết mục tiêu"

        # 4. Sub-goal vẫn còn và trở thành mục tiêu độc lập (parent_id = None)
        survived_sub = db.query(StudyGoal).filter(StudyGoal.id == sub_goal_id).first()
        assert survived_sub is not None
        assert survived_sub.parent_id is None

        # 5. TimeCapsule vẫn còn
        survived_capsule = db.query(TimeCapsule).filter(TimeCapsule.id == capsule_id).first()
        assert survived_capsule is not None
        assert survived_capsule.goal_id is None

        # Dọn dẹp bản ghi test
        db.delete(survived_session)
        db.delete(survived_task)
        db.delete(survived_sub)
        db.delete(survived_capsule)
        db.commit()

    finally:
        db.close()


def test_twenty_matrix_tasks_reliability():
    """Tạo 20 công việc ma trận và toggle hoàn thành toàn bộ, kiểm tra 0 lỗi 500"""
    db = SessionLocal()
    task_ids = []
    try:
        today = datetime.date.today()
        for i in range(20):
            data = DailyMatrixTaskCreate(
                title=f"Reliability Task #{i + 1}",
                quadrant=(i % 4) + 1,
                date=today,
                description=f"Auto test resilience index {i}",
            )
            created = create_matrix_task(data, db, user=None)
            task_ids.append(created.id)

        assert len(task_ids) == 20

        # Toggle toàn bộ 20 task
        for tid in task_ids:
            updated = toggle_matrix_task(tid, db)
            assert updated.is_completed is True

        # Toggle lại để uncheck
        for tid in task_ids:
            updated = toggle_matrix_task(tid, db)
            assert updated.is_completed is False

        # Dọn dẹp
        for tid in task_ids:
            t = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == tid).first()
            if t:
                db.delete(t)
        db.commit()

    finally:
        db.close()
