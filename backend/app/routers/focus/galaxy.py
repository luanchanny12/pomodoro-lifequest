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
def get_topic_galaxy(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    if user:
        goals = db.query(StudyGoal).filter(StudyGoal.user_id == user.id).order_by(StudyGoal.is_completed.desc(), StudyGoal.created_at.asc()).all()
        sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id == user.id).all()
        latest_session = db.query(StudySessionLog).filter(StudySessionLog.user_id == user.id).order_by(StudySessionLog.created_at.desc()).first()
    else:
        goals = db.query(StudyGoal).filter(StudyGoal.user_id.is_(None)).order_by(StudyGoal.is_completed.desc(), StudyGoal.created_at.asc()).all()
        sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id.is_(None)).all()
        latest_session = db.query(StudySessionLog).filter(StudySessionLog.user_id.is_(None)).order_by(StudySessionLog.created_at.desc()).first()

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

_SEED_LOCK = threading.Lock()

def _seed_constellations_if_empty(db: Session):
    with _SEED_LOCK:
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
            try:
                db.commit()
            except Exception:
                db.rollback()


@router.get("/constellations", response_model=List[ConstellationAchievementResponse])
def get_constellation_achievements(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    _seed_constellations_if_empty(db)
    if user:
        completed_goals = db.query(StudyGoal).filter(StudyGoal.user_id == user.id, StudyGoal.is_completed == True).all()
    else:
        completed_goals = db.query(StudyGoal).filter(StudyGoal.user_id.is_(None), StudyGoal.is_completed == True).all()

    completed_goals_count = len(completed_goals)
    completed_titles = [g.title for g in completed_goals]
    titles_str = ", ".join(f'"{t}"' for t in completed_titles) if completed_titles else None

    uid = user.id if user else None
    unlock_query = db.query(UserConstellationUnlock)
    if uid is None:
        unlock_query = unlock_query.filter(UserConstellationUnlock.user_id.is_(None))
    else:
        unlock_query = unlock_query.filter(UserConstellationUnlock.user_id == uid)
    persisted_unlock_map = {u.constellation_id: u for u in unlock_query.all()}

    constellations = db.query(ConstellationAchievement).order_by(ConstellationAchievement.required_completed_goals.asc()).all()
    results = []
    for c in constellations:
        is_persisted = c.id in persisted_unlock_map
        is_unlocked = is_persisted or (completed_goals_count >= c.required_completed_goals)
        prog = 100.0 if is_unlocked else min(100.0, round((completed_goals_count / c.required_completed_goals) * 100.0, 1))

        ai_interp = c.ai_interpretation
        narration = c.narration_script
        if is_unlocked and titles_str:
            ai_interp = f"{ai_interp} Các vì tinh tú được tôi luyện qua việc chinh phục thành công: {titles_str}."
            narration = f"{narration} Thành tích này được ghi dấu bằng việc bạn đã hoàn thành xuất sắc các mục tiêu: {titles_str}!"

        unlocked_timestamp = persisted_unlock_map[c.id].unlocked_at if is_persisted else None

        item = ConstellationAchievementResponse(
            id=c.id,
            code=c.code,
            title=c.title,
            archetype=c.archetype,
            icon=c.icon,
            required_completed_goals=c.required_completed_goals,
            shape_pattern=c.shape_pattern,
            ai_interpretation=ai_interp,
            narration_script=narration,
            associated_goal_titles=titles_str if is_unlocked else None,
            is_unlocked=is_unlocked,
            unlocked_at=unlocked_timestamp,
            progress_percent=prog,
        )
        results.append(item)
    return results


@router.post("/constellations/check", response_model=ConstellationCheckResponse)
def check_constellation_unlock(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    _seed_constellations_if_empty(db)

    if user:
        completed_goals = db.query(StudyGoal).filter(StudyGoal.user_id == user.id, StudyGoal.is_completed == True).all()
    else:
        completed_goals = db.query(StudyGoal).filter(StudyGoal.user_id.is_(None), StudyGoal.is_completed == True).all()

    completed_count = len(completed_goals)
    completed_titles = [g.title for g in completed_goals]
    titles_str = ", ".join(f'"{t}"' for t in completed_titles) if completed_titles else None

    uid = user.id if user else None
    now = datetime.datetime.utcnow()

    # Tải các bản ghi đã mở khóa đã được lưu vĩnh viễn (sao đã mở không bị thu hồi khi un-complete goal)
    unlock_query = db.query(UserConstellationUnlock)
    if uid is None:
        unlock_query = unlock_query.filter(UserConstellationUnlock.user_id.is_(None))
    else:
        unlock_query = unlock_query.filter(UserConstellationUnlock.user_id == uid)
    persisted_unlock_map = {u.constellation_id: u for u in unlock_query.all()}

    constellations = db.query(ConstellationAchievement).order_by(ConstellationAchievement.required_completed_goals.asc()).all()
    newly_unlocked_response = None

    for c in constellations:
        # Nếu đạt điều kiện hoàn thành mục tiêu
        if completed_count >= c.required_completed_goals:
            # Chỉ coi là "mới khai mở" nếu TỪNG người dùng này chưa có record unlock
            if c.id not in persisted_unlock_map:
                new_unlock = UserConstellationUnlock(user_id=uid, constellation_id=c.id, unlocked_at=now)
                db.add(new_unlock)
                persisted_unlock_map[c.id] = new_unlock

                ai_interp = c.ai_interpretation
                narration = c.narration_script
                if titles_str:
                    ai_interp = f"{ai_interp} Các vì tinh tú được tôi luyện qua việc chinh phục thành công: {titles_str}."
                    narration = f"{narration} Thành tích này được ghi dấu bằng việc bạn đã hoàn thành xuất sắc các mục tiêu: {titles_str}!"

                newly_unlocked_response = ConstellationAchievementResponse(
                    id=c.id,
                    code=c.code,
                    title=c.title,
                    archetype=c.archetype,
                    icon=c.icon,
                    required_completed_goals=c.required_completed_goals,
                    shape_pattern=c.shape_pattern,
                    ai_interpretation=ai_interp,
                    narration_script=narration,
                    associated_goal_titles=titles_str,
                    is_unlocked=True,
                    unlocked_at=now,
                    progress_percent=100.0,
                )

    try:
        db.commit()
    except Exception:
        db.rollback()

    # Tổng số chòm sao đã mở khóa tính trên số bản ghi unlock thực tế (không bị mất khi un-complete goal)
    total_unlocked = len(persisted_unlock_map)

    return ConstellationCheckResponse(
        newly_unlocked=newly_unlocked_response,
        total_unlocked=total_unlocked,
        total_constellations=len(constellations),
    )


