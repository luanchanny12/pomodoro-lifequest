from typing import List, Optional, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta

from app.database import get_db
from app.models import StudyGoal, DailyMatrixTask, SchoolClassSchedule, TetEarningPlan
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
    user_id = real_user.id if real_user else None

    # 1. Query Goals with target_date
    goals_query = db.query(StudyGoal).filter(
        StudyGoal.target_date.isnot(None),
        StudyGoal.is_completed == False,
    )
    if real_user:
        goals_query = goals_query.filter(StudyGoal.user_id == real_user.id)
    else:
        goals_query = goals_query.filter(StudyGoal.user_id.is_(None))
    goals = goals_query.all()

    # 2. Query uncompleted Matrix Tasks with date (Ô 1 ONLY: Khẩn cấp & Quan trọng)
    tasks_query = db.query(DailyMatrixTask).filter(
        DailyMatrixTask.is_completed == False,
        DailyMatrixTask.quadrant == 1,
    )
    if real_user:
        tasks_query = tasks_query.filter(DailyMatrixTask.user_id == real_user.id)
    else:
        tasks_query = tasks_query.filter(DailyMatrixTask.user_id.is_(None))
    tasks = tasks_query.all()

    # 3. Query School Class Schedules (Thời khóa biểu trường của người dùng)
    school_classes = []
    if real_user:
        school_classes = db.query(SchoolClassSchedule).filter(
            SchoolClassSchedule.is_active == True,
            SchoolClassSchedule.user_id == real_user.id
        ).all()

    # 4. Query Tet Earning Plan (Mục tiêu tài chính & Ca kiếm tiền cá nhân)
    tet_plan = None
    if real_user:
        tet_plan = db.query(TetEarningPlan).filter(
            TetEarningPlan.is_active == True,
            TetEarningPlan.user_id == real_user.id
        ).first()

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
            "notes": g.notes,
            "quadrant": None,
        })

    # Process Tasks (Ô 1: Làm ngay)
    for t in tasks:
        if not t.date:
            continue
        days_left = (t.date - today).days
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
            "category": "Ma trận Ô 1 (Làm ngay)",
            "color": "#F59E0B",
            "planet_type": "task",
            "notes": t.description,
            "quadrant": 1,
        })

    # Khung thời gian chiếu lên lịch: từ 7 ngày trước đến 45 ngày tới
    date_window_start = today - timedelta(days=7)
    date_window_end = today + timedelta(days=45)

    # 5. Chiếu Lịch học trường lên các ngày trong tháng
    if school_classes:
        curr_d = date_window_start
        while curr_d <= date_window_end:
            curr_dow = curr_d.weekday() + 2  # Thứ 2 = 2, Thứ 7 = 7, Chủ nhật = 8
            matched_classes = [c for c in school_classes if c.day_of_week == curr_dow]
            days_left = (curr_d - today).days
            for sc in matched_classes:
                s_name = getattr(sc, "school_name", None) or "Trường"
                deadlines.append({
                    "type": "school_class",
                    "id": f"school_{sc.id}_{curr_d.isoformat()}",
                    "title": f"📚 {sc.course_name}",
                    "date": curr_d.isoformat(),
                    "days_left": days_left,
                    "urgency": "today" if days_left == 0 else ("past" if days_left < 0 else "soon" if days_left <= 7 else "future"),
                    "current_hours": 0.0,
                    "target_hours": 2.5,
                    "progress_percent": 100.0 if days_left < 0 else 0.0,
                    "category": f"Lịch Học - {s_name}",
                    "color": "#3B82F6",
                    "planet_type": "school",
                    "notes": f"Phòng: {sc.room or 'N/A'} | Giờ học: {sc.start_time} - {sc.end_time} | GV: {sc.lecturer or 'Chưa rõ'}",
                    "quadrant": None,
                    "time_range": f"{sc.start_time} - {sc.end_time}",
                    "room": sc.room,
                })
            curr_d += timedelta(days=1)

    # 6. Chiếu Ca làm việc / Ca kiếm tiền lên các ngày (chỉ khi user BẬT shift_enabled)
    if tet_plan and tet_plan.is_active and getattr(tet_plan, "shift_enabled", False):
        limit_date = tet_plan.tet_date or date(2027, 2, 6)
        shift_title = getattr(tet_plan, "shift_name", None) or "Ca kiếm tiền"
        start_t = getattr(tet_plan, "daily_shift_start", "10:00") or "10:00"
        end_t = getattr(tet_plan, "daily_shift_end", "14:00") or "14:00"
        home_t = getattr(tet_plan, "home_arrival_time", "15:00") or "15:00"
        curr_d = max(today - timedelta(days=3), date_window_start)
        while curr_d <= min(date_window_end, limit_date):
            days_left = (curr_d - today).days
            deadlines.append({
                "type": "gig_shift",
                "id": f"gig_{curr_d.isoformat()}",
                "title": f"🛵 {shift_title} ({start_t} - {end_t})",
                "date": curr_d.isoformat(),
                "days_left": days_left,
                "urgency": "today" if days_left == 0 else ("past" if days_left < 0 else "soon" if days_left <= 7 else "future"),
                "current_hours": 0.0,
                "target_hours": 4.0,
                "progress_percent": 100.0 if days_left < 0 else 0.0,
                "category": f"{shift_title}",
                "color": "#10B981",
                "planet_type": "gig",
                "notes": f"{shift_title} ({start_t} - {end_t}), đúng {home_t} về nhà nghỉ ngơi và tập trung học tập!",
                "quadrant": None,
                "time_range": f"{start_t} - {end_t}",
            })
            curr_d += timedelta(days=1)

    # Sắp xếp deadlines
    deadlines.sort(key=lambda x: (x["days_left"], str(x.get("type", ""))))

    core_tasks = [d for d in deadlines if d["type"] in ["goal", "task"]]
    summary = {
        "overdue": len([d for d in core_tasks if d["days_left"] < 0]),
        "today": len([d for d in deadlines if d["days_left"] == 0]),
        "urgent": len([d for d in core_tasks if 0 <= d["days_left"] <= 3]),
        "soon": len([d for d in deadlines if 3 < d["days_left"] <= 7]),
        "future": len([d for d in deadlines if d["days_left"] > 7]),
        "school_count": len(school_classes),
        "total_active": len(deadlines),
    }

    return {"items": deadlines, "summary": summary}
