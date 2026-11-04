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
# REWARDS & PEARLS ENDPOINTS (DOPAMINE BAZAAR)
# -------------------------------------------------------------

def _calculate_pearls(db: Session, user_id: Optional[int] = None) -> PearlsBalanceResponse:
    filter_user = (StudySessionLog.user_id == user_id) if user_id else StudySessionLog.user_id.is_(None)
    filter_redemptions = (RewardRedemption.user_id == user_id) if user_id else RewardRedemption.user_id.is_(None)

    total_hours = (
        db.query(func.coalesce(func.sum(StudySessionLog.duration_hours), 0.0))
        .filter(filter_user)
        .scalar()
        or 0.0
    )
    total_earned = round(float(total_hours), 2)

    total_spent = (
        db.query(func.coalesce(func.sum(RewardRedemption.pearls_spent), 0.0))
        .filter(filter_redemptions)
        .scalar()
        or 0.0
    )
    total_spent = round(float(total_spent), 2)
    available = max(0.0, round(total_earned - total_spent, 2))

    return PearlsBalanceResponse(
        total_earned_pearls=total_earned,
        spent_pearls=total_spent,
        available_pearls=available,
    )


_SEED_LOCK = threading.Lock()

def _seed_default_rewards(db: Session):
    with _SEED_LOCK:
        if not db.query(RewardItem).first():
            now = datetime.datetime.utcnow()
            defaults = [
                RewardItem(
                    user_id=None,
                    title="Vé xem 1 bộ phim yêu thích",
                    pearl_cost=2.0,
                    icon="🎬",
                    category="giải trí",
                    description="Tận hưởng 1 bộ phim rạp hoặc tập phim Netflix dài trọn vẹn không chút mặc cảm!",
                    is_custom=False,
                    created_at=now,
                ),
                RewardItem(
                    user_id=None,
                    title="Vé 1 giờ chơi game xả láng",
                    pearl_cost=1.0,
                    icon="🎮",
                    category="giải trí",
                    description="1 tiếng giải trí thỏa thích với trò chơi bạn yêu thích sau giờ học chăm chỉ.",
                    is_custom=False,
                    created_at=now,
                ),
                RewardItem(
                    user_id=None,
                    title="Vé cà phê / trà sữa đặc biệt",
                    pearl_cost=3.0,
                    icon="🧋",
                    category="ẩm thực",
                    description="Tự thưởng 1 ly đồ uống thơm ngon tại quán cà phê chill cuối tuần.",
                    is_custom=False,
                    created_at=now,
                ),
                RewardItem(
                    user_id=None,
                    title="Vé ngủ nướng thêm 1 tiếng",
                    pearl_cost=3.0,
                    icon="🛌",
                    category="nghỉ ngơi",
                    description="Thức dậy muộn hơn 1 tiếng vào buổi sáng cuối tuần không cần báo thức.",
                    is_custom=False,
                    created_at=now,
                ),
                RewardItem(
                    user_id=None,
                    title="Vé bữa ăn ngon / đi ăn lẩu",
                    pearl_cost=6.0,
                    icon="🍣",
                    category="ẩm thực",
                    description="Tự thưởng 1 bữa ăn thịnh soạn cùng bạn bè để ăn mừng tiến độ học tập.",
                    is_custom=False,
                    created_at=now,
                ),
            ]
            try:
                db.add_all(defaults)
                db.commit()
            except Exception:
                db.rollback()


@router.get("/rewards")
def get_rewards(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    _seed_default_rewards(db)
    query = db.query(RewardItem)
    if user:
        query = query.filter((RewardItem.user_id == user.id) | (RewardItem.user_id.is_(None)))
    else:
        query = query.filter(RewardItem.user_id.is_(None))
    items = query.order_by(RewardItem.is_custom.asc(), RewardItem.pearl_cost.asc()).all()
    balance = _calculate_pearls(db, user_id=user.id if user else None)
    return {
        "items": [RewardItemResponse.model_validate(it) for it in items],
        "balance": balance,
    }


@router.post("/rewards", response_model=RewardItemResponse, status_code=201)
def create_reward(
    data: RewardItemCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    if data.pearl_cost <= 0:
        raise HTTPException(status_code=400, detail="Chi phí ngọc phải lớn hơn 0")
    reward = RewardItem(
        user_id=user.id if user else None,
        title=data.title.strip(),
        pearl_cost=round(data.pearl_cost, 2),
        icon=data.icon or "🎁",
        category=data.category or "giải trí",
        description=data.description.strip() if data.description else None,
        is_custom=True,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return RewardItemResponse.model_validate(reward)


_REDEEM_LOCK = threading.Lock()

@router.post("/rewards/redeem", response_model=RewardRedemptionResponse)
def redeem_reward(
    data: RewardRedeemRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    with _REDEEM_LOCK:
        if user:
            # Khóa dòng cấp CSDL (Row-Level Locking) để ngăn race condition trừ ngọc lặp lại giữa các worker
            db.query(User).filter(User.id == user.id).with_for_update().first()

        reward = db.query(RewardItem).filter(RewardItem.id == data.reward_id).first()
        if not reward:
            raise HTTPException(status_code=404, detail="Phần thưởng không tồn tại")
        _verify_resource_ownership(reward, user)

        balance = _calculate_pearls(db, user_id=user.id if user else None)
        if balance.available_pearls < reward.pearl_cost:
            raise HTTPException(
                status_code=400,
                detail=f"Bạn cần {reward.pearl_cost} ngọc nhưng hiện chỉ có {balance.available_pearls} ngọc. Hãy học thêm nhé!",
            )

        redemption = RewardRedemption(
            user_id=user.id if user else None,
            reward_id=reward.id,
            reward_title=reward.title,
            reward_icon=reward.icon,
            pearls_spent=reward.pearl_cost,
            note=data.note.strip() if data.note else None,
            redeemed_at=datetime.datetime.utcnow(),
        )
        db.add(redemption)
        db.commit()
        db.refresh(redemption)
        return RewardRedemptionResponse.model_validate(redemption)


@router.get("/rewards/history", response_model=List[RewardRedemptionResponse])
def get_redemption_history(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(RewardRedemption)
    if user:
        query = query.filter(RewardRedemption.user_id == user.id)
    else:
        query = query.filter(RewardRedemption.user_id.is_(None))
    redemptions = query.order_by(RewardRedemption.redeemed_at.desc()).limit(50).all()
    return [RewardRedemptionResponse.model_validate(r) for r in redemptions]


