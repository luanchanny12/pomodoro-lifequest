import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models import (
    FinancialJar,
    JarTransaction,
    TetEarningPlan,
    SchoolClassSchedule,
)
from app.schemas import (
    FinancialJarCreate,
    FinancialJarUpdate,
    FinancialJarResponse,
    JarTransactionCreate,
    JarTransactionResponse,
    GigDepositRequest,
    GigDepositResponse,
    JarTemplateApplyRequest,
    TetEarningPlanUpdate,
    TetEarningPlanResponse,
    SchoolScheduleItemCreate,
    SchoolScheduleItemResponse,
    DualCoachAdviceResponse,
    PhenikaaSyncStatusResponse,
    PhenikaaSyncConfigRequest,
    PhenikaaSyncTriggerResponse,
)
from app.models_auth import User
from app.routers.auth import get_current_user_optional
from app.routers.focus.common import (
    _get_real_user,
    _verify_resource_ownership,
    vn_today,
    vn_now,
)

router = APIRouter()

JAR_TEMPLATES = {
    "tet_gig": [
        {
            "name": "Hũ Tiêu Tết",
            "jar_type": "TET",
            "target_amount": 15000000.0,
            "current_balance": 0.0,
            "icon": "🧧",
            "color": "#EF4444",
            "note": "Quỹ mua sắm, mừng tuổi & đón Tết Nguyên Đán sung túc.",
        },
        {
            "name": "Hũ Sinh Hoạt Hàng Ngày",
            "jar_type": "LIVING",
            "target_amount": 5000000.0,
            "current_balance": 0.0,
            "icon": "🍲",
            "color": "#F59E0B",
            "note": "Tiền đổ xăng, ăn trưa, cà phê và chi tiêu sinh hoạt hàng ngày.",
        },
        {
            "name": "Hũ Phát Triển Kỹ Năng",
            "jar_type": "SKILL",
            "target_amount": 3000000.0,
            "current_balance": 0.0,
            "icon": "💻",
            "color": "#8B5CF6",
            "note": "Quỹ học tập, sách chuyên ngành và nâng cao kỹ năng.",
        },
        {
            "name": "Hũ Dự Phòng Khẩn Cấp",
            "jar_type": "EMERGENCY",
            "target_amount": 5000000.0,
            "current_balance": 0.0,
            "icon": "🛡️",
            "color": "#10B981",
            "note": "Quỹ phòng thân an toàn cho xe cộ, sức khỏe và việc đột xuất.",
        },
    ],
    "six_jars": [
        {
            "name": "Chi Tiêu Thiết Yếu (NEC - 55%)",
            "jar_type": "LIVING",
            "target_amount": 5000000.0,
            "current_balance": 0.0,
            "icon": "🏠",
            "color": "#3B82F6",
            "note": "Ăn uống, thuê nhà, điện nước, xăng xe và sinh hoạt cơ bản.",
        },
        {
            "name": "Tiết Kiệm Dài Hạn (LTSS - 10%)",
            "jar_type": "TET",
            "target_amount": 10000000.0,
            "current_balance": 0.0,
            "icon": "💎",
            "color": "#10B981",
            "note": "Mua sắm mục tiêu lớn, xe mới, máy tính, quỹ lớn tương lai.",
        },
        {
            "name": "Giáo Dục & Kỹ Năng (EDU - 10%)",
            "jar_type": "SKILL",
            "target_amount": 3000000.0,
            "current_balance": 0.0,
            "icon": "📚",
            "color": "#8B5CF6",
            "note": "Khóa học, sách vở, chứng chỉ, phát triển bản thân.",
        },
        {
            "name": "Hưởng Thụ Bản Thân (PLAY - 10%)",
            "jar_type": "CUSTOM",
            "target_amount": 2000000.0,
            "current_balance": 0.0,
            "icon": "🎉",
            "color": "#EC4899",
            "note": "Tự thưởng, xem phim, du lịch, trải nghiệm cuộc sống.",
        },
        {
            "name": "Tự Do Tài Chính (FFA - 10%)",
            "jar_type": "EMERGENCY",
            "target_amount": 10000000.0,
            "current_balance": 0.0,
            "icon": "📈",
            "color": "#F59E0B",
            "note": "Đầu tư, sinh lời, tạo dòng tiền thụ động.",
        },
        {
            "name": "Cho Đi & Giúp Đỡ (GIVE - 5%)",
            "jar_type": "CUSTOM",
            "target_amount": 1000000.0,
            "current_balance": 0.0,
            "icon": "❤️",
            "color": "#EF4444",
            "note": "Quà tặng gia đình, người thân, từ thiện và giúp đỡ người khó khăn.",
        },
    ],
    "simple_three": [
        {
            "name": "Hũ Sinh Hoạt Thiết Yếu",
            "jar_type": "LIVING",
            "target_amount": 4000000.0,
            "current_balance": 0.0,
            "icon": "🍲",
            "color": "#F59E0B",
            "note": "Chi tiêu ăn uống, xăng xe, nhà trọ.",
        },
        {
            "name": "Hũ Mục Tiêu Lớn",
            "jar_type": "TET",
            "target_amount": 10000000.0,
            "current_balance": 0.0,
            "icon": "🎯",
            "color": "#3B82F6",
            "note": "Tích lũy mua sắm, đón Tết hoặc mục tiêu riêng.",
        },
        {
            "name": "Hũ Dự Phòng Khẩn Cấp",
            "jar_type": "EMERGENCY",
            "target_amount": 3000000.0,
            "current_balance": 0.0,
            "icon": "🛡️",
            "color": "#10B981",
            "note": "Quỹ phòng ngừa ốm đau, sự cố xe cộ.",
        },
    ],
}

DEFAULT_JARS_SEED = JAR_TEMPLATES["tet_gig"]

DAY_NAME_MAP = {
    2: "Thứ 2",
    3: "Thứ 3",
    4: "Thứ 4",
    5: "Thứ 5",
    6: "Thứ 6",
    7: "Thứ 7",
    8: "Chủ Nhật",
}


def _get_or_create_default_jars(db: Session, user_id: Optional[int]) -> List[FinancialJar]:
    query = db.query(FinancialJar)
    if user_id:
        query = query.filter(FinancialJar.user_id == user_id)
    else:
        query = query.filter(FinancialJar.user_id.is_(None))
    jars = query.order_by(FinancialJar.id.asc()).all()

    if not jars:
        created_jars = []
        for seed in DEFAULT_JARS_SEED:
            jar = FinancialJar(
                user_id=user_id,
                name=seed["name"],
                jar_type=seed["jar_type"],
                target_amount=seed["target_amount"],
                current_balance=seed["current_balance"],
                icon=seed["icon"],
                color=seed["color"],
                note=seed["note"],
            )
            db.add(jar)
            created_jars.append(jar)
        db.commit()
        for j in created_jars:
            db.refresh(j)
        return created_jars
    return jars


def _get_or_create_tet_plan(db: Session, user_id: Optional[int]) -> TetEarningPlan:
    query = db.query(TetEarningPlan)
    if user_id:
        query = query.filter(TetEarningPlan.user_id == user_id)
    else:
        query = query.filter(TetEarningPlan.user_id.is_(None))
    plan = query.first()

    if not plan:
        is_luan = (user_id == 10)
        plan = TetEarningPlan(
            user_id=user_id,
            plan_name="Kế Hoạch Đón Tết" if is_luan else "Kế Hoạch Tài Chính",
            tet_target_amount=15000000.0 if is_luan else 10000000.0,
            tet_date=datetime.date(2027, 2, 6),  # Mùng 1 Tết Đinh Mùi
            shift_enabled=True if is_luan else False,
            shift_name="Ca chạy xe" if is_luan else "Ca kiếm tiền",
            daily_shift_start="10:00",
            daily_shift_end="14:00",
            home_arrival_time="15:00",
            primary_skill_focus="Lập trình Web Fullstack & Tiếng Anh" if is_luan else None,
            default_tet_split_percent=60.0,
            default_living_split_percent=40.0,
            is_active=True,
            note="Kỷ luật giờ giấc và quản lý tài chính cá nhân.",
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
    return plan


def _format_jar_response(jar: FinancialJar) -> FinancialJarResponse:
    pct = 0.0
    if jar.target_amount and jar.target_amount > 0:
        pct = round(min(100.0, max(0.0, (jar.current_balance / jar.target_amount) * 100.0)), 1)
    return FinancialJarResponse(
        id=jar.id,
        user_id=jar.user_id,
        name=jar.name,
        jar_type=jar.jar_type,
        target_amount=round(float(jar.target_amount or 0), 0),
        current_balance=round(float(jar.current_balance or 0), 0),
        icon=jar.icon,
        color=jar.color,
        note=jar.note,
        progress_percent=pct,
        created_at=jar.created_at,
        updated_at=jar.updated_at,
    )


def _format_plan_response(plan: TetEarningPlan, db: Session, user_id: Optional[int]) -> TetEarningPlanResponse:
    tet_jar = db.query(FinancialJar).filter(
        FinancialJar.user_id == user_id if user_id else FinancialJar.user_id.is_(None),
        FinancialJar.jar_type == "TET",
    ).first()
    current_savings = round(float(tet_jar.current_balance), 0) if tet_jar else 0.0

    today = vn_today()
    tet_date = plan.tet_date or datetime.date(2027, 2, 6)
    days_left = max(1, (tet_date - today).days)
    target = float(plan.tet_target_amount or 15000000.0)
    needed = max(0.0, target - current_savings)
    daily_target_needed = round(needed / float(days_left), 0)

    # Tính thu nhập kiếm được hôm nay
    tx_query = db.query(func.coalesce(func.sum(JarTransaction.amount), 0.0)).filter(
        JarTransaction.user_id == user_id if user_id else JarTransaction.user_id.is_(None),
        JarTransaction.transaction_type == "INCOME_GIG",
        func.date(JarTransaction.transaction_time) == today,
    )
    today_earned = round(float(tx_query.scalar() or 0.0), 0)
    is_target_met_today = today_earned >= daily_target_needed

    return TetEarningPlanResponse(
        id=plan.id,
        plan_name=getattr(plan, "plan_name", None) or "Kế Hoạch Tài Chính",
        tet_target_amount=round(target, 0),
        current_savings=current_savings,
        tet_date=tet_date.isoformat() if tet_date else None,
        days_remaining=days_left,
        daily_target_needed=daily_target_needed,
        shift_enabled=bool(getattr(plan, "shift_enabled", False)),
        shift_name=getattr(plan, "shift_name", None) or "Ca kiếm tiền",
        daily_shift_start=plan.daily_shift_start or "10:00",
        daily_shift_end=plan.daily_shift_end or "14:00",
        home_arrival_time=plan.home_arrival_time or "15:00",
        primary_skill_focus=getattr(plan, "primary_skill_focus", None),
        today_earned=today_earned,
        is_target_met_today=is_target_met_today,
        is_active=bool(plan.is_active),
        note=plan.note,
    )


# --- 1. JARS CRUD ENDPOINTS ---

@router.get("/jars", response_model=List[FinancialJarResponse])
def get_user_jars(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Lấy danh sách các hũ tài chính của người dùng. Nếu chưa có, trả về danh sách rỗng để chọn mẫu."""
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None
    jars = _get_or_create_default_jars(db, user_id)
    return [_format_jar_response(j) for j in jars]


@router.post("/jars/apply-template", response_model=List[FinancialJarResponse])
def apply_jar_template(
    payload: JarTemplateApplyRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Áp dụng bộ mẫu hũ tài chính (tet_gig, six_jars, simple_three, empty)."""
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None
    template_key = payload.template_type or "simple_three"

    if template_key not in JAR_TEMPLATES and template_key != "empty":
        template_key = "simple_three"

    # Xóa các hũ hiện có của người dùng
    existing_jars = db.query(FinancialJar).filter(
        FinancialJar.user_id == user_id if user_id else FinancialJar.user_id.is_(None)
    ).all()
    for ej in existing_jars:
        db.delete(ej)
    db.commit()

    created_jars = []
    if template_key in JAR_TEMPLATES:
        for seed in JAR_TEMPLATES[template_key]:
            j = FinancialJar(
                user_id=user_id,
                name=seed["name"],
                jar_type=seed["jar_type"],
                target_amount=seed["target_amount"],
                current_balance=0.0,
                icon=seed["icon"],
                color=seed["color"],
                note=seed["note"],
            )
            db.add(j)
            created_jars.append(j)
        db.commit()
        for cj in created_jars:
            db.refresh(cj)

    # Nếu chọn mẫu tet_gig, tự động bật ca kiếm tiền
    if template_key == "tet_gig":
        plan = _get_or_create_tet_plan(db, user_id)
        plan.shift_enabled = True
        plan.shift_name = "Ca chạy xe"
        db.commit()

    return [_format_jar_response(j) for j in created_jars]


@router.post("/jars", response_model=FinancialJarResponse)
def create_custom_jar(
    payload: FinancialJarCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Tạo thêm một hũ tài chính tùy chỉnh mới."""
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    jar = FinancialJar(
        user_id=user_id,
        name=payload.name.strip(),
        jar_type=payload.jar_type or "CUSTOM",
        target_amount=max(0.0, payload.target_amount or 0.0),
        current_balance=max(0.0, payload.current_balance or 0.0),
        icon=payload.icon or "🏺",
        color=payload.color or "#3B82F6",
        note=payload.note,
    )
    db.add(jar)
    db.commit()
    db.refresh(jar)

    # Nếu có số dư khởi tạo > 0, tạo một giao dịch INITIAL
    if jar.current_balance > 0:
        tx = JarTransaction(
            jar_id=jar.id,
            user_id=user_id,
            amount=jar.current_balance,
            transaction_type="INITIAL",
            category="khoi_tao",
            description=f"Số dư ban đầu khi mở {jar.name}",
            transaction_time=vn_now(),
        )
        db.add(tx)
        db.commit()

    return _format_jar_response(jar)


@router.put("/jars/{jar_id}", response_model=FinancialJarResponse)
def update_jar(
    jar_id: int,
    payload: FinancialJarUpdate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Cập nhật thông tin hũ tài chính (mục tiêu, số dư, tên, biểu tượng)."""
    jar = db.query(FinancialJar).filter(FinancialJar.id == jar_id).first()
    if not jar:
        raise HTTPException(status_code=404, detail="Không tìm thấy hũ tài chính!")
    _verify_resource_ownership(jar, user)

    if payload.name is not None:
        jar.name = payload.name.strip()
    if payload.target_amount is not None:
        jar.target_amount = max(0.0, payload.target_amount)
    if payload.current_balance is not None:
        jar.current_balance = max(0.0, payload.current_balance)
    if payload.icon is not None:
        jar.icon = payload.icon
    if payload.color is not None:
        jar.color = payload.color
    if payload.note is not None:
        jar.note = payload.note
    jar.updated_at = vn_now()

    db.commit()
    db.refresh(jar)
    return _format_jar_response(jar)


@router.delete("/jars/{jar_id}")
def delete_jar(
    jar_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Xóa hũ tài chính tùy chỉnh (không cho phép xóa hũ Tết hoặc hũ Sinh Hoạt chính)."""
    jar = db.query(FinancialJar).filter(FinancialJar.id == jar_id).first()
    if not jar:
        raise HTTPException(status_code=404, detail="Không tìm thấy hũ tài chính!")
    _verify_resource_ownership(jar, user)

    if jar.jar_type in ["TET", "LIVING"]:
        raise HTTPException(
            status_code=400,
            detail="Không thể xóa Hũ Tiêu Tết hoặc Hũ Sinh Hoạt chính vì đây là hũ trụ cột của hệ thống!"
        )

    db.delete(jar)
    db.commit()
    return {"status": "success", "message": f"Đã xóa hũ {jar.name} thành công."}


# --- 2. TRANSACTIONS & FAST EXPENSE / GIG DEPOSIT ---

@router.get("/transactions", response_model=List[JarTransactionResponse])
def get_transactions(
    jar_id: Optional[int] = None,
    category: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Lấy danh sách các giao dịch thu/chi gần nhất."""
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    query = db.query(JarTransaction)
    if user_id:
        query = query.filter(JarTransaction.user_id == user_id)
    else:
        query = query.filter(JarTransaction.user_id.is_(None))

    if jar_id:
        query = query.filter(JarTransaction.jar_id == jar_id)
    if category:
        query = query.filter(JarTransaction.category == category)

    txs = query.order_by(desc(JarTransaction.transaction_time)).limit(limit).all()

    # Pre-fetch jar names
    jar_ids = {t.jar_id for t in txs if t.jar_id}
    jars_map = {j.id: j.name for j in db.query(FinancialJar).filter(FinancialJar.id.in_(jar_ids)).all()} if jar_ids else {}

    result = []
    for t in txs:
        result.append(JarTransactionResponse(
            id=t.id,
            jar_id=t.jar_id,
            jar_name=jars_map.get(t.jar_id, "Hũ chung"),
            amount=round(float(t.amount), 0),
            transaction_type=t.transaction_type,
            category=t.category,
            description=t.description,
            transaction_time=t.transaction_time,
            created_at=t.created_at,
        ))
    return result


@router.post("/expense")
def log_fast_expense(
    payload: JarTransactionCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Ghi nhận một khoản chi tiêu (tiêu tiền).
    Mặc định trừ vào Hũ Sinh Hoạt Hàng Ngày nếu không chỉ định jar_id.
    """
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    # Tìm jar mục tiêu
    target_jar = None
    if payload.jar_id:
        target_jar = db.query(FinancialJar).filter(FinancialJar.id == payload.jar_id).first()
        _verify_resource_ownership(target_jar, user)
    else:
        # Mặc định lấy Hũ Sinh Hoạt (LIVING)
        target_jar = db.query(FinancialJar).filter(
            FinancialJar.user_id == user_id if user_id else FinancialJar.user_id.is_(None),
            FinancialJar.jar_type == "LIVING"
        ).first()

    if not target_jar:
        # Nếu chưa có hũ sinh hoạt, tạo bộ hũ chuẩn
        jars = _get_or_create_default_jars(db, user_id)
        target_jar = next((j for j in jars if j.jar_type == "LIVING"), jars[0])

    expense_amount = abs(payload.amount)
    # Trừ số dư
    target_jar.current_balance = round(float(target_jar.current_balance or 0) - expense_amount, 0)
    target_jar.updated_at = vn_now()

    tx_time = payload.transaction_time or vn_now()
    tx = JarTransaction(
        jar_id=target_jar.id,
        user_id=user_id,
        amount=-expense_amount,  # Tiêu tiền là số âm
        transaction_type="EXPENSE",
        category=payload.category or "khac",
        description=payload.description or f"Chi tiêu từ {target_jar.name}",
        transaction_time=tx_time,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    db.refresh(target_jar)

    # Đưa ra lời khuyên ngắn gọn
    advice = (
        f"Đã ghi nhận chi {expense_amount:,.0f}đ cho '{tx.description}'. "
        f"Số dư còn lại trong {target_jar.name}: {target_jar.current_balance:,.0f}đ. "
        f"Hãy giữ chi tiêu trong định mức để bảo toàn tiền cho Hũ Tết nhé!"
    )

    return {
        "status": "success",
        "transaction": {
            "id": tx.id,
            "amount": tx.amount,
            "category": tx.category,
            "description": tx.description,
            "time": tx.transaction_time.isoformat(),
        },
        "jar": _format_jar_response(target_jar),
        "advice": advice,
    }


@router.post("/gig-deposit", response_model=GigDepositResponse)
def deposit_gig_earnings(
    payload: GigDepositRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Nạp thu nhập từ ca chạy 10h-14h.
    Tự động phân bổ vào Hũ Tết (mặc định 60%) và Hũ Sinh Hoạt (mặc định 40%).
    """
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    amount = max(0.0, float(payload.amount))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Số tiền thu nhập phải lớn hơn 0!")

    jars = _get_or_create_default_jars(db, user_id)
    tet_jar = next((j for j in jars if j.jar_type == "TET"), None)
    living_jar = next((j for j in jars if j.jar_type == "LIVING"), None)

    tet_pct = payload.tet_percent if payload.tet_percent is not None else 60.0
    living_pct = 100.0 - tet_pct if payload.living_percent is None else payload.living_percent

    tet_amount = round(amount * (tet_pct / 100.0), 0)
    living_amount = amount - tet_amount

    now = vn_now()

    # Nạp Hũ Tết
    if tet_jar:
        tet_jar.current_balance = round(float(tet_jar.current_balance or 0) + tet_amount, 0)
        tet_jar.updated_at = now
        tx_tet = JarTransaction(
            jar_id=tet_jar.id,
            user_id=user_id,
            amount=tet_amount,
            transaction_type="INCOME_GIG",
            category="chay_xe_tet",
            description=f"{payload.description} (Tích lũy Tết {tet_pct:.0f}%)",
            transaction_time=now,
        )
        db.add(tx_tet)

    # Nạp Hũ Sinh Hoạt
    if living_jar:
        living_jar.current_balance = round(float(living_jar.current_balance or 0) + living_amount, 0)
        living_jar.updated_at = now
        tx_living = JarTransaction(
            jar_id=living_jar.id,
            user_id=user_id,
            amount=living_amount,
            transaction_type="INCOME_GIG",
            category="chay_xe_living",
            description=f"{payload.description} (Sinh hoạt hàng ngày {living_pct:.0f}%)",
            transaction_time=now,
        )
        db.add(tx_living)

    db.commit()

    # Lấy kế hoạch Tết để kiểm tra chỉ tiêu
    plan = _get_or_create_tet_plan(db, user_id)
    plan_info = _format_plan_response(plan, db, user_id)

    msg = (
        f"Xuất sắc! Đã nạp thành công {amount:,.0f}đ từ ca chạy 10h-14h. "
        f"Đã chuyển {tet_amount:,.0f}đ vào Hũ Tết và {living_amount:,.0f}đ vào Hũ Sinh Hoạt. "
    )
    if plan_info.is_target_met_today:
        msg += "🎯 Bạn đã đạt và vượt chỉ tiêu kiếm tiền ngày hôm nay! Bây giờ hãy nghỉ ngơi và tập trung học nhé!"
    else:
        con_thieu = max(0.0, plan_info.daily_target_needed - plan_info.today_earned)
        msg += f"Hôm nay bạn đã kiếm được {plan_info.today_earned:,.0f}đ (còn thiếu {con_thieu:,.0f}đ để đạt chỉ tiêu ngày)."

    return GigDepositResponse(
        total_amount=amount,
        tet_deposited=tet_amount,
        living_deposited=living_amount,
        message=msg,
        daily_target=plan_info.daily_target_needed,
        daily_achieved=plan_info.today_earned,
        is_target_met=plan_info.is_target_met_today,
    )


# --- 3. TET EARNING PLAN ENDPOINTS ---

@router.get("/tet-plan", response_model=TetEarningPlanResponse)
def get_tet_plan(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Lấy kế hoạch kiếm tiền Tết, chỉ tiêu mỗi ngày và tiến độ hôm nay."""
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None
    plan = _get_or_create_tet_plan(db, user_id)
    return _format_plan_response(plan, db, user_id)


@router.put("/tet-plan", response_model=TetEarningPlanResponse)
def update_tet_plan(
    payload: TetEarningPlanUpdate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Cập nhật kế hoạch kiếm tiền Tết (mục tiêu tổng, giờ ca chạy, tỷ lệ phân bổ)."""
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None
    plan = _get_or_create_tet_plan(db, user_id)

    if payload.plan_name is not None:
        plan.plan_name = payload.plan_name.strip()
    if payload.tet_target_amount is not None:
        plan.tet_target_amount = max(0.0, payload.tet_target_amount)
    if payload.tet_date is not None:
        try:
            plan.tet_date = datetime.date.fromisoformat(payload.tet_date)
        except Exception:
            pass
    if payload.shift_enabled is not None:
        plan.shift_enabled = bool(payload.shift_enabled)
    if payload.shift_name is not None:
        plan.shift_name = payload.shift_name.strip()
    if payload.daily_shift_start is not None:
        plan.daily_shift_start = payload.daily_shift_start.strip()
    if payload.daily_shift_end is not None:
        plan.daily_shift_end = payload.daily_shift_end.strip()
    if payload.home_arrival_time is not None:
        plan.home_arrival_time = payload.home_arrival_time.strip()
    if payload.primary_skill_focus is not None:
        plan.primary_skill_focus = payload.primary_skill_focus.strip()
    if payload.default_tet_split_percent is not None:
        plan.default_tet_split_percent = max(0.0, min(100.0, payload.default_tet_split_percent))
    if payload.default_living_split_percent is not None:
        plan.default_living_split_percent = max(0.0, min(100.0, payload.default_living_split_percent))
    if payload.is_active is not None:
        plan.is_active = payload.is_active
    if payload.note is not None:
        plan.note = payload.note

    plan.updated_at = vn_now()
    db.commit()
    db.refresh(plan)
    return _format_plan_response(plan, db, user_id)


# --- 4. DUAL COACH ADVICE ENGINE ---

@router.get("/dual-coach-advice", response_model=DualCoachAdviceResponse)
def get_dual_coach_advice(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Trợ lý AI Dual-Coach:
    - Vừa phân tích chỉ tiêu kiếm tiền ca chạy 10h-14h và tiến độ tích lũy Hũ Tết.
    - Vừa đôn đốc giữ đúng kỷ luật thời gian, trở về lúc 15h để tập trung học trường & Fullstack / Tiếng Anh.
    """
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None
    today = vn_today()
    current_time_str = vn_now().strftime("%H:%M")

    plan = _get_or_create_tet_plan(db, user_id)
    plan_info = _format_plan_response(plan, db, user_id)

    # Lấy lịch học hôm nay của người dùng
    weekday_vn = today.weekday() + 2  # Thứ 2 = 2, Thứ 7 = 7, CN = 8
    today_classes = []
    if user_id:
        today_classes = db.query(SchoolClassSchedule).filter(
            SchoolClassSchedule.user_id == user_id,
            SchoolClassSchedule.day_of_week == weekday_vn,
            SchoolClassSchedule.is_active == True,
        ).order_by(SchoolClassSchedule.start_time.asc()).all()

    school_label = (
        today_classes[0].school_name
        if today_classes and getattr(today_classes[0], "school_name", None)
        else "Trường học"
    )

    # Xây dựng bảng thời gian biểu mẫu trong ngày
    schedule_blocks = []

    # 1. Lớp học buổi sáng (nếu có)
    for c in today_classes:
        if c.start_time < "12:00":
            schedule_blocks.append({
                "time": f"{c.start_time} - {c.end_time}",
                "title": f"Lớp học: {c.course_name}",
                "tag": c.school_name or "Giảng đường",
                "room": c.room or "Giảng đường",
                "color": "#3B82F6",
            })

    # 2. Ca kiếm tiền / Ca làm việc (chỉ hiển thị nếu user BẬT shift_enabled)
    if plan.shift_enabled:
        s_name = plan.shift_name or "Ca kiếm tiền"
        schedule_blocks.append({
            "time": f"{plan.daily_shift_start} - {plan.daily_shift_end}",
            "title": f"🛵 {s_name} ({plan.daily_shift_start} - {plan.daily_shift_end})",
            "tag": "Kiếm tiền",
            "room": "Nơi làm việc",
            "color": "#10B981",
        })
        schedule_blocks.append({
            "time": f"{plan.daily_shift_end} - {plan.home_arrival_time}",
            "title": "🏠 Về nhà, ăn uống & nghỉ ngơi hồi phục",
            "tag": "Nghỉ ngơi",
            "room": "Tại nhà",
            "color": "#F59E0B",
        })
    else:
        morning_class = next((c for c in today_classes if c.start_time < "12:00"), None)
        if not morning_class:
            schedule_blocks.append({
                "time": "08:30 - 11:30",
                "title": "🎯 Khung tập trung buổi sáng: Hoàn thành việc quan trọng (Deep Work)",
                "tag": "Tập trung",
                "room": "Bàn làm việc",
                "color": "#10B981",
            })
        schedule_blocks.append({
            "time": "11:30 - 13:30",
            "title": "🥗 Ăn trưa, thư giãn & nghỉ ngơi hồi phục năng lượng",
            "tag": "Nghỉ ngơi",
            "room": "Tại nhà",
            "color": "#F59E0B",
        })

    # 3. Lớp học buổi chiều (nếu có)
    afternoon_class = next((c for c in today_classes if c.start_time >= "12:00"), None)
    if afternoon_class:
        schedule_blocks.append({
            "time": f"{afternoon_class.start_time} - {afternoon_class.end_time}",
            "title": f"Lớp học: {afternoon_class.course_name}",
            "tag": afternoon_class.school_name or "Giảng đường",
            "room": afternoon_class.room or "Giảng đường",
            "color": "#3B82F6",
        })

    # 4. Kỹ năng trọng tâm / Khung tự học
    skill_title = getattr(plan, "primary_skill_focus", None)
    if not skill_title and user_id:
        from app.models import StudyGoal
        g = db.query(StudyGoal).filter(StudyGoal.user_id == user_id, StudyGoal.is_completed == False).first()
        if g:
            skill_title = g.title
    if not skill_title:
        skill_title = "Phát triển kỹ năng & Tự học tập trung"

    schedule_blocks.append({
        "time": "15:00 - 18:00" if plan.shift_enabled else "14:00 - 17:30",
        "title": f"💻 Khung học tập trung: {skill_title}",
        "tag": "Phát triển bản thân",
        "room": "Góc học tập",
        "color": "#8B5CF6",
    })

    # 5. Buổi tối ôn bài & làm bài tập
    schedule_blocks.append({
        "time": "19:30 - 22:30",
        "title": "📚 Ôn tập kiến thức, làm bài tập & Pomodoro hoàn thành Deadline",
        "tag": "Học tập",
        "room": "Bàn học",
        "color": "#6366F1",
    })

    # Lời khuyên tài chính
    target_k = plan_info.daily_target_needed / 1000.0
    earned_k = plan_info.today_earned / 1000.0
    days_left = plan_info.days_remaining
    plan_title = plan_info.plan_name or "Mục tiêu tài chính"

    if plan.shift_enabled:
        s_title = plan.shift_name or "ca làm việc"
        if plan_info.is_target_met_today:
            fin_advice = (
                f"🎉 Hôm nay bạn đã kiếm được {earned_k:,.0f}k, hoàn thành xuất sắc chỉ tiêu ngày ({target_k:,.0f}k)! "
                f"Hãy nghỉ ngơi đúng giờ ({plan.daily_shift_end}), không làm quá sức để giữ gìn sức khỏe nhé!"
            )
        elif earned_k > 0:
            fin_advice = (
                f"Hôm nay bạn đã kiếm được {earned_k:,.0f}k / {target_k:,.0f}k chỉ tiêu cho {plan_title}. "
                f"Chỉ cần duy trì đều đặn mỗi ngày là bạn sẽ sớm đạt mục tiêu {plan_info.tet_target_amount:,.0f}đ!"
            )
        else:
            fin_advice = (
                f"Chỉ tiêu hôm nay cho {plan_title}: {s_title} ({plan.daily_shift_start} - {plan.daily_shift_end}) cần tích lũy khoảng {target_k:,.0f}k. "
                f"Hãy chuẩn bị sẵn sàng và giữ an toàn trên đường nhé!"
            )
    else:
        fin_advice = (
            f"Kế hoạch '{plan_title}': Mục tiêu tích lũy {plan_info.tet_target_amount:,.0f}đ (còn {days_left} ngày). "
            f"Chỉ tiêu phân bổ mỗi ngày khoảng {target_k:,.0f}k. Hãy duy trì chi tiêu trong hạn mức các Hũ sinh hoạt để đảm bảo số tiền tiết kiệm!"
        )

    # Lời khuyên học tập & phát triển kỹ năng
    class_note = (
        f" Hôm nay bạn có {len(today_classes)} tiết học tại {school_label}."
        if today_classes
        else " Hôm nay không có lịch học trường, rất thích hợp để tập trung cao độ vào các dự án cá nhân."
    )
    if plan.shift_enabled:
        study_advice = (
            f"Kỷ luật vàng: Kết thúc {plan.shift_name} lúc {plan.daily_shift_end} và có mặt tại nhà lúc {plan.home_arrival_time}.{class_note} "
            f"Dành trọn vẹn buổi chiều tối để rèn luyện: {skill_title}!"
        )
    else:
        study_advice = (
            f"Kỷ luật bản thân:{class_note} Dành các phiên Pomodoro chất lượng để tập trung phát triển: {skill_title}. "
            f"Kiên trì mỗi ngày là chìa khóa tạo nên sự bứt phá dài hạn!"
        )

    quotes = [
        "Kiếm tiền nuôi hiện tại, mài giũa kiến thức làm chủ tương lai.",
        "Chỉ tiêu hôm nay bạn làm chủ, tương lai ngày mai bạn kiến tạo!",
        "Kỷ luật là cây cầu nối giữa mục tiêu và thành tựu.",
        "Mỗi giờ tập trung hôm nay đều tích lũy thành tự do của ngày mai.",
    ]
    selected_quote = quotes[today.timetuple().tm_yday % len(quotes)]
    # Lựa chọn quote theo ngày trong năm
    selected_quote = quotes[today.timetuple().tm_yday % len(quotes)]

    return DualCoachAdviceResponse(
        financial_advice=fin_advice,
        study_skill_advice=study_advice,
        daily_schedule_summary=schedule_blocks,
        motivation_quote=selected_quote,
    )


# --- 5. SCHOOL SCHEDULE CRUD & BATCH IMPORT ---

@router.get("/school-schedule", response_model=List[SchoolScheduleItemResponse])
def get_school_schedules(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Lấy danh sách thời khóa biểu các môn học tại trường của người dùng."""
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None
    if not user_id:
        return []

    classes = db.query(SchoolClassSchedule).filter(
        SchoolClassSchedule.user_id == user_id,
        SchoolClassSchedule.is_active == True,
    ).order_by(
        SchoolClassSchedule.day_of_week.asc(),
        SchoolClassSchedule.start_time.asc()
    ).all()

    return [
        SchoolScheduleItemResponse(
            id=c.id,
            school_name=getattr(c, "school_name", None) or "Trường Đại Học",
            course_code=c.course_code,
            course_name=c.course_name,
            day_of_week=c.day_of_week,
            day_name=DAY_NAME_MAP.get(c.day_of_week, f"Thứ {c.day_of_week}"),
            start_time=c.start_time,
            end_time=c.end_time,
            room=c.room,
            lecturer=c.lecturer,
            semester=c.semester,
            is_active=bool(c.is_active),
        )
        for c in classes
    ]


@router.post("/school-schedule", response_model=SchoolScheduleItemResponse)
def add_school_schedule_item(
    payload: SchoolScheduleItemCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Thêm một môn học vào thời khóa biểu."""
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    c = SchoolClassSchedule(
        user_id=user_id,
        school_name=payload.school_name or "Trường Đại Học",
        course_code=payload.course_code,
        course_name=payload.course_name.strip(),
        day_of_week=payload.day_of_week,
        start_period=payload.start_period,
        end_period=payload.end_period,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room,
        lecturer=payload.lecturer,
        semester=payload.semester,
        is_active=True,
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    return SchoolScheduleItemResponse(
        id=c.id,
        school_name=c.school_name or "Trường Đại Học",
        course_code=c.course_code,
        course_name=c.course_name,
        day_of_week=c.day_of_week,
        day_name=DAY_NAME_MAP.get(c.day_of_week, f"Thứ {c.day_of_week}"),
        start_time=c.start_time,
        end_time=c.end_time,
        room=c.room,
        lecturer=c.lecturer,
        semester=c.semester,
        is_active=bool(c.is_active),
    )


@router.delete("/school-schedule/{item_id}")
def delete_school_schedule_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Xóa một môn học khỏi thời khóa biểu."""
    item = db.query(SchoolClassSchedule).filter(SchoolClassSchedule.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học!")
    _verify_resource_ownership(item, user)

    db.delete(item)
    db.commit()
    return {"status": "success", "message": f"Đã xóa môn {item.course_name} khỏi thời khóa biểu."}


@router.post("/school-schedule/batch-import")
def batch_import_school_schedule(
    items: List[SchoolScheduleItemCreate],
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Import hàng loạt môn học từ thời khóa biểu."""
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    created_count = 0
    for it in items:
        c = SchoolClassSchedule(
            user_id=user_id,
            school_name=it.school_name or "Trường Đại Học",
            course_code=it.course_code,
            course_name=it.course_name.strip(),
            day_of_week=it.day_of_week,
            start_period=it.start_period,
            end_period=it.end_period,
            start_time=it.start_time,
            end_time=it.end_time,
            room=it.room,
            lecturer=it.lecturer,
            semester=it.semester,
            is_active=True,
        )
        db.add(c)
        created_count += 1

    db.commit()
    return {"status": "success", "imported_count": created_count, "message": f"Đã import thành công {created_count} môn học."}


# --- 6. PHENIKAA 2-WEEK AUTO SYNC ENDPOINTS ---

@router.get("/phenikaa/sync-status", response_model=PhenikaaSyncStatusResponse)
def get_phenikaa_sync_status(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Lấy trạng thái và tiến độ đếm ngược chu kỳ đồng bộ thời khóa biểu 2 tuần/lần."""
    from app.services.phenikaa_sync import get_or_create_sync_setting, check_if_sync_due

    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None
    setting = get_or_create_sync_setting(db, user_id)

    today = vn_today()
    next_date = setting.next_sync_date or (today + datetime.timedelta(days=setting.sync_interval_days))
    days_left = max(0, (next_date - today).days)
    is_due = check_if_sync_due(setting)

    return PhenikaaSyncStatusResponse(
        auto_sync_enabled=bool(setting.auto_sync_enabled),
        sync_interval_days=setting.sync_interval_days or 14,
        last_synced_at=setting.last_synced_at,
        next_sync_date=next_date,
        days_until_next_sync=days_left,
        is_due=is_due,
        last_sync_status=setting.last_sync_status or "SUCCESS",
        last_changes_summary=setting.last_changes_summary,
        student_id=setting.student_id or "23010720",
    )


@router.post("/phenikaa/trigger-sync", response_model=PhenikaaSyncTriggerResponse)
def trigger_manual_phenikaa_sync(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Kích hoạt đồng bộ thời khóa biểu Phenikaa ngay lập tức (ép cập nhật)."""
    from app.services.phenikaa_sync import trigger_phenikaa_sync

    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    result = trigger_phenikaa_sync(db, user_id, force=True)
    return PhenikaaSyncTriggerResponse(
        success=result["success"],
        message=result["message"],
        synced_count=result["synced_count"],
        changes_detected=result["changes_detected"],
        next_sync_date=result["next_sync_date"],
    )


@router.put("/phenikaa/configure-sync")
def configure_phenikaa_sync(
    payload: PhenikaaSyncConfigRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Cấu hình chu kỳ tự động đồng bộ thời khóa biểu (bật/tắt, số ngày chu kỳ)."""
    from app.services.phenikaa_sync import get_or_create_sync_setting

    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None
    setting = get_or_create_sync_setting(db, user_id)

    if payload.auto_sync_enabled is not None:
        setting.auto_sync_enabled = payload.auto_sync_enabled
    if payload.sync_interval_days is not None:
        setting.sync_interval_days = max(1, min(60, payload.sync_interval_days))
        setting.next_sync_date = vn_today() + datetime.timedelta(days=setting.sync_interval_days)
    if payload.student_id is not None:
        setting.student_id = payload.student_id.strip()

    setting.updated_at = vn_now()
    db.commit()
    db.refresh(setting)

    return {
        "status": "success",
        "message": f"Đã cập nhật cấu hình tự động đồng bộ (Chu kỳ: {setting.sync_interval_days} ngày).",
        "auto_sync_enabled": setting.auto_sync_enabled,
        "sync_interval_days": setting.sync_interval_days,
        "next_sync_date": setting.next_sync_date.isoformat() if setting.next_sync_date else None,
    }

