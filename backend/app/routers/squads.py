import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.routers.auth import get_current_user
from app.models_auth import User
from app.models import StudyGoal, StudySessionLog, Player
from app.models_squad import StudySquad, StudySquadMember, StudySquadMessage, generate_squad_code

router = APIRouter(prefix="/api/squads", tags=["Study Squads & Mini F1"])

# ── SCHEMAS ──
class CreateSquadRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    target_title: str = Field(..., min_length=2, max_length=100) # e.g. "1000h Tiếng Anh"
    target_hours: float = Field(default=1000.0, gt=0)
    category: Optional[str] = "Chung"
    icon: Optional[str] = "🏎️"
    color: Optional[str] = "#06b6d4"
    description: Optional[str] = None
    goal_id: Optional[int] = None
    vehicle_icon: Optional[str] = "🏎️"

class JoinSquadRequest(BaseModel):
    invite_code: Optional[str] = None
    squad_id: Optional[int] = None
    goal_id: Optional[int] = None
    vehicle_icon: Optional[str] = "🏎️"

class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    emoji: Optional[str] = None

class SquadMemberProgress(BaseModel):
    user_id: int
    display_name: str
    role: str
    vehicle_icon: str
    goal_id: Optional[int] = None
    goal_title: Optional[str] = None
    current_hours: float
    target_hours: float
    progress_percent: float
    streak: int
    is_current_user: bool
    is_studying: bool
    joined_at: str

class SquadDetailResponse(BaseModel):
    id: int
    name: str
    target_title: str
    target_hours: float
    category: str
    icon: str
    color: str
    description: Optional[str] = None
    invite_code: str
    creator_id: int
    created_at: str
    members_count: int
    is_member: bool
    user_role: Optional[str] = None
    members: List[SquadMemberProgress]

class SquadSummary(BaseModel):
    id: int
    name: str
    target_title: str
    target_hours: float
    category: str
    icon: str
    color: str
    invite_code: str
    members_count: int
    my_progress_percent: float
    my_current_hours: float
    user_role: str

class SquadMessageItem(BaseModel):
    id: int
    squad_id: int
    user_id: Optional[int] = None
    sender_name: str
    message_type: str # "text" | "system_speedup" | "system_join"
    content: str
    emoji: Optional[str] = None
    created_at: str


# ── ENDPOINTS ──

@router.post("", response_model=SquadDetailResponse)
def create_squad(
    data: CreateSquadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tạo một nhóm học mới cùng mục tiêu lớn."""
    # Generate unique invite code
    code = generate_squad_code()
    while db.query(StudySquad).filter(StudySquad.invite_code == code).first():
        code = generate_squad_code()

    squad = StudySquad(
        name=data.name.strip(),
        target_title=data.target_title.strip(),
        target_hours=data.target_hours,
        category=data.category or "Chung",
        icon=data.icon or "🏎️",
        color=data.color or "#06b6d4",
        description=data.description.strip() if data.description else None,
        invite_code=code,
        creator_id=current_user.id,
        is_public=True,
    )
    db.add(squad)
    db.flush()

    # Add creator as leader
    creator_member = StudySquadMember(
        squad_id=squad.id,
        user_id=current_user.id,
        goal_id=data.goal_id,
        role="leader",
        vehicle_icon=data.vehicle_icon or "🏎️",
    )
    db.add(creator_member)

    # Initial system message
    welcome_msg = StudySquadMessage(
        squad_id=squad.id,
        user_id=None,
        sender_name="Đường Đua F1 🏁",
        message_type="system_join",
        content=f"Chào mừng nhóm '{squad.name}' được thành lập! Hãy cùng bứt tốc chinh phục mục tiêu {squad.target_title} ({squad.target_hours:g}h)!",
        emoji="🏁",
    )
    db.add(welcome_msg)
    db.commit()
    db.refresh(squad)

    return get_squad_detail_internal(squad.id, current_user, db)


@router.get("/my", response_model=List[SquadSummary])
def get_my_squads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy danh sách các nhóm học mà user đang tham gia."""
    memberships = (
        db.query(StudySquadMember)
        .filter(StudySquadMember.user_id == current_user.id)
        .all()
    )

    result = []
    for m in memberships:
        squad = db.query(StudySquad).filter(StudySquad.id == m.squad_id).first()
        if not squad:
            continue

        members_count = db.query(StudySquadMember).filter(StudySquadMember.squad_id == squad.id).count()

        # Compute user's personal progress for this squad
        cur_hours = 0.0
        tgt_hours = squad.target_hours
        if m.goal_id:
            goal = db.query(StudyGoal).filter(StudyGoal.id == m.goal_id, StudyGoal.user_id == current_user.id).first()
            if goal:
                cur_hours = float(goal.current_hours or 0.0)
                tgt_hours = float(goal.target_hours or squad.target_hours)

        prog_pct = min(100.0, round((cur_hours / max(1.0, tgt_hours)) * 100, 1))

        result.append(
            SquadSummary(
                id=squad.id,
                name=squad.name,
                target_title=squad.target_title,
                target_hours=squad.target_hours,
                category=squad.category,
                icon=squad.icon,
                color=squad.color,
                invite_code=squad.invite_code,
                members_count=members_count,
                my_progress_percent=prog_pct,
                my_current_hours=cur_hours,
                user_role=m.role,
            )
        )

    return result


@router.get("/public", response_model=List[SquadSummary])
def get_public_squads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Khám phá các nhóm học công khai đang tuyển thành viên."""
    my_squad_ids = [
        m.squad_id
        for m in db.query(StudySquadMember.squad_id)
        .filter(StudySquadMember.user_id == current_user.id)
        .all()
    ]

    squads = (
        db.query(StudySquad)
        .filter(StudySquad.is_public == True, ~StudySquad.id.in_(my_squad_ids) if my_squad_ids else True)
        .order_by(StudySquad.created_at.desc())
        .limit(20)
        .all()
    )

    result = []
    for s in squads:
        cnt = db.query(StudySquadMember).filter(StudySquadMember.squad_id == s.id).count()
        result.append(
            SquadSummary(
                id=squad.id if 'squad' in locals() and squad.id else s.id,
                name=s.name,
                target_title=s.target_title,
                target_hours=s.target_hours,
                category=s.category,
                icon=s.icon,
                color=s.color,
                invite_code=s.invite_code,
                members_count=cnt,
                my_progress_percent=0.0,
                my_current_hours=0.0,
                user_role="none",
            )
        )
    return result


@router.post("/join", response_model=SquadDetailResponse)
def join_squad(
    data: JoinSquadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gia nhập nhóm học bằng mã mời (invite_code) hoặc ID nhóm."""
    squad = None
    if data.invite_code:
        clean_code = data.invite_code.strip().upper()
        squad = db.query(StudySquad).filter(func.upper(StudySquad.invite_code) == clean_code).first()
    elif data.squad_id:
        squad = db.query(StudySquad).filter(StudySquad.id == data.squad_id).first()

    if not squad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy nhóm học với mã mời này!",
        )

    # Check if already joined
    existing = db.query(StudySquadMember).filter(
        StudySquadMember.squad_id == squad.id,
        StudySquadMember.user_id == current_user.id,
    ).first()

    if existing:
        # Update goal_id or vehicle if provided
        if data.goal_id:
            existing.goal_id = data.goal_id
        if data.vehicle_icon:
            existing.vehicle_icon = data.vehicle_icon
        db.commit()
        return get_squad_detail_internal(squad.id, current_user, db)

    # Max 15 members guard
    member_count = db.query(StudySquadMember).filter(StudySquadMember.squad_id == squad.id).count()
    if member_count >= 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nhóm học này đã đạt giới hạn tối đa 15 thành viên!",
        )

    member = StudySquadMember(
        squad_id=squad.id,
        user_id=current_user.id,
        goal_id=data.goal_id,
        role="member",
        vehicle_icon=data.vehicle_icon or "🏎️",
    )
    db.add(member)

    # Post join message
    join_msg = StudySquadMessage(
        squad_id=squad.id,
        user_id=current_user.id,
        sender_name=current_user.display_name or "Bạn mới",
        message_type="system_join",
        content=f"👋 {current_user.display_name} vừa bước vào đường đua nhóm! Cả nhóm cùng chào đón và tăng tốc nhé!",
        emoji="👋",
    )
    db.add(join_msg)
    db.commit()

    return get_squad_detail_internal(squad.id, current_user, db)


@router.get("/{squad_id}", response_model=SquadDetailResponse)
def get_squad_detail(
    squad_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy chi tiết nhóm và bảng xếp hạng tiến trình cá nhân trên đường đua F1 thu nhỏ."""
    return get_squad_detail_internal(squad_id, current_user, db)


@router.post("/{squad_id}/leave")
def leave_squad(
    squad_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rời khỏi nhóm học."""
    membership = db.query(StudySquadMember).filter(
        StudySquadMember.squad_id == squad_id,
        StudySquadMember.user_id == current_user.id,
    ).first()

    if not membership:
        raise HTTPException(status_code=400, detail="Bạn không thuộc nhóm này!")

    db.delete(membership)

    # Check remaining members
    remaining = db.query(StudySquadMember).filter(StudySquadMember.squad_id == squad_id).all()
    if not remaining:
        # Delete squad if 0 members
        db.query(StudySquad).filter(StudySquad.id == squad_id).delete()
    else:
        # If leader left, promote oldest remaining member to leader
        if membership.role == "leader":
            remaining[0].role = "leader"
        # Post leave notice
        leave_msg = StudySquadMessage(
            squad_id=squad_id,
            user_id=None,
            sender_name="Hệ thống",
            message_type="system_join",
            content=f"{current_user.display_name} đã rời khỏi nhóm học.",
            emoji="👋",
        )
        db.add(leave_msg)

    db.commit()
    return {"success": True, "message": "Đã rời nhóm thành công"}


@router.delete("/{squad_id}/members/{target_user_id}")
def kick_squad_member(
    squad_id: int,
    target_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trưởng nhóm (Leader) kick thành viên ra khỏi nhóm học."""
    my_membership = db.query(StudySquadMember).filter(
        StudySquadMember.squad_id == squad_id,
        StudySquadMember.user_id == current_user.id,
    ).first()

    if not my_membership or my_membership.role != "leader":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ trưởng nhóm mới có quyền mời thành viên ra khỏi nhóm!",
        )

    if target_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trưởng nhóm không thể tự kick chính mình! Hãy sử dụng tính năng rời nhóm.",
        )

    target_membership = db.query(StudySquadMember).filter(
        StudySquadMember.squad_id == squad_id,
        StudySquadMember.user_id == target_user_id,
    ).first()

    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thành viên này không còn ở trong nhóm!",
        )

    target_user = db.query(User).filter(User.id == target_user_id).first()
    target_name = target_user.display_name if target_user else "Thành viên"

    db.delete(target_membership)

    kick_msg = StudySquadMessage(
        squad_id=squad_id,
        user_id=None,
        sender_name="Hệ thống",
        message_type="system_join",
        content=f"⚠️ {target_name} đã được trưởng nhóm mời ra khỏi nhóm học.",
        emoji="⚠️",
    )
    db.add(kick_msg)
    db.commit()

    return {"success": True, "message": f"Đã mời {target_name} ra khỏi nhóm thành công"}


@router.get("/{squad_id}/messages", response_model=List[SquadMessageItem])
def get_squad_messages(
    squad_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy lịch sử tin nhắn trong nhóm."""
    # Check membership
    is_mem = db.query(StudySquadMember).filter(
        StudySquadMember.squad_id == squad_id,
        StudySquadMember.user_id == current_user.id,
    ).first()

    if not is_mem:
        raise HTTPException(status_code=403, detail="Bạn cần tham gia nhóm để xem tin nhắn!")

    msgs = (
        db.query(StudySquadMessage)
        .filter(StudySquadMessage.squad_id == squad_id)
        .order_by(StudySquadMessage.created_at.asc())
        .limit(limit)
        .all()
    )

    return [
        SquadMessageItem(
            id=m.id,
            squad_id=m.squad_id,
            user_id=m.user_id,
            sender_name=m.sender_name,
            message_type=m.message_type,
            content=m.content,
            emoji=m.emoji,
            created_at=m.created_at.isoformat(),
        )
        for m in msgs
    ]


@router.post("/{squad_id}/messages", response_model=SquadMessageItem)
def send_squad_message(
    squad_id: int,
    data: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gửi tin nhắn vào nhóm học."""
    is_mem = db.query(StudySquadMember).filter(
        StudySquadMember.squad_id == squad_id,
        StudySquadMember.user_id == current_user.id,
    ).first()

    if not is_mem:
        raise HTTPException(status_code=403, detail="Bạn cần tham gia nhóm để nhắn tin!")

    content_clean = data.content.strip() if data.content else ""
    if not content_clean:
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được để trống!")

    msg = StudySquadMessage(
        squad_id=squad_id,
        user_id=current_user.id,
        sender_name=current_user.display_name or "Bạn học",
        message_type="text",
        content=content_clean,
        emoji=data.emoji,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return SquadMessageItem(
        id=msg.id,
        squad_id=msg.squad_id,
        user_id=msg.user_id,
        sender_name=msg.sender_name,
        message_type=msg.message_type,
        content=msg.content,
        emoji=msg.emoji,
        created_at=msg.created_at.isoformat(),
    )


# ── INTERNAL HELPER ──
def get_squad_detail_internal(squad_id: int, current_user: User, db: Session) -> SquadDetailResponse:
    squad = db.query(StudySquad).filter(StudySquad.id == squad_id).first()
    if not squad:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm học!")

    members = (
        db.query(StudySquadMember)
        .filter(StudySquadMember.squad_id == squad.id)
        .all()
    )

    # 30 mins active window for is_studying check
    now = datetime.datetime.utcnow()
    recent_active_window = now - datetime.timedelta(minutes=30)

    member_progress_list: List[SquadMemberProgress] = []
    user_role = None
    is_member = False

    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if not user:
            continue

        if user.id == current_user.id:
            is_member = True
            user_role = m.role

        cur_hours = 0.0
        tgt_hours = squad.target_hours
        goal_title = None

        if m.goal_id:
            goal = db.query(StudyGoal).filter(StudyGoal.id == m.goal_id).first()
            if goal:
                cur_hours = float(goal.current_hours or 0.0)
                tgt_hours = float(goal.target_hours or squad.target_hours)
                goal_title = goal.title

        prog_pct = min(100.0, round((cur_hours / max(1.0, tgt_hours)) * 100, 1))

        # Check if recently studying
        recent_session = (
            db.query(StudySessionLog)
            .filter(
                StudySessionLog.user_id == user.id,
                StudySessionLog.created_at >= recent_active_window,
            )
            .first()
        )

        player = db.query(Player).filter(Player.user_id == user.id).first()
        streak_val = player.streak if player and player.streak else 0

        member_progress_list.append(
            SquadMemberProgress(
                user_id=user.id,
                display_name=user.display_name or "Thành viên",
                role=m.role,
                vehicle_icon=m.vehicle_icon or "🏎️",
                goal_id=m.goal_id,
                goal_title=goal_title,
                current_hours=cur_hours,
                target_hours=tgt_hours,
                progress_percent=prog_pct,
                streak=streak_val,
                is_current_user=(user.id == current_user.id),
                is_studying=bool(recent_session),
                joined_at=m.joined_at.isoformat(),
            )
        )

    # Sort racers: highest progress_percent first for F1 leaderboard
    # Deterministic tie-breaker: progress_percent desc, current_hours desc, streak desc, user_id asc
    member_progress_list.sort(key=lambda r: (r.progress_percent, r.current_hours, r.streak, -r.user_id), reverse=True)

    return SquadDetailResponse(
        id=squad.id,
        name=squad.name,
        target_title=squad.target_title,
        target_hours=squad.target_hours,
        category=squad.category,
        icon=squad.icon,
        color=squad.color,
        description=squad.description,
        invite_code=squad.invite_code,
        creator_id=squad.creator_id,
        created_at=squad.created_at.isoformat(),
        members_count=len(members),
        is_member=is_member,
        user_role=user_role,
        members=member_progress_list,
    )
