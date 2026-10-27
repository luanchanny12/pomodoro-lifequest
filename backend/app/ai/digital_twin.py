from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
from app.models import Player, DailyLog, Task, StudyHour
from app.models_v2 import DigitalTwin, LearningActivity
import json


def get_or_create_twin(db: Session, player_id: int = 1) -> DigitalTwin:
    twin = db.query(DigitalTwin).filter(DigitalTwin.player_id == player_id).first()
    if not twin:
        twin = DigitalTwin(player_id=player_id)
        db.add(twin)
        db.commit()
        db.refresh(twin)
    return twin


def update_twin_from_daily_log(db: Session, log_date: date = None, player_id: int = 1) -> DigitalTwin:
    if log_date is None:
        log_date = date.today()
    twin = get_or_create_twin(db, player_id)
    logs_30d = db.query(DailyLog).filter(
        DailyLog.date >= log_date - timedelta(days=30)
    ).all()
    if not logs_30d:
        return twin

    avg_energy = sum(l.energy_level or 5 for l in logs_30d) / len(logs_30d)
    avg_sleep = sum(l.sleep_hours or 7 for l in logs_30d) / len(logs_30d)
    avg_completion = sum(l.completion_percent or 50 for l in logs_30d) / len(logs_30d)
    consistency = len([l for l in logs_30d if l.completion_percent and l.completion_percent >= 70]) / max(1, len(logs_30d))

    activities = db.query(LearningActivity).filter(
        LearningActivity.player_id == player_id,
        LearningActivity.date >= log_date - timedelta(days=30)
    ).all()
    if activities:
        avg_duration = sum(a.duration_minutes for a in activities) / len(activities)
        avg_score = sum(a.score or 0 for a in activities if a.score) / max(1, len([a for a in activities if a.score]))
        twin.avg_task_completion_minutes = int(avg_duration)
        twin.absorption_rate = round(min(1.0, avg_score / 100 if avg_score > 0 else 0.7), 2)
        completed = len([a for a in activities if a.is_completed])
        twin.consistency_score = round(completed / max(1, len(activities)), 2)

    tasks_30d = db.query(Task).filter(
        Task.date >= log_date - timedelta(days=30)
    ).all()
    if tasks_30d:
        completed_tasks = [t for t in tasks_30d if t.status == "hoàn thành"]
        if completed_tasks:
            avg_task_time = sum(
                (_parse_time(t.end_time) - _parse_time(t.start_time)).total_seconds() / 60
                for t in completed_tasks if t.start_time and t.end_time
            ) / len(completed_tasks)
            twin.avg_task_completion_minutes = int(abs(avg_task_time)) if avg_task_time > 0 else twin.avg_task_completion_minutes

    twin.avg_daily_energy = int(round(avg_energy))
    twin.learning_speed = round(avg_completion / 50, 2)
    twin.avg_break_minutes = max(5, int(15 - avg_sleep))
    twin.total_sessions += 1
    twin.last_updated = datetime.utcnow()

    subjects_30d = db.query(StudyHour).filter(
        StudyHour.date >= log_date - timedelta(days=30)
    ).all()
    subject_hours = {}
    for s in subjects_30d:
        subject_hours[s.goal_type] = subject_hours.get(s.goal_type, 0) + (s.hours or 0)
    sorted_subjects = sorted(subject_hours.items(), key=lambda x: -x[1])
    twin.favorite_subjects = json.dumps([s[0] for s in sorted_subjects[:3]])

    all_types = ["ielts", "devops", "gpa"]
    completed_by_type = {}
    for t in all_types:
        completed_by_type[t] = len([x for x in (tasks_30d or []) if x.goal_type == t and x.status == "hoàn thành"])
    skipped = [t for t in all_types if completed_by_type.get(t, 0) == 0]
    twin.skipped_subjects = json.dumps(skipped)

    db.commit()
    db.refresh(twin)
    return twin


def get_learning_profile(db: Session, player_id: int = 1) -> dict:
    twin = get_or_create_twin(db, player_id)
    twin = update_twin_from_daily_log(db, player_id=player_id)
    return {
        "learning_speed": twin.learning_speed,
        "focus_time_minutes": twin.focus_time_minutes,
        "effective_hours": safe_json_loads(twin.effective_hours),
        "favorite_subjects": safe_json_loads(twin.favorite_subjects),
        "skipped_subjects": safe_json_loads(twin.skipped_subjects),
        "forgetting_speed": twin.forgetting_speed,
        "absorption_rate": twin.absorption_rate,
        "avg_task_completion_minutes": twin.avg_task_completion_minutes,
        "avg_break_minutes": twin.avg_break_minutes,
        "avg_daily_energy": twin.avg_daily_energy,
        "consistency_score": twin.consistency_score,
        "total_sessions": twin.total_sessions
    }


def get_optimal_schedule_from_twin(db: Session, player_id: int = 1) -> list:
    twin = get_or_create_twin(db, player_id)
    profile = get_learning_profile(db, player_id)
    focus_minutes = profile["focus_time_minutes"]
    break_minutes = profile["avg_break_minutes"]
    preferred_hours = profile.get("effective_hours", [])
    if not preferred_hours:
        preferred_hours = detect_effective_hours(db, player_id)
    blocks = []
    start = 8
    for _ in range(4):
        hour_str = f"{start:02d}:00"
        in_preferred = any(
            h - 1 <= start <= h + 1 for h in preferred_hours
        ) if preferred_hours else True
        intensity = "cao" if in_preferred else "thấp"
        blocks.append({
            "start": hour_str,
            "duration_minutes": focus_minutes,
            "break_minutes": break_minutes,
            "intensity": intensity,
            "preferred": in_preferred
        })
        start += 2
    return blocks


def detect_effective_hours(db: Session, player_id: int = 1) -> list:
    activities = db.query(LearningActivity).filter(
        LearningActivity.player_id == player_id,
        LearningActivity.is_completed == True
    ).order_by(LearningActivity.date.desc()).limit(50).all()
    hour_scores = {}
    for a in activities:
        if a.date:
            h = a.date.hour
            score = a.score or 50
            hour_scores[h] = hour_scores.get(h, []) + [score]
    if not hour_scores:
        return [8, 14, 20]
    ranked = sorted(
        [(h, sum(scores) / len(scores)) for h, scores in hour_scores.items()],
        key=lambda x: -x[1]
    )
    return [h for h, _ in ranked[:5]]


def record_activity(db: Session, player_id: int, goal_type: str, activity_type: str,
                    duration_minutes: int, score: float = None, is_completed: bool = True,
                    module: str = None, lesson: str = None,
                    energy_before: int = None, energy_after: int = None,
                    difficulty: int = 3) -> LearningActivity:
    act = LearningActivity(
        player_id=player_id, goal_type=goal_type, activity_type=activity_type,
        duration_minutes=duration_minutes, score=score, is_completed=is_completed,
        module=module, lesson=lesson, energy_before=energy_before,
        energy_after=energy_after, difficulty=difficulty
    )
    db.add(act)
    db.commit()
    return act


def _parse_time(t: str):
    if not t:
        return datetime(2000, 1, 1, 0, 0)
    try:
        parts = t.split(":")
        return datetime(2000, 1, 1, int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        return datetime(2000, 1, 1, 1, 0)


def safe_json_loads(val):
    if isinstance(val, list):
        return val
    try:
        return json.loads(val) if val else []
    except (json.JSONDecodeError, TypeError):
        return []
