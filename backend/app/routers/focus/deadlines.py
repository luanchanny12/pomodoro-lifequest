from typing import List, Optional, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta

from app.database import get_db
from app.models import StudyGoal, DailyMatrixTask
from app.models_auth import User
from app.routers.auth import get_current_user_optional
from app.routers.focus.common import _get_real_user, vn_today

router = APIRouter()

def _get_urgency(days_left: int) -> str:
    if days_left < 0:
        return "overdue"
    if days_left == 0:
        return "today"
    if days_left <= 3:
        return "urgent"
    if days_left <= 7:
        return "soon"
    return "future"

@router.get("/deadlines")
def get_deadlines(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    real_user = _get_real_user(user)

    # 1. Query Goals with target_date
    goals_query = db.query(StudyGoal).filter(
        StudyGoal.target_date.isnot(None),
        StudyGoal.is_completed == False
    )
    if real_user:
        goals_query = goals_query.filter(StudyGoal.user_id == real_user.id)
    else:
        goals_query = goals_query.filter(StudyGoal.user_id.is_(None))
    goals = goals_query.all()

    # 2. Query uncompleted Matrix Tasks with date
    tasks_query = db.query(DailyMatrixTask).filter(
        DailyMatrixTask.is_completed == False
    )
    if real_user:
        tasks_query = tasks_query.filter(DailyMatrixTask.user_id == real_user.id)
    else:
        tasks_query = tasks_query.filter(DailyMatrixTask.user_id.is_(None))
    tasks = tasks_query.all()

    today = vn_today()
    deadlines = []
    
    # Process Goals
    for g in goals:
        if not g.target_date:
            continue
        days_left = (g.target_date - today).days
        progress_pct = round((g.current_hours / g.target_hours * 100), 1) if (g.target_hours and g.target_hours > 0) else 0.0
        progress_pct = min(100.0, max(0.0, progress_pct))
        deadlines.append({
            "type": "goal",
            "id": g.id,
            "title": g.title,
            "date": g.target_date.isoformat(),
            "days_left": days_left,
            "urgency": _get_urgency(days_left),
            "current_hours": round(float(g.current_hours or 0), 1),
            "target_hours": round(float(g.target_hours or 0), 1),
            "progress_percent": progress_pct,
            "category": g.category or "Học tập",
            "color": g.color or "#E24A4A",
            "planet_type": g.planet_type or "earth",
        })

    # Process Tasks
    for t in tasks:
        if not t.date:
            continue
        days_left = (t.date - today).days
        # Chỉ lấy các task trong vòng 30 ngày trở lại hoặc tương lai
        if days_left < -30:
            continue
        deadlines.append({
            "type": "task",
            "id": t.id,
            "title": t.title,
            "date": t.date.isoformat(),
            "days_left": days_left,
            "urgency": _get_urgency(days_left),
            "current_hours": 0.0,
            "target_hours": 0.0,
            "progress_percent": 0.0,
            "category": f"Ma trận Ô {t.quadrant}",
            "color": "#F59E0B" if t.quadrant == 1 else "#3B82F6",
            "planet_type": "task",
        })

    # Sắp xếp: Quá hạn trước (days_left < 0), sau đó là hôm nay (0), rồi đến các ngày tăng dần
    deadlines.sort(key=lambda x: x["days_left"])

    summary = {
        "overdue": len([d for d in deadlines if d["days_left"] < 0]),
        "today": len([d for d in deadlines if d["days_left"] == 0]),
        "urgent": len([d for d in deadlines if 0 <= d["days_left"] <= 3]),
        "soon": len([d for d in deadlines if 3 < d["days_left"] <= 7]),
        "future": len([d for d in deadlines if d["days_left"] > 7]),
        "total_active": len(deadlines)
    }

    return {"items": deadlines, "summary": summary}
