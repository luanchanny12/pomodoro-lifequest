from typing import List, Optional, Dict, Any
import datetime
import math
import os
import re
import threading
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.cache import get_cache, set_cache, invalidate_user_cache
from app.models import (
    StudyGoal,
    StudySessionLog,
    RewardItem,
    RewardRedemption,
    TimeCapsule,
    ConstellationAchievement,
    UserConstellationUnlock,
    DailyMatrixTask,
    Player,
    Achievement,
)
from app.schemas import (
    StudyGoalCreate,
    StudyGoalUpdate,
    StudyGoalResponse,
    PlanetBuildUpdateRequest,
    StudySessionLogCreate,
    StudySessionLogUpdate,
    StudySessionLogResponse,
    FocusStatsResponse,
    DailyFocusStat,
    RewardItemCreate,
    RewardItemResponse,
    RewardRedeemRequest,
    RewardRedemptionResponse,
    PearlsBalanceResponse,
    TopicPlanetResponse,
    TopicGalaxyResponse,
    TimeWarpOracleResponse,
    TimeCapsuleCreate,
    TimeCapsuleResponse,
    MoodBalanceResponse,
    ConstellationAchievementResponse,
    ConstellationCheckResponse,
    DailyMatrixTaskCreate,
    DailyMatrixTaskUpdate,
    DailyMatrixTaskReflectionUpdate,
    DailyMatrixTaskResponse,
    MonthlyMatrixSummaryResponse,
    AIBuddyPromptResponse,
)
from app.models_auth import User
from app.routers.auth import (
    get_current_user_optional,
    get_client_ip,
    _check_rate_limit,
    _record_failed_attempt,
)
from app.routers.focus.common import (
    DEFAULT_CELESTIALS,
    _get_real_user,
    _verify_resource_ownership,
    VN_TZ,
    vn_now,
    vn_today,
    _propagate_goal_hours,
    _reconcile_parent_goals,
    _update_user_streak,
    _format_goal_response,
    _format_session_response,
)

router = APIRouter()

# -------------------------------------------------------------
# STUDY SESSIONS ENDPOINTS
# -------------------------------------------------------------

@router.get("/sessions", response_model=List[StudySessionLogResponse])
def get_sessions(
    goal_id: Optional[int] = Query(None),
    date_from: Optional[datetime.date] = Query(None),
    date_to: Optional[datetime.date] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    if user:
        query = db.query(StudySessionLog).filter(StudySessionLog.user_id == user.id)
    else:
        query = db.query(StudySessionLog).filter(StudySessionLog.user_id.is_(None))
    if goal_id:
        query = query.filter(StudySessionLog.goal_id == goal_id)
    if date_from:
        query = query.filter(StudySessionLog.session_date >= date_from)
    if date_to:
        query = query.filter(StudySessionLog.session_date <= date_to)

    sessions = (
        query.options(joinedload(StudySessionLog.goal))
        .order_by(StudySessionLog.session_date.desc(), StudySessionLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_format_session_response(s) for s in sessions]


@router.post("/sessions", response_model=StudySessionLogResponse, status_code=201)
def create_session(
    data: StudySessionLogCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
    request: Request = None,
):
    if not user and isinstance(request, Request) and not os.getenv("PYTEST_CURRENT_TEST"):
        client_ip = get_client_ip(request)
        _check_rate_limit(f"guest_write:{client_ip}", 60, 60, "Bạn đang ghi nhận quá nhanh. Vui lòng thử lại sau!")
        _record_failed_attempt(f"guest_write:{client_ip}")

    if data.duration_minutes < 1 or data.duration_minutes > 1440:
        raise HTTPException(status_code=400, detail="Thời lượng học phải từ 1 đến 1440 phút (tối đa 24 giờ)!")

    session_date = data.session_date or vn_today()
    if session_date > vn_today():
        raise HTTPException(status_code=400, detail="Ngày học không thể vượt quá ngày hôm nay!")

    effective_goal_id = data.goal_id if (data.goal_id and data.goal_id > 0) else None
    if effective_goal_id:
        goal = db.query(StudyGoal).filter(StudyGoal.id == effective_goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Mục tiêu không tồn tại")
        _verify_resource_ownership(goal, user)

    duration_hours = round(data.duration_minutes / 60.0, 2)
    now = datetime.datetime.utcnow()

    session_log = StudySessionLog(
        user_id=user.id if user else None,
        goal_id=effective_goal_id,
        duration_minutes=data.duration_minutes,
        duration_hours=duration_hours,
        session_date=session_date,
        topic_note=data.topic_note.strip() if data.topic_note else None,
        source=data.source or "manual",
        created_at=now,
    )
    db.add(session_log)

    # Accumulate into goal if linked
    if effective_goal_id:
        goal = db.query(StudyGoal).filter(StudyGoal.id == effective_goal_id).first()
        if goal:
            goal.current_hours = round(goal.current_hours + duration_hours, 2)
            if goal.target_hours > 0 and goal.current_hours >= goal.target_hours:
                goal.is_completed = True
                if not goal.completed_at:
                    goal.completed_at = now
            goal.updated_at = now
            if goal.parent_id:
                _propagate_goal_hours(db, goal.parent_id, duration_hours, now)

    # Tự động cập nhật chuỗi ngày học liên tục (Streak) và cộng điểm EXP
    _update_user_streak(db, user, session_date)

    # Tự động phát thông báo bứt tốc vào các nhóm học (Study Squads) cùng mục tiêu
    if user:
        try:
            from app.models_squad import StudySquadMember, StudySquadMessage
            squad_memberships = db.query(StudySquadMember).filter(StudySquadMember.user_id == user.id).all()
            for sm in squad_memberships:
                if sm.goal_id == effective_goal_id or not sm.goal_id:
                    goal_obj = db.query(StudyGoal).filter(StudyGoal.id == effective_goal_id).first() if effective_goal_id else None
                    cur_h = goal_obj.current_hours if goal_obj else duration_hours
                    squad_msg = StudySquadMessage(
                        squad_id=sm.squad_id,
                        user_id=user.id,
                        sender_name=user.display_name or "Đồng đội",
                        message_type="system_speedup",
                        content=f"⚡ {user.display_name} vừa bứt tốc thêm {data.duration_minutes} phút! Tiến lên mốc {cur_h:g} giờ trên đường đua!",
                        emoji="⚡",
                        created_at=now,
                    )
                    db.add(squad_msg)
        except Exception:
            pass

    db.commit()
    db.refresh(session_log)
    invalidate_user_cache(user)
    return _format_session_response(session_log)


@router.put("/sessions/{session_id}", response_model=StudySessionLogResponse)
def update_session(
    session_id: int,
    data: StudySessionLogUpdate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    session_log = db.query(StudySessionLog).filter(StudySessionLog.id == session_id).first()
    if not session_log:
        raise HTTPException(status_code=404, detail="Bản ghi học tập không tồn tại")
    _verify_resource_ownership(session_log, user)

    old_minutes = session_log.duration_minutes
    old_hours = session_log.duration_hours
    old_goal_id = session_log.goal_id

    update_dict = data.model_dump(exclude_unset=True)
    if "duration_minutes" in update_dict and update_dict["duration_minutes"] is not None:
        new_minutes = update_dict["duration_minutes"]
        if new_minutes < 1 or new_minutes > 1440:
            raise HTTPException(status_code=400, detail="Thời lượng học phải từ 1 đến 1440 phút (tối đa 24 giờ)!")
        new_hours = round(new_minutes / 60.0, 2)
        session_log.duration_minutes = new_minutes
        session_log.duration_hours = new_hours
    else:
        new_hours = old_hours

    if "session_date" in update_dict and update_dict["session_date"] is not None:
        if update_dict["session_date"] > vn_today():
            raise HTTPException(status_code=400, detail="Ngày học không thể vượt quá ngày hôm nay!")
        session_log.session_date = update_dict["session_date"]

    if "topic_note" in update_dict:
        session_log.topic_note = update_dict["topic_note"]
    if "source" in update_dict:
        session_log.source = update_dict["source"]

    if "goal_id" in update_dict:
        raw_gid = update_dict["goal_id"]
        new_goal_id = None if (raw_gid is None or raw_gid <= 0) else raw_gid
    else:
        new_goal_id = old_goal_id

    if new_goal_id and new_goal_id != old_goal_id:
        new_g = db.query(StudyGoal).filter(StudyGoal.id == new_goal_id).first()
        if not new_g:
            raise HTTPException(status_code=404, detail="Mục tiêu liên kết mới không tồn tại!")
        _verify_resource_ownership(new_g, user)

    # If goal changed or hours changed, reconcile goal hours
    now = datetime.datetime.utcnow()
    if old_goal_id != new_goal_id:
        if old_goal_id:
            old_g = db.query(StudyGoal).filter(StudyGoal.id == old_goal_id).first()
            if old_g:
                old_g.current_hours = max(0.0, round(old_g.current_hours - old_hours, 2))
                if old_g.target_hours > 0 and old_g.current_hours < old_g.target_hours:
                    old_g.is_completed = False
                    old_g.completed_at = None
                old_g.updated_at = now
                if old_g.parent_id:
                    _propagate_goal_hours(db, old_g.parent_id, -old_hours, now)
        if new_goal_id:
            new_g = db.query(StudyGoal).filter(StudyGoal.id == new_goal_id).first()
            if new_g:
                new_g.current_hours = round(new_g.current_hours + new_hours, 2)
                if new_g.target_hours > 0 and new_g.current_hours >= new_g.target_hours:
                    new_g.is_completed = True
                    if not new_g.completed_at:
                        new_g.completed_at = now
                new_g.updated_at = now
                if new_g.parent_id:
                    _propagate_goal_hours(db, new_g.parent_id, new_hours, now)
        session_log.goal_id = new_goal_id
    elif old_goal_id and old_hours != new_hours:
        goal = db.query(StudyGoal).filter(StudyGoal.id == old_goal_id).first()
        if goal:
            diff_hours = new_hours - old_hours
            goal.current_hours = max(0.0, round(goal.current_hours + diff_hours, 2))
            if goal.target_hours > 0 and goal.current_hours >= goal.target_hours:
                goal.is_completed = True
                if not goal.completed_at:
                    goal.completed_at = now
            else:
                goal.is_completed = False
                goal.completed_at = None
            goal.updated_at = now
            if goal.parent_id:
                _propagate_goal_hours(db, goal.parent_id, diff_hours, now)

    db.commit()
    db.refresh(session_log)
    invalidate_user_cache(user)
    return _format_session_response(session_log)


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    session_log = db.query(StudySessionLog).filter(StudySessionLog.id == session_id).first()
    if not session_log:
        raise HTTPException(status_code=404, detail="Bản ghi học tập không tồn tại")
    _verify_resource_ownership(session_log, user)

    if session_log.goal_id:
        goal = db.query(StudyGoal).filter(StudyGoal.id == session_log.goal_id).first()
        if goal:
            goal.current_hours = max(0.0, round(goal.current_hours - session_log.duration_hours, 2))
            if goal.target_hours > 0 and goal.current_hours < goal.target_hours:
                goal.is_completed = False
                goal.completed_at = None
            now = datetime.datetime.utcnow()
            goal.updated_at = now
            if goal.parent_id:
                _propagate_goal_hours(db, goal.parent_id, -session_log.duration_hours, now)

    db.delete(session_log)
    db.commit()
    invalidate_user_cache(user)
    return {"message": "Đã xóa bản ghi học tập"}


# -------------------------------------------------------------
# STATS & OVERVIEW
# -------------------------------------------------------------

@router.get("/stats", response_model=FocusStatsResponse)
def get_focus_stats(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    real_user = _get_real_user(user)
    uid_str = f"u_{real_user.id}" if real_user else "u_guest"
    cache_key = f"cache:stats:{uid_str}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    today = datetime.date.today()
    week_start = today - datetime.timedelta(days=today.weekday())

    filter_user = (StudySessionLog.user_id == real_user.id) if real_user else StudySessionLog.user_id.is_(None)
    filter_goal = (StudyGoal.user_id == real_user.id) if real_user else StudyGoal.user_id.is_(None)

    # 1. Total hours & Total sessions (Single SQL Aggregation)
    stats_row = (
        db.query(
            func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0),
            func.count(StudySessionLog.id),
        )
        .filter(filter_user)
        .first()
    )
    total_hours = round(float(stats_row[0] or 0.0), 2)
    total_sessions = int(stats_row[1] or 0)

    # 2. Today hours
    today_hours = (
        db.query(func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0))
        .filter(filter_user, StudySessionLog.session_date == today)
        .scalar()
        or 0.0
    )
    today_hours = round(float(today_hours), 2)

    # 3. Week hours
    week_hours = (
        db.query(func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0))
        .filter(filter_user, StudySessionLog.session_date >= week_start)
        .scalar()
        or 0.0
    )
    week_hours = round(float(week_hours), 2)

    # 4. Pomodoro sessions count
    pomodoro_sessions = (
        db.query(func.count(StudySessionLog.id))
        .filter(filter_user, StudySessionLog.source == "pomodoro")
        .scalar()
        or 0
    )

    # 5. Completed & Active goals
    completed_goals = db.query(StudyGoal).filter(filter_goal, StudyGoal.is_completed == True).count()
    active_goals = db.query(StudyGoal).filter(filter_goal, StudyGoal.is_completed == False).count()

    # 6. Last 7 days breakdown with 1 grouped query!
    seven_days_ago = today - datetime.timedelta(days=6)
    recent_grouped = (
        db.query(
            StudySessionLog.session_date,
            func.coalesce(func.sum(StudySessionLog.duration_minutes), 0),
            func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0),
        )
        .filter(filter_user, StudySessionLog.session_date >= seven_days_ago)
        .group_by(StudySessionLog.session_date)
        .all()
    )

    daily_map = {row[0]: (int(row[1]), round(float(row[2]), 2)) for row in recent_grouped}

    last_7_days: List[DailyFocusStat] = []
    for i in range(6, -1, -1):
        d = today - datetime.timedelta(days=i)
        d_mins, d_hours = daily_map.get(d, (0, 0.0))
        last_7_days.append(
            DailyFocusStat(
                date=d.strftime("%d/%m"),
                hours=d_hours,
                minutes=d_mins,
            )
        )

    res = FocusStatsResponse(
        total_hours=total_hours,
        today_hours=today_hours,
        week_hours=week_hours,
        total_sessions=total_sessions,
        pomodoro_sessions=pomodoro_sessions,
        completed_goals=completed_goals,
        active_goals=active_goals,
        last_7_days=last_7_days,
    )
    set_cache(cache_key, res.model_dump(), ttl_seconds=120)
    return res

