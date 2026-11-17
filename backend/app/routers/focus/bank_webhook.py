import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Request, Response, HTTPException, Query, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BankWebhookLog, NotificationSetting
from app.schemas import SepayWebhookPayload
from app.models_auth import User
from app.routers.auth import get_current_user_optional
from app.routers.focus.common import _get_real_user, vn_now
from app.routers.focus.telegram_chat import (
    notify_bank_expense_detected,
    notify_gig_income_detected,
)

router = APIRouter()


@router.post("/webhook/sepay")
async def receive_sepay_webhook(
    request: Request,
    db: Session = Depends(get_db),
    user_id_param: Optional[int] = Query(None, alias="user_id"),
    authorization: Optional[str] = Header(None),
):
    """
    Webhook tiếp nhận biến động số dư ngân hàng từ SePay / Casso.
    - Tiền RA (transferType == 'out'): Kích hoạt Telegram hỏi lý do tiêu tiền & gợi ý trừ Hũ Sinh Hoạt.
    - Tiền VÀO (transferType == 'in'): Kích hoạt Telegram chúc mừng ca chạy & gợi ý nạp Hũ Tết 60% + Hũ Sống 40%.
    """
    try:
        raw_body = await request.body()
        payload_dict = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # Xác định user_id (nếu không truyền qua query param, tìm user đầu tiên có cấu hình telegram)
    user_id = user_id_param
    if not user_id:
        setting = db.query(NotificationSetting).filter(
            NotificationSetting.telegram_enabled == True,
            NotificationSetting.telegram_bot_token.isnot(None),
        ).first()
        if setting:
            user_id = setting.user_id

    transfer_type = str(payload_dict.get("transferType", "out")).lower()
    amount = float(payload_dict.get("transferAmount", 0.0) or 0.0)
    content = str(payload_dict.get("content", ""))
    gateway = str(payload_dict.get("gateway", "sepay"))
    tx_id = str(payload_dict.get("id", payload_dict.get("referenceCode", "")))

    # Lưu log webhook vào database
    log_entry = BankWebhookLog(
        user_id=user_id,
        gateway=gateway,
        transaction_id=tx_id,
        amount=amount,
        transfer_type=transfer_type,
        content=content,
        raw_payload=raw_body.decode("utf-8") if raw_body else "",
        is_processed=True,
        telegram_message_sent=False,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    sent = False
    if amount > 0:
        if transfer_type == "out":
            # Tiêu tiền -> Hỏi Telegram lý do
            sent = notify_bank_expense_detected(db, user_id, amount, content)
        elif transfer_type == "in":
            # Nhận tiền -> Chúc mừng ca chạy & hỏi nạp hũ
            sent = notify_gig_income_detected(db, user_id, amount, content)

    if sent:
        log_entry.telegram_message_sent = True
        db.commit()

    return {
        "success": True,
        "message": "Webhook processed successfully",
        "transferType": transfer_type,
        "amount": amount,
        "telegram_sent": sent,
    }


@router.post("/test-trigger-bank-expense")
def test_trigger_bank_expense(
    amount: float = Query(50000.0, description="Số tiền giả lập chuyển khoản chi tiêu"),
    content: str = Query("Ăn trưa cơm sườn", description="Nội dung chuyển khoản"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Test giả lập một giao dịch chuyển tiền (tiêu tiền) để kiểm tra bot Telegram hỏi tương tác ngay lập tức.
    """
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    sent = notify_bank_expense_detected(db, user_id, amount, content)
    if not sent:
        return {
            "success": False,
            "message": "Không thể gửi tin nhắn Telegram. Vui lòng kiểm tra Bot Token và Chat ID trong Cài đặt thông báo!",
        }

    return {
        "success": True,
        "message": f"Đã giả lập giao dịch chi {amount:,.0f}đ thành công! Kiểm tra tin nhắn Telegram của bạn nhé.",
    }


@router.post("/test-trigger-bank-income")
def test_trigger_bank_income(
    amount: float = Query(260000.0, description="Số tiền giả lập nhận về từ ca chạy"),
    content: str = Query("Thu nhập ca chạy 10h-14h", description="Nội dung nhận tiền"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Test giả lập nhận tiền ca chạy 10h-14h để bot Telegram gửi tin chúc mừng và nút nạp vào Hũ Tết.
    """
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    sent = notify_gig_income_detected(db, user_id, amount, content)
    if not sent:
        return {
            "success": False,
            "message": "Không thể gửi tin nhắn Telegram. Vui lòng kiểm tra Bot Token và Chat ID trong Cài đặt thông báo!",
        }

    return {
        "success": True,
        "message": f"Đã giả lập giao dịch nhận {amount:,.0f}đ thành công! Kiểm tra tin nhắn Telegram của bạn nhé.",
    }
