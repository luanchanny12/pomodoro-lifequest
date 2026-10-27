import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models_auth import User, CheerLog
from app.models import Player, StudySessionLog, StudyGoal
from app.routers.auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/race", tags=["Cosmic Race Track"])

class RacerCard(BaseModel):
    user_id: int
    username: str
    display_name: str
    racer_avatar: str
    level: int
    exp: int
    streak: int
    today_hours: float
    weekly_hours: float
    current_goal_title: str
    cheer_count: int
    rank: int
    track_progress_percent: float
    is_racing_now: bool
    is_current_user: bool = False

class RaceTrackResponse(BaseModel):
    track_name: str = "Đường Đua Không Gian Neon F1"
    racers: List[RacerCard]
    total_racers: int
    community_hours_today: float
    my_rank: Optional[int] = None

class CheerRequest(BaseModel):
    target_user_id: int
    emoji: Optional[str] = "🔥"
    message: Optional[str] = "Cố lên bạn ơi, bứt tốc nào!"

@router.get("/track", response_model=RaceTrackResponse)
def get_race_track_status(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    today = datetime.date.today()
    seven_days_ago = today - datetime.timedelta(days=7)
    now = datetime.datetime.utcnow()
    forty_five_mins_ago = now - datetime.timedelta(minutes=45)

    users = db.query(User).filter(User.is_active == True).all()

    # If no registered users exist yet, create a default host user representation
    if not users:
        # Create default host account
        default_user = User(
            username="chiến_binh",
            display_name="Bạn (Chủ Phòng)",
            password_hash="demo",
            salt="demo",
            racer_avatar="cyber_car",
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)
        users = [default_user]

    racers: List[RacerCard] = []
    total_community_hours = 0.0

    for user in users:
        player = db.query(Player).filter(Player.user_id == user.id).first()
        if not player:
            player = db.query(Player).first()  # Fallback to general player

        # 1. Tính số giờ hôm nay
        today_sessions = (
            db.query(StudySessionLog)
            .filter(
                (StudySessionLog.user_id == user.id) | (StudySessionLog.user_id == None),
                StudySessionLog.session_date == today
            )
            .all()
        ) if len(users) == 1 else (
            db.query(StudySessionLog)
            .filter(StudySessionLog.user_id == user.id, StudySessionLog.session_date == today)
            .all()
        )

        today_hours = round(sum(s.duration_hours for s in today_sessions), 2)
        total_community_hours += today_hours

        # 2. Tính số giờ 7 ngày gần nhất
        weekly_sessions = (
            db.query(StudySessionLog)
            .filter(
                (StudySessionLog.user_id == user.id) | (StudySessionLog.user_id == None),
                StudySessionLog.session_date >= seven_days_ago
            )
            .all()
        ) if len(users) == 1 else (
            db.query(StudySessionLog)
            .filter(StudySessionLog.user_id == user.id, StudySessionLog.session_date >= seven_days_ago)
            .all()
        )

        weekly_hours = round(sum(s.duration_hours for s in weekly_sessions), 2)

        # 3. Mục tiêu hiện tại
        active_goal = (
            db.query(StudyGoal)
            .filter((StudyGoal.user_id == user.id) | (StudyGoal.user_id == None))
            .order_by(StudyGoal.updated_at.desc())
            .first()
        )
        goal_title = active_goal.title if active_goal else "Chinh phục Pomodoro"

        # 4. Đang đua ngay bây giờ? (có session trong 45 phút gần nhất)
        recent_log = (
            db.query(StudySessionLog)
            .filter(StudySessionLog.user_id == user.id, StudySessionLog.created_at >= forty_five_mins_ago)
            .first()
        )
        is_racing_now = recent_log is not None

        # 5. Tiến trình trên đường đua: 5 giờ = 100%, 0 giờ = 5%
        # Công thức: min(100.0, max(5.0, (today_hours / 5.0) * 100.0))
        progress = round(min(100.0, max(6.0, (today_hours / 5.0) * 100.0)), 1)

        racers.append(
            RacerCard(
                user_id=user.id,
                username=user.username,
                display_name=user.display_name,
                racer_avatar=user.racer_avatar or "rocket",
                level=player.level if player else 1,
                exp=player.exp if player else 0,
                streak=player.streak if player else 0,
                today_hours=today_hours,
                weekly_hours=weekly_hours,
                current_goal_title=goal_title,
                cheer_count=user.cheer_count or 0,
                rank=1,  # Will sort and reassign below
                track_progress_percent=progress,
                is_racing_now=is_racing_now,
                is_current_user=(current_user is not None and user.id == current_user.id),
            )
        )

    # Sắp xếp thứ hạng đua: Ưu tiên hôm nay > Tuần này > EXP
    racers.sort(key=lambda r: (r.today_hours, r.weekly_hours, r.exp), reverse=True)

    my_rank = None
    for index, racer in enumerate(racers, start=1):
        racer.rank = index
        if current_user and racer.user_id == current_user.id:
            my_rank = index

    # Nếu chỉ có 1 người, thêm 2 bot đối thủ ảo vui vẻ để đường đua sinh động
    if len(racers) == 1:
        racers.append(
            RacerCard(
                user_id=9998,
                username="cyber_bot",
                display_name="Cyber Racer 🤖",
                racer_avatar="lightning",
                level=3,
                exp=450,
                streak=4,
                today_hours=1.5,
                weekly_hours=9.2,
                current_goal_title="Tự Động Hóa AI",
                cheer_count=5,
                rank=2,
                track_progress_percent=30.0,
                is_racing_now=False,
                is_current_user=False,
            )
        )
        racers.append(
            RacerCard(
                user_id=9999,
                username="zen_master",
                display_name="Zen Pilot 🧘",
                racer_avatar="quantum_saucer",
                level=5,
                exp=1120,
                streak=12,
                today_hours=2.5,
                weekly_hours=14.0,
                current_goal_title="Thiền & Tập Trung Cao Độ",
                cheer_count=18,
                rank=3,
                track_progress_percent=50.0,
                is_racing_now=True,
                is_current_user=False,
            )
        )
        racers.sort(key=lambda r: (r.today_hours, r.weekly_hours, r.exp), reverse=True)
        for index, racer in enumerate(racers, start=1):
            racer.rank = index
            if current_user and racer.user_id == current_user.id:
                my_rank = index

    return RaceTrackResponse(
        racers=racers,
        total_racers=len(racers),
        community_hours_today=round(total_community_hours, 2),
        my_rank=my_rank,
    )

@router.post("/cheer")
def cheer_racer(
    data: CheerRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    if data.target_user_id >= 9000:
        return {
            "success": True,
            "message": f"Đã gửi cổ vũ {data.emoji or '🔥'} tới Tay Đua Thách Đấu AI!",
            "new_cheer_count": 99,
        }

    target_user = db.query(User).filter(User.id == data.target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tay đua này!")

    target_user.cheer_count = (target_user.cheer_count or 0) + 1

    sender_name = current_user.display_name if current_user else "Một người bạn bí ẩn"
    cheer_log = CheerLog(
        sender_id=current_user.id if current_user else None,
        sender_name=sender_name,
        target_user_id=target_user.id,
        emoji=data.emoji or "🔥",
        message=data.message or "Cố lên bạn ơi, bứt tốc nào!",
    )
    db.add(cheer_log)
    db.commit()

    return {
        "success": True,
        "message": f"Đã gửi cổ vũ {data.emoji} thành công tới {target_user.display_name}!",
        "new_cheer_count": target_user.cheer_count,
    }

@router.get("/cheers/my")
def get_my_recent_cheers(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = (
        db.query(CheerLog)
        .filter(CheerLog.target_user_id == user.id)
        .order_by(CheerLog.created_at.desc())
        .limit(10)
        .all()
    )
    return logs
