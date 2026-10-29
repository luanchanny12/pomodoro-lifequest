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

# --- Helpers ---

def parse_user_agent(ua: Optional[str]) -> dict:
    """Phân tích chuỗi User-Agent để nhận diện chính xác Trình duyệt, Hệ điều hành và Thiết bị."""
    if not ua:
        return {"browser": "Không xác định", "os": "Không xác định", "device_type": "desktop"}
    
    ua_lower = ua.lower()
    
    # 1. Trình duyệt (Browser)
    browser = "Trình duyệt khác"
    if "coccoc" in ua_lower or "coc_coc" in ua_lower:
        browser = "Cốc Cốc"
    elif "edg/" in ua_lower or "edge/" in ua_lower:
        browser = "Microsoft Edge"
    elif "chrome/" in ua_lower and "chromium" not in ua_lower and "edg" not in ua_lower:
        browser = "Google Chrome"
    elif "firefox/" in ua_lower:
        browser = "Mozilla Firefox"
    elif "safari/" in ua_lower and "chrome/" not in ua_lower:
        browser = "Apple Safari"
    elif "opr/" in ua_lower or "opera" in ua_lower:
        browser = "Opera"
    elif "zalo" in ua_lower:
        browser = "Zalo In-App"
    elif "fb" in ua_lower or "fbav" in ua_lower:
        browser = "Facebook In-App"

    # 2. Hệ điều hành (OS)
    os_name = "Khác"
    if "windows nt 10.0" in ua_lower:
        os_name = "Windows 10/11"
    elif "windows" in ua_lower:
        os_name = "Windows"
    elif "iphone" in ua_lower:
        os_name = "iOS (iPhone)"
    elif "ipad" in ua_lower:
        os_name = "iPadOS"
    elif "android" in ua_lower:
        os_name = "Android"
    elif "macintosh" in ua_lower or "mac os" in ua_lower:
        os_name = "macOS"
    elif "linux" in ua_lower:
        os_name = "Linux"

    # 3. Loại thiết bị
    dev = "desktop"
    if any(k in ua_lower for k in ["iphone", "android", "mobile", "phone"]):
        dev = "mobile"
    elif any(k in ua_lower for k in ["ipad", "tablet"]):
        dev = "tablet"

    return {"browser": browser, "os": os_name, "device_type": dev}


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

    # Đảm bảo user_id hợp lệ
    if user_id:
        user_check = db.query(User).filter(User.id == user_id).first()
        if not user_check:
            user_id = None
            is_member = False
        else:
            is_member = True

    # Lấy IP client từ các proxy headers phổ biến
    client_ip = (
        request.headers.get("cf-connecting-ip")
        or request.headers.get("x-real-ip")
        or (request.headers.get("x-forwarded-for").split(",")[0].strip() if request.headers.get("x-forwarded-for") else None)
        or (request.client.host if request.client else None)
    )
    ua = data.user_agent or request.headers.get("user-agent")

    # Xác định device_type
    ua_info = parse_user_agent(ua)
    dev = data.device_type.lower()
    if dev not in ["mobile", "tablet", "desktop"]:
        dev = ua_info["device_type"]

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


@router.get("/api/admin/visitors")
@router.get("/admin/visitors")
def get_admin_visitors(
    filter_type: str = Query("all"),  # all, members, guests
    search: Optional[str] = Query(None),
    timeframe: str = Query("all"),    # day, week, month, all
    limit: int = Query(100, ge=10, le=500),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách người truy cập chi tiết:
    - Nếu là thành viên: Tên hiển thị + @username + avatar + số lần vào + thiết bị/trình duyệt.
    - Nếu là khách vãng lai: Địa chỉ IP + số lần vào + thiết bị/trình duyệt.
    Kèm nhật ký live recent logs 50 lượt mới nhất.
    """
    today = date.today()
    date_filter = None
    if timeframe == "day":
        date_filter = VisitorLog.visit_date == today
    elif timeframe == "week":
        date_filter = VisitorLog.visit_date >= today - datetime.timedelta(days=7)
    elif timeframe == "month":
        date_filter = VisitorLog.visit_date >= today - datetime.timedelta(days=30)

    # 1. TỔNG HỢP THÀNH VIÊN (Members)
    member_items = []
    if filter_type in ["all", "members"]:
        m_query = (
            db.query(
                VisitorLog.user_id,
                func.count(VisitorLog.id).label("visit_count"),
                func.min(VisitorLog.created_at).label("first_visit"),
                func.max(VisitorLog.created_at).label("last_visit"),
            )
            .filter(VisitorLog.is_member == True, VisitorLog.user_id.isnot(None))
        )
        if date_filter is not None:
            m_query = m_query.filter(date_filter)

        m_groups = m_query.group_by(VisitorLog.user_id).all()
        for g in m_groups:
            user_obj = db.query(User).filter(User.id == g.user_id).first()
            if not user_obj:
                continue

            # Lấy bản ghi truy cập mới nhất để lấy path, ip, device, ua
            latest_v = (
                db.query(VisitorLog)
                .filter(VisitorLog.user_id == g.user_id)
                .order_by(VisitorLog.created_at.desc())
                .first()
            )
            parsed = parse_user_agent(latest_v.user_agent if latest_v else None)

            member_items.append({
                "id": f"member_{user_obj.id}",
                "identity": user_obj.display_name,
                "username": user_obj.username,
                "user_id": user_obj.id,
                "avatar": user_obj.racer_avatar or "cyber_car",
                "is_member": True,
                "ip_address": (latest_v.ip_address if latest_v and latest_v.ip_address else "Localhost / N/A"),
                "visit_count": g.visit_count,
                "first_visit": g.first_visit.isoformat() if g.first_visit else None,
                "last_visit": g.last_visit.isoformat() if g.last_visit else None,
                "last_path": latest_v.path if latest_v else "/",
                "device_type": latest_v.device_type if latest_v else parsed["device_type"],
                "browser": parsed["browser"],
                "os": parsed["os"],
            })

    # 2. TỔNG HỢP KHÁCH VÃNG LAI (Guests - theo IP hoặc visitor_id)
    guest_items = []
    if filter_type in ["all", "guests"]:
        # Gom nhóm theo IP (hoặc visitor_id nếu IP null)
        guest_key = func.coalesce(VisitorLog.ip_address, VisitorLog.visitor_id)
        g_query = (
            db.query(
                guest_key.label("guest_id"),
                func.max(VisitorLog.ip_address).label("ip_address"),
                func.max(VisitorLog.visitor_id).label("visitor_id"),
                func.count(VisitorLog.id).label("visit_count"),
                func.min(VisitorLog.created_at).label("first_visit"),
                func.max(VisitorLog.created_at).label("last_visit"),
            )
            .filter(VisitorLog.is_member == False)
        )
        if date_filter is not None:
            g_query = g_query.filter(date_filter)

        g_groups = g_query.group_by(guest_key).all()
        for g in g_groups:
            latest_v = (
                db.query(VisitorLog)
                .filter(guest_key == g.guest_id)
                .order_by(VisitorLog.created_at.desc())
                .first()
            )
            parsed = parse_user_agent(latest_v.user_agent if latest_v else None)

            ip_str = g.ip_address if g.ip_address else "Khách ẩn danh"
            guest_items.append({
                "id": f"guest_{g.guest_id}",
                "identity": ip_str,
                "username": None,
                "user_id": None,
                "avatar": None,
                "is_member": False,
                "ip_address": ip_str,
                "visit_count": g.visit_count,
                "first_visit": g.first_visit.isoformat() if g.first_visit else None,
                "last_visit": g.last_visit.isoformat() if g.last_visit else None,
                "last_path": latest_v.path if latest_v else "/",
                "device_type": latest_v.device_type if latest_v else parsed["device_type"],
                "browser": parsed["browser"],
                "os": parsed["os"],
            })

    # Kết hợp và lọc theo search
    all_aggregated = member_items + guest_items
    if search and search.strip():
        kw = search.strip().lower()
        all_aggregated = [
            item for item in all_aggregated
            if kw in item["identity"].lower()
            or (item["username"] and kw in item["username"].lower())
            or (item["ip_address"] and kw in item["ip_address"].lower())
            or (item["last_path"] and kw in item["last_path"].lower())
        ]

    # Sắp xếp theo lần truy cập gần nhất (last_visit) giảm dần
    all_aggregated.sort(key=lambda x: x["last_visit"] or "", reverse=True)
    all_aggregated = all_aggregated[:limit]

    # 3. NHẬT KÝ LIVE RECENT LOGS (50 lượt truy cập mới nhất)
    recent_query = db.query(VisitorLog)
    if date_filter is not None:
        recent_query = recent_query.filter(date_filter)
    if filter_type == "members":
        recent_query = recent_query.filter(VisitorLog.is_member == True)
    elif filter_type == "guests":
        recent_query = recent_query.filter(VisitorLog.is_member == False)

    recent_logs = recent_query.order_by(VisitorLog.created_at.desc()).limit(50).all()
    live_logs = []
    for log in recent_logs:
        user_obj = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
        parsed = parse_user_agent(log.user_agent)
        live_logs.append({
            "id": log.id,
            "visitor_id": log.visitor_id,
            "user_id": log.user_id,
            "display_name": user_obj.display_name if user_obj else None,
            "username": user_obj.username if user_obj else None,
            "avatar": user_obj.racer_avatar if user_obj else None,
            "is_member": log.is_member,
            "ip_address": log.ip_address or "N/A",
            "device_type": log.device_type,
            "browser": parsed["browser"],
            "os": parsed["os"],
            "path": log.path,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    total_visits_count = db.query(VisitorLog).count()
    if date_filter is not None:
        total_visits_count = db.query(VisitorLog).filter(date_filter).count()

    return {
        "aggregated_visitors": all_aggregated,
        "live_recent_logs": live_logs,
        "total_unique_visitors": len(all_aggregated),
        "total_visits": total_visits_count,
    }
