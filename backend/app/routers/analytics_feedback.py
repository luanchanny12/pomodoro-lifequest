import datetime
from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models_auth import User, VisitorLog, UserFeedback
from app.routers.auth import get_current_admin, get_current_user_optional

router = APIRouter(tags=["Analytics & Feedback"])

# --- Schemas ---

class TrackVisitRequest(BaseModel):
    visitor_id: str
    is_member: bool = False
    user_id: Optional[int] = None
    device_type: str = "desktop"
    path: str = "/"
    user_agent: Optional[str] = None

class CreateFeedbackRequest(BaseModel):
    rating: int = Field(5, ge=1, le=5)
    category: str = Field("feature")  # feature, bug, praise, ui, other
    content: str = Field(..., min_length=2, max_length=2000)
    sender_name: Optional[str] = None
    sender_contact: Optional[str] = None

class UpdateFeedbackStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(new|reviewed|resolved)$")
    admin_note: Optional[str] = None

# --- Endpoints ---

@router.post("/api/analytics/track-visit")
@router.post("/analytics/track-visit")
def track_visit(
    data: TrackVisitRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Ghi nhận lượt truy cập (Pageview) và phân loại Khách vãng lai vs Thành viên."""
    is_member = bool(current_user is not None or data.is_member or data.user_id)
    user_id = current_user.id if current_user else data.user_id

    # Lấy IP client
    forwarded_for = request.headers.get("x-forwarded-for")
    client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else None)
    ua = data.user_agent or request.headers.get("user-agent")

    # Xác định device_type
    dev = data.device_type.lower()
    if dev not in ["mobile", "tablet", "desktop"]:
        dev = "mobile" if (ua and any(k in ua.lower() for k in ["mobi", "android", "iphone", "ipad"])) else "desktop"

    visit = VisitorLog(
        visitor_id=data.visitor_id.strip()[:64],
        user_id=user_id,
        is_member=is_member,
        device_type=dev,
        path=data.path.strip()[:128] if data.path else "/",
        ip_address=client_ip[:64] if client_ip else None,
        user_agent=ua[:256] if ua else None,
        visit_date=date.today(),
        created_at=datetime.datetime.utcnow(),
    )
    db.add(visit)
    db.commit()

    total_visits = db.query(VisitorLog).count()
    return {"status": "ok", "total_visits": total_visits}


@router.post("/api/feedback")
@router.post("/feedback")
def submit_feedback(
    data: CreateFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Gửi góp ý, đánh giá số sao và nhận xét về website."""
    sender_name = data.sender_name.strip() if data.sender_name and data.sender_name.strip() else None
    if not sender_name:
        sender_name = current_user.display_name if current_user else "Khách vãng lai"

    feedback = UserFeedback(
        user_id=current_user.id if current_user else None,
        sender_name=sender_name[:64],
        sender_contact=data.sender_contact.strip()[:128] if data.sender_contact else None,
        rating=data.rating,
        category=data.category,
        content=data.content.strip(),
        status="new",
        created_at=datetime.datetime.utcnow(),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return {
        "status": "ok",
        "message": "Cảm ơn bạn đã gửi góp ý và đánh giá cho Pomodoro LifeQuest! Ý kiến của bạn đã được chuyển đến Admin.",
        "id": feedback.id,
    }


@router.get("/api/admin/feedbacks")
@router.get("/admin/feedbacks")
def get_admin_feedbacks(
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    rating: Optional[int] = Query(None, ge=1, le=5),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Lấy danh sách góp ý và nhận xét của người dùng cho Admin Portal."""
    query = db.query(UserFeedback)

    if category and category != "all":
        query = query.filter(UserFeedback.category == category)
    if status_filter and status_filter != "all":
        query = query.filter(UserFeedback.status == status_filter)
    if rating:
        query = query.filter(UserFeedback.rating == rating)

    total_count = query.count()
    new_count = db.query(UserFeedback).filter(UserFeedback.status == "new").count()

    avg_rating_raw = db.query(func.avg(UserFeedback.rating)).scalar()
    avg_rating = round(float(avg_rating_raw), 1) if avg_rating_raw is not None else 5.0

    feedbacks = query.order_by(UserFeedback.id.desc()).offset(skip).limit(limit).all()

    items = []
    for f in feedbacks:
        user_obj = db.query(User).filter(User.id == f.user_id).first() if f.user_id else None
        items.append({
            "id": f.id,
            "user_id": f.user_id,
            "sender_name": f.sender_name,
            "sender_contact": f.sender_contact,
            "is_member": bool(f.user_id is not None),
            "member_username": user_obj.username if user_obj else None,
            "racer_avatar": user_obj.racer_avatar if user_obj else None,
            "rating": f.rating,
            "category": f.category,
            "content": f.content,
            "status": f.status,
            "admin_note": f.admin_note,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        })

    return {
        "total": total_count,
        "new_count": new_count,
        "average_rating": avg_rating,
        "items": items,
    }


@router.put("/api/admin/feedbacks/{feedback_id}/status")
@router.put("/admin/feedbacks/{feedback_id}/status")
def update_feedback_status(
    feedback_id: int,
    data: UpdateFeedbackStatusRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Cập nhật trạng thái (Đã xem, Đã giải quyết) và ghi chú của Admin cho một nhận xét."""
    feedback = db.query(UserFeedback).filter(UserFeedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy góp ý này")

    feedback.status = data.status
    if data.admin_note is not None:
        feedback.admin_note = data.admin_note.strip()
    db.commit()

    return {"status": "ok", "message": f"Đã cập nhật trạng thái nhận xét thành '{data.status}'"}


@router.delete("/api/admin/feedbacks/{feedback_id}")
@router.delete("/admin/feedbacks/{feedback_id}")
def delete_feedback(
    feedback_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Xóa nhận xét rác hoặc vi phạm."""
    feedback = db.query(UserFeedback).filter(UserFeedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy góp ý này")

    db.delete(feedback)
    db.commit()
    return {"status": "ok", "message": "Đã xóa nhận xét thành công"}
