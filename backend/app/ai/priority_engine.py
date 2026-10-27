from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models import Goal, Task, StudyHour, Player
from app.models_v2 import SpacedRepetition, LearningPattern
from app.ai.energy_manager import get_energy_for_task
from app.ai.risk_engine import calculate_risk_score


def calculate_priority_score(db: Session, goal_type: str,
                             current_energy: int = 100,
                             query_date: date = None) -> dict:
    if query_date is None:
        query_date = date.today()

    goal = db.query(Goal).filter(Goal.type == goal_type).first()
    if not goal:
        return {"goal_type": goal_type, "score": 0}

    days_until = (goal.deadline - query_date).days if goal.deadline else 365
    deadline_weight = max(1, 365 - days_until) / 365.0 * 100

    remaining = max(0, goal.target_value - goal.current_value)
    learning_gap = remaining / max(1, goal.target_value) * 100
    current_progress = min(100, goal.progress_percent or 0)
    progress_factor = max(10, 100 - current_progress)

    energy_needed = get_energy_for_task(goal_type)
    energy_factor = max(0, current_energy - energy_needed) / max(1, current_energy) * 100

    reps = db.query(SpacedRepetition).filter(
        SpacedRepetition.goal_type == goal_type
    ).all()
    avg_retention = sum(r.retention_score for r in reps) / max(1, len(reps))
    retention_factor = max(0, (1 - avg_retention) * 100)

    risk_info = calculate_risk_score(db, goal_type)
    risk_factor = risk_info.get("score", 0)

    priority_scores = {"gpa": 1.0, "ielts": 1.2, "devops": 1.5}
    importance = priority_scores.get(goal_type, 1.0)

    remaining_days_factor = max(0, min(100, (90 - days_until) / 90 * 100)) if days_until > 0 else 100

    pace_7d = _get_pace(db, goal_type, 7)
    recent_task_count = db.query(Task).filter(
        Task.goal_type == goal_type, Task.status == "hoàn thành",
        Task.date >= query_date - timedelta(days=7)
    ).count()
    consistency_factor = min(100, (pace_7d * 10 + recent_task_count * 20))
    difficulty_factor = min(100, (learning_gap * 0.4 + energy_factor * 0.2 + risk_factor * 0.2 + retention_factor * 0.2))

    score = (
        deadline_weight * 0.20 +
        importance * 20 +
        learning_gap * 0.15 +
        retention_factor * 0.10 +
        remaining_days_factor * 0.10 +
        progress_factor * 0.10 +
        energy_factor * 0.05 +
        risk_factor * 0.05 +
        consistency_factor * 0.05
    )

    risk_level = risk_info.get("risk", "low")
    return {
        "goal_type": goal_type,
        "score": round(score, 1),
        "deadline_weight": round(deadline_weight, 1),
        "learning_gap": round(learning_gap, 1),
        "energy_factor": round(energy_factor, 1),
        "retention_factor": round(retention_factor, 1),
        "risk_factor": risk_factor,
        "risk_level": risk_level,
        "importance": importance,
        "remaining_days_factor": round(remaining_days_factor, 1),
        "consistency_factor": round(consistency_factor, 1),
        "difficulty_factor": round(difficulty_factor, 1)
    }


def get_priority_ranking(db: Session, current_energy: int = 100) -> list:
    """Get priority ranking using subjects from StudySubject table, fallback to empty list."""
    try:
        from app.models_schedule import StudySubject
        subjects = db.query(StudySubject).filter(StudySubject.is_active == True).all()
        goal_types = [s.name for s in subjects]
    except Exception:
        goal_types = []

    if not goal_types:
        return []

    scores = []
    for g in goal_types:
        s = calculate_priority_score(db, g, current_energy)
        scores.append(s)
    scores.sort(key=lambda x: x["score"], reverse=True)
    return scores


def get_next_priority_goal(db: Session, current_energy: int = 100) -> str:
    ranking = get_priority_ranking(db, current_energy)
    if ranking:
        return ranking[0]["goal_type"]
    return ""


def _get_pace(db: Session, goal_type: str, days: int) -> float:
    logs = db.query(StudyHour).filter(
        StudyHour.goal_type == goal_type,
        StudyHour.date >= date.today() - timedelta(days=days)
    ).all()
    if not logs:
        return 0
    return sum(l.hours or 0 for l in logs) / len(logs)
