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
# TIME WARP ORACLE (FUTURE PREDICTOR)
# -------------------------------------------------------------

@router.get("/oracle", response_model=TimeWarpOracleResponse)
def get_time_warp_oracle(
    goal_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    user_id = user.id if user else None

    # Lọc mục tiêu chuẩn xác của tài khoản hiện tại
    goal_query = db.query(StudyGoal)
    if user_id:
        goal_query = goal_query.filter(StudyGoal.user_id == user_id)
    else:
        goal_query = goal_query.filter(StudyGoal.user_id.is_(None))

    if goal_id:
        main_goal = goal_query.filter(StudyGoal.id == goal_id).first()
    else:
        main_goal = goal_query.order_by(StudyGoal.target_hours.desc()).first()

    target_hours = main_goal.target_hours if main_goal else 1000.0
    current_hours = main_goal.current_hours if main_goal else 0.0
    remaining_hours = max(0.0, round(target_hours - current_hours, 2))
    goal_title = main_goal.title if main_goal else "Tập trung 1000h"
    goal_type = main_goal.goal_type if main_goal else "hours"
    target_date_str = main_goal.target_date.strftime("%d/%m/%Y") if (main_goal and main_goal.target_date) else None

    # Phân tích dữ liệu học tập THỰC TẾ 100% của User này
    session_query = db.query(StudySessionLog)
    if user_id:
        session_query = session_query.filter(StudySessionLog.user_id == user_id)
    else:
        session_query = session_query.filter(StudySessionLog.user_id.is_(None))

    total_user_sessions = session_query.count()

    today = datetime.date.today()
    seven_days_ago = today - datetime.timedelta(days=7)
    thirty_days_ago = today - datetime.timedelta(days=30)

    recent_7d = session_query.filter(StudySessionLog.session_date >= seven_days_ago).all()
    sum_7d = sum(s.duration_hours for s in recent_7d)
    avg_7d = round(sum_7d / 7.0, 2)

    recent_30d = session_query.filter(StudySessionLog.session_date >= thirty_days_ago).all()
    sum_30d = sum(s.duration_hours for s in recent_30d)
    avg_30d = round(sum_30d / 30.0, 2)

    # Vận tốc thực tế chính xác (không bịa số)
    avg_daily = avg_7d if avg_7d > 0.05 else (avg_30d if avg_30d > 0.05 else 0.5)

    days_needed = math.ceil(remaining_hours / avg_daily) if avg_daily > 0 else 365
    projected_date = today + datetime.timedelta(days=days_needed)

    # 3 Kịch bản thực tế dựa trên phong độ
    relaxed_pace = max(0.5, round(avg_30d if avg_30d > 0.2 else 1.0, 2))
    days_relaxed = math.ceil(remaining_hours / relaxed_pace)
    date_relaxed = today + datetime.timedelta(days=days_relaxed)

    days_current = days_needed
    date_current = projected_date

    speedup_pace = max(1.2, round(avg_daily * 1.35, 2))
    days_speedup = math.ceil(remaining_hours / speedup_pace)
    date_speedup = today + datetime.timedelta(days=days_speedup)

    scenarios = {
        "relaxed": {
            "label": "Thư thái (Tối thiểu)",
            "hours_per_day": relaxed_pace,
            "days_needed": days_relaxed,
            "finish_date": date_relaxed.strftime("%d/%m/%Y"),
        },
        "current": {
            "label": "Phong độ 7 ngày thực tế",
            "hours_per_day": avg_daily,
            "days_needed": days_current,
            "finish_date": date_current.strftime("%d/%m/%Y"),
        },
        "speedup": {
            "label": "Bứt phá chiến thần (+35%)",
            "hours_per_day": speedup_pace,
            "days_needed": days_speedup,
            "finish_date": date_speedup.strftime("%d/%m/%Y"),
            "saved_days": max(0, days_current - days_speedup),
        }
    }

    days_until_deadline = None
    hours_per_day_needed = None
    if main_goal and main_goal.target_date:
        days_until_deadline = max(0, (main_goal.target_date - today).days)
        if days_until_deadline > 0:
            hours_per_day_needed = round(remaining_hours / float(days_until_deadline), 2)
        else:
            hours_per_day_needed = remaining_hours

    latest_session = session_query.order_by(StudySessionLog.created_at.desc()).first()
    recent_hours = latest_session.duration_hours if latest_session else 0.5
    hours_warped = round((recent_hours / max(0.5, avg_daily)) * 24.0, 1)

    return TimeWarpOracleResponse(
        goal_id=main_goal.id if main_goal else None,
        goal_title=goal_title,
        goal_type=goal_type,
        target_hours=target_hours,
        current_hours=current_hours,
        remaining_hours=remaining_hours,
        average_daily_hours=avg_daily,
        projected_finish_date=projected_date.strftime("%d/%m/%Y"),
        days_remaining=days_needed,
        target_date=target_date_str,
        days_until_deadline=days_until_deadline,
        hours_per_day_needed=hours_per_day_needed,
        total_user_sessions=total_user_sessions,
        hours_warped_recent=hours_warped,
        scenarios=scenarios,
    )


# -------------------------------------------------------------
# TIME CAPSULE ENDPOINTS (MOOD RESCUE & DAYS UNLOCK)
# -------------------------------------------------------------

@router.get("/time-capsules", response_model=List[TimeCapsuleResponse])
def get_time_capsules(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    if user:
        all_sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id == user.id).all()
        query = db.query(TimeCapsule).filter(TimeCapsule.user_id == user.id)
    else:
        all_sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id.is_(None)).all()
        query = db.query(TimeCapsule).filter(TimeCapsule.user_id.is_(None))

    total_hours = sum(s.duration_hours for s in all_sessions)
    capsules = query.order_by(TimeCapsule.created_at.desc()).all()
    now = datetime.datetime.utcnow()

    # Check auto-unlock by hours OR by unlock_date
    for cap in capsules:
        if not cap.is_unlocked:
            hours_met = bool(cap.milestone_hours and cap.milestone_hours > 0 and total_hours >= cap.milestone_hours)
            date_met = bool(cap.unlock_date and now >= cap.unlock_date)
            if hours_met or date_met:
                cap.is_unlocked = True
                cap.unlocked_at = now

    db.commit()
    return [TimeCapsuleResponse.model_validate(c) for c in capsules]


@router.post("/time-capsules", response_model=TimeCapsuleResponse, status_code=201)
def create_time_capsule(
    data: TimeCapsuleCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    milestone_hours = round(data.milestone_hours or 0.0, 1)
    unlock_days = data.unlock_days

    if milestone_hours <= 0 and (not unlock_days or unlock_days <= 0):
        raise HTTPException(
            status_code=400,
            detail="Vui lòng thiết lập mốc giờ học hoặc số ngày mở khóa cho hòm thư!",
        )

    if not data.message_content or not data.message_content.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập nội dung bức thư nhắn gửi tương lai!")

    if data.goal_id:
        goal = db.query(StudyGoal).filter(StudyGoal.id == data.goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Mục tiêu không tồn tại")
        _verify_resource_ownership(goal, user)

    if user:
        all_sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id == user.id).all()
    else:
        all_sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id.is_(None)).all()

    total_hours = sum(s.duration_hours for s in all_sessions)
    now = datetime.datetime.utcnow()

    unlock_date = None
    if unlock_days and unlock_days > 0:
        unlock_date = now + datetime.timedelta(days=unlock_days)

    hours_met = bool(milestone_hours > 0 and total_hours >= milestone_hours)
    date_met = bool(unlock_date is not None and now >= unlock_date)
    is_unlocked = bool(hours_met or date_met)

    unlock_type = data.unlock_type or (
        "both" if (milestone_hours > 0 and unlock_days) else ("days" if unlock_days else "hours")
    )

    capsule = TimeCapsule(
        user_id=user.id if user else None,
        goal_id=data.goal_id,
        milestone_hours=milestone_hours,
        unlock_days=unlock_days,
        unlock_date=unlock_date,
        unlock_type=unlock_type,
        mood_tag=data.mood_tag,
        title=data.title.strip() if data.title else "Thư gửi tương lai",
        message_content=data.message_content.strip(),
        is_unlocked=is_unlocked,
        unlocked_at=now if is_unlocked else None,
        unlocked_by_key=False,
        created_at=now,
    )
    db.add(capsule)

    # Thưởng +1 Hạc Giấy Hy Vọng cho người dùng vì đã gieo niềm tin vào tương lai!
    if user:
        player = db.query(Player).filter(Player.user_id == user.id).first()
        if not player:
            player = Player(user_id=user.id, level=1, exp=0, coins=0, streak=0, mood_keys=4)
            db.add(player)
        else:
            current_keys = player.mood_keys if player.mood_keys is not None else 3
            player.mood_keys = current_keys + 1

    db.commit()
    db.refresh(capsule)
    return TimeCapsuleResponse.model_validate(capsule)


@router.get("/time-capsules/mood-balance", response_model=MoodBalanceResponse)
def get_capsule_mood_balance(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    mood_keys = 3
    if user:
        player = db.query(Player).filter(Player.user_id == user.id).first()
        if player and player.mood_keys is not None:
            mood_keys = player.mood_keys
        query = db.query(TimeCapsule).filter(TimeCapsule.user_id == user.id)
    else:
        query = db.query(TimeCapsule).filter(TimeCapsule.user_id.is_(None))

    total = query.count()
    unlocked = query.filter(TimeCapsule.is_unlocked.is_(True)).count()
    return MoodBalanceResponse(
        mood_keys=mood_keys,
        total_capsules=total,
        unlocked_capsules=unlocked,
    )


@router.post("/time-capsules/{capsule_id}/unlock-emergency", response_model=TimeCapsuleResponse)
def unlock_capsule_emergency(
    capsule_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(TimeCapsule).filter(TimeCapsule.id == capsule_id)
    if user:
        capsule = query.filter(TimeCapsule.user_id == user.id).first()
    else:
        capsule = query.filter(TimeCapsule.user_id.is_(None)).first()

    if not capsule:
        raise HTTPException(status_code=404, detail="Không tìm thấy hòm thư này!")

    if capsule.is_unlocked:
        return TimeCapsuleResponse.model_validate(capsule)

    # Tiêu hao 1 Hạc Giấy Hy Vọng
    if user:
        player = db.query(Player).filter(Player.user_id == user.id).first()
        current_keys = player.mood_keys if (player and player.mood_keys is not None) else 3
        if current_keys < 1:
            raise HTTPException(
                status_code=400,
                detail="Bạn đã hết Hạc Giấy Hy Vọng! Hãy làm bài tập thở 30s hoặc viết một lá thư mới để nhận thêm nhé.",
            )
        player.mood_keys = current_keys - 1

    capsule.is_unlocked = True
    capsule.unlocked_by_key = True
    capsule.unlocked_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(capsule)
    return TimeCapsuleResponse.model_validate(capsule)


@router.post("/time-capsules/random-rescue", response_model=TimeCapsuleResponse)
def random_rescue_capsule(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    import random
    if user:
        query = db.query(TimeCapsule).filter(TimeCapsule.user_id == user.id)
    else:
        query = db.query(TimeCapsule).filter(TimeCapsule.user_id.is_(None))

    capsules = query.all()
    if not capsules:
        raise HTTPException(
            status_code=404,
            detail="Bạn chưa có lá thư nào trong hòm thư thời gian! Hãy bấm 'Soạn thư mới' để gửi gắm niềm tin vào tương lai nhé.",
        )

    # Ưu tiên rút:
    # 1. Thư niêm phong có tag cứu mood
    # 2. Thư niêm phong khác
    # 3. Thư đã mở có tag cứu mood
    # 4. Thư đã mở bất kỳ
    rescue_tags = ("khi_met_moi", "tiep_lua", "ly_do_bat_dau")
    locked_mood = [c for c in capsules if not c.is_unlocked and c.mood_tag in rescue_tags]
    locked_other = [c for c in capsules if not c.is_unlocked]
    unlocked_mood = [c for c in capsules if c.is_unlocked and c.mood_tag in rescue_tags]

    chosen = None
    needs_key = False

    if locked_mood:
        chosen = random.choice(locked_mood)
        needs_key = True
    elif locked_other:
        chosen = random.choice(locked_other)
        needs_key = True
    elif unlocked_mood:
        chosen = random.choice(unlocked_mood)
        needs_key = False
    else:
        chosen = random.choice(capsules)
        needs_key = False

    # Nếu cần bẻ khóa thì kiểm tra & trừ 1 Hạc Giấy
    if needs_key and not chosen.is_unlocked:
        if user:
            player = db.query(Player).filter(Player.user_id == user.id).first()
            current_keys = player.mood_keys if (player and player.mood_keys is not None) else 3
            if current_keys < 1:
                # Nếu hết hạc mà có thư đã mở thì fallback sang thư đã mở để không chặn người dùng
                unlocked_fallback = [c for c in capsules if c.is_unlocked]
                if unlocked_fallback:
                    chosen = random.choice(unlocked_fallback)
                    needs_key = False
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Bạn đã hết Hạc Giấy Hy Vọng để bẻ khóa thư niêm phong! Hãy làm bài tập thở 30s để nhận hạc khẩn cấp.",
                    )
            else:
                player.mood_keys = current_keys - 1

        if needs_key:
            chosen.is_unlocked = True
            chosen.unlocked_by_key = True
            chosen.unlocked_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(chosen)
    return TimeCapsuleResponse.model_validate(chosen)


@router.post("/time-capsules/claim-breath-grant")
def claim_breath_grant(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Cấp 1 Hạc Giấy Hy Vọng khẩn cấp sau bài tập thở 30s khi tâm trạng người dùng chạm đáy.
    """
    mood_keys = 3
    if user:
        player = db.query(Player).filter(Player.user_id == user.id).first()
        if not player:
            player = Player(user_id=user.id, level=1, exp=0, coins=0, streak=0, mood_keys=4)
            db.add(player)
            mood_keys = 4
        else:
            current_keys = player.mood_keys if player.mood_keys is not None else 3
            player.mood_keys = current_keys + 1
            mood_keys = player.mood_keys
        db.commit()

    return {
        "success": True,
        "mood_keys": mood_keys,
        "message": "Bạn đã hoàn thành 30s tĩnh tâm và nhận được 1 Hạc Giấy Hy Vọng! 🕊️",
    }


