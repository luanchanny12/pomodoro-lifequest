from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models import Goal, Task, DailyLog, StudyHour, Player
from app.ai.digital_twin import get_learning_profile
from app.ai.risk_engine import get_all_risks
from app.ai.ai_predictor import calculate_pace
from app.ai.focus_score import get_focus_trend
from app.ai.reflection import generate_reflection


def generate_monthly_review(db: Session, month: int = None, year: int = None) -> dict:
    today = date.today()
    if month is None:
        month = today.month
    if year is None:
        year = today.year

    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)

    logs = db.query(DailyLog).filter(
        DailyLog.date >= start_date, DailyLog.date <= end_date
    ).all()
    tasks = db.query(Task).filter(
        Task.date >= start_date, Task.date <= end_date
    ).all()
    study_hours = db.query(StudyHour).filter(
        StudyHour.date >= start_date, StudyHour.date <= end_date
    ).all()
    goals = db.query(Goal).all()
    player = db.query(Player).first()

    total_days = (end_date - start_date).days + 1
    active_days = len(logs)
    completion_rate = round(active_days / max(1, total_days) * 100, 1)

    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == "hoàn thành"])
    task_completion_rate = round(completed_tasks / max(1, total_tasks) * 100, 1)

    hours_by_type = {}
    total_hours = 0
    for s in study_hours:
        hours_by_type[s.goal_type] = hours_by_type.get(s.goal_type, 0) + (s.hours or 0)
        total_hours += s.hours or 0

    goal_progress = []
    for g in goals:
        pace = calculate_pace(db, g.type, 30)
        goal_progress.append({
            "name": g.name,
            "type": g.type,
            "progress": g.progress_percent,
            "pace": round(pace, 2)
        })

    risks = get_all_risks(db)
    profile = get_learning_profile(db)
    weekly_reflections = []
    for w in range(4):
        ref = generate_reflection(db)
        if ref:
            weekly_reflections.append({
                "week": w + 1,
                "summary": ref.get("summary", ""),
                "completion_rate": ref.get("completion_rate", 0)
            })

    avg_mood = sum(l.mood_level or 5 for l in logs) / max(1, len(logs)) if logs else 5
    avg_energy = sum(l.energy_level or 5 for l in logs) / max(1, len(logs)) if logs else 5
    avg_sleep = sum(l.sleep_hours or 7 for l in logs) / max(1, len(logs)) if logs else 7

    strengths = []
    weaknesses = []
    for g in goal_progress:
        if g["pace"] > 1.0:
            strengths.append(f"{g['name']}: tốc độ {g['pace']}h/ngày")
        elif g["pace"] < 0.5:
            weaknesses.append(f"{g['name']}: chỉ {g['pace']}h/ngày, cần cải thiện")

    if completion_rate >= 70:
        strengths.append(f"Đều đặn: {completion_rate}% ngày có học")
    else:
        weaknesses.append(f"Thiếu đều đặn: chỉ {completion_rate}% ngày có học")

    predictions = []
    for g in goals:
        if g.deadline:
            days_left = (g.deadline - today).days
            predictions.append({
                "goal": g.name,
                "days_left": max(0, days_left),
                "status": "on_track" if days_left >= 60 else "urgent" if days_left < 30 else "warning"
            })

    summary = f"Tháng {month}/{year}: {completion_rate}% ngày học, "
    summary += f"{total_hours:.0f}h tổng cộng, {completed_tasks}/{total_tasks} task hoàn thành."
    if weaknesses:
        summary += f" Cần cải thiện: {weaknesses[0]}."

    return {
        "month": month,
        "year": year,
        "summary": summary,
        "total_days": total_days,
        "active_days": active_days,
        "completion_rate": completion_rate,
        "total_study_hours": round(total_hours, 1),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "task_completion_rate": task_completion_rate,
        "avg_mood": round(avg_mood, 1),
        "avg_energy": round(avg_energy, 1),
        "avg_sleep": round(avg_sleep, 1),
        "hours_by_goal": hours_by_type,
        "goal_progress": goal_progress,
        "risks": risks,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "predictions": predictions,
        "profile": profile,
        "weekly_reflections": weekly_reflections,
        "recommendations": _generate_recommendations(weaknesses, goal_progress, risks)
    }


def _generate_recommendations(weaknesses: list, goal_progress: list, risks: list) -> list:
    recs = []
    for w in weaknesses:
        recs.append(f"Khắc phục: {w}")
    for r in risks:
        if r["risk"] == "high":
            recs.append(f"Ưu tiên {r['goal_type']}: {r['message']}")
    if not recs:
        recs.append("Duy trì phong độ hiện tại, tập trung vào điểm mạnh.")
    recs.append("Đặt mục tiêu cụ thể cho tháng tiếp theo.")
    return recs
