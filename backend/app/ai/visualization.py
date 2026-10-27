from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models import StudyHour, Task, DailyLog


def get_heatmap_data(db: Session, goal_type: str = None,
                     days: int = 365) -> list:
    start = date.today() - timedelta(days=days)

    query = db.query(StudyHour).filter(StudyHour.date >= start)
    if goal_type:
        query = query.filter(StudyHour.goal_type == goal_type)
    records = query.all()

    daily = {}
    for r in records:
        d = r.date.isoformat()
        daily[d] = daily.get(d, 0) + (r.hours or 0)

    result = []
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        hours = daily.get(d, 0)
        intensity = _calc_intensity(hours)
        result.append({"date": d, "count": round(hours, 1), "intensity": intensity})

    return result


def get_life_timeline(db: Session, goal_type: str = None,
                      limit: int = 50) -> list:
    query = db.query(Task)
    if goal_type:
        query = query.filter(Task.goal_type == goal_type)
    tasks = query.order_by(Task.date.desc()).limit(limit).all()

    entries = []
    for t in tasks:
        if t.date:
            entries.append({
                "date": t.date.isoformat(),
                "activity": t.title,
                "completed": t.status == "hoàn thành",
                "goal_type": t.goal_type or "general"
            })

    entries.sort(key=lambda x: x["date"])
    return entries


def _calc_intensity(hours: float) -> int:
    if hours <= 0:
        return 0
    if hours < 0.5:
        return 1
    if hours < 1:
        return 2
    if hours < 2:
        return 3
    if hours < 3:
        return 4
    return 5
