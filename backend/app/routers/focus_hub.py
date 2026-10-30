import datetime
import math
import re
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    StudyGoal,
    StudySessionLog,
    RewardItem,
    RewardRedemption,
    TimeCapsule,
    ConstellationAchievement,
    DailyMatrixTask,
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
from app.routers.auth import get_current_user_optional

router = APIRouter(prefix="/api/focus", tags=["Pomodoro Focus & Goals"])

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


def _format_goal_response(goal: StudyGoal, db: Session = None) -> StudyGoalResponse:
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

    parent_title = None
    sub_goals_count = 0
    if db:
        if goal.parent_id:
            parent = db.query(StudyGoal).filter(StudyGoal.id == goal.parent_id).first()
            if parent:
                parent_title = parent.title
        sub_goals_count = db.query(StudyGoal).filter(StudyGoal.parent_id == goal.id).count()

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
        sub_goals_count=sub_goals_count,
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


# -------------------------------------------------------------
# GOALS ENDPOINTS
# -------------------------------------------------------------

@router.get("/goals", response_model=List[StudyGoalResponse])
def get_goals(
    is_completed: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    if user:
        query = db.query(StudyGoal).filter(StudyGoal.user_id == user.id)
    else:
        query = db.query(StudyGoal).filter(StudyGoal.user_id.is_(None))
    if is_completed is not None:
        query = query.filter(StudyGoal.is_completed == is_completed)
    goals = query.order_by(StudyGoal.is_completed.asc(), StudyGoal.updated_at.desc()).all()
    return [_format_goal_response(g, db) for g in goals]


@router.post("/goals", response_model=StudyGoalResponse, status_code=201)
def create_goal(
    data: StudyGoalCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    is_done = data.current_hours >= data.target_hours if data.target_hours > 0 else False
    now = datetime.datetime.utcnow()

    # Assign celestial planet name
    existing_count = db.query(StudyGoal).count()
    celestial = data.celestial_name or DEFAULT_CELESTIALS[existing_count % len(DEFAULT_CELESTIALS)]

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
    db.commit()
    db.refresh(goal)
    return _format_goal_response(goal, db)


@router.put("/goals/{goal_id}", response_model=StudyGoalResponse)
def update_goal(goal_id: int, data: StudyGoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(StudyGoal).filter(StudyGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Mục tiêu không tồn tại")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(goal, k, v)

    # Re-evaluate completion status
    if goal.current_hours >= goal.target_hours:
        goal.is_completed = True
        if not goal.completed_at:
            goal.completed_at = datetime.datetime.utcnow()
    elif "is_completed" not in update_dict:
        goal.is_completed = False
        goal.completed_at = None

    goal.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(goal)
    return _format_goal_response(goal, db)


@router.put("/goals/{goal_id}/planet-build", response_model=StudyGoalResponse)
def update_planet_build(
    goal_id: int,
    data: PlanetBuildUpdateRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(StudyGoal).filter(StudyGoal.id == goal_id)
    if user:
        query = query.filter((StudyGoal.user_id == user.id) | (StudyGoal.user_id.is_(None)))
    goal = query.first()
    if not goal:
        raise HTTPException(status_code=404, detail="Mục tiêu không tồn tại")
    goal.planet_data = data.planet_data
    goal.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(goal)
    return _format_goal_response(goal, db)


@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(StudyGoal).filter(StudyGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Mục tiêu không tồn tại")

    try:
        # 1. Gỡ liên kết các mục tiêu con để trở thành mục tiêu độc lập, tránh crash khóa ngoại
        db.query(StudyGoal).filter(StudyGoal.parent_id == goal_id).update({StudyGoal.parent_id: None})

        # 2. Gỡ liên kết các phiên học đã hoàn thành -> BẢO TOÀN 100% GIỜ HỌC LỊCH SỬ CỦA NGƯỜI DÙNG
        db.query(StudySessionLog).filter(StudySessionLog.goal_id == goal_id).update({StudySessionLog.goal_id: None})

        # 3. Gỡ liên kết các công việc trong ma trận 4 ô -> KHÔNG BAO GIỜ MẤT NHIỆM VỤ ĐÃ TẠO
        db.query(DailyMatrixTask).filter(DailyMatrixTask.goal_id == goal_id).update({DailyMatrixTask.goal_id: None})

        # 4. Gỡ liên kết TimeCapsule
        db.query(TimeCapsule).filter(TimeCapsule.goal_id == goal_id).update({TimeCapsule.goal_id: None})

        db.delete(goal)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa mục tiêu an toàn: {str(e)}")

    return {"message": "Đã xóa mục tiêu thành công (bảo toàn toàn bộ giờ học và công việc)"}


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

    sessions = query.order_by(StudySessionLog.session_date.desc(), StudySessionLog.created_at.desc()).limit(limit).all()
    return [_format_session_response(s) for s in sessions]


@router.post("/sessions", response_model=StudySessionLogResponse, status_code=201)
def create_session(
    data: StudySessionLogCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    if data.duration_minutes <= 0:
        raise HTTPException(status_code=400, detail="Thời lượng học phải lớn hơn 0 phút")

    duration_hours = round(data.duration_minutes / 60.0, 2)
    session_date = data.session_date or datetime.date.today()
    now = datetime.datetime.utcnow()

    session_log = StudySessionLog(
        user_id=user.id if user else None,
        goal_id=data.goal_id,
        duration_minutes=data.duration_minutes,
        duration_hours=duration_hours,
        session_date=session_date,
        topic_note=data.topic_note.strip() if data.topic_note else None,
        source=data.source or "manual",
        created_at=now,
    )
    db.add(session_log)

    # Accumulate into goal if linked
    if data.goal_id:
        goal = db.query(StudyGoal).filter(StudyGoal.id == data.goal_id).first()
        if goal:
            goal.current_hours = round(goal.current_hours + duration_hours, 2)
            if goal.current_hours >= goal.target_hours:
                goal.is_completed = True
                if not goal.completed_at:
                    goal.completed_at = now
            goal.updated_at = now

    db.commit()
    db.refresh(session_log)
    return _format_session_response(session_log)


@router.put("/sessions/{session_id}", response_model=StudySessionLogResponse)
def update_session(session_id: int, data: StudySessionLogUpdate, db: Session = Depends(get_db)):
    session_log = db.query(StudySessionLog).filter(StudySessionLog.id == session_id).first()
    if not session_log:
        raise HTTPException(status_code=404, detail="Bản ghi học tập không tồn tại")

    old_minutes = session_log.duration_minutes
    old_hours = session_log.duration_hours
    old_goal_id = session_log.goal_id

    update_dict = data.model_dump(exclude_unset=True)
    if "duration_minutes" in update_dict and update_dict["duration_minutes"] is not None:
        if update_dict["duration_minutes"] <= 0:
            raise HTTPException(status_code=400, detail="Thời lượng học phải lớn hơn 0")
        new_minutes = update_dict["duration_minutes"]
        new_hours = round(new_minutes / 60.0, 2)
        session_log.duration_minutes = new_minutes
        session_log.duration_hours = new_hours
    else:
        new_hours = old_hours

    if "session_date" in update_dict:
        session_log.session_date = update_dict["session_date"]
    if "topic_note" in update_dict:
        session_log.topic_note = update_dict["topic_note"]
    if "source" in update_dict:
        session_log.source = update_dict["source"]

    new_goal_id = update_dict.get("goal_id", old_goal_id)

    # If goal changed or hours changed, reconcile goal hours
    now = datetime.datetime.utcnow()
    if old_goal_id != new_goal_id:
        if old_goal_id:
            old_g = db.query(StudyGoal).filter(StudyGoal.id == old_goal_id).first()
            if old_g:
                old_g.current_hours = max(0.0, round(old_g.current_hours - old_hours, 2))
                if old_g.current_hours < old_g.target_hours:
                    old_g.is_completed = False
                old_g.updated_at = now
        if new_goal_id:
            new_g = db.query(StudyGoal).filter(StudyGoal.id == new_goal_id).first()
            if new_g:
                new_g.current_hours = round(new_g.current_hours + new_hours, 2)
                if new_g.current_hours >= new_g.target_hours:
                    new_g.is_completed = True
                    if not new_g.completed_at:
                        new_g.completed_at = now
                new_g.updated_at = now
        session_log.goal_id = new_goal_id
    elif old_goal_id and old_hours != new_hours:
        goal = db.query(StudyGoal).filter(StudyGoal.id == old_goal_id).first()
        if goal:
            goal.current_hours = max(0.0, round(goal.current_hours - old_hours + new_hours, 2))
            if goal.current_hours >= goal.target_hours:
                goal.is_completed = True
                if not goal.completed_at:
                    goal.completed_at = now
            else:
                goal.is_completed = False
            goal.updated_at = now

    db.commit()
    db.refresh(session_log)
    return _format_session_response(session_log)


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session_log = db.query(StudySessionLog).filter(StudySessionLog.id == session_id).first()
    if not session_log:
        raise HTTPException(status_code=404, detail="Bản ghi học tập không tồn tại")

    if session_log.goal_id:
        goal = db.query(StudyGoal).filter(StudyGoal.id == session_log.goal_id).first()
        if goal:
            goal.current_hours = max(0.0, round(goal.current_hours - session_log.duration_hours, 2))
            if goal.current_hours < goal.target_hours:
                goal.is_completed = False
            goal.updated_at = datetime.datetime.utcnow()

    db.delete(session_log)
    db.commit()
    return {"message": "Đã xóa bản ghi học tập"}


# -------------------------------------------------------------
# STATS & OVERVIEW
# -------------------------------------------------------------

@router.get("/stats", response_model=FocusStatsResponse)
def get_focus_stats(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    today = datetime.date.today()
    week_start = today - datetime.timedelta(days=today.weekday())

    if user:
        all_sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id == user.id).all()
        completed_goals = db.query(StudyGoal).filter(StudyGoal.user_id == user.id, StudyGoal.is_completed == True).count()
        active_goals = db.query(StudyGoal).filter(StudyGoal.user_id == user.id, StudyGoal.is_completed == False).count()
    else:
        all_sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id.is_(None)).all()
        completed_goals = db.query(StudyGoal).filter(StudyGoal.user_id.is_(None), StudyGoal.is_completed == True).count()
        active_goals = db.query(StudyGoal).filter(StudyGoal.user_id.is_(None), StudyGoal.is_completed == False).count()

    total_hours = round(sum(s.duration_hours for s in all_sessions), 2)
    today_hours = round(sum(s.duration_hours for s in all_sessions if s.session_date == today), 2)
    week_hours = round(sum(s.duration_hours for s in all_sessions if s.session_date >= week_start), 2)
    total_sessions = len(all_sessions)
    pomodoro_sessions = sum(1 for s in all_sessions if s.source == "pomodoro")

    # Last 7 days breakdown
    last_7_days: List[DailyFocusStat] = []
    for i in range(6, -1, -1):
        d = today - datetime.timedelta(days=i)
        day_sessions = [s for s in all_sessions if s.session_date == d]
        day_minutes = sum(s.duration_minutes for s in day_sessions)
        day_hours = round(day_minutes / 60.0, 2)
        last_7_days.append(
            DailyFocusStat(
                date=d.strftime("%d/%m"),
                hours=day_hours,
                minutes=day_minutes,
            )
        )

    return FocusStatsResponse(
        total_hours=total_hours,
        today_hours=today_hours,
        week_hours=week_hours,
        total_sessions=total_sessions,
        pomodoro_sessions=pomodoro_sessions,
        completed_goals=completed_goals,
        active_goals=active_goals,
        last_7_days=last_7_days,
    )


# -------------------------------------------------------------
# REWARDS & PEARLS ENDPOINTS (DOPAMINE BAZAAR)
# -------------------------------------------------------------

def _calculate_pearls(db: Session, user_id: Optional[int] = None) -> PearlsBalanceResponse:
    if user_id:
        all_sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id == user_id).all()
        redemptions = db.query(RewardRedemption).all()
    else:
        all_sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id.is_(None)).all()
        redemptions = db.query(RewardRedemption).all()
    total_hours = sum(s.duration_hours for s in all_sessions)
    total_earned = round(total_hours, 2)

    total_spent = round(sum(r.pearls_spent for r in redemptions), 2)
    available = max(0.0, round(total_earned - total_spent, 2))

    return PearlsBalanceResponse(
        total_earned_pearls=total_earned,
        spent_pearls=total_spent,
        available_pearls=available,
    )


def _seed_default_rewards(db: Session):
    if not db.query(RewardItem).first():
        defaults = [
            RewardItem(
                title="Vé xem 1 bộ phim yêu thích",
                pearl_cost=2.0,
                icon="🎬",
                category="giải trí",
                description="Tận hưởng 1 bộ phim rạp hoặc tập phim Netflix dài trọn vẹn không chút mặc cảm!",
                is_custom=False,
            ),
            RewardItem(
                title="Vé 1 giờ chơi game xả láng",
                pearl_cost=1.0,
                icon="🎮",
                category="giải trí",
                description="1 tiếng giải trí thỏa thích với trò chơi bạn yêu thích sau giờ học chăm chỉ.",
                is_custom=False,
            ),
            RewardItem(
                title="Vé cà phê / trà sữa đặc biệt",
                pearl_cost=3.0,
                icon="🧋",
                category="ẩm thực",
                description="Tự thưởng 1 ly đồ uống thơm ngon tại quán cà phê chill cuối tuần.",
                is_custom=False,
            ),
            RewardItem(
                title="Vé ngủ nướng thêm 1 tiếng",
                pearl_cost=3.0,
                icon="🛌",
                category="nghỉ ngơi",
                description="Thức dậy muộn hơn 1 tiếng vào buổi sáng cuối tuần không cần báo thức.",
                is_custom=False,
            ),
            RewardItem(
                title="Vé bữa ăn ngon / đi ăn lẩu",
                pearl_cost=6.0,
                icon="🍣",
                category="ẩm thực",
                description="Tự thưởng 1 bữa ăn thịnh soạn cùng bạn bè để ăn mừng tiến độ học tập.",
                is_custom=False,
            ),
        ]
        db.add_all(defaults)
        db.commit()


@router.get("/rewards")
def get_rewards(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    _seed_default_rewards(db)
    items = db.query(RewardItem).order_by(RewardItem.is_custom.asc(), RewardItem.pearl_cost.asc()).all()
    balance = _calculate_pearls(db, user_id=user.id if user else None)
    return {
        "items": [RewardItemResponse.model_validate(it) for it in items],
        "balance": balance,
    }


@router.post("/rewards", response_model=RewardItemResponse, status_code=201)
def create_reward(data: RewardItemCreate, db: Session = Depends(get_db)):
    if data.pearl_cost <= 0:
        raise HTTPException(status_code=400, detail="Chi phí ngọc phải lớn hơn 0")
    reward = RewardItem(
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


@router.post("/rewards/redeem", response_model=RewardRedemptionResponse)
def redeem_reward(data: RewardRedeemRequest, db: Session = Depends(get_db)):
    reward = db.query(RewardItem).filter(RewardItem.id == data.reward_id).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Phần thưởng không tồn tại")

    balance = _calculate_pearls(db)
    if balance.available_pearls < reward.pearl_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Bạn cần {reward.pearl_cost} ngọc nhưng hiện chỉ có {balance.available_pearls} ngọc. Hãy học thêm nhé!",
        )

    redemption = RewardRedemption(
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
def get_redemption_history(db: Session = Depends(get_db)):
    redemptions = db.query(RewardRedemption).order_by(RewardRedemption.redeemed_at.desc()).limit(50).all()
    return [RewardRedemptionResponse.model_validate(r) for r in redemptions]


# -------------------------------------------------------------
# TOPIC GALAXY ENDPOINT
# -------------------------------------------------------------

PLANET_PALETTES = [
  "#10B981", # emerald
  "#06B6D4", # cyan
  "#8B5CF6", # violet
  "#F59E0B", # amber
  "#EC4899", # pink
  "#3B82F6", # blue
  "#F97316", # orange
  "#A855F7", # purple
]

def _extract_topic(note: Optional[str]) -> str:
    if not note or not note.strip():
        return "Tập trung chung"
    text = note.strip()
    # Check common prefixes like "chủ đề du lịch" -> "Du lịch"
    match = re.search(r"chủ\s*đề\s+([^\.,;\n]+)", text, re.IGNORECASE)
    if match:
        return match.group(1).strip().capitalize()
    
    # If starting with "Nói tiếng Anh" or "Luyện..."
    if len(text) > 28:
        # Take first 4 words
        words = text.split()
        return " ".join(words[:3]).capitalize()
    return text.capitalize()


@router.get("/galaxy", response_model=TopicGalaxyResponse)
def get_topic_galaxy(db: Session = Depends(get_db)):
    goals = db.query(StudyGoal).order_by(StudyGoal.is_completed.desc(), StudyGoal.created_at.asc()).all()
    sessions = db.query(StudySessionLog).all()
    total_study_hours = round(sum(s.duration_hours for s in sessions), 2)
    total_sessions_count = len(sessions)

    sun_info = {
        "name": "Mặt Trời Tri Thức",
        "total_hours": total_study_hours,
        "total_sessions": total_sessions_count,
        "solar_power": "Cốt Lõi Ý Chí",
    }

    if not goals:
        return TopicGalaxyResponse(
            planets=[],
            total_goals=0,
            completed_goals=0,
            sun_stats=sun_info,
            constellation_links=[],
            active_archetype=None,
        )

    # Find the most recently studied goal
    latest_session = db.query(StudySessionLog).order_by(StudySessionLog.created_at.desc()).first()
    recent_goal_id = latest_session.goal_id if latest_session else None

    planets: List[TopicPlanetResponse] = []
    for idx, g in enumerate(goals):
        celestial_name = g.celestial_name or DEFAULT_CELESTIALS[idx % len(DEFAULT_CELESTIALS)]
        target_h = g.target_hours if g.target_hours > 0 else 1.0
        prog = round(min(100.0, (g.current_hours / target_h) * 100.0), 1)

        # Level: 5 if completed, otherwise 1-4 based on progress
        if g.is_completed:
            lvl = 5
        elif prog < 25.0:
            lvl = 1
        elif prog < 50.0:
            lvl = 2
        elif prog < 75.0:
            lvl = 3
        else:
            lvl = 4

        # Sessions for this goal
        goal_sessions = [s for s in sessions if s.goal_id == g.id]
        last_date_str = max(s.session_date for s in goal_sessions).strftime("%d/%m/%Y") if goal_sessions else None

        color = g.color or PLANET_PALETTES[idx % len(PLANET_PALETTES)]
        is_rec = (recent_goal_id == g.id) or (
            g.is_completed and g.completed_at and (datetime.datetime.utcnow() - g.completed_at).total_seconds() < 86400
        )

        planets.append(
            TopicPlanetResponse(
                goal_id=g.id,
                name=celestial_name,
                real_title=g.title,
                is_completed=g.is_completed,
                current_hours=g.current_hours,
                target_hours=g.target_hours,
                progress_percent=prog,
                session_count=len(goal_sessions),
                level=lvl,
                color=color,
                category=g.category or "Học tập",
                notes=g.notes,
                last_studied=last_date_str,
                is_recent=is_rec,
                goal_type=getattr(g, 'goal_type', 'hours') or 'hours',
                target_date=g.target_date,
                parent_id=g.parent_id,
                planet_type=getattr(g, 'planet_type', 'earth') or 'earth',
                planet_data=getattr(g, 'planet_data', '[]') or '[]',
                sub_goals_count=len(g.sub_goals) if hasattr(g, 'sub_goals') and g.sub_goals else 0,
            )
        )

    # Constellation links based on COMPLETED goals
    completed_planets = [p for p in planets if p.is_completed]
    completed_count = len(completed_planets)

    constellation_links: List[List[str]] = []
    active_archetype = None

    if completed_count >= 1:
        # Determine archetype
        if completed_count == 1:
            active_archetype = "triangle"
        elif completed_count == 2:
            active_archetype = "arrow"
        elif completed_count == 3:
            active_archetype = "eagle"
        elif completed_count == 4:
            active_archetype = "shield"
        elif completed_count == 5:
            active_archetype = "crown"
        else:
            active_archetype = "dragon"

        completed_names = [p.name for p in completed_planets]
        if completed_count >= 2:
            for i in range(completed_count - 1):
                constellation_links.append([completed_names[i], completed_names[i + 1]])
            if completed_count >= 3:
                constellation_links.append([completed_names[-1], completed_names[0]])
            if completed_count >= 4:
                constellation_links.append([completed_names[0], completed_names[2]])
        elif completed_count == 1 and len(planets) >= 2:
            # Connect the completed planet with the next in-progress planet!
            constellation_links.append([completed_names[0], planets[1].name])

    return TopicGalaxyResponse(
        planets=planets,
        total_goals=len(planets),
        completed_goals=completed_count,
        sun_stats=sun_info,
        constellation_links=constellation_links,
        active_archetype=active_archetype,
    )


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
# TIME CAPSULE ENDPOINTS
# -------------------------------------------------------------

@router.get("/time-capsules", response_model=List[TimeCapsuleResponse])
def get_time_capsules(db: Session = Depends(get_db)):
    # Calculate total study hours across all sessions
    all_sessions = db.query(StudySessionLog).all()
    total_hours = sum(s.duration_hours for s in all_sessions)

    capsules = db.query(TimeCapsule).order_by(TimeCapsule.milestone_hours.asc()).all()
    now = datetime.datetime.utcnow()

    # Check auto-unlock
    for cap in capsules:
        if total_hours >= cap.milestone_hours and not cap.is_unlocked:
            cap.is_unlocked = True
            cap.unlocked_at = now

    db.commit()
    return [TimeCapsuleResponse.model_validate(c) for c in capsules]


@router.post("/time-capsules", response_model=TimeCapsuleResponse, status_code=201)
def create_time_capsule(data: TimeCapsuleCreate, db: Session = Depends(get_db)):
    if data.milestone_hours <= 0:
        raise HTTPException(status_code=400, detail="Mốc giờ mở khóa phải lớn hơn 0")

    # Check if total study hours already reached milestone
    all_sessions = db.query(StudySessionLog).all()
    total_hours = sum(s.duration_hours for s in all_sessions)
    now = datetime.datetime.utcnow()
    is_unlocked = total_hours >= data.milestone_hours

    capsule = TimeCapsule(
        goal_id=data.goal_id,
        milestone_hours=round(data.milestone_hours, 1),
        title=data.title.strip() if data.title else "Thư gửi tương lai",
        message_content=data.message_content.strip(),
        is_unlocked=is_unlocked,
        unlocked_at=now if is_unlocked else None,
        created_at=now,
    )
    db.add(capsule)
    db.commit()
    db.refresh(capsule)
    return TimeCapsuleResponse.model_validate(capsule)


# -------------------------------------------------------------
# CONSTELLATION ACHIEVEMENTS (AI MEANING & VOICE NARATION)
# -------------------------------------------------------------

DEFAULT_CONSTELLATIONS = [
    {
        "code": "triangulum",
        "title": "Chòm Sao Tam Giác Khởi Nguyên",
        "archetype": "Tam Giác Khởi Nguyên",
        "icon": "🔺",
        "required_completed_goals": 1,
        "shape_pattern": "triangle",
        "ai_interpretation": "Sự hội tụ đầu tiên giữa ngọn lửa ý chí và Mặt Trời Tri Thức đã tạo nên Tam Giác Khởi Nguyên. Đây là minh chứng bạn đã phá vỡ rào cản của sự trì hoãn và hoàn thành trọn vẹn mục tiêu lớn đầu tiên!",
        "narration_script": "Chúc mừng bạn! Bạn đã hoàn thành mục tiêu lớn đầu tiên và khai mở Chòm Sao Tam Giác Khởi Nguyên. Một đỉnh cao mới đã được chinh phục, ngọn lửa tri thức trong bạn đang bùng cháy rực rỡ hơn bao giờ hết!",
    },
    {
        "code": "sagittarius",
        "title": "Chòm Sao Nhân Mã Mũi Tên",
        "archetype": "Nhân Mã Mũi Tên",
        "icon": "🏹",
        "required_completed_goals": 2,
        "shape_pattern": "arrow",
        "ai_interpretation": "Hai mục tiêu lớn đã được chinh phục thành công, các vì sao liên kết thành Mũi Tên Nhân Mã hướng thẳng về đích đến 1000 giờ. Bạn đã có tầm nhìn rõ ràng và sự kiên định không gì lay chuyển.",
        "narration_script": "Xuất sắc! Sự kiên trì qua hai mục tiêu lớn đã dệt nên Chòm Sao Nhân Mã Mũi Tên. Mũi tên ý chí của bạn đang lao vút đi không dao động, sẵn sàng xuyên qua mọi thử thách phía trước!",
    },
    {
        "code": "aquila",
        "title": "Chòm Sao Đại Bàng Tri Thức",
        "archetype": "Đại Bàng Tri Thức",
        "icon": "🦅",
        "required_completed_goals": 3,
        "shape_pattern": "eagle",
        "ai_interpretation": "Đôi cánh chim đại bàng sải rộng trên dải ngân hà tượng trưng cho sự bứt phá khỏi những thói quen tầm thường. Ba mục tiêu hoàn thành chứng minh bạn đã nắm giữ phương pháp học tập đỉnh cao.",
        "narration_script": "Tuyệt vời! Chòm Sao Đại Bàng Tri Thức đã được thắp sáng. Với ba mục tiêu hoàn thành, bạn đang sải cánh bay cao trên đỉnh núi tri thức, nhìn xa trông rộng và tự do làm chủ vận mệnh!",
    },
    {
        "code": "scutum",
        "title": "Chòm Sao Khiên Thép Kỷ Luật",
        "archetype": "Khiên Thép Kỷ Luật",
        "icon": "🛡️",
        "required_completed_goals": 4,
        "shape_pattern": "shield",
        "ai_interpretation": "Tấm khiên sao lục giác hộ mệnh che chở tâm trí. Kỷ luật thép qua bốn mục tiêu lớn đã ăn sâu vào tiềm thức, tạo nên bản lĩnh vững vàng trước mọi sóng gió và sự xao nhãng.",
        "narration_script": "Kính phục sự kiên định của bạn! Chòm Sao Khiên Thép Kỷ Luật đã thành hình. Kỷ luật đã trở thành bản năng tự nhiên, không cám dỗ nào có thể làm bạn lung lay!",
    },
    {
        "code": "corona",
        "title": "Chòm Sao Vương Miện Tinh Hoa",
        "archetype": "Vương Miện Tinh Hoa",
        "icon": "👑",
        "required_completed_goals": 5,
        "shape_pattern": "crown",
        "ai_interpretation": "Vương miện sao tỏa sáng với các đỉnh ngọc tinh khiết, tượng trưng cho trí tuệ uyên bác và khả năng làm chủ kiến thức toàn diện qua năm mục tiêu lớn.",
        "narration_script": "Đỉnh cao tinh hoa! Chòm Sao Vương Miện Tinh Hoa đã vinh danh bạn. Năm mục tiêu lớn đã hoàn thành, bạn đã chạm đến cảnh giới của sự thông tuệ và bản lĩnh phi thường!",
    },
    {
        "code": "draco",
        "title": "Chòm Sao Rồng Thần Bất Tử",
        "archetype": "Rồng Thần Bất Tử",
        "icon": "🐉",
        "required_completed_goals": 6,
        "shape_pattern": "dragon",
        "ai_interpretation": "Rồng thần uốn lượn ôm trọn dải ngân hà, biểu tượng cho huyền thoại kiên trì và đỉnh cao chinh phục trọn vẹn mục tiêu học tập tối thượng.",
        "narration_script": "Huyền thoại đã thành hiện thực! Chòm Sao Rồng Thần Bất Tử đã thức tỉnh. Bạn chính là tấm gương sáng ngời cho tinh thần học tập suốt đời không bao giờ bỏ cuộc!",
    },
]

def _seed_constellations_if_empty(db: Session):
    existing = db.query(ConstellationAchievement).count()
    if existing == 0:
        now = datetime.datetime.utcnow()
        for c_data in DEFAULT_CONSTELLATIONS:
            item = ConstellationAchievement(
                code=c_data["code"],
                title=c_data["title"],
                archetype=c_data["archetype"],
                icon=c_data["icon"],
                required_completed_goals=c_data["required_completed_goals"],
                shape_pattern=c_data["shape_pattern"],
                ai_interpretation=c_data["ai_interpretation"],
                narration_script=c_data["narration_script"],
                is_unlocked=False,
                created_at=now,
            )
            db.add(item)
        db.commit()


@router.get("/constellations", response_model=List[ConstellationAchievementResponse])
def get_constellation_achievements(db: Session = Depends(get_db)):
    _seed_constellations_if_empty(db)
    completed_goals_count = db.query(StudyGoal).filter(StudyGoal.is_completed == True).count()

    constellations = db.query(ConstellationAchievement).order_by(ConstellationAchievement.required_completed_goals.asc()).all()
    results = []
    for c in constellations:
        prog = min(100.0, round((completed_goals_count / c.required_completed_goals) * 100.0, 1))
        item = ConstellationAchievementResponse(
            id=c.id,
            code=c.code,
            title=c.title,
            archetype=c.archetype,
            icon=c.icon,
            required_completed_goals=c.required_completed_goals,
            shape_pattern=c.shape_pattern,
            ai_interpretation=c.ai_interpretation,
            narration_script=c.narration_script,
            associated_goal_titles=c.associated_goal_titles,
            is_unlocked=c.is_unlocked,
            unlocked_at=c.unlocked_at,
            progress_percent=prog,
        )
        results.append(item)
    return results


@router.post("/constellations/check", response_model=ConstellationCheckResponse)
def check_constellation_unlock(db: Session = Depends(get_db)):
    _seed_constellations_if_empty(db)

    completed_goals = db.query(StudyGoal).filter(StudyGoal.is_completed == True).all()
    completed_count = len(completed_goals)

    locked_constellations = (
        db.query(ConstellationAchievement)
        .filter(
            ConstellationAchievement.is_unlocked == False,
            ConstellationAchievement.required_completed_goals <= completed_count,
        )
        .order_by(ConstellationAchievement.required_completed_goals.asc())
        .all()
    )

    newly_unlocked_response = None
    if locked_constellations:
        now = datetime.datetime.utcnow()
        completed_titles = [g.title for g in completed_goals]
        titles_str = ", ".join(f'"{t}"' for t in completed_titles)

        for c in locked_constellations:
            c.is_unlocked = True
            c.unlocked_at = now
            c.associated_goal_titles = titles_str

            # Personalize AI interpretation with real completed goal names!
            c.ai_interpretation = (
                f"{c.ai_interpretation} Các vì tinh tú được tôi luyện qua việc chinh phục thành công: {titles_str}."
            )
            c.narration_script = (
                f"{c.narration_script} Thành tích này được ghi dấu bằng việc bạn đã hoàn thành xuất sắc các mục tiêu: {titles_str}!"
            )

        db.commit()

        latest_unlocked = locked_constellations[-1]
        db.refresh(latest_unlocked)
        newly_unlocked_response = ConstellationAchievementResponse(
            id=latest_unlocked.id,
            code=latest_unlocked.code,
            title=latest_unlocked.title,
            archetype=latest_unlocked.archetype,
            icon=latest_unlocked.icon,
            required_completed_goals=latest_unlocked.required_completed_goals,
            shape_pattern=latest_unlocked.shape_pattern,
            ai_interpretation=latest_unlocked.ai_interpretation,
            narration_script=latest_unlocked.narration_script,
            associated_goal_titles=latest_unlocked.associated_goal_titles,
            is_unlocked=True,
            unlocked_at=latest_unlocked.unlocked_at,
            progress_percent=100.0,
        )

    total_unlocked = db.query(ConstellationAchievement).filter(ConstellationAchievement.is_unlocked == True).count()
    total_constellations = db.query(ConstellationAchievement).count()

    return ConstellationCheckResponse(
        newly_unlocked=newly_unlocked_response,
        total_unlocked=total_unlocked,
        total_constellations=total_constellations,
    )


# ==========================================
# ── DAILY 4-QUADRANT MATRIX (EISENHOWER) ──
# ==========================================

@router.get("/matrix", response_model=List[DailyMatrixTaskResponse])
def get_matrix_tasks(
    task_date: Optional[datetime.date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    target_date = task_date or datetime.date.today()
    query = db.query(DailyMatrixTask).filter(DailyMatrixTask.date == target_date)
    if user:
        query = query.filter((DailyMatrixTask.user_id == user.id) | (DailyMatrixTask.user_id.is_(None)))
    tasks = (
        query
        .order_by(DailyMatrixTask.quadrant.asc(), DailyMatrixTask.order_index.asc(), DailyMatrixTask.id.asc())
        .all()
    )

    goals_map = {g.id: g for g in db.query(StudyGoal).all()}
    result = []
    for t in tasks:
        goal = goals_map.get(t.goal_id) if t.goal_id else None
        result.append(
            DailyMatrixTaskResponse(
                id=t.id,
                title=t.title,
                description=t.description,
                date=t.date,
                quadrant=t.quadrant,
                goal_id=t.goal_id,
                goal_title=goal.title if goal else None,
                goal_color=goal.color if goal else None,
                is_completed=t.is_completed,
                completed_at=t.completed_at,
                reflection_note=t.reflection_note,
                order_index=t.order_index or 0,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
        )
    return result


@router.post("/matrix", response_model=DailyMatrixTaskResponse, status_code=201)
def create_matrix_task(
    data: DailyMatrixTaskCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    task_date = data.date or datetime.date.today()
    quadrant = max(1, min(4, data.quadrant))
    clean_title = data.title.strip()

    # Chống double click / spam request trùng lặp trong vòng 3 giây
    recent_duplicate = (
        db.query(DailyMatrixTask)
        .filter(
            DailyMatrixTask.user_id == (user.id if user else None),
            DailyMatrixTask.title == clean_title,
            DailyMatrixTask.date == task_date,
            DailyMatrixTask.quadrant == quadrant,
        )
        .order_by(DailyMatrixTask.created_at.desc())
        .first()
    )
    if recent_duplicate and recent_duplicate.created_at:
        diff_sec = (datetime.datetime.utcnow() - recent_duplicate.created_at).total_seconds()
        if diff_sec < 3.0:
            goal = db.query(StudyGoal).filter(StudyGoal.id == recent_duplicate.goal_id).first() if recent_duplicate.goal_id else None
            return DailyMatrixTaskResponse(
                id=recent_duplicate.id,
                title=recent_duplicate.title,
                description=recent_duplicate.description,
                date=recent_duplicate.date,
                quadrant=recent_duplicate.quadrant,
                goal_id=recent_duplicate.goal_id,
                goal_title=goal.title if goal else None,
                goal_color=goal.color if goal else None,
                is_completed=recent_duplicate.is_completed,
                completed_at=recent_duplicate.completed_at,
                reflection_note=recent_duplicate.reflection_note,
                order_index=recent_duplicate.order_index or 0,
                created_at=recent_duplicate.created_at,
                updated_at=recent_duplicate.updated_at,
            )

    task = DailyMatrixTask(
        user_id=user.id if user else None,
        title=clean_title,
        description=data.description,
        date=task_date,
        quadrant=quadrant,
        goal_id=data.goal_id,
        reflection_note=data.reflection_note,
        order_index=0,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    goal = db.query(StudyGoal).filter(StudyGoal.id == task.goal_id).first() if task.goal_id else None
    return DailyMatrixTaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        date=task.date,
        quadrant=task.quadrant,
        goal_id=task.goal_id,
        goal_title=goal.title if goal else None,
        goal_color=goal.color if goal else None,
        is_completed=task.is_completed,
        completed_at=task.completed_at,
        reflection_note=task.reflection_note,
        order_index=task.order_index or 0,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.put("/matrix/{task_id}", response_model=DailyMatrixTaskResponse)
def update_matrix_task(task_id: int, data: DailyMatrixTaskUpdate, db: Session = Depends(get_db)):
    task = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.date is not None:
        task.date = data.date
    if data.quadrant is not None:
        task.quadrant = max(1, min(4, data.quadrant))
    if data.goal_id is not None:
        task.goal_id = data.goal_id if data.goal_id > 0 else None
    if data.is_completed is not None:
        task.is_completed = data.is_completed
        task.completed_at = datetime.datetime.utcnow() if data.is_completed else None
    if data.reflection_note is not None:
        task.reflection_note = data.reflection_note
    if data.order_index is not None:
        task.order_index = data.order_index

    task.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(task)

    goal = db.query(StudyGoal).filter(StudyGoal.id == task.goal_id).first() if task.goal_id else None
    return DailyMatrixTaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        date=task.date,
        quadrant=task.quadrant,
        goal_id=task.goal_id,
        goal_title=goal.title if goal else None,
        goal_color=goal.color if goal else None,
        is_completed=task.is_completed,
        completed_at=task.completed_at,
        reflection_note=task.reflection_note,
        order_index=task.order_index or 0,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.patch("/matrix/{task_id}/toggle", response_model=DailyMatrixTaskResponse)
def toggle_matrix_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")

    task.is_completed = not task.is_completed
    task.completed_at = datetime.datetime.utcnow() if task.is_completed else None
    task.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(task)

    goal = db.query(StudyGoal).filter(StudyGoal.id == task.goal_id).first() if task.goal_id else None
    return DailyMatrixTaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        date=task.date,
        quadrant=task.quadrant,
        goal_id=task.goal_id,
        goal_title=goal.title if goal else None,
        goal_color=goal.color if goal else None,
        is_completed=task.is_completed,
        completed_at=task.completed_at,
        reflection_note=task.reflection_note,
        order_index=task.order_index or 0,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.patch("/matrix/{task_id}/reflection", response_model=DailyMatrixTaskResponse)
def update_matrix_task_reflection(task_id: int, data: DailyMatrixTaskReflectionUpdate, db: Session = Depends(get_db)):
    task = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")

    task.reflection_note = data.reflection_note
    task.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(task)

    goal = db.query(StudyGoal).filter(StudyGoal.id == task.goal_id).first() if task.goal_id else None
    return DailyMatrixTaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        date=task.date,
        quadrant=task.quadrant,
        goal_id=task.goal_id,
        goal_title=goal.title if goal else None,
        goal_color=goal.color if goal else None,
        is_completed=task.is_completed,
        completed_at=task.completed_at,
        reflection_note=task.reflection_note,
        order_index=task.order_index or 0,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.delete("/matrix/{task_id}")
def delete_matrix_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    db.delete(task)
    db.commit()
    return {"message": "Đã xóa công việc", "id": task_id}


@router.post("/matrix/rollover")
def rollover_matrix_tasks(
    from_date: datetime.date = Query(..., description="Ngày cần chuyển các việc chưa xong"),
    to_date: datetime.date = Query(..., description="Ngày đích nhận việc"),
    db: Session = Depends(get_db),
):
    uncompleted = (
        db.query(DailyMatrixTask)
        .filter(
            DailyMatrixTask.date == from_date,
            DailyMatrixTask.is_completed == False,
        )
        .all()
    )

    rolled_count = 0
    for t in uncompleted:
        new_task = DailyMatrixTask(
            title=t.title,
            description=t.description,
            date=to_date,
            quadrant=t.quadrant,
            goal_id=t.goal_id,
            reflection_note=f"Chuyển từ {from_date.strftime('%d/%m')}: {t.reflection_note or 'chưa hoàn thành'}",
        )
        db.add(new_task)
        rolled_count += 1

    db.commit()
    return {
        "message": f"Đã chuyển {rolled_count} việc chưa hoàn thành sang ngày {to_date.strftime('%d/%m/%Y')}",
        "count": rolled_count,
    }


@router.get("/matrix/monthly-summary", response_model=MonthlyMatrixSummaryResponse)
def get_monthly_matrix_summary(
    year: int = Query(..., description="Năm"),
    month: int = Query(..., description="Tháng 1-12"),
    db: Session = Depends(get_db),
):
    start_date = datetime.date(year, month, 1)
    if month == 12:
        end_date = datetime.date(year + 1, 1, 1)
    else:
        end_date = datetime.date(year, month + 1, 1)

    tasks = (
        db.query(DailyMatrixTask)
        .filter(
            DailyMatrixTask.date >= start_date,
            DailyMatrixTask.date < end_date,
        )
        .all()
    )

    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.is_completed])
    completion_rate = round((completed_tasks / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0

    q1_tasks = [t for t in tasks if t.quadrant == 1]
    q2_tasks = [t for t in tasks if t.quadrant == 2]
    q3_tasks = [t for t in tasks if t.quadrant == 3]
    q4_tasks = [t for t in tasks if t.quadrant == 4]

    q1_count = len(q1_tasks)
    q2_count = len(q2_tasks)
    q3_count = len(q3_tasks)
    q4_count = len(q4_tasks)

    q1_completed = len([t for t in q1_tasks if t.is_completed])
    q2_completed = len([t for t in q2_tasks if t.is_completed])
    q3_completed = len([t for t in q3_tasks if t.is_completed])
    q4_completed = len([t for t in q4_tasks if t.is_completed])

    q1_percent = round((q1_count / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0
    q2_percent = round((q2_count / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0
    q3_percent = round((q3_count / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0
    q4_percent = round((q4_count / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0

    all_goals = db.query(StudyGoal).all()
    total_big_goals_active = len([g for g in all_goals if not g.is_completed])
    total_big_goals_completed = len([g for g in all_goals if g.is_completed])

    reflection_logs = []
    goals_map = {g.id: g.title for g in all_goals}
    for t in sorted(tasks, key=lambda x: x.date, reverse=True):
        if t.reflection_note and t.reflection_note.strip():
            reflection_logs.append(
                {
                    "task_id": t.id,
                    "task_title": t.title,
                    "date": t.date.strftime("%d/%m/%Y"),
                    "quadrant": t.quadrant,
                    "is_completed": t.is_completed,
                    "goal_title": goals_map.get(t.goal_id),
                    "reflection_note": t.reflection_note,
                }
            )

    return MonthlyMatrixSummaryResponse(
        year=year,
        month=month,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_rate=completion_rate,
        q1_count=q1_count,
        q1_completed=q1_completed,
        q2_count=q2_count,
        q2_completed=q2_completed,
        q3_count=q3_count,
        q3_completed=q3_completed,
        q4_count=q4_count,
        q4_completed=q4_completed,
        q1_percent=q1_percent,
        q2_percent=q2_percent,
        q3_percent=q3_percent,
        q4_percent=q4_percent,
        total_big_goals_active=total_big_goals_active,
        total_big_goals_completed=total_big_goals_completed,
        reflection_logs=reflection_logs,
    )


@router.get("/ai-buddy/prompt", response_model=AIBuddyPromptResponse)
def get_ai_buddy_prompt(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    today = datetime.date.today()
    current_hour = datetime.datetime.now().hour

    if not user:
        return AIBuddyPromptResponse(
            message="Chào bạn! Hãy đăng nhập để lưu trữ mục tiêu cá nhân, ma trận 4 ô và cùng đua Top với bạn bè nhé! 🚀",
            action_type="open_login",
            action_label="Đăng nhập ngay 🔑",
            action_target="auth",
            mood="friendly",
        )

    name = user.display_name or f"@{user.username}"
    goals = db.query(StudyGoal).filter(StudyGoal.user_id == user.id, StudyGoal.is_completed == False).all()
    today_tasks = db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user.id, DailyMatrixTask.date == today).all()
    today_sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id == user.id, StudySessionLog.session_date == today).all()
    today_hours = round(sum(s.duration_hours for s in today_sessions), 1)

    q1_pending = [t for t in today_tasks if t.quadrant == 1 and not t.is_completed]
    q2_pending = [t for t in today_tasks if t.quadrant == 2 and not t.is_completed]

    # Rule 0: User has no goals yet
    if not goals:
        return AIBuddyPromptResponse(
            message=f"Chào {name}! Bạn chưa có mục tiêu học tập nào trong vũ trụ. Hãy tạo mục tiêu đầu tiên để bắt đầu hành trình nào! 🎯",
            action_type="open_goal_modal",
            action_label="Tạo mục tiêu ngay ✨",
            action_target="goals",
            mood="friendly",
        )

    # Rule 1: Late evening (after 20:00 / 8 PM) -> Reminder to plan for tomorrow
    if current_hour >= 20 or current_hour < 5:
        tomorrow = today + datetime.timedelta(days=1)
        tomorrow_tasks = db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user.id, DailyMatrixTask.date == tomorrow).count()
        if tomorrow_tasks == 0:
            return AIBuddyPromptResponse(
                message=f"Tối rồi {name} ơi! 🌙 Hãy dành 3 phút lên trước Ma Trận 4 Ô cho ngày mai để sáng dậy có lộ trình rõ ràng, làm việc cực mượt nha!",
                action_type="plan_tomorrow",
                action_label="Lên lịch ngày mai 🌙",
                action_target="matrix",
                mood="cozy",
            )

    # Rule 2: There are critical Q1 tasks pending
    if q1_pending:
        task_name = q1_pending[0].title
        return AIBuddyPromptResponse(
            message=f"Chào {name}, trong Ô 1 bạn đang có việc khẩn cấp: '{task_name}'. Xử lý dứt điểm trước để tâm trí thảnh thơi nhé! 🚀",
            action_type="open_matrix",
            action_label="Xem việc Ô 1 ngay",
            action_target="matrix",
            mood="urgent",
        )

    # Rule 3: There are important Q2 tasks related to big goals
    if q2_pending:
        task = q2_pending[0]
        goal = db.query(StudyGoal).filter(StudyGoal.id == task.goal_id, StudyGoal.user_id == user.id).first() if task.goal_id else None
        if goal:
            return AIBuddyPromptResponse(
                message=f"Chào {name}! Hôm nay có nhiệm vụ '{task.title}' thuộc mục tiêu '{goal.title}' trong Ô 2 kìa. Khởi động 25 phút Pomodoro nhẹ nhàng nhé? ✨",
                action_type="start_pomodoro",
                action_label="Học ngay 25p Pomodoro",
                action_target="pomodoro",
                suggested_goal_id=goal.id,
                mood="friendly",
            )
        else:
            return AIBuddyPromptResponse(
                message=f"Chào {name}! Trong Ô 2 hôm nay bạn có việc quan trọng: '{task.title}'. Tập trung 1 phiên Pomodoro giải quyết nó nào! 🎯",
                action_type="open_matrix",
                action_label="Mở Ma Trận 4 Ô",
                action_target="matrix",
                mood="friendly",
            )

    # Rule 4: If completed sessions today
    if today_hours > 0:
        return AIBuddyPromptResponse(
            message=f"Phong độ tuyệt vời {name} ơi! 🔥 Hôm nay bạn đã cày được {today_hours}h Pomodoro. Tiếp tục giữ vững đà tập trung nhé!",
            action_type="start_pomodoro",
            action_label="Làm thêm 1 hiệp Pomodoro 🍅",
            action_target="pomodoro",
            suggested_goal_id=goals[0].id if goals else None,
            mood="friendly",
        )

    # Rule 5: Suggest focusing on a big goal
    if goals:
        least_goal = sorted(goals, key=lambda g: g.current_hours)[0]
        return AIBuddyPromptResponse(
            message=f"Chào {name}! Mục tiêu lớn '{least_goal.title}' đang đợi bạn bứt phá nè! Cùng làm một hiệp Pomodoro 25 phút để tích lũy ngọc nhé! 🎧💎",
            action_type="start_pomodoro",
            action_label=f"Bắt đầu: {least_goal.title[:15]}...",
            action_target="pomodoro",
            suggested_goal_id=least_goal.id,
            mood="friendly",
        )

    # Rule 6: Generic friendly encouragement
    return AIBuddyPromptResponse(
        message=f"Chào {name}! Sẵn sàng cho một phiên Pomodoro bứt phá mục tiêu hôm nay chưa nào? 🌟",
        action_type="open_matrix",
        action_label="Mở Ma Trận 4 Ô",
        action_target="matrix",
        mood="friendly",
    )


