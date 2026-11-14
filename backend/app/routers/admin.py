import datetime
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, confloat
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.database import get_db
from app.models_auth import User, CheerLog, VisitorLog, UserFeedback
from app.models import (
    Player,
    Achievement,
    StudyGoal,
    StudySessionLog,
    DailyMatrixTask,
    NotificationSetting,
    TimeCapsule,
    RewardItem,
    RewardRedemption,
    UserConstellationUnlock,
)
from app.routers.auth import get_current_admin, hash_password
from app.cache import invalidate_user_cache, invalidate_admin_cache, get_cache, set_cache
from app.services.streak import vn_today

router = APIRouter(prefix="/api/admin", tags=["Admin Portal & User Management"])

# --- Schemas ---

class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=4)

class UpdateRoleRequest(BaseModel):
    is_admin: bool

class UpdateStatusRequest(BaseModel):
    is_active: bool

class AdminGoalUpdateRequest(BaseModel):
    title: Optional[str] = None
    target_hours: Optional[confloat(allow_inf_nan=False, ge=0.1, le=100000.0)] = None
    current_hours: Optional[confloat(allow_inf_nan=False, ge=0.0, le=100000.0)] = None
    notes: Optional[str] = None
    is_completed: Optional[bool] = None

class AdminCheerRequest(BaseModel):
    emoji: str = "🔥"
    message: Optional[str] = "Admin đã gửi lời khen và tiếp lửa năng lượng học tập cho bạn!"

class AdminTelegramMessageRequest(BaseModel):
    message: str

# --- Endpoints ---

@router.get("/overview")
def get_admin_overview(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Thống kê tổng quan nền tảng học tập & tay đua (Tối ưu hóa hiệu năng cao & có bộ đệm cache 60s)."""
    cached_overview = get_cache("cache:admin:overview")
    if cached_overview is not None and isinstance(cached_overview, dict):
        return cached_overview

    VN_TZ = datetime.timezone(datetime.timedelta(hours=7))
    today = datetime.datetime.now(VN_TZ).date()
    yesterday = today - datetime.timedelta(days=1)
    week_start = today - datetime.timedelta(days=6)
    month_start = today - datetime.timedelta(days=29)

    today_dt_start = datetime.datetime.combine(today, datetime.time.min)
    week_dt_start = datetime.datetime.combine(week_start, datetime.time.min)
    month_dt_start = datetime.datetime.combine(month_start, datetime.time.min)

    # 1. User stats (1 query)
    user_counts = (
        db.query(
            func.count(User.id),
            func.coalesce(func.sum(case((User.is_active == True, 1), else_=0)), 0),
            func.coalesce(func.sum(case((User.created_at >= today_dt_start, 1), else_=0)), 0),
            func.coalesce(func.sum(case((User.created_at >= week_dt_start, 1), else_=0)), 0),
            func.coalesce(func.sum(case((User.created_at >= month_dt_start, 1), else_=0)), 0),
        ).first()
    )
    total_users = user_counts[0] or 0
    active_users_count = int(user_counts[1] or 0)
    today_new_users = int(user_counts[2] or 0)
    week_new_users = int(user_counts[3] or 0)
    month_new_users = int(user_counts[4] or 0)

    # 2. Overall study hours & total sessions (1 query)
    study_aggregates = (
        db.query(
            func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0),
            func.count(StudySessionLog.id),
        ).first() or (0.0, 0)
    )
    total_study_hours = float(study_aggregates[0] or 0.0)
    total_sessions = int(study_aggregates[1] or 0)

    # 3. Overall goals (1 query)
    goal_aggregates = (
        db.query(
            func.count(StudyGoal.id),
            func.coalesce(func.sum(case((StudyGoal.is_completed == True, 1), else_=0)), 0),
        ).first() or (0, 0)
    )
    total_goals = int(goal_aggregates[0] or 0)
    completed_goals = int(goal_aggregates[1] or 0)

    # 4. Sessions in the last 30 days — aggregate bằng SQL (tránh load toàn bộ rows)
    session_agg_by_date = (
        db.query(
            StudySessionLog.session_date,
            func.count(StudySessionLog.id).label("cnt"),
            func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0).label("hrs"),
        )
        .filter(StudySessionLog.session_date >= month_start)
        .group_by(StudySessionLog.session_date)
        .all()
    )

    today_sessions = 0
    today_study_hours = 0.0
    week_sessions = 0
    week_study_hours = 0.0
    month_sessions = 0
    month_study_hours = 0.0

    for s_date, cnt, hrs in session_agg_by_date:
        c = int(cnt or 0)
        h = float(hrs or 0.0)
        month_sessions += c
        month_study_hours += h
        if s_date >= week_start:
            week_sessions += c
            week_study_hours += h
        if s_date == today:
            today_sessions = c
            today_study_hours = h

    # Unique users per period (distinct user_id only — nhẹ hơn load toàn bộ rows)
    sess_month_uids = [r[0] for r in db.query(StudySessionLog.user_id).filter(
        StudySessionLog.session_date >= month_start, StudySessionLog.user_id.isnot(None)
    ).distinct().all()]
    sess_week_uids = [r[0] for r in db.query(StudySessionLog.user_id).filter(
        StudySessionLog.session_date >= week_start, StudySessionLog.user_id.isnot(None)
    ).distinct().all()]
    sess_today_uids = [r[0] for r in db.query(StudySessionLog.user_id).filter(
        StudySessionLog.session_date == today, StudySessionLog.user_id.isnot(None)
    ).distinct().all()]

    mat_month_uids = [r[0] for r in db.query(DailyMatrixTask.user_id).filter(
        DailyMatrixTask.date >= month_start, DailyMatrixTask.user_id.isnot(None)
    ).distinct().all()]
    mat_week_uids = [r[0] for r in db.query(DailyMatrixTask.user_id).filter(
        DailyMatrixTask.date >= week_start, DailyMatrixTask.user_id.isnot(None)
    ).distinct().all()]
    mat_today_uids = [r[0] for r in db.query(DailyMatrixTask.user_id).filter(
        DailyMatrixTask.date == today, DailyMatrixTask.user_id.isnot(None)
    ).distinct().all()]

    today_session_users = set(sess_today_uids)
    week_session_users = set(sess_week_uids)
    month_session_users = set(sess_month_uids)
    today_matrix_users = set(mat_today_uids)
    week_matrix_users = set(mat_week_uids)
    month_matrix_users = set(mat_month_uids)

    active_today_set = today_session_users | today_matrix_users
    active_week_set = week_session_users | week_matrix_users
    active_month_set = month_session_users | month_matrix_users

    active_today = len(active_today_set)
    active_week = len(active_week_set)
    active_month = len(active_month_set)

    # 5. Top 5 Racers (Batch SQL query: 2 queries instead of 2*N queries)
    top_study_rows = (
        db.query(
            StudySessionLog.user_id,
            func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0).label("total_hours"),
        )
        .join(User, User.id == StudySessionLog.user_id)
        .filter(User.is_active == True, StudySessionLog.user_id.isnot(None))
        .group_by(StudySessionLog.user_id)
        .order_by(func.sum(StudySessionLog.duration_hours).desc())
        .limit(5)
        .all()
    )

    top_user_ids = [r[0] for r in top_study_rows]
    top_users_map = {u.id: u for u in db.query(User).filter(User.id.in_(top_user_ids)).all()} if top_user_ids else {}
    top_players_map = {p.user_id: p for p in db.query(Player).filter(Player.user_id.in_(top_user_ids)).all()} if top_user_ids else {}

    top_racers = []
    for uid, hours in top_study_rows:
        u = top_users_map.get(uid)
        if not u:
            continue
        p = top_players_map.get(uid)
        streak_val = 0
        if p:
            if not p.last_streak_date or p.last_streak_date >= yesterday:
                streak_val = p.streak

        top_racers.append({
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "racer_avatar": u.racer_avatar or "rocket",
            "total_hours": round(float(hours), 2),
            "level": p.level if p else 1,
            "streak": streak_val,
        })

    if len(top_racers) < 5:
        existing_ids = set(top_user_ids)
        remaining_users = (
            db.query(User)
            .filter(User.is_active == True, ~User.id.in_(existing_ids) if existing_ids else True)
            .limit(5 - len(top_racers))
            .all()
        )
        rem_uids = [u.id for u in remaining_users]
        rem_players = {p.user_id: p for p in db.query(Player).filter(Player.user_id.in_(rem_uids)).all()} if rem_uids else {}
        for u in remaining_users:
            p = rem_players.get(u.id)
            streak_val = 0
            if p:
                if not p.last_streak_date or p.last_streak_date >= yesterday:
                    streak_val = p.streak
            top_racers.append({
                "id": u.id,
                "username": u.username,
                "display_name": u.display_name,
                "racer_avatar": u.racer_avatar or "rocket",
                "total_hours": 0.0,
                "level": p.level if p else 1,
                "streak": streak_val,
            })

    # 6. Visitor aggregates (1 consolidated query for overall counts)
    visitor_aggregates = (
        db.query(
            func.count(VisitorLog.id),
            func.coalesce(func.sum(case((VisitorLog.is_member == False, 1), else_=0)), 0),
            func.coalesce(func.sum(case((VisitorLog.is_member == True, 1), else_=0)), 0),
            func.coalesce(func.sum(case((VisitorLog.device_type.in_(["mobile", "tablet"]), 1), else_=0)), 0),
            func.coalesce(func.sum(case((VisitorLog.device_type == "desktop", 1), else_=0)), 0),
        ).first()
    )
    total_visits = visitor_aggregates[0] or 0
    guest_visits = int(visitor_aggregates[1] or 0)
    member_visits = int(visitor_aggregates[2] or 0)
    mobile_visits = int(visitor_aggregates[3] or 0)
    desktop_visits = int(visitor_aggregates[4] or 0)

    unique_guests = db.query(func.count(func.distinct(VisitorLog.visitor_id))).filter(VisitorLog.is_member == False).scalar() or 0
    unique_members = db.query(func.count(func.distinct(VisitorLog.user_id))).filter(VisitorLog.is_member == True).scalar() or 0

    # 7. Feedback overview (1 consolidated query)
    feedback_stats = (
        db.query(
            func.count(UserFeedback.id),
            func.coalesce(func.sum(case((UserFeedback.status == "new", 1), else_=0)), 0),
            func.avg(UserFeedback.rating),
            func.coalesce(func.sum(case((UserFeedback.created_at >= today_dt_start, 1), else_=0)), 0),
            func.coalesce(func.sum(case((UserFeedback.created_at >= week_dt_start, 1), else_=0)), 0),
            func.coalesce(func.sum(case((UserFeedback.created_at >= month_dt_start, 1), else_=0)), 0),
        ).first()
    )
    total_feedbacks = feedback_stats[0] or 0
    new_feedbacks = int(feedback_stats[1] or 0)
    avg_rating_raw = feedback_stats[2]
    feedback_avg_rating = round(float(avg_rating_raw), 1) if avg_rating_raw is not None else 5.0
    today_feedbacks = int(feedback_stats[3] or 0)
    week_feedbacks = int(feedback_stats[4] or 0)
    month_feedbacks = int(feedback_stats[5] or 0)

    # 8. High-Performance Aggregated Traffic Trend (1 single GROUP BY query)
    start_30d = today - datetime.timedelta(days=29)
    grouped_counts = (
        db.query(
            VisitorLog.visit_date,
            VisitorLog.is_member,
            func.count(VisitorLog.id),
        )
        .filter(VisitorLog.visit_date >= start_30d)
        .group_by(VisitorLog.visit_date, VisitorLog.is_member)
        .all()
    )

    traffic_map = {}
    for v_date, is_mem, c_val in grouped_counts:
        if v_date not in traffic_map:
            traffic_map[v_date] = {"guest": 0, "member": 0}
        if is_mem:
            traffic_map[v_date]["member"] += c_val
        else:
            traffic_map[v_date]["guest"] += c_val

    # Derive day, week, month traffic totals from traffic_map in memory
    today_traffic = traffic_map.get(today, {"guest": 0, "member": 0})
    today_visits = today_traffic["guest"] + today_traffic["member"]
    today_guest_visits = today_traffic["guest"]
    today_member_visits = today_traffic["member"]

    week_visits = 0
    week_guest_visits = 0
    week_member_visits = 0
    month_visits = 0
    month_guest_visits = 0
    month_member_visits = 0

    for d, counts in traffic_map.items():
        if d >= month_start:
            month_visits += counts["guest"] + counts["member"]
            month_guest_visits += counts["guest"]
            month_member_visits += counts["member"]
        if d >= week_start:
            week_visits += counts["guest"] + counts["member"]
            week_guest_visits += counts["guest"]
            week_member_visits += counts["member"]

    # Unique visitors in day, week, month (3 fast distinct queries)
    unique_day_rows = (
        db.query(
            func.count(func.distinct(case((VisitorLog.is_member == False, VisitorLog.visitor_id), else_=None))),
            func.count(func.distinct(case((VisitorLog.is_member == True, VisitorLog.user_id), else_=None))),
        )
        .filter(VisitorLog.visit_date == today)
        .first()
    )
    today_unique_guests = unique_day_rows[0] or 0
    today_unique_members = unique_day_rows[1] or 0

    unique_week_rows = (
        db.query(
            func.count(func.distinct(case((VisitorLog.is_member == False, VisitorLog.visitor_id), else_=None))),
            func.count(func.distinct(case((VisitorLog.is_member == True, VisitorLog.user_id), else_=None))),
        )
        .filter(VisitorLog.visit_date >= week_start)
        .first()
    )
    week_unique_guests = unique_week_rows[0] or 0
    week_unique_members = unique_week_rows[1] or 0

    unique_month_rows = (
        db.query(
            func.count(func.distinct(case((VisitorLog.is_member == False, VisitorLog.visitor_id), else_=None))),
            func.count(func.distinct(case((VisitorLog.is_member == True, VisitorLog.user_id), else_=None))),
        )
        .filter(VisitorLog.visit_date >= month_start)
        .first()
    )
    month_unique_guests = unique_month_rows[0] or 0
    month_unique_members = unique_month_rows[1] or 0

    traffic_trend_7days = []
    for i in range(6, -1, -1):
        d = today - datetime.timedelta(days=i)
        counts = traffic_map.get(d, {"guest": 0, "member": 0})
        g = counts["guest"]
        m = counts["member"]
        traffic_trend_7days.append({
            "date": d.strftime("%d/%m"),
            "guest": g,
            "member": m,
            "total": g + m,
        })

    traffic_trend_30days = []
    for i in range(29, -1, -1):
        d = today - datetime.timedelta(days=i)
        counts = traffic_map.get(d, {"guest": 0, "member": 0})
        g = counts["guest"]
        m = counts["member"]
        traffic_trend_30days.append({
            "date": d.strftime("%d/%m"),
            "guest": g,
            "member": m,
            "total": g + m,
        })

    timeframes = {
        "day": {
            "label": "Hôm nay",
            "visits": today_visits,
            "guest_visits": today_guest_visits,
            "member_visits": today_member_visits,
            "unique_guests": today_unique_guests,
            "unique_members": today_unique_members,
            "study_hours": round(float(today_study_hours), 2),
            "study_sessions": today_sessions,
            "new_users": today_new_users,
            "active_users": len(active_today_set),
            "feedbacks": today_feedbacks,
        },
        "week": {
            "label": "7 ngày (Tuần)",
            "visits": week_visits,
            "guest_visits": week_guest_visits,
            "member_visits": week_member_visits,
            "unique_guests": week_unique_guests,
            "unique_members": week_unique_members,
            "study_hours": round(float(week_study_hours), 2),
            "study_sessions": week_sessions,
            "new_users": week_new_users,
            "active_users": len(active_week_set),
            "feedbacks": week_feedbacks,
            "trend": traffic_trend_7days,
        },
        "month": {
            "label": "30 ngày (Tháng)",
            "visits": month_visits,
            "guest_visits": month_guest_visits,
            "member_visits": month_member_visits,
            "unique_guests": month_unique_guests,
            "unique_members": month_unique_members,
            "study_hours": round(float(month_study_hours), 2),
            "study_sessions": month_sessions,
            "new_users": month_new_users,
            "active_users": len(active_month_set),
            "feedbacks": month_feedbacks,
            "trend": traffic_trend_30days,
        },
        "all": {
            "label": "Toàn thời gian",
            "visits": total_visits,
            "guest_visits": guest_visits,
            "member_visits": member_visits,
            "unique_guests": unique_guests,
            "unique_members": unique_members,
            "study_hours": round(float(total_study_hours), 2),
            "study_sessions": total_sessions,
            "total_users": total_users,
            "active_users": active_users_count,
            "feedbacks": total_feedbacks,
            "total_goals": total_goals,
            "completed_goals": completed_goals,
        },
    }

    overview_result = {
        "total_users": total_users,
        "active_users_count": active_users_count,
        "active_today_count": len(active_today_set),
        "total_study_hours": round(float(total_study_hours), 2),
        "total_sessions": total_sessions,
        "today_sessions": today_sessions,
        "today_study_hours": round(float(today_study_hours), 2),
        "total_goals": total_goals,
        "completed_goals": completed_goals,
        "top_racers": top_racers,
        # Analytics & Feedback
        "total_visits": total_visits,
        "guest_visits": guest_visits,
        "member_visits": member_visits,
        "unique_guests": unique_guests,
        "unique_members": unique_members,
        "today_visits": today_visits,
        "today_guest_visits": today_guest_visits,
        "today_member_visits": today_member_visits,
        "mobile_visits": mobile_visits,
        "desktop_visits": desktop_visits,
        "total_feedbacks": total_feedbacks,
        "new_feedbacks": new_feedbacks,
        "feedback_avg_rating": feedback_avg_rating,
        "traffic_trend_7days": traffic_trend_7days,
        "traffic_trend_30days": traffic_trend_30days,
        "timeframes": timeframes,
    }

    set_cache("cache:admin:overview", overview_result, ttl_seconds=60)
    return overview_result


@router.get("/overview/summary")
def get_admin_overview_summary(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Lấy dữ liệu tổng quan người dùng và giờ học (nhẹ, phục vụ tab Summary)."""
    full = get_admin_overview(admin=admin, db=db)
    timeframes = full.get("timeframes", {})
    return {
        "total_users": full.get("total_users", 0),
        "active_users_count": full.get("active_users_count", 0),
        "today_new_users": timeframes.get("day", {}).get("new_users", 0),
        "week_new_users": timeframes.get("week", {}).get("new_users", 0),
        "month_new_users": timeframes.get("month", {}).get("new_users", 0),
        "active_today_count": full.get("active_today_count", 0),
        "total_study_hours": full.get("total_study_hours", 0.0),
        "total_sessions": full.get("total_sessions", 0),
        "today_sessions": full.get("today_sessions", 0),
        "today_study_hours": full.get("today_study_hours", 0.0),
        "total_goals": full.get("total_goals", 0),
        "completed_goals": full.get("completed_goals", 0),
    }


@router.get("/overview/traffic")
def get_admin_overview_traffic(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Lấy dữ liệu thống kê lưu lượng và biểu đồ xu hướng (phục vụ tab Traffic)."""
    full = get_admin_overview(admin=admin, db=db)
    return {
        "total_visits": full["total_visits"],
        "guest_visits": full["guest_visits"],
        "member_visits": full["member_visits"],
        "unique_guests": full["unique_guests"],
        "unique_members": full["unique_members"],
        "today_visits": full["today_visits"],
        "today_guest_visits": full["today_guest_visits"],
        "today_member_visits": full["today_member_visits"],
        "mobile_visits": full["mobile_visits"],
        "desktop_visits": full["desktop_visits"],
        "traffic_trend_7days": full["traffic_trend_7days"],
        "traffic_trend_30days": full["traffic_trend_30days"],
        "timeframes": full["timeframes"],
    }


@router.get("/overview/top-racers")
def get_admin_overview_top_racers(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Lấy bảng xếp hạng top 5 tay đua xuất sắc nhất."""
    full = get_admin_overview(admin=admin, db=db)
    return {"top_racers": full.get("top_racers", [])}


@router.get("/overview/feedbacks")
def get_admin_overview_feedbacks(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Lấy thống kê đánh giá & phản hồi từ người dùng."""
    full = get_admin_overview(admin=admin, db=db)
    return {
        "total_feedbacks": full["total_feedbacks"],
        "new_feedbacks": full["new_feedbacks"],
        "feedback_avg_rating": full["feedback_avg_rating"],
    }


@router.get("/users")
def get_admin_users(
    search: Optional[str] = Query(None, description="Tìm theo tên hoặc username"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lấy danh sách tất cả người dùng kèm chỉ số học tập để quản lý (Tối ưu hóa Batch SQL không lặp N+1)."""
    query = db.query(User)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter((User.username.ilike(term)) | (User.display_name.ilike(term)))

    total_count = query.count()
    users = query.order_by(User.id.desc()).offset(skip).limit(limit).all()

    VN_TZ = datetime.timezone(datetime.timedelta(hours=7))
    today = datetime.datetime.now(VN_TZ).date()
    yesterday = today - datetime.timedelta(days=1)

    user_ids = [u.id for u in users]

    total_hours_map = {}
    today_hours_map = {}
    goal_count_map = {}
    player_map = {}
    notif_map = {}

    if user_ids:
        # 1. Batch total hours
        total_hours_rows = (
            db.query(
                StudySessionLog.user_id,
                func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0),
            )
            .filter(StudySessionLog.user_id.in_(user_ids))
            .group_by(StudySessionLog.user_id)
            .all()
        )
        total_hours_map = {uid: float(h) for uid, h in total_hours_rows}

        # 2. Batch today hours
        today_hours_rows = (
            db.query(
                StudySessionLog.user_id,
                func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0),
            )
            .filter(
                StudySessionLog.user_id.in_(user_ids),
                StudySessionLog.session_date == today,
            )
            .group_by(StudySessionLog.user_id)
            .all()
        )
        today_hours_map = {uid: float(h) for uid, h in today_hours_rows}

        # 3. Batch goal count
        goal_count_rows = (
            db.query(StudyGoal.user_id, func.count(StudyGoal.id))
            .filter(StudyGoal.user_id.in_(user_ids))
            .group_by(StudyGoal.user_id)
            .all()
        )
        goal_count_map = {uid: cnt for uid, cnt in goal_count_rows}

        # 4. Batch players
        players = db.query(Player).filter(Player.user_id.in_(user_ids)).all()
        player_map = {p.user_id: p for p in players}

        # 5. Batch notifications
        notifs = db.query(NotificationSetting).filter(NotificationSetting.user_id.in_(user_ids)).all()
        notif_map = {n.user_id: n for n in notifs}

    results = []
    for u in users:
        total_hours = total_hours_map.get(u.id, 0.0)
        today_hours = today_hours_map.get(u.id, 0.0)
        goal_count = goal_count_map.get(u.id, 0)
        player = player_map.get(u.id)
        notification = notif_map.get(u.id)

        streak_val = 0
        if player:
            if not player.last_streak_date or player.last_streak_date >= yesterday:
                streak_val = player.streak

        results.append({
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "racer_avatar": u.racer_avatar or "rocket",
            "cheer_count": u.cheer_count or 0,
            "is_admin": bool(getattr(u, "is_admin", False)),
            "is_active": bool(u.is_active),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "level": player.level if player else 1,
            "exp": player.exp if player else 0,
            "streak": streak_val,
            "total_hours": round(total_hours, 2),
            "today_hours": round(today_hours, 2),
            "goal_count": goal_count,
            "has_telegram": bool(notification and notification.telegram_chat_id),
        })

    return {
        "total": total_count,
        "items": results,
    }


@router.get("/users/{user_id}/detail")
def get_user_activity_detail(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Soi chi tiết toàn bộ hoạt động học tập, mục tiêu và ma trận của 1 người bạn."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng này!")

    player = db.query(Player).filter(Player.user_id == user_id).first()

    # Mục tiêu của user
    goals = db.query(StudyGoal).filter(StudyGoal.user_id == user_id).order_by(StudyGoal.id.desc()).all()

    # Batch: số phiên học theo từng goal (tránh N+1 query)
    goal_ids = [g.id for g in goals]
    session_count_map = {}
    if goal_ids:
        sc_rows = (
            db.query(StudySessionLog.goal_id, func.count(StudySessionLog.id))
            .filter(StudySessionLog.goal_id.in_(goal_ids))
            .group_by(StudySessionLog.goal_id)
            .all()
        )
        session_count_map = {gid: cnt for gid, cnt in sc_rows}

    goals_data = []
    for g in goals:
        session_count = session_count_map.get(g.id, 0)
        progress = round((g.current_hours / g.target_hours * 100.0), 1) if g.target_hours > 0 else 0.0
        goals_data.append({
            "id": g.id,
            "title": g.title,
            "celestial_name": g.celestial_name or "Vega",
            "target_hours": g.target_hours,
            "current_hours": round(g.current_hours, 2),
            "progress_percent": min(100.0, progress),
            "color": g.color or "#E24A4A",
            "category": g.category or "Học tập",
            "is_completed": bool(g.is_completed),
            "notes": g.notes,
            "session_count": session_count,
            "created_at": g.created_at.isoformat() if g.created_at else None,
        })

    # Lịch sử phiên học gần nhất (tối đa 40 phiên)
    sessions = db.query(StudySessionLog).filter(
        StudySessionLog.user_id == user_id
    ).order_by(StudySessionLog.created_at.desc()).limit(40).all()
    sessions_data = []
    for s in sessions:
        goal_title = s.goal.title if s.goal else "Tự do"
        sessions_data.append({
            "id": s.id,
            "goal_id": s.goal_id,
            "goal_title": goal_title,
            "duration_minutes": s.duration_minutes,
            "duration_hours": round(s.duration_hours, 2),
            "session_date": str(s.session_date),
            "topic_note": s.topic_note,
            "source": s.source,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })

    # Ma trận 4 ô nhiệm vụ (hôm nay và gần đây, tối đa 50 task)
    tasks = db.query(DailyMatrixTask).filter(
        DailyMatrixTask.user_id == user_id
    ).order_by(DailyMatrixTask.date.desc(), DailyMatrixTask.quadrant.asc()).limit(50).all()
    matrix_data = []
    for t in tasks:
        matrix_data.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "date": str(t.date),
            "quadrant": t.quadrant,
            "is_completed": bool(t.is_completed),
            "reflection_note": t.reflection_note,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        })

    # Lịch sử vào web & thiết bị sử dụng của người dùng này (mới nhất 50 lượt)
    user_visits = db.query(VisitorLog).filter(
        VisitorLog.user_id == user_id
    ).order_by(VisitorLog.created_at.desc()).limit(50).all()

    from app.routers.analytics_feedback import parse_user_agent
    visits_data = []
    for v in user_visits:
        parsed = parse_user_agent(v.user_agent)
        visits_data.append({
            "id": v.id,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "visit_date": str(v.visit_date),
            "ip_address": v.ip_address or "Localhost / N/A",
            "device_type": v.device_type or parsed["device_type"],
            "browser": parsed["browser"],
            "os": parsed["os"],
            "path": v.path or "/",
        })

    total_visits = db.query(VisitorLog).filter(VisitorLog.user_id == user_id).count()
    total_sessions_count = db.query(StudySessionLog).filter(StudySessionLog.user_id == user_id).count()
    total_matrix_count = db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user_id).count()

    # Chòm sao đã thắp sáng
    try:
        from app.models import UserConstellationUnlock
        unlocked_rows = db.query(UserConstellationUnlock).filter(UserConstellationUnlock.user_id == user_id).all()
        unlocked_constellations = [u.constellation_id for u in unlocked_rows]
    except Exception:
        unlocked_constellations = []

    # Thông tin thông báo
    notif = db.query(NotificationSetting).filter(NotificationSetting.user_id == user_id).first()

    return {
        "user": {
            "id": target_user.id,
            "username": target_user.username,
            "display_name": target_user.display_name,
            "racer_avatar": target_user.racer_avatar or "rocket",
            "cheer_count": target_user.cheer_count or 0,
            "is_admin": bool(getattr(target_user, "is_admin", False)),
            "is_active": bool(target_user.is_active),
            "created_at": target_user.created_at.isoformat() if target_user.created_at else None,
            "level": player.level if player else 1,
            "exp": player.exp if player else 0,
            "coins": player.coins if player else 0,
            "streak": (player.streak if (player and (not player.last_streak_date or player.last_streak_date >= vn_today() - datetime.timedelta(days=1))) else 0) if player else 0,
            "has_telegram": bool(notif and notif.telegram_chat_id),
        },
        "goals": goals_data,
        "recent_sessions": sessions_data,
        "matrix_tasks": matrix_data,
        "visit_history": visits_data,
        "unlocked_constellations": unlocked_constellations,
        "total_visits": total_visits,
        "total_sessions_count": total_sessions_count,
        "total_matrix_count": total_matrix_count,
    }


@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    data: ResetPasswordRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin đặt lại mật khẩu mới cho bạn bè khi họ quên."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")

    pwd_hash, salt = hash_password(data.new_password)
    user.password_hash = pwd_hash
    user.salt = salt
    db.commit()
    invalidate_admin_cache()

    return {"message": f"Đã đặt lại mật khẩu thành công cho tài khoản @{user.username}!"}


@router.put("/users/{user_id}/role")
def admin_update_role(
    user_id: int,
    data: UpdateRoleRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Cấp hoặc thu hồi quyền Quản trị viên."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")

    if user.id == admin.id and not data.is_admin:
        admin_count = db.query(User).filter(User.is_admin == True).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Không thể tự hạ quyền của chính bạn khi bạn là Admin duy nhất!")

    user.is_admin = data.is_admin
    db.commit()
    invalidate_admin_cache()

    role_str = "Quản trị viên (Admin)" if data.is_admin else "Người dùng thông thường"
    return {"message": f"Đã cập nhật vai trò của @{user.username} thành {role_str}!"}


@router.put("/users/{user_id}/status")
def admin_update_status(
    user_id: int,
    data: UpdateStatusRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Khóa hoặc mở khóa tài khoản người dùng."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")

    if user.id == admin.id and not data.is_active:
        raise HTTPException(status_code=400, detail="Không thể tự khóa tài khoản của chính bạn!")

    user.is_active = data.is_active
    db.commit()
    invalidate_admin_cache()

    status_str = "Kích hoạt" if data.is_active else "Đã khóa"
    return {"message": f"Đã cập nhật trạng thái tài khoản @{user.username}: {status_str}!"}


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Xóa tài khoản người dùng và dọn dẹp dữ liệu học tập liên quan."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Không thể tự xóa tài khoản của chính bạn!")

    # Dọn dẹp dữ liệu liên quan theo đúng thứ tự ràng buộc khóa ngoại (Foreign Keys)
    db.query(VisitorLog).filter(VisitorLog.user_id == user_id).update({"user_id": None}, synchronize_session=False)
    db.query(UserFeedback).filter(UserFeedback.user_id == user_id).update({"user_id": None}, synchronize_session=False)
    db.query(StudyGoal).filter(StudyGoal.user_id == user_id).update({"parent_id": None}, synchronize_session=False)
    
    db.query(UserConstellationUnlock).filter(UserConstellationUnlock.user_id == user_id).delete(synchronize_session=False)
    db.query(RewardRedemption).filter(RewardRedemption.user_id == user_id).delete(synchronize_session=False)
    db.query(RewardItem).filter(RewardItem.user_id == user_id).delete(synchronize_session=False)
    db.query(TimeCapsule).filter(TimeCapsule.user_id == user_id).delete(synchronize_session=False)
    db.query(StudySessionLog).filter(StudySessionLog.user_id == user_id).delete(synchronize_session=False)
    db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user_id).delete(synchronize_session=False)
    db.query(StudyGoal).filter(StudyGoal.user_id == user_id).delete(synchronize_session=False)
    db.query(NotificationSetting).filter(NotificationSetting.user_id == user_id).delete(synchronize_session=False)

    player_ids = [p[0] for p in db.query(Player.id).filter(Player.user_id == user_id).all()]
    if player_ids:
        db.query(Achievement).filter(Achievement.player_id.in_(player_ids)).delete(synchronize_session=False)
    db.query(Player).filter(Player.user_id == user_id).delete(synchronize_session=False)
    db.query(CheerLog).filter((CheerLog.target_user_id == user_id) | (CheerLog.sender_id == user_id)).delete(synchronize_session=False)

    db.delete(user)
    db.commit()
    invalidate_user_cache(user_id)
    invalidate_admin_cache()

    return {"message": f"Đã xóa hoàn toàn tài khoản @{user.username} và các dữ liệu liên quan!"}


@router.put("/goals/{goal_id}")
def admin_update_goal(
    goal_id: int,
    data: AdminGoalUpdateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin điều chỉnh hoặc cập nhật mục tiêu của người dùng."""
    goal = db.query(StudyGoal).filter(StudyGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục tiêu này!")

    old_hours = goal.current_hours
    now = datetime.datetime.utcnow()

    if data.title is not None:
        goal.title = data.title.strip()
    if data.target_hours is not None:
        goal.target_hours = max(0.1, data.target_hours)
    if data.current_hours is not None:
        goal.current_hours = max(0.0, data.current_hours)
    if data.notes is not None:
        goal.notes = data.notes

    if data.is_completed is not None:
        goal.is_completed = data.is_completed
        goal.completed_at = now if goal.is_completed else None
    elif goal.target_hours > 0:
        if goal.current_hours >= goal.target_hours:
            goal.is_completed = True
            if not goal.completed_at:
                goal.completed_at = now
        else:
            goal.is_completed = False
            goal.completed_at = None

    diff_hours = goal.current_hours - old_hours
    goal.updated_at = now

    # Propagate to parent goal if applicable
    if goal.parent_id and abs(diff_hours) > 1e-6:
        from app.routers.focus_hub import _propagate_goal_hours
        _propagate_goal_hours(db, goal.parent_id, diff_hours, now)

    db.commit()
    db.refresh(goal)
    invalidate_user_cache(goal.user_id)
    invalidate_admin_cache()
    return {"message": "Đã cập nhật mục tiêu thành công!", "goal_id": goal.id}


@router.delete("/goals/{goal_id}")
def admin_delete_goal(
    goal_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin xóa mục tiêu của người dùng."""
    goal = db.query(StudyGoal).filter(StudyGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục tiêu này!")

    target_user_id = goal.user_id

    # 1. Khấu trừ giờ khỏi mục tiêu lớn cha nếu mục tiêu này là mục tiêu con
    if goal.parent_id and goal.current_hours > 0:
        from app.routers.focus_hub import _propagate_goal_hours
        _propagate_goal_hours(db, goal.parent_id, -goal.current_hours, datetime.datetime.utcnow())

    # Safe Unlinking: Bảo toàn 100% giờ học lịch sử và công việc ma trận của người dùng
    db.query(StudySessionLog).filter(StudySessionLog.goal_id == goal_id).update({"goal_id": None}, synchronize_session=False)
    db.query(DailyMatrixTask).filter(DailyMatrixTask.goal_id == goal_id).update({"goal_id": None}, synchronize_session=False)
    db.query(StudyGoal).filter(StudyGoal.parent_id == goal_id).update({"parent_id": None}, synchronize_session=False)
    db.query(TimeCapsule).filter(TimeCapsule.goal_id == goal_id).update({"goal_id": None}, synchronize_session=False)
    db.delete(goal)
    db.commit()
    invalidate_user_cache(target_user_id)
    invalidate_admin_cache()

    return {"message": "Đã xóa mục tiêu thành công!"}


@router.post("/users/{user_id}/cheer")
def admin_cheer_user(
    user_id: int,
    data: AdminCheerRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin gửi lời chúc mừng / cổ vũ tinh thần trực tiếp đến bạn bè."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")

    user.cheer_count = (user.cheer_count or 0) + 1
    cheer_log = CheerLog(
        sender_id=admin.id,
        sender_name=f"Admin {admin.display_name}",
        target_user_id=user_id,
        emoji=data.emoji,
        message=data.message,
    )
    db.add(cheer_log)
    db.commit()
    invalidate_admin_cache()

    return {"message": f"Đã gửi cổ vũ {data.emoji} thành công đến {user.display_name}!"}


@router.post("/users/{user_id}/notify-telegram")
def admin_notify_telegram(
    user_id: int,
    data: AdminTelegramMessageRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Gửi tin nhắn Telegram trực tiếp đến bạn bè (nếu họ đã cài Bot)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")

    setting = db.query(NotificationSetting).filter(NotificationSetting.user_id == user_id).first()
    if not setting or not setting.telegram_bot_token or not setting.telegram_chat_id:
        raise HTTPException(
            status_code=400,
            detail=f"Người dùng @{user.username} chưa kết nối Telegram Bot trong cài đặt cá nhân!"
        )

    import requests
    bot_token = setting.telegram_bot_token.strip()
    chat_id = setting.telegram_chat_id.strip()
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

    text = f"👑 [Admin {admin.display_name} Nhắn Bạn]:\n\n{data.message.strip()}\n\n🚀 Hãy giữ vững phong độ và tiếp tục cày Pomodoro nhé!"
    try:
        res = requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, timeout=10)
        res_data = res.json()
        if not res_data.get("ok"):
            raise HTTPException(status_code=400, detail=f"Telegram API báo lỗi: {res_data.get('description')}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi gửi tin nhắn Telegram: {str(e)}")

    return {"message": f"Đã gửi tin nhắn Telegram thành công tới @{user.username}!"}
