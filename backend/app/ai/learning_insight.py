from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
from app.models import V1LearningHistory, Task, DailyLog, StudyHour
from app.models_v2 import LearningPattern, LearningInsight


def analyze_skipped_subjects(db: Session, goal_type: str = None) -> list:
    week_ago = date.today() - timedelta(days=7)
    query = db.query(V1LearningHistory).filter(V1LearningHistory.created_at >= datetime.combine(week_ago, datetime.min.time()))
    if goal_type:
        query = query.filter(V1LearningHistory.goal_type == goal_type)
    recent = query.all()
    all_goal_types = ["gpa", "ielts", "devops"]
    studied = set(h.goal_type for h in recent)
    skipped = [g for g in all_goal_types if g not in studied]
    return skipped


def analyze_best_time(db: Session, goal_type: str) -> dict:
    history = db.query(V1LearningHistory).filter(
        V1LearningHistory.goal_type == goal_type
    ).all()
    hour_scores = {}
    for h in history:
        if h.created_at and h.score is not None:
            hour = h.created_at.hour
            if hour not in hour_scores:
                hour_scores[hour] = []
            hour_scores[hour].append(h.score)
    best_hour = None
    best_avg = 0
    for hour, scores in hour_scores.items():
        avg = sum(scores) / len(scores)
        if avg > best_avg:
            best_avg = avg
            best_hour = hour
    return {"goal_type": goal_type, "best_hour": best_hour, "avg_score": round(best_avg, 1)}


def analyze_common_mistakes(db: Session, goal_type: str) -> list:
    low_scores = db.query(V1LearningHistory).filter(
        V1LearningHistory.goal_type == goal_type,
        V1LearningHistory.score < 40,
        V1LearningHistory.score.isnot(None)
    ).order_by(V1LearningHistory.created_at.desc()).limit(10).all()
    mistakes = {}
    for h in low_scores:
        key = f"{h.module} - {h.lesson}" if h.module and h.lesson else (h.title or "unknown")
        mistakes[key] = mistakes.get(key, 0) + 1
    result = [{"subject": k, "fail_count": v} for k, v in sorted(mistakes.items(), key=lambda x: -x[1])]
    return result[:5]


def calculate_efficiency_trend(db: Session, goal_type: str) -> str:
    two_weeks = date.today() - timedelta(days=14)
    records = db.query(StudyHour).filter(
        StudyHour.goal_type == goal_type,
        StudyHour.date >= two_weeks
    ).all()
    if len(records) < 4:
        return "stable"
    mid = len(records) // 2
    first_half = records[:mid]
    second_half = records[mid:]
    avg1 = sum(r.hours for r in first_half) / max(1, len(first_half))
    avg2 = sum(r.hours for r in second_half) / max(1, len(second_half))
    if avg2 > avg1 * 1.2:
        return "improving"
    if avg2 < avg1 * 0.8:
        return "declining"
    return "stable"


def generate_optimal_schedule(db: Session) -> list:
    goal_types = ["gpa", "ielts", "devops"]
    schedule = []
    for g in goal_types:
        insight = db.query(LearningInsight).filter(
            LearningInsight.goal_type == g
        ).first()
        if insight and insight.best_hour is not None:
            schedule.append({
                "goal_type": g,
                "best_hour": insight.best_hour,
                "recommendation": f"Học {g} lúc {insight.best_hour}:00"
            })
    schedule.sort(key=lambda x: x["best_hour"] if x.get("best_hour") else 99)
    return schedule


def detect_patterns(db: Session) -> dict:
    all_goal_types = ["gpa", "ielts", "devops"]
    results = {}
    for g in all_goal_types:
        results[g] = {
            "skipped": analyze_skipped_subjects(db, g),
            "best_time": analyze_best_time(db, g),
            "mistakes": analyze_common_mistakes(db, g),
            "trend": calculate_efficiency_trend(db, g)
        }
    return results


def detect_habits(db: Session) -> list:
    habits = []
    logs_30d = db.query(DailyLog).order_by(DailyLog.date.desc()).limit(30).all()
    if len(logs_30d) < 7:
        return [{"habit": "Chưa đủ dữ liệu để phát hiện thói quen", "confidence": 0}]

    hour_completion = {}
    for l in logs_30d:
        if l.completion_percent:
            bucket = "sáng" if l.completion_percent and True else "chiều"
            hour_completion[l.date.strftime("%A")] = hour_completion.get(l.date.strftime("%A"), []) + [l.completion_percent]

    best_days = {}
    for day, scores in hour_completion.items():
        if scores:
            best_days[day] = sum(scores) / len(scores)
    if best_days:
        sorted_days = sorted(best_days.items(), key=lambda x: -x[1])
        best_day = sorted_days[0]
        if best_day[1] > 70:
            habits.append({"habit": f"Học tốt nhất vào {best_day[0]}", "confidence": round(best_day[1] / 100, 2)})

    tasks_30d = db.query(Task).filter(
        Task.date >= date.today() - timedelta(days=30)
    ).all()
    completion_by_hour = {}
    for t in tasks_30d:
        if t.start_time and t.status == "hoàn thành":
            try:
                h = int(t.start_time.split(":")[0])
                completion_by_hour[h] = completion_by_hour.get(h, 0) + 1
            except (ValueError, IndexError):
                pass
    if completion_by_hour:
        best_hour = max(completion_by_hour, key=completion_by_hour.get)
        habits.append({"habit": f"Hiệu quả nhất lúc {best_hour}:00", "confidence": 0.8})

    goal_counts = {}
    for t in tasks_30d:
        if t.status == "hoàn thành":
            goal_counts[t.goal_type] = goal_counts.get(t.goal_type, 0) + 1
    if goal_counts:
        best_goal = max(goal_counts, key=goal_counts.get)
        names = {"ielts": "IELTS", "devops": "DevOps", "gpa": "GPA"}
        habits.append({"habit": f"Môn yêu thích: {names.get(best_goal, best_goal)}", "confidence": 0.75})

    skipped_goal = analyze_skipped_subjects(db)
    if skipped_goal:
        names = {"ielts": "IELTS", "devops": "DevOps", "gpa": "GPA"}
        for s in skipped_goal:
            habits.append({"habit": f"Thường bỏ {names.get(s, s)}", "confidence": 0.6})

    logs_7d = db.query(DailyLog).filter(
        DailyLog.date >= date.today() - timedelta(days=7)
    ).all()
    late_nights = sum(1 for l in logs_7d if l.sleep_hours and l.sleep_hours < 6)
    if late_nights >= 3:
        habits.append({"habit": "Ngủ không đủ giấc (dưới 6h, 3+ lần/tuần)", "confidence": 0.7})

    return habits[:6]
