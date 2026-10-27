"""
Tests cho AI Brain, AI Planner, AI Predictor
"""
import pytest
from datetime import date, timedelta
from app.database import SessionLocal, engine, Base
from app.models import *
from app.ai.ai_brain import track_learning, get_next_lesson
from app.ai.ai_planner import generate_daily_plan
from app.ai.ai_predictor import predict_goal_completion, calculate_pace
from app.ai.ai_reviewer import generate_daily_review, calculate_life_score
from app.ai.energy_manager import get_energy_for_task, get_max_energy, can_do_task


@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


def test_get_energy_for_task(db):
    assert get_energy_for_task("ipa") == 10
    assert get_energy_for_task("kubernetes") == 120
    assert get_energy_for_task("unknown") == 30


def test_get_max_energy(db):
    assert get_max_energy(8) == 100
    assert get_max_energy(5) >= 40
    assert get_max_energy(10) == 100


def test_calculate_pace(db):
    for i in range(7):
        d = date.today() - timedelta(days=i)
        db.add(StudyHour(date=d, goal_type="ielts", hours=2.0))
    db.commit()
    pace = calculate_pace(db, "ielts", days_back=30)
    assert pace > 0


def test_predict_goal_completion(db):
    db.add(Goal(name="Test IELTS", type="ielts", target_value=6.5, current_value=4.5, deadline=date.today() + timedelta(days=100)))
    for i in range(7):
        db.add(StudyHour(date=date.today() - timedelta(days=i), goal_type="ielts", hours=2.0))
    db.commit()
    result = predict_goal_completion(db, "ielts")
    assert "predicted_date" in result
    assert "current_pace" in result


def test_generate_daily_plan(db):
    db.add(Goal(name="Test GPA", type="gpa", target_value=3.0, current_value=2.5, deadline=date.today() + timedelta(days=30)))
    db.add(Goal(name="Test IELTS", type="ielts", target_value=6.5, current_value=4.5, deadline=date.today() + timedelta(days=60)))
    db.add(Goal(name="Test DevOps", type="devops", target_value=100, current_value=25, deadline=date.today() + timedelta(days=90)))
    db.add(Player(level=1, exp=0, coins=0, streak=0))
    db.add(RoadmapLesson(goal_type="gpa", module_name="Test", lesson_name="Lesson 1", order_index=1, difficulty=1, energy_cost=20, exp_reward=15, estimated_minutes=30, description="Test"))
    db.add(RoadmapLesson(goal_type="ielts", module_name="Test", lesson_name="Lesson 1", order_index=1, difficulty=1, energy_cost=20, exp_reward=15, estimated_minutes=30, description="Test"))
    db.add(RoadmapLesson(goal_type="devops", module_name="Test", lesson_name="Lesson 1", order_index=1, difficulty=1, energy_cost=20, exp_reward=15, estimated_minutes=30, description="Test"))
    db.commit()
    plan = generate_daily_plan(db, user_id=1)
    assert "summary" in plan
    assert "blocks" in plan
    assert "reason" in plan


def test_calculate_life_score(db):
    db.add(Goal(name="GPA", type="gpa", target_value=3.0, current_value=2.5))
    db.add(Goal(name="IELTS", type="ielts", target_value=6.5, current_value=4.5))
    db.add(Goal(name="DevOps", type="devops", target_value=100, current_value=25))
    db.add(Player(level=1, exp=0, coins=0, streak=0))
    db.commit()
    score = calculate_life_score(db)
    assert "score" in score
    assert 0 <= score["score"] <= 100


def test_get_next_lesson(db):
    db.add(RoadmapLesson(goal_type="devops", module_name="Linux", lesson_name="pwd/ls", order_index=1, difficulty=1, energy_cost=20, exp_reward=15, estimated_minutes=30, description="test"))
    db.add(RoadmapLesson(goal_type="devops", module_name="Linux", lesson_name="cd/mkdir", order_index=2, difficulty=1, energy_cost=20, exp_reward=15, estimated_minutes=30, description="test"))
    db.commit()
    result = get_next_lesson(db, "devops")
    assert result is not None
    assert "done" not in result or not result.get("done")


def test_generate_daily_review(db):
    review = generate_daily_review(db)
    assert "rating" in review
    assert "completion_percent" in review


def test_can_do_task(db):
    assert can_do_task(db, "ipa")
