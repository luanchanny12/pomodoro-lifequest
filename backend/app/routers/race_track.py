import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.cache import get_cache, set_cache, delete_cache
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
    # Check cache first (< 2ms response)
    cached = get_cache("cache:race:track")
    if cached is not None:
        try:
            cached_racers = [RacerCard(**r) for r in cached.get("racers", [])]
            my_rank = None
            for r in cached_racers:
                r.is_current_user = (current_user is not None and r.user_id == current_user.id)
                if r.is_current_user:
                    my_rank = r.rank
            return RaceTrackResponse(
                track_name=cached.get("track_name", "Đường Đua Không Gian Neon F1"),
                racers=cached_racers,
                total_racers=len(cached_racers),
                community_hours_today=cached.get("community_hours_today", 0.0),
                my_rank=my_rank,
            )
        except Exception:
            pass

    today = datetime.date.today()
    seven_days_ago = today - datetime.timedelta(days=7)
    now = datetime.datetime.utcnow()
    forty_five_mins_ago = now - datetime.timedelta(minutes=45)

    users = db.query(User).filter(User.is_active == True).all()
    user_ids = [u.id for u in users]

    # Batch queries to eliminate N+1 queries entirely
    players_map = {}
    today_hours_map = {}
    weekly_hours_map = {}
    recent_active_uids = set()
    latest_goals_map = {}

    if user_ids:
        players = db.query(Player).filter(Player.user_id.in_(user_ids)).all()
        players_map = {p.user_id: p for p in players}

        today_logs = (
            db.query(StudySessionLog)
            .filter(StudySessionLog.user_id.in_(user_ids), StudySessionLog.session_date == today)
            .all()
        )
        for log in today_logs:
            today_hours_map[log.user_id] = today_hours_map.get(log.user_id, 0.0) + (log.duration_hours or 0.0)

        weekly_logs = (
            db.query(StudySessionLog)
            .filter(StudySessionLog.user_id.in_(user_ids), StudySessionLog.session_date >= seven_days_ago)
            .all()
        )
        for log in weekly_logs:
            weekly_hours_map[log.user_id] = weekly_hours_map.get(log.user_id, 0.0) + (log.duration_hours or 0.0)

        recent_logs = (
            db.query(StudySessionLog.user_id)
            .filter(StudySessionLog.user_id.in_(user_ids), StudySessionLog.created_at >= forty_five_mins_ago)
            .all()
        )
        recent_active_uids = {r[0] for r in recent_logs}

        all_user_goals = (
            db.query(StudyGoal)
            .filter(StudyGoal.user_id.in_(user_ids))
            .order_by(StudyGoal.updated_at.desc())
            .all()
        )
        for g in all_user_goals:
            if g.user_id not in latest_goals_map:
                latest_goals_map[g.user_id] = g.title

    racers: List[RacerCard] = []
    total_community_hours = 0.0

    for user in users:
        player = players_map.get(user.id)
        player_level = player.level if player else 1
        player_exp = player.exp if player else 0
        player_streak = player.streak if player else 0

        today_hours = round(today_hours_map.get(user.id, 0.0), 2)
        total_community_hours += today_hours

        weekly_hours = round(weekly_hours_map.get(user.id, 0.0), 2)
        goal_title = latest_goals_map.get(user.id, "Chinh phục Pomodoro")
        is_racing_now = user.id in recent_active_uids
        progress = round(min(100.0, max(6.0, (today_hours / 5.0) * 100.0)), 1)

        racers.append(
            RacerCard(
                user_id=user.id,
                username=user.username,
                display_name=user.display_name,
                racer_avatar=user.racer_avatar or "rocket",
                level=player_level,
                exp=player_exp,
                streak=player_streak,
                today_hours=today_hours,
                weekly_hours=weekly_hours,
                current_goal_title=goal_title,
                cheer_count=user.cheer_count or 0,
                rank=1,
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

    res_data = {
        "track_name": "Đường Đua Không Gian Neon F1",
        "racers": [r.model_dump() for r in racers],
        "community_hours_today": round(total_community_hours, 2),
    }
    set_cache("cache:race:track", res_data, ttl_seconds=60)

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

    # Chống tự cổ vũ chính mình
    if current_user and current_user.id == data.target_user_id:
        raise HTTPException(
            status_code=400,
            detail="Bạn không thể tự gửi năng lượng cổ vũ cho chính mình! Hãy để cộng đồng tiếp sức cho bạn nhé! 🔥"
        )

    target_user = db.query(User).filter(User.id == data.target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tay đua này!")

    # Giới hạn tần suất gửi cổ vũ (Rate limit: 1 lượt mỗi 30 giây giữa cùng cặp người gửi - người nhận)
    sender_id = current_user.id if current_user else None
    thirty_secs_ago = datetime.datetime.utcnow() - datetime.timedelta(seconds=30)
    recent_cheer = db.query(CheerLog).filter(
        CheerLog.target_user_id == data.target_user_id,
        CheerLog.sender_id == sender_id,
        CheerLog.created_at >= thirty_secs_ago,
    ).first()
    if recent_cheer:
        raise HTTPException(
            status_code=429,
            detail="Bạn vừa gửi cổ vũ tới bạn này rồi! Vui lòng đợi 30 giây để gửi đợt năng lượng tiếp theo nhé!"
        )

    # Cập nhật nguyên tử tránh lost update race condition
    db.query(User).filter(User.id == target_user.id).update(
        {User.cheer_count: func.coalesce(User.cheer_count, 0) + 1},
        synchronize_session=False,
    )

    sender_name = current_user.display_name if current_user else "Một người bạn bí ẩn"
    cheer_log = CheerLog(
        sender_id=sender_id,
        sender_name=sender_name,
        target_user_id=target_user.id,
        emoji=data.emoji or "🔥",
        message=data.message or "Cố lên bạn ơi, bứt tốc nào!",
    )
    db.add(cheer_log)
    db.commit()
    db.refresh(target_user)
    delete_cache("cache:race:track")

    return {
        "success": True,
        "message": f"Đã gửi cổ vũ {data.emoji} thành công tới {target_user.display_name}!",
        "new_cheer_count": target_user.cheer_count or 0,
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
        .limit(20)
        .all()
    )
    return logs


@router.get("/cheers/unread")
def get_unread_cheers(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lấy danh sách các lời cổ vũ mới nhất chưa đọc để hiển thị thông báo popup cho user."""
    unread_logs = (
        db.query(CheerLog)
        .filter(CheerLog.target_user_id == user.id, (CheerLog.is_read == False) | (CheerLog.is_read == None))
        .order_by(CheerLog.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "unread_count": len(unread_logs),
        "cheers": unread_logs,
    }


@router.post("/cheers/{cheer_id}/read")
def mark_cheer_read(
    cheer_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cheer = db.query(CheerLog).filter(CheerLog.id == cheer_id, CheerLog.target_user_id == user.id).first()
    if cheer:
        cheer.is_read = True
        db.commit()
    return {"success": True}


@router.post("/cheers/read-all")
def mark_all_cheers_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(CheerLog).filter(
        CheerLog.target_user_id == user.id,
        (CheerLog.is_read == False) | (CheerLog.is_read == None)
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"success": True, "message": "Đã đánh dấu tất cả lời cổ vũ là đã đọc"}
