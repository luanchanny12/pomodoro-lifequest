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
# GOALS ENDPOINTS
# -------------------------------------------------------------

@router.get("/goals", response_model=List[StudyGoalResponse])
def get_goals(
    is_completed: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    real_user = _get_real_user(user)
    uid_str = f"u_{real_user.id}" if real_user else "u_guest"
    cache_key = f"cache:goals:{uid_str}:{is_completed}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    if real_user:
        query = db.query(StudyGoal).filter(StudyGoal.user_id == real_user.id)
    else:
        query = db.query(StudyGoal).filter(StudyGoal.user_id.is_(None))

    # Tự động đối soát và cộng dồn lại số giờ cho các mục tiêu lớn (nếu bị lệch trước đó)
    _reconcile_parent_goals(db, real_user.id if real_user else None)

    if is_completed is not None:
        query = query.filter(StudyGoal.is_completed == is_completed)
    goals = query.order_by(StudyGoal.is_completed.asc(), StudyGoal.updated_at.desc()).all()

    # Batch query sub_goals_count & parent_titles to eliminate N+1 queries
    sub_counts: Dict[int, int] = {}
    parent_map: Dict[int, str] = {}
    goal_ids = [g.id for g in goals]
    if goal_ids:
        counts = (
            db.query(StudyGoal.parent_id, func.count(StudyGoal.id))
            .filter(StudyGoal.parent_id.in_(goal_ids))
            .group_by(StudyGoal.parent_id)
            .all()
        )
        sub_counts = {p_id: cnt for p_id, cnt in counts if p_id is not None}
        parent_ids = [g.parent_id for g in goals if g.parent_id]
        if parent_ids:
            parents = db.query(StudyGoal.id, StudyGoal.title).filter(StudyGoal.id.in_(parent_ids)).all()
            parent_map = {p.id: p.title for p in parents}

    formatted = [
        _format_goal_response(
            g,
            db=None,
            sub_count=sub_counts.get(g.id, 0),
            parent_title=parent_map.get(g.parent_id) if g.parent_id else None,
        )
        for g in goals
    ]
    set_cache(cache_key, [item.model_dump() for item in formatted], ttl_seconds=120)
    return formatted


@router.post("/goals", response_model=StudyGoalResponse, status_code=201)
def create_goal(
    data: StudyGoalCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
    request: Request = None,
):
    if not user and isinstance(request, Request) and not os.getenv("PYTEST_CURRENT_TEST"):
        client_ip = get_client_ip(request)
        _check_rate_limit(f"guest_write:{client_ip}", 60, 60, "Bạn đang tạo dữ liệu quá nhanh. Vui lòng thử lại sau!")
        _record_failed_attempt(f"guest_write:{client_ip}")

    is_done = data.current_hours >= data.target_hours if data.target_hours > 0 else False
    now = datetime.datetime.utcnow()

    # Assign celestial planet name
    existing_count = db.query(StudyGoal).count()
    celestial = data.celestial_name or DEFAULT_CELESTIALS[existing_count % len(DEFAULT_CELESTIALS)]

    if data.parent_id:
        parent_goal = db.query(StudyGoal).filter(StudyGoal.id == data.parent_id).first()
        if not parent_goal:
            raise HTTPException(status_code=404, detail="Mục tiêu cha không tồn tại")
        _verify_resource_ownership(parent_goal, user)

    goal = StudyGoal(
        user_id=user.id if user else None,
        title=data.title.strip(),
        celestial_name=celestial,
        goal_type=data.goal_type or "hours",
        target_hours=max(0.1, round(data.target_hours, 2)),
        current_hours=max(0.0, round(data.current_hours, 2)),
        target_date=data.target_date,
        parent_id=data.parent_id,
        planet_type=data.planet_type or "earth",
        planet_data=data.planet_data,
        color=data.color or "#E24A4A",
        category=data.category or "Học tập",
        is_completed=is_done,
        completed_at=now if is_done else None,
        notes=data.notes,
        created_at=now,
        updated_at=now,
    )
    db.add(goal)
    db.flush()
    if goal.parent_id and goal.current_hours > 0:
        _propagate_goal_hours(db, goal.parent_id, goal.current_hours, now)
    db.commit()
    db.refresh(goal)
    invalidate_user_cache(user)
    return _format_goal_response(goal, db)


@router.put("/goals/{goal_id}", response_model=StudyGoalResponse)
def update_goal(
    goal_id: int,
    data: StudyGoalUpdate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    goal = db.query(StudyGoal).filter(StudyGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Mục tiêu không tồn tại")
    _verify_resource_ownership(goal, user)

    old_parent_id = goal.parent_id
    old_current_hours = goal.current_hours

    update_dict = data.model_dump(exclude_unset=True)

    if "target_hours" in update_dict:
        th = update_dict["target_hours"]
        if th is None or th <= 0:
            raise HTTPException(status_code=400, detail="Mục tiêu số giờ (target_hours) phải là số dương lớn hơn 0!")

    new_parent_id = update_dict.get("parent_id", old_parent_id)
    new_current_hours = update_dict.get("current_hours", old_current_hours)

    if "parent_id" in update_dict:
        cand_pid = update_dict["parent_id"]
        if cand_pid == 0:
            cand_pid = None
            update_dict["parent_id"] = None
        if cand_pid is not None:
            if cand_pid == goal.id:
                raise HTTPException(status_code=400, detail="Mục tiêu không thể tự làm cha của chính mình!")
            parent_goal = db.query(StudyGoal).filter(StudyGoal.id == cand_pid).first()
            if not parent_goal:
                raise HTTPException(status_code=404, detail="Mục tiêu cha không tồn tại")
            _verify_resource_ownership(parent_goal, user)

            # Phân tích cây tổ tiên để chặn đứng hoàn toàn vòng lặp phân cấp (A->B->A cycle)
            visited_ancestors = {goal.id, cand_pid}
            curr_ancestor_id = parent_goal.parent_id
            while curr_ancestor_id:
                if curr_ancestor_id == goal.id:
                    raise HTTPException(
                        status_code=400,
                        detail="Không thể gán mục tiêu cha này vì sẽ tạo thành vòng lặp phân cấp mục tiêu (cycle)!",
                    )
                if curr_ancestor_id in visited_ancestors:
                    break
                visited_ancestors.add(curr_ancestor_id)
                anc = db.query(StudyGoal).filter(StudyGoal.id == curr_ancestor_id).first()
                if not anc:
                    break
                curr_ancestor_id = anc.parent_id

    for k, v in update_dict.items():
        setattr(goal, k, v)

    now = datetime.datetime.utcnow()

    # Rollup cập nhật giờ lên mục tiêu cha nếu đổi parent_id hoặc đổi current_hours
    if new_parent_id != old_parent_id:
        if old_parent_id and old_current_hours > 0:
            _propagate_goal_hours(db, old_parent_id, -old_current_hours, now)
        if new_parent_id and new_current_hours > 0:
            _propagate_goal_hours(db, new_parent_id, new_current_hours, now)
    elif new_parent_id and abs(new_current_hours - old_current_hours) > 1e-6:
        delta = new_current_hours - old_current_hours
        _propagate_goal_hours(db, new_parent_id, delta, now)

    # Re-evaluate completion status
    if goal.target_hours > 0 and goal.current_hours >= goal.target_hours:
        goal.is_completed = True
        if not goal.completed_at:
            goal.completed_at = now
    elif "is_completed" not in update_dict:
        goal.is_completed = False
        goal.completed_at = None

    goal.updated_at = now
    db.commit()
    db.refresh(goal)
    invalidate_user_cache(user)
    return _format_goal_response(goal, db)


@router.put("/goals/{goal_id}/planet-build", response_model=StudyGoalResponse)
def update_planet_build(
    goal_id: int,
    data: PlanetBuildUpdateRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    goal = db.query(StudyGoal).filter(StudyGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Mục tiêu không tồn tại")
    _verify_resource_ownership(goal, user)

    goal.planet_data = data.planet_data
    goal.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(goal)
    invalidate_user_cache(user)
    return _format_goal_response(goal, db)


@router.delete("/goals/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    goal = db.query(StudyGoal).filter(StudyGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Mục tiêu không tồn tại")
    _verify_resource_ownership(goal, user)

    try:
        # 1. Gỡ liên kết các mục tiêu con để trở thành mục tiêu độc lập, tránh crash khóa ngoại
        db.query(StudyGoal).filter(StudyGoal.parent_id == goal_id).update({StudyGoal.parent_id: None})

        # 2. Khấu trừ giờ khỏi mục tiêu lớn cha nếu mục tiêu này là mục tiêu con
        if goal.parent_id and goal.current_hours > 0:
            _propagate_goal_hours(db, goal.parent_id, -goal.current_hours, datetime.datetime.utcnow())

        # 3. Gỡ liên kết các phiên học đã hoàn thành -> BẢO TOÀN 100% GIỜ HỌC LỊCH SỬ CỦA NGƯỜI DÙNG
        db.query(StudySessionLog).filter(StudySessionLog.goal_id == goal_id).update({StudySessionLog.goal_id: None})

        # 4. Gỡ liên kết các công việc trong ma trận 4 ô -> KHÔNG BAO GIỜ MẤT NHIỆM VỤ ĐÃ TẠO
        db.query(DailyMatrixTask).filter(DailyMatrixTask.goal_id == goal_id).update({DailyMatrixTask.goal_id: None})

        # 5. Gỡ liên kết TimeCapsule
        db.query(TimeCapsule).filter(TimeCapsule.goal_id == goal_id).update({TimeCapsule.goal_id: None})

        db.delete(goal)
        db.commit()
        invalidate_user_cache(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa mục tiêu an toàn: {str(e)}")

    return {"message": "Đã xóa mục tiêu thành công (bảo toàn toàn bộ giờ học và công việc)"}


