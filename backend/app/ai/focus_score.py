from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models import DailyLog, Task, StudyHour, Player
from app.models_v2 import FocusScore


def calculate_focus_score(db: Session, query_date: date = None) -> dict:
    if query_date is None:
        query_date = date.today()

    daily_log = db.query(DailyLog).filter(DailyLog.date == query_date).first()
    tasks = db.query(Task).filter(Task.date == query_date).all()
    study = db.query(StudyHour).filter(StudyHour.date == query_date).all()

    sleep_score = 0
    if daily_log and daily_log.sleep_hours:
        sleep_hours = daily_log.sleep_hours
        if sleep_hours >= 8:
            sleep_score = 25
        elif sleep_hours >= 7:
            sleep_score = 20
        elif sleep_hours >= 6:
            sleep_score = 15
        elif sleep_hours >= 5:
            sleep_score = 10
        else:
            sleep_score = 5

    total = len(tasks)
    completed = len([t for t in tasks if t.status == "hoàn thành"])
    completion_score = int((completed / max(1, total)) * 30) if total > 0 else 0

    total_minutes = sum(r.hours * 60 for r in study)
    time_score = min(25, int(total_minutes / 30))

    mood_score = 0
    if daily_log and daily_log.mood_level:
        mood_score = min(10, daily_log.mood_level)

    energy_score = 0
    if daily_log and daily_log.energy_level:
        energy_score = min(10, daily_log.energy_level)

    focus = sleep_score + completion_score + time_score + mood_score + energy_score
    focus = max(0, min(100, focus))

    existing = db.query(FocusScore).filter(FocusScore.date == query_date.isoformat()).first()
    if not existing:
        existing = FocusScore(date=query_date.isoformat())
        db.add(existing)
    existing.score = focus
    existing.sleep_hours = daily_log.sleep_hours if daily_log else 7
    existing.total_study_minutes = total_minutes
    existing.task_switches = 0
    existing.tasks_completed = completed
    existing.tasks_total = total
    existing.deep_work_minutes = total_minutes
    db.commit()

    return {
        "score": focus,
        "sleep_score": sleep_score,
        "completion_score": completion_score,
        "time_score": time_score,
        "mood_score": mood_score,
        "energy_score": energy_score,
        "total_minutes": total_minutes,
        "tasks_completed": completed,
        "tasks_total": total
    }


def get_focus_trend(db: Session, days: int = 30) -> list:
    records = db.query(FocusScore).order_by(FocusScore.date.desc()).limit(days).all()
    records.reverse()
    return [{"date": r.date, "score": r.score} for r in records]
