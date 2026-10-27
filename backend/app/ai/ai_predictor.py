"""
AI Predictor - Dự đoán kết quả học tập
"""
from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
from app.models import Goal, StudyHour, DailyLog, Prediction, CurrentPosition, Task


def predict_goal_completion(db: Session, goal_type: str) -> dict:
    """Dự đoán ngày hoàn thành mục tiêu dựa trên tốc độ hiện tại"""
    goal = db.query(Goal).filter(Goal.type == goal_type).first()
    if not goal or goal.target_value == 0:
        return {"error": "Mục tiêu không tồn tại hoặc chưa có dữ liệu"}

    current_pace = calculate_pace(db, goal_type, 30)
    improved_pace = calculate_pace(db, goal_type, 7)

    remaining = max(0, goal.target_value - goal.current_value)
    remaining_progress_pct = max(0, 100 - goal.progress_percent)

    predicted_date = None
    improved_date = None
    if current_pace > 0:
        if goal.type == "ielts":
            days_needed = int(remaining / (current_pace * 0.5))
        elif goal.type == "gpa":
            days_needed = int(remaining / (current_pace * 0.3))
        elif goal.type == "devops":
            days_needed = int(remaining_progress_pct / (current_pace * 5))
        else:
            days_needed = int(remaining / current_pace) if remaining > 0 else 0
        predicted_date = date.today() + timedelta(days=days_needed)

        if improved_pace > 0:
            if goal.type == "ielts":
                imp_days = int(remaining / (improved_pace * 0.5))
            elif goal.type == "gpa":
                imp_days = int(remaining / (improved_pace * 0.3))
            else:
                imp_days = int(remaining_progress_pct / (improved_pace * 5))
            improved_date = date.today() + timedelta(days=imp_days)

    deadline_impact = 0
    if goal.deadline and predicted_date:
        if predicted_date > goal.deadline:
            deadline_impact = (predicted_date - goal.deadline).days

    streak_impact = "+0 ngày"
    recent_logs = db.query(DailyLog).filter(
        DailyLog.date >= date.today() - timedelta(days=7)
    ).count()
    if recent_logs < 3:
        streak_impact = "+15 ngày"
    elif recent_logs < 5:
        streak_impact = "+7 ngày"

    total_hours_data = db.query(StudyHour).filter(
        StudyHour.goal_type == goal_type,
        StudyHour.date >= date.today() - timedelta(days=14)
    ).count()
    if total_hours_data >= 10:
        confidence = "cao"
    elif total_hours_data >= 5:
        confidence = "trung bình"
    else:
        confidence = "thấp"

    if deadline_impact > 0:
        recommendation = f"Cần tăng tốc độ học lên gấp đôi để kịp deadline (còn thiếu {deadline_impact} ngày)"
    elif confidence == "thấp":
        recommendation = "Duy trì học đều đặn hàng ngày để có dữ liệu dự đoán chính xác hơn"
    else:
        recommendation = "Tiếp tục duy trì tốc độ hiện tại"

    prediction = db.query(Prediction).filter(Prediction.goal_type == goal_type).first()
    pred_data = {
        "goal_type": goal_type,
        "current_pace": round(current_pace, 2),
        "predicted_date": predicted_date.isoformat() if predicted_date else "Không xác định",
        "improved_pace": round(improved_pace, 2),
        "improved_date": improved_date.isoformat() if improved_date else "Không xác định",
        "streak_break_impact": streak_impact,
        "confidence": confidence,
        "recommendation": recommendation,
        "remaining": round(remaining, 2),
        "deadline": goal.deadline.isoformat() if goal.deadline else None,
        "progress_percent": goal.progress_percent
    }

    if not prediction:
        prediction = Prediction(goal_type=goal_type)
        db.add(prediction)
    prediction.current_pace_hours_per_day = current_pace
    prediction.predicted_completion_date = predicted_date
    prediction.confidence_score = confidence
    prediction.recommendation = recommendation
    db.commit()

    return pred_data


def calculate_pace(db: Session, goal_type: str, days_back: int = 30) -> float:
    """Tính tốc độ học trung bình (giờ/ngày)"""
    cutoff = date.today() - timedelta(days=days_back)
    records = db.query(StudyHour).filter(
        StudyHour.goal_type == goal_type,
        StudyHour.date >= cutoff
    ).all()
    if not records:
        return 0.0
    total_hours = sum(r.hours for r in records)
    return total_hours / days_back


def get_all_predictions(db: Session) -> list:
    """Dự đoán cho tất cả mục tiêu"""
    goals = db.query(Goal).all()
    results = []
    for goal in goals:
        pred = predict_goal_completion(db, goal.type)
        results.append(pred)
    return results
