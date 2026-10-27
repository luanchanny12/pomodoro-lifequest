from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models import Goal, Task, StudyHour, DailyLog


def calculate_risk_score(db: Session, goal_type: str) -> dict:
    goal = db.query(Goal).filter(Goal.type == goal_type).first()
    if not goal:
        return {"goal_type": goal_type, "risk": "unknown", "score": 0,
                "message": "Không tìm thấy mục tiêu", "deadline_days": 0,
                "current_pace": 0.0, "needed_pace": 0.0, "trend": "stable"}

    days_until_deadline = (goal.deadline - date.today()).days if goal.deadline else 365
    remaining_pct = max(0, 100 - goal.progress_percent)

    pace_30d = _get_pace(db, goal_type, 30)
    pace_7d = _get_pace(db, goal_type, 7)
    needed_pace = (remaining_pct / max(1, days_until_deadline)) * 100 if days_until_deadline > 0 else 999

    if pace_30d <= 0:
        return {"goal_type": goal_type, "risk": "high", "score": 85,
                "message": f"Chưa có dữ liệu học tập cho {goal_type}. Cần bắt đầu ngay!",
                "deadline_days": days_until_deadline, "current_pace": 0.0,
                "needed_pace": round(needed_pace, 2), "trend": "stable"}
    current_pace_pct = pace_30d * 10

    pace_ratio = current_pace_pct / max(0.1, needed_pace)

    trend_penalty = 0
    if pace_7d < pace_30d * 0.7:
        trend_penalty = 20
    elif pace_7d < pace_30d * 0.9:
        trend_penalty = 10

    deadline_risk = 0
    if days_until_deadline <= 0:
        deadline_risk = 50
    elif days_until_deadline < 7:
        deadline_risk = 40
    elif days_until_deadline < 30:
        deadline_risk = 25
    elif days_until_deadline < 60:
        deadline_risk = 15
    elif days_until_deadline < 90:
        deadline_risk = 5

    risk_score = min(100, max(0, int(
        (100 - min(100, pace_ratio * 100)) * 0.5 + deadline_risk + trend_penalty
    )))

    level = "low"
    message = f"Tốc độ học {goal_type} đang ổn định."
    if risk_score >= 70:
        level = "high"
        lag_days = int((remaining_pct / max(0.1, pace_30d * 10)) - days_until_deadline)
        message = f"Tốc độ học {goal_type} hiện thấp hơn kế hoạch khoảng {abs(lag_days)} ngày. Cần tăng tốc!"
    elif risk_score >= 40:
        level = "medium"
        message = f"{goal_type} đang có dấu hiệu chậm lại. Cần theo dõi sát."

    return {
        "goal_type": goal_type,
        "risk": level,
        "score": risk_score,
        "message": message,
        "deadline_days": days_until_deadline,
        "current_pace": round(pace_30d, 2),
        "needed_pace": round(needed_pace / 100, 2),
        "trend": "declining" if pace_7d < pace_30d * 0.9 else "stable"
    }


def get_all_risks(db: Session) -> list:
    """Get risks based on StudySubject completion rate."""
    try:
        from app.models_schedule import StudySubject, StudySlot
        subjects = db.query(StudySubject).filter(StudySubject.is_active == True).all()
        if not subjects:
            return []
        results = []
        for subj in subjects:
            total = db.query(StudySlot).filter(StudySlot.subject_id == subj.id).count()
            done = db.query(StudySlot).filter(StudySlot.subject_id == subj.id, StudySlot.is_done == True).count()
            completion = (done / total * 100) if total > 0 else 0
            risk = "low" if completion >= 60 else ("medium" if completion >= 30 else "high")
            results.append({
                "goal_type": subj.name,
                "risk": risk,
                "score": round(100 - completion, 1),
                "message": f"Đã hoàn thành {done}/{total} buổi học ({completion:.0f}%)",
                "deadline_days": 0,
                "current_pace": round(done / max(1, total), 2),
                "needed_pace": 1.0,
                "trend": "stable",
            })
        return results
    except Exception:
        return []



def _get_pace(db: Session, goal_type: str, days: int) -> float:
    logs = db.query(StudyHour).filter(
        StudyHour.goal_type == goal_type,
        StudyHour.date >= date.today() - timedelta(days=days)
    ).all()
    if not logs:
        return 0
    return sum(l.hours or 0 for l in logs) / len(logs)
