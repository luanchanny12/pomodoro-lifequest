from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models import Goal, StudyHour, DailyLog, Task, Player
from app.ai.ai_predictor import calculate_pace


def enhanced_predict(db: Session, goal_type: str) -> dict:
    goal = db.query(Goal).filter(Goal.type == goal_type).first()
    if not goal:
        return {"error": "Không tìm thấy mục tiêu"}

    current_pace = calculate_pace(db, goal_type, 30)
    recent_pace = calculate_pace(db, goal_type, 7)

    remaining = max(0, goal.target_value - goal.current_value)
    remaining_pct = max(0, 100 - goal.progress_percent)

    if goal_type == "ielts":
        days_needed = int(remaining / (current_pace * 0.5)) if current_pace > 0 else 999
        imp_days = int(remaining / ((current_pace + 0.5) * 0.5)) if current_pace > 0 else 999
    elif goal_type == "gpa":
        days_needed = int(remaining / (current_pace * 0.3)) if current_pace > 0 else 999
        imp_days = int(remaining / ((current_pace + 0.3) * 0.3)) if current_pace > 0 else 999
    elif goal_type == "devops":
        days_needed = int(remaining_pct / (current_pace * 5)) if current_pace > 0 else 999
        imp_days = int(remaining_pct / ((current_pace + 1) * 5)) if current_pace > 0 else 999
    else:
        days_needed = int(remaining / current_pace) if current_pace > 0 else 999
        imp_days = int(remaining / (current_pace + 0.5)) if current_pace > 0 else 999

    predicted = date.today() + timedelta(days=days_needed)
    improved = date.today() + timedelta(days=imp_days)

    skip_3d = date.today() + timedelta(days=days_needed + 9)

    week_ago = date.today() - timedelta(days=7)
    logs = db.query(DailyLog).filter(DailyLog.date >= week_ago).count()
    if current_pace <= 0:
        confidence = "thấp - chưa có dữ liệu"
    elif logs >= 5:
        confidence = "cao"
    elif logs >= 3:
        confidence = "trung bình"
    else:
        confidence = "thấp - ít dữ liệu"

    recent_tasks = db.query(Task).filter(
        Task.goal_type == goal_type, Task.status == "hoàn thành",
        Task.date >= week_ago
    ).count()

    trend = "ổn định"
    if recent_tasks >= 5:
        trend = "tăng tốc"
    elif recent_tasks <= 1:
        trend = "chậm lại"

    return {
        "goal_type": goal_type,
        "current_pace": round(current_pace, 2),
        "predicted_date": predicted.isoformat(),
        "improved_pace": round(recent_pace, 2),
        "improved_prediction": improved.isoformat(),
        "if_skip_3_days": skip_3d.isoformat(),
        "trend": trend,
        "confidence": confidence,
        "recommendation": _get_recommendation(goal, predicted, days_needed, current_pace)
    }


def _get_recommendation(goal, predicted, days_needed, pace):
    if pace <= 0:
        return "Bắt đầu học đều đặn để có dữ liệu dự đoán"
    if goal.deadline and predicted > goal.deadline:
        extra = (predicted - goal.deadline).days
        more = extra / max(1, days_needed) * pace if days_needed > 0 else pace
        return f"Cần tăng {more:.1f}h/ngày để kịp deadline (chậm {extra} ngày)"
    if days_needed < 30:
        return "Gần về đích! Duy trì tốc độ hiện tại."
    return "Tiếp tục duy trì tốc độ hiện tại, mọi thứ đang đi đúng hướng"


def get_all_enhanced_predictions(db: Session) -> list:
    goals = db.query(Goal).all()
    results = []
    for g in goals:
        results.append(enhanced_predict(db, g.type))
    return results
