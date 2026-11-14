import os
import datetime
import math
import re
import threading
from typing import List, Optional, Dict, Any
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


DEFAULT_CELESTIALS = [
    "Polaris (Bắc Đẩu)",
    "Sirius (Thiên Lang)",
    "Vega (Chức Nữ)",
    "Altair (Ngưu Lang)",
    "Antares (Tâm Túc)",
    "Spica (Giác Túc)",
    "Arcturus (Đại Giác)",
    "Rigel (Tham Tú)",
    "Betelgeuse (Sâm Tú)",
    "Aldebaran (Tất Tú)",
]


def _get_real_user(user: Any) -> Optional[User]:
    if user and hasattr(user, "id") and type(user).__name__ != "Depends":
        return user
    return None


def _verify_resource_ownership(resource, current_user: Optional[User]):
    """
    OWASP API1 (IDOR) Security Guard:
    Ngăn chặn người dùng can thiệp vào tài nguyên của người dùng khác.
    - Nếu tài nguyên thuộc về một user_id cụ thể:
      - Bắt buộc người gọi phải đăng nhập.
      - Người gọi phải đúng là chủ sở hữu, hoặc có quyền Quản trị viên (Admin).
    """
    if not resource:
        return
    res_user_id = getattr(resource, "user_id", None)
    if res_user_id is not None:
        real_user = _get_real_user(current_user)
        if not real_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Vui lòng đăng nhập để thao tác trên tài nguyên này."
            )
        if res_user_id != real_user.id and not getattr(real_user, "is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền thao tác trên tài nguyên của người dùng khác!"
            )


from app.services.streak import (
    VN_TZ,
    vn_now,
    vn_today,
    calculate_real_user_streak,
    update_user_streak,
)


def _propagate_goal_hours(db: Session, parent_id: Optional[int], hours_delta: float, now: datetime.datetime):
    """
    Tự động leo cây phân cấp mục tiêu cha (Parent Goal Rollup),
    cộng dồn/khấu trừ hours_delta và tự động cập nhật trạng thái hoàn thành.
    Bảo vệ chống chu kỳ (cycle guard) bằng tập visited.
    """
    if not parent_id or abs(hours_delta) < 1e-6:
        return
    curr_id = parent_id
    visited = set()
    while curr_id and curr_id not in visited:
        visited.add(curr_id)
        parent = db.query(StudyGoal).filter(StudyGoal.id == curr_id).first()
        if not parent:
            break
        parent.current_hours = max(0.0, round(parent.current_hours + hours_delta, 2))
        if parent.target_hours > 0 and parent.current_hours >= parent.target_hours:
            parent.is_completed = True
            if not parent.completed_at:
                parent.completed_at = now
        else:
            parent.is_completed = False
            parent.completed_at = None
        parent.updated_at = now
        curr_id = parent.parent_id


def _reconcile_parent_goals(db: Session, user_id: Optional[int]):
    """
    Tự động đối soát và cân bằng lại số giờ của các Mục Tiêu Lớn cấp trên (Parent Goals).
    - Có cycle guard phát hiện và ngắt chu kỳ cha-con bất thường (A->B->A).
    - Bảo toàn số giờ gốc nếu người dùng/admin tự thiết lập trực tiếp trên mục tiêu cha.
    """
    query = db.query(StudyGoal)
    if user_id is not None:
        query = query.filter(StudyGoal.user_id == user_id)
    else:
        query = query.filter(StudyGoal.user_id.is_(None))
    all_goals = query.all()
    if not all_goals:
        return

    # 1. Phát hiện và bẻ gãy mọi chu kỳ cha-con (Cycle Breaking Guard)
    goal_dict: Dict[int, StudyGoal] = {g.id: g for g in all_goals}
    has_broken_cycle = False
    for g in all_goals:
        visited_nodes = set()
        curr_node = g
        while curr_node and curr_node.parent_id:
            if curr_node.parent_id == g.id or curr_node.id in visited_nodes:
                g.parent_id = None
                has_broken_cycle = True
                break
            visited_nodes.add(curr_node.id)
            curr_node = goal_dict.get(curr_node.parent_id)

    if has_broken_cycle:
        db.commit()

    parent_map: Dict[int, List[StudyGoal]] = {}
    for g in all_goals:
        if g.parent_id:
            parent_map.setdefault(g.parent_id, []).append(g)

    if not parent_map:
        return

    # Single grouped query to fetch direct hours for all parents at once (O(1) roundtrip)
    parent_ids = list(parent_map.keys())
    direct_rows = (
        db.query(StudySessionLog.goal_id, func.sum(StudySessionLog.duration_hours))
        .filter(StudySessionLog.goal_id.in_(parent_ids))
        .group_by(StudySessionLog.goal_id)
        .all()
    )
    direct_hours_map: Dict[int, float] = {
        gid: float(hrs or 0.0) for gid, hrs in direct_rows if gid is not None
    }

    now = datetime.datetime.utcnow()
    changed = False
    for pid, children in parent_map.items():
        parent = goal_dict.get(pid)
        if not parent:
            continue
        direct_hours = direct_hours_map.get(pid, 0.0)
        sub_hours = sum(c.current_hours for c in children)
        # Tự động đồng bộ số giờ chính xác = direct_hours + tổng giờ các mục tiêu con (hỗ trợ cả tăng và giảm)
        calculated_sum = round(float(direct_hours) + float(sub_hours), 2)
        expected_hours = calculated_sum
        if abs(parent.current_hours - expected_hours) > 0.01:
            parent.current_hours = expected_hours
            if parent.target_hours > 0 and parent.current_hours >= parent.target_hours:
                parent.is_completed = True
                if not parent.completed_at:
                    parent.completed_at = now
            else:
                parent.is_completed = False
                parent.completed_at = None
            parent.updated_at = now
            changed = True

    if changed:
        db.commit()


def _update_user_streak(
    db: Session,
    user: Optional[User],
    activity_date: Optional[datetime.date] = None,
) -> Optional[Player]:
    """
    Thuật toán Chuỗi Ngày Liên Tục (Streak) chuẩn quốc tế & thông minh:
    - Nếu hôm nay đã có hoạt động: Giữ nguyên streak (không tăng lặp trong ngày).
    - Nếu hôm qua có hoạt động: Kéo dài streak (+1 ngày).
    - Nếu bị đứt chuỗi nhẹ (ví dụ học muộn qua nửa đêm): Cơ chế Smart Grace bảo toàn chuỗi.
    - Tự động đồng bộ và phục hồi nếu streak trong DB bị lệch thấp hơn thực tế.
    - Thưởng +50 EXP mỗi ngày học và +300 EXP kèm Huy hiệu STREAK_7 khi đạt mốc 7 ngày liên tục.
    """
    real_user = _get_real_user(user)
    if not real_user:
        return None
    return update_user_streak(db, real_user.id, activity_date)


def _format_goal_response(
    goal: StudyGoal,
    db: Optional[Session] = None,
    sub_count: Optional[int] = None,
    parent_title: Optional[str] = None,
) -> StudyGoalResponse:
    target = goal.target_hours if (goal.target_hours and goal.target_hours > 0) else 1.0
    progress = round(min(100.0, (goal.current_hours / target) * 100.0), 1)
    remaining = max(0.0, round(goal.target_hours - goal.current_hours, 2))

    days_left = None
    hours_needed = None
    if goal.target_date:
        today = datetime.date.today()
        delta = (goal.target_date - today).days
        days_left = max(0, delta)
        if days_left > 0 and remaining > 0:
            hours_needed = round(remaining / float(days_left), 2)
        elif remaining > 0:
            hours_needed = remaining

    if parent_title is None and db and goal.parent_id:
        parent = db.query(StudyGoal).filter(StudyGoal.id == goal.parent_id).first()
        if parent:
            parent_title = parent.title

    if sub_count is None:
        sub_count = db.query(StudyGoal).filter(StudyGoal.parent_id == goal.id).count() if db else 0

    return StudyGoalResponse(
        id=goal.id,
        title=goal.title,
        celestial_name=goal.celestial_name or "Polaris",
        goal_type=goal.goal_type or "hours",
        target_hours=goal.target_hours or 100.0,
        current_hours=goal.current_hours or 0.0,
        target_date=goal.target_date,
        parent_id=goal.parent_id,
        parent_title=parent_title,
        planet_type=goal.planet_type or "earth",
        planet_data=goal.planet_data,
        sub_goals_count=sub_count,
        days_left=days_left,
        hours_per_day_needed=hours_needed,
        color=goal.color or "#E24A4A",
        category=goal.category or "Học tập",
        is_completed=goal.is_completed,
        completed_at=goal.completed_at,
        notes=goal.notes,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        progress_percent=progress,
        remaining_hours=remaining,
    )


def _format_session_response(s: StudySessionLog) -> StudySessionLogResponse:
    goal_title = s.goal.title if s.goal else None
    goal_color = s.goal.color if s.goal else None
    return StudySessionLogResponse(
        id=s.id,
        goal_id=s.goal_id,
        goal_title=goal_title,
        goal_color=goal_color,
        duration_minutes=s.duration_minutes or 0,
        duration_hours=s.duration_hours or 0.0,
        session_date=s.session_date,
        topic_note=s.topic_note,
        source=s.source or "manual",
        created_at=s.created_at,
    )



__all__ = [
    "DEFAULT_CELESTIALS",
    "_get_real_user",
    "_verify_resource_ownership",
    "VN_TZ",
    "vn_now",
    "vn_today",
    "_propagate_goal_hours",
    "_reconcile_parent_goals",
    "_update_user_streak",
    "_format_goal_response",
    "_format_session_response",
]
