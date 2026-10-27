from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models import StudyHour, Task, DailyLog, Goal, V1LearningHistory
from app.ai.learning_insight import analyze_common_mistakes


def generate_reflection(db: Session, week_start: date = None) -> dict:
    if week_start is None:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    records = db.query(StudyHour).filter(
        StudyHour.date >= week_start, StudyHour.date <= week_end
    ).all()
    total_hours = sum(r.hours for r in records)

    by_goal = {}
    for r in records:
        by_goal.setdefault(r.goal_type, 0)
        by_goal[r.goal_type] += r.hours

    changes = {}
    prev_start = week_start - timedelta(days=7)
    prev_records = db.query(StudyHour).filter(
        StudyHour.date >= prev_start, StudyHour.date < week_start
    ).all()
    prev_hours = sum(h.hours for h in prev_records)
    changes["total"] = round(total_hours - prev_hours, 1)

    strengths = []
    weaknesses = []
    root_causes = []
    recommendations = []

    for g, h in by_goal.items():
        g_prev = sum(r.hours for r in prev_records if r.goal_type == g)
        diff = round(h - g_prev, 1)
        pct = round((diff / max(1, g_prev)) * 100, 1) if g_prev > 0 else 0
        names = {"ielts": "IELTS", "devops": "DevOps", "gpa": "GPA"}
        label = names.get(g, g)
        if diff > 0:
            changes[label] = f"+{diff}h (+{pct}%)"
            strengths.append(f"{label}: +{pct}%")
        elif diff < 0:
            changes[label] = f"{diff}h ({pct}%)"
            weaknesses.append(f"{label}: {pct}%")
            root_causes.append(f"Bạn thường bỏ {label} sau 21h")
            recommendations.append(f"Đổi {label} sang buổi sáng")

    tasks_done = db.query(Task).filter(
        Task.date >= week_start, Task.date <= week_end,
        Task.status == "hoàn thành"
    ).count()
    tasks_total = db.query(Task).filter(
        Task.date >= week_start, Task.date <= week_end
    ).count()

    if tasks_total > 0:
        completion_rate = round(tasks_done / tasks_total * 100, 1)
        strengths.append(f"Hoàn thành {completion_rate}% nhiệm vụ")
    else:
        weaknesses.append("Không có nhiệm vụ nào trong tuần")
        root_causes.append("Chưa lập kế hoạch đầu tuần")
        recommendations.append("Lập kế hoạch vào đầu mỗi tuần")

    if total_hours < 10:
        weaknesses.append("Tổng thời gian học dưới 10h")
        root_causes.append("Chưa có thói quen học đều đặn")
        recommendations.append("Đặt mục tiêu tối thiểu 30 phút/ngày")

    daily_logs = db.query(DailyLog).filter(
        DailyLog.date >= week_start, DailyLog.date <= week_end
    ).all()
    avg_mood = sum(d.mood_level or 5 for d in daily_logs) / max(1, len(daily_logs))
    if avg_mood < 4:
        root_causes.append(f"Tâm trạng thấp ({avg_mood:.1f}/10)")
        recommendations.append("Kết hợp giải lao giữa giờ, học nhóm")

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "total_hours": total_hours,
        "changes": changes,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "root_causes": root_causes,
        "recommendations": recommendations
    }
