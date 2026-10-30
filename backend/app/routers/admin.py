import datetime
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models_auth import User, CheerLog, VisitorLog, UserFeedback
from app.models import Player, StudyGoal, StudySessionLog, DailyMatrixTask, NotificationSetting, TimeCapsule, RewardRedemption
from app.routers.auth import get_current_admin, hash_password

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
    target_hours: Optional[float] = None
    current_hours: Optional[float] = None
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
    """Thống kê tổng quan nền tảng học tập & tay đua."""
    total_users = db.query(User).count()
    active_users_count = db.query(User).filter(User.is_active == True).count()

    total_study_hours = db.query(func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0)).scalar()
    total_sessions = db.query(StudySessionLog).count()

    today = date.today()
    today_sessions = db.query(StudySessionLog).filter(StudySessionLog.session_date == today).count()
    today_study_hours = db.query(func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0)).filter(
        StudySessionLog.session_date == today
    ).scalar()

    total_goals = db.query(StudyGoal).count()
    completed_goals = db.query(StudyGoal).filter(StudyGoal.is_completed == True).count()

    # Active users today (users who did pomodoro or created/checked matrix tasks)
    session_user_ids = db.query(StudySessionLog.user_id).filter(
        StudySessionLog.session_date == today,
        StudySessionLog.user_id.isnot(None)
    ).distinct().all()
    matrix_user_ids = db.query(DailyMatrixTask.user_id).filter(
        DailyMatrixTask.date == today,
        DailyMatrixTask.user_id.isnot(None)
    ).distinct().all()
    active_today_set = {u[0] for u in session_user_ids} | {u[0] for u in matrix_user_ids}

    # Top racers by total study hours
    all_users = db.query(User).filter(User.is_active == True).all()
    user_ranking = []
    for u in all_users:
        hours = db.query(func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0)).filter(
            StudySessionLog.user_id == u.id
        ).scalar()
        player = db.query(Player).filter(Player.user_id == u.id).first()
        user_ranking.append({
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "racer_avatar": u.racer_avatar or "rocket",
            "total_hours": round(float(hours), 2),
            "level": player.level if player else 1,
            "streak": player.streak if player else 0,
        })
    user_ranking.sort(key=lambda x: x["total_hours"], reverse=True)

    # --- Traffic & Visitor Breakdown ---
    total_visits = db.query(VisitorLog).count()
    guest_visits = db.query(VisitorLog).filter(VisitorLog.is_member == False).count()
    member_visits = db.query(VisitorLog).filter(VisitorLog.is_member == True).count()
    unique_guests = db.query(func.count(func.distinct(VisitorLog.visitor_id))).filter(VisitorLog.is_member == False).scalar() or 0
    unique_members = db.query(func.count(func.distinct(VisitorLog.user_id))).filter(VisitorLog.is_member == True).scalar() or 0

    today_visits = db.query(VisitorLog).filter(VisitorLog.visit_date == today).count()
    today_guest_visits = db.query(VisitorLog).filter(VisitorLog.visit_date == today, VisitorLog.is_member == False).count()
    today_member_visits = db.query(VisitorLog).filter(VisitorLog.visit_date == today, VisitorLog.is_member == True).count()

    mobile_visits = db.query(VisitorLog).filter(VisitorLog.device_type.in_(["mobile", "tablet"])).count()
    desktop_visits = db.query(VisitorLog).filter(VisitorLog.device_type == "desktop").count()

    # --- Feedback Overview ---
    total_feedbacks = db.query(UserFeedback).count()
    new_feedbacks = db.query(UserFeedback).filter(UserFeedback.status == "new").count()
    avg_rating_raw = db.query(func.avg(UserFeedback.rating)).scalar()
    feedback_avg_rating = round(float(avg_rating_raw), 1) if avg_rating_raw is not None else 5.0

    # --- Timeframe Analytics: Day, Week, Month ---
    week_start = today - datetime.timedelta(days=6)
    month_start = today - datetime.timedelta(days=29)

    today_dt_start = datetime.datetime.combine(today, datetime.time.min)
    week_dt_start = datetime.datetime.combine(week_start, datetime.time.min)
    month_dt_start = datetime.datetime.combine(month_start, datetime.time.min)

    # 1. Day (Hôm nay)
    today_new_users = db.query(User).filter(User.created_at >= today_dt_start).count()
    today_feedbacks = db.query(UserFeedback).filter(UserFeedback.created_at >= today_dt_start).count()
    today_unique_guests = db.query(func.count(func.distinct(VisitorLog.visitor_id))).filter(
        VisitorLog.visit_date == today, VisitorLog.is_member == False
    ).scalar() or 0
    today_unique_members = db.query(func.count(func.distinct(VisitorLog.user_id))).filter(
        VisitorLog.visit_date == today, VisitorLog.is_member == True
    ).scalar() or 0

    # 2. Week (7 ngày qua)
    week_visits = db.query(VisitorLog).filter(VisitorLog.visit_date >= week_start).count()
    week_guest_visits = db.query(VisitorLog).filter(VisitorLog.visit_date >= week_start, VisitorLog.is_member == False).count()
    week_member_visits = db.query(VisitorLog).filter(VisitorLog.visit_date >= week_start, VisitorLog.is_member == True).count()
    week_unique_guests = db.query(func.count(func.distinct(VisitorLog.visitor_id))).filter(
        VisitorLog.visit_date >= week_start, VisitorLog.is_member == False
    ).scalar() or 0
    week_unique_members = db.query(func.count(func.distinct(VisitorLog.user_id))).filter(
        VisitorLog.visit_date >= week_start, VisitorLog.is_member == True
    ).scalar() or 0
    week_study_hours = db.query(func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0)).filter(
        StudySessionLog.session_date >= week_start
    ).scalar() or 0.0
    week_sessions = db.query(StudySessionLog).filter(StudySessionLog.session_date >= week_start).count()
    week_new_users = db.query(User).filter(User.created_at >= week_dt_start).count()
    week_feedbacks = db.query(UserFeedback).filter(UserFeedback.created_at >= week_dt_start).count()

    week_session_users = db.query(StudySessionLog.user_id).filter(
        StudySessionLog.session_date >= week_start, StudySessionLog.user_id.isnot(None)
    ).distinct().all()
    week_matrix_users = db.query(DailyMatrixTask.user_id).filter(
        DailyMatrixTask.date >= week_start, DailyMatrixTask.user_id.isnot(None)
    ).distinct().all()
    active_week_set = {u[0] for u in week_session_users} | {u[0] for u in week_matrix_users}

    # 3. Month (30 ngày qua)
    month_visits = db.query(VisitorLog).filter(VisitorLog.visit_date >= month_start).count()
    month_guest_visits = db.query(VisitorLog).filter(VisitorLog.visit_date >= month_start, VisitorLog.is_member == False).count()
    month_member_visits = db.query(VisitorLog).filter(VisitorLog.visit_date >= month_start, VisitorLog.is_member == True).count()
    month_unique_guests = db.query(func.count(func.distinct(VisitorLog.visitor_id))).filter(
        VisitorLog.visit_date >= month_start, VisitorLog.is_member == False
    ).scalar() or 0
    month_unique_members = db.query(func.count(func.distinct(VisitorLog.user_id))).filter(
        VisitorLog.visit_date >= month_start, VisitorLog.is_member == True
    ).scalar() or 0
    month_study_hours = db.query(func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0)).filter(
        StudySessionLog.session_date >= month_start
    ).scalar() or 0.0
    month_sessions = db.query(StudySessionLog).filter(StudySessionLog.session_date >= month_start).count()
    month_new_users = db.query(User).filter(User.created_at >= month_dt_start).count()
    month_feedbacks = db.query(UserFeedback).filter(UserFeedback.created_at >= month_dt_start).count()

    month_session_users = db.query(StudySessionLog.user_id).filter(
        StudySessionLog.session_date >= month_start, StudySessionLog.user_id.isnot(None)
    ).distinct().all()
    month_matrix_users = db.query(DailyMatrixTask.user_id).filter(
        DailyMatrixTask.date >= month_start, DailyMatrixTask.user_id.isnot(None)
    ).distinct().all()
    active_month_set = {u[0] for u in month_session_users} | {u[0] for u in month_matrix_users}

    # 7-day Traffic Trend
    traffic_trend_7days = []
    for i in range(6, -1, -1):
        d = today - datetime.timedelta(days=i)
        d_str = d.strftime("%d/%m")
        d_guests = db.query(VisitorLog).filter(VisitorLog.visit_date == d, VisitorLog.is_member == False).count()
        d_members = db.query(VisitorLog).filter(VisitorLog.visit_date == d, VisitorLog.is_member == True).count()
        traffic_trend_7days.append({
            "date": d_str,
            "guest": d_guests,
            "member": d_members,
            "total": d_guests + d_members,
        })

    # 30-day Traffic Trend
    traffic_trend_30days = []
    for i in range(29, -1, -1):
        d = today - datetime.timedelta(days=i)
        d_str = d.strftime("%d/%m")
        d_guests = db.query(VisitorLog).filter(VisitorLog.visit_date == d, VisitorLog.is_member == False).count()
        d_members = db.query(VisitorLog).filter(VisitorLog.visit_date == d, VisitorLog.is_member == True).count()
        traffic_trend_30days.append({
            "date": d_str,
            "guest": d_guests,
            "member": d_members,
            "total": d_guests + d_members,
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

    return {
        "total_users": total_users,
        "active_users_count": active_users_count,
        "active_today_count": len(active_today_set),
        "total_study_hours": round(float(total_study_hours), 2),
        "total_sessions": total_sessions,
        "today_sessions": today_sessions,
        "today_study_hours": round(float(today_study_hours), 2),
        "total_goals": total_goals,
        "completed_goals": completed_goals,
        "top_racers": user_ranking[:5],
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


@router.get("/users")
def get_admin_users(
    search: Optional[str] = Query(None, description="Tìm theo tên hoặc username"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lấy danh sách tất cả người dùng kèm chỉ số học tập để quản lý."""
    query = db.query(User)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter((User.username.ilike(term)) | (User.display_name.ilike(term)))

    total_count = query.count()
    users = query.order_by(User.id.desc()).offset(skip).limit(limit).all()

    today = date.today()
    results = []
    for u in users:
        total_hours = db.query(func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0)).filter(
            StudySessionLog.user_id == u.id
        ).scalar()
        today_hours = db.query(func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0)).filter(
            StudySessionLog.user_id == u.id,
            StudySessionLog.session_date == today
        ).scalar()
        goal_count = db.query(StudyGoal).filter(StudyGoal.user_id == u.id).count()
        player = db.query(Player).filter(Player.user_id == u.id).first()
        notification = db.query(NotificationSetting).filter(NotificationSetting.user_id == u.id).first()

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
            "streak": player.streak if player else 0,
            "total_hours": round(float(total_hours), 2),
            "today_hours": round(float(today_hours), 2),
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
    goals_data = []
    for g in goals:
        session_count = db.query(StudySessionLog).filter(StudySessionLog.goal_id == g.id).count()
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

    # Ma trận 4 ô nhiệm vụ (hôm nay và gần đây, tối đa 30 task)
    tasks = db.query(DailyMatrixTask).filter(
        DailyMatrixTask.user_id == user_id
    ).order_by(DailyMatrixTask.date.desc(), DailyMatrixTask.quadrant.asc()).limit(30).all()
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
            "streak": player.streak if player else 0,
            "has_telegram": bool(notif and notif.telegram_chat_id),
        },
        "goals": goals_data,
        "recent_sessions": sessions_data,
        "matrix_tasks": matrix_data,
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

    # Dọn dẹp dữ liệu liên quan
    db.query(StudyGoal).filter(StudyGoal.user_id == user_id).update({"parent_id": None}, synchronize_session=False)
    db.query(TimeCapsule).filter(TimeCapsule.user_id == user_id).delete()
    db.query(RewardRedemption).filter(RewardRedemption.user_id == user_id).delete()
    db.query(StudySessionLog).filter(StudySessionLog.user_id == user_id).delete()
    db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user_id).delete()
    db.query(StudyGoal).filter(StudyGoal.user_id == user_id).delete()
    db.query(NotificationSetting).filter(NotificationSetting.user_id == user_id).delete()
    db.query(Player).filter(Player.user_id == user_id).delete()
    db.query(CheerLog).filter((CheerLog.target_user_id == user_id) | (CheerLog.sender_id == user_id)).delete()

    db.delete(user)
    db.commit()

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

    if data.title is not None:
        goal.title = data.title.strip()
    if data.target_hours is not None:
        goal.target_hours = max(1.0, data.target_hours)
    if data.current_hours is not None:
        goal.current_hours = max(0.0, data.current_hours)
    if data.notes is not None:
        goal.notes = data.notes
    if data.is_completed is not None:
        goal.is_completed = data.is_completed

    db.commit()
    db.refresh(goal)
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

    # Safe Unlinking: Bảo toàn 100% giờ học lịch sử và công việc ma trận của người dùng
    db.query(StudySessionLog).filter(StudySessionLog.goal_id == goal_id).update({"goal_id": None}, synchronize_session=False)
    db.query(DailyMatrixTask).filter(DailyMatrixTask.goal_id == goal_id).update({"goal_id": None}, synchronize_session=False)
    db.query(StudyGoal).filter(StudyGoal.parent_id == goal_id).update({"parent_id": None}, synchronize_session=False)
    db.query(TimeCapsule).filter(TimeCapsule.goal_id == goal_id).update({"goal_id": None}, synchronize_session=False)
    db.delete(goal)
    db.commit()

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
