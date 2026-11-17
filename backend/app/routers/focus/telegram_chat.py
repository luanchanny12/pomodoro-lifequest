import json
import re
import urllib.request
import urllib.error
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    NotificationSetting,
    FinancialJar,
    JarTransaction,
    TetEarningPlan,
    SchoolClassSchedule,
)
from app.models_auth import User
from app.routers.auth import get_current_user_optional
from app.routers.focus.common import _get_real_user, vn_today, vn_now

router = APIRouter()


def send_telegram_interactive_msg(
    token: str,
    chat_id: str,
    text: str,
    reply_markup: Optional[Dict[str, Any]] = None,
) -> dict:
    """Gửi tin nhắn Telegram kèm bàn phím inline hoặc markup tương tác."""
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    body: Dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        body["reply_markup"] = reply_markup

    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        return {"ok": False, "error": str(e)}


def answer_telegram_callback(token: str, callback_query_id: str, text: Optional[str] = None) -> dict:
    """Trả lời CallbackQuery khi người dùng bấm nút trên Telegram để tắt biểu tượng loading."""
    url = f"https://api.telegram.org/bot{token}/answerCallbackQuery"
    body: Dict[str, Any] = {"callback_query_id": callback_query_id}
    if text:
        body["text"] = text
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        return {"ok": False, "error": str(e)}


def edit_telegram_msg(
    token: str,
    chat_id: str,
    message_id: int,
    text: str,
    reply_markup: Optional[Dict[str, Any]] = None,
) -> dict:
    """Chỉnh sửa tin nhắn Telegram sau khi người dùng bấm chọn một nút."""
    url = f"https://api.telegram.org/bot{token}/editMessageText"
    body: Dict[str, Any] = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup is not None:
        body["reply_markup"] = reply_markup
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        return {"ok": False, "error": str(e)}


def notify_bank_expense_detected(
    db: Session,
    user_id: Optional[int],
    amount: float,
    content: Optional[str] = None,
) -> bool:
    """
    Kích hoạt khi phát hiện biến động tài khoản TRỪ TIỀN (chuyển khoản đi).
    Gửi tin nhắn qua Telegram hỏi người dùng tiêu tiền vì việc gì kèm nút bấm nhanh.
    """
    settings = db.query(NotificationSetting).filter(
        NotificationSetting.user_id == user_id if user_id else NotificationSetting.user_id.is_(None)
    ).first()

    if not settings or not settings.telegram_bot_token or not settings.telegram_chat_id:
        return False

    token = settings.telegram_bot_token.strip()
    chat_id = settings.telegram_chat_id.strip()

    amt_int = int(abs(amount))
    amt_formatted = f"{amt_int:,.0f}đ"
    note_content = f"\n<i>Nội dung CK: {content}</i>" if content else ""

    text = (
        f"💳 <b>Phát hiện giao dịch chuyển tiền:</b> <code>{amt_formatted}</code>{note_content}\n\n"
        f"👉 <b>Bạn vừa chi tiêu việc gì thế?</b>\n"
        f"Hãy chọn danh mục bên dưới để mình ghi vào sổ và trừ vào <b>Hũ Sinh Hoạt</b> nhé:"
    )

    reply_markup = {
        "inline_keyboard": [
            [
                {"text": "🍜 Ăn uống", "callback_data": f"cat_an_uong_{amt_int}"},
                {"text": "⛽ Đổ xăng", "callback_data": f"cat_xang_xe_{amt_int}"},
            ],
            [
                {"text": "🛒 Mua sắm", "callback_data": f"cat_mua_sam_{amt_int}"},
                {"text": "📚 Học tập", "callback_data": f"cat_hoc_tap_{amt_int}"},
            ],
            [
                {"text": "💡 Chi tiêu khác", "callback_data": f"cat_khac_{amt_int}"},
                {"text": "❌ Không ghi nhận", "callback_data": "cancel_tx"},
            ],
        ]
    }

    res = send_telegram_interactive_msg(token, chat_id, text, reply_markup)
    return res.get("ok", False)


def notify_gig_income_detected(
    db: Session,
    user_id: Optional[int],
    amount: float,
    content: Optional[str] = None,
) -> bool:
    """
    Kích hoạt khi phát hiện biến động tài khoản CỘNG TIỀN (thu nhập ca chạy 10h-14h).
    Gửi tin nhắn chúc mừng và hỏi phân bổ vào Hũ Tết (60%) & Hũ Sinh Hoạt (40%).
    """
    settings = db.query(NotificationSetting).filter(
        NotificationSetting.user_id == user_id if user_id else NotificationSetting.user_id.is_(None)
    ).first()

    if not settings or not settings.telegram_bot_token or not settings.telegram_chat_id:
        return False

    token = settings.telegram_bot_token.strip()
    chat_id = settings.telegram_chat_id.strip()

    amt_int = int(abs(amount))
    amt_formatted = f"{amt_int:,.0f}đ"
    tet_amt = int(round(amt_int * 0.6))
    living_amt = amt_int - tet_amt

    text = (
        f"🎉 <b>Phát hiện tiền về tài khoản:</b> <code>{amt_formatted}</code>!\n\n"
        f"🛵 Bạn vừa hoàn thành ca chạy kiếm tiền đúng không? Bạn có muốn phân bổ vào các Hũ để chuẩn bị đón Tết không?\n\n"
        f"• 🧧 <b>Hũ Tiêu Tết (60%):</b> +{tet_amt:,.0f}đ\n"
        f"• 🍲 <b>Hũ Sinh Hoạt (40%):</b> +{living_amt:,.0f}đ"
    )

    reply_markup = {
        "inline_keyboard": [
            [
                {"text": "✅ Phân bổ 60% Tết - 40% Sống", "callback_data": f"gig_split_{amt_int}"},
            ],
            [
                {"text": "🏺 Nạp 100% vào Hũ Tết", "callback_data": f"gig_tet100_{amt_int}"},
                {"text": "🍲 Nạp 100% vào Hũ Sinh Hoạt", "callback_data": f"gig_living100_{amt_int}"},
            ],
            [
                {"text": "❌ Bỏ qua", "callback_data": "cancel_tx"},
            ],
        ]
    }

    res = send_telegram_interactive_msg(token, chat_id, text, reply_markup)
    return res.get("ok", False)


@router.post("/telegram-webhook")
async def telegram_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Webhook tiếp nhận tin nhắn và tương tác nút bấm trực tiếp từ Telegram Bot.
    """
    try:
        body = await request.json()
    except Exception:
        return {"ok": False, "detail": "Invalid JSON"}

    # 1. XỬ LÝ KHI NGƯỜI DÙNG BẤM NÚT (CALLBACK QUERY)
    if "callback_query" in body:
        cq = body["callback_query"]
        cq_id = cq["id"]
        data = cq.get("data", "")
        msg = cq.get("message", {})
        chat_id = str(msg.get("chat", {}).get("id", ""))
        message_id = msg.get("message_id")

        # Tìm user tương ứng với chat_id
        setting = db.query(NotificationSetting).filter(
            NotificationSetting.telegram_chat_id == chat_id
        ).first()
        token = setting.telegram_bot_token if setting else None
        user_id = setting.user_id if setting else None

        if not token:
            return {"ok": True}

        # Nút Hủy
        if data == "cancel_tx":
            answer_telegram_callback(token, cq_id, "Đã hủy bỏ.")
            edit_telegram_msg(token, chat_id, message_id, "❌ Giao dịch này đã được bỏ qua và không ghi vào sổ.")
            return {"ok": True}

        # Xử lý chọn danh mục chi tiêu: cat_an_uong_50000
        cat_match = re.match(r"^cat_([a-z_]+)_(\d+)$", data)
        if cat_match:
            cat_code = cat_match.group(1)
            amt = float(cat_match.group(2))

            cat_labels = {
                "an_uong": "Ăn uống 🍜",
                "xang_xe": "Đổ xăng ⛽",
                "mua_sam": "Mua sắm 🛒",
                "hoc_tap": "Học tập 📚",
                "khac": "Chi tiêu khác 💡",
            }
            cat_label = cat_labels.get(cat_code, "Chi tiêu")

            # Lấy hũ Sinh Hoạt
            living_jar = db.query(FinancialJar).filter(
                FinancialJar.user_id == user_id if user_id else FinancialJar.user_id.is_(None),
                FinancialJar.jar_type == "LIVING",
            ).first()

            if not living_jar:
                living_jar = db.query(FinancialJar).filter(
                    FinancialJar.user_id == user_id if user_id else FinancialJar.user_id.is_(None),
                ).first()

            if living_jar:
                living_jar.current_balance = round(float(living_jar.current_balance or 0) - amt, 0)
                living_jar.updated_at = vn_now()
                tx = JarTransaction(
                    jar_id=living_jar.id,
                    user_id=user_id,
                    amount=-amt,
                    transaction_type="EXPENSE",
                    category=cat_code,
                    description=f"Chi {cat_label} (Telegram)",
                    transaction_time=vn_now(),
                )
                db.add(tx)
                db.commit()
                db.refresh(living_jar)

                rem_balance = f"{int(living_jar.current_balance):,.0f}đ"
                answer_telegram_callback(token, cq_id, f"Đã ghi nhận -{amt:,.0f}đ!")
                reply_text = (
                    f"✅ <b>Đã ghi nhận chi tiêu thành công!</b>\n\n"
                    f"• <b>Mục đích:</b> {cat_label}\n"
                    f"• <b>Số tiền:</b> -{amt:,.0f}đ\n"
                    f"• <b>Trừ từ:</b> {living_jar.name}\n"
                    f"• <b>Số dư hũ còn lại:</b> <code>{rem_balance}</code>\n\n"
                    f"💡 <i>Mẹo: Cân đối chi tiêu mỗi ngày để giữ trọn vẹn tiền tích lũy cho Hũ Tết nhé!</i>"
                )
                edit_telegram_msg(token, chat_id, message_id, reply_text)
            return {"ok": True}

        # Xử lý nạp tiền ca chạy: gig_split_260000, gig_tet100_260000, gig_living100_260000
        gig_match = re.match(r"^gig_(split|tet100|living100)_(\d+)$", data)
        if gig_match:
            action = gig_match.group(1)
            amt = float(gig_match.group(2))

            tet_jar = db.query(FinancialJar).filter(
                FinancialJar.user_id == user_id if user_id else FinancialJar.user_id.is_(None),
                FinancialJar.jar_type == "TET",
            ).first()
            living_jar = db.query(FinancialJar).filter(
                FinancialJar.user_id == user_id if user_id else FinancialJar.user_id.is_(None),
                FinancialJar.jar_type == "LIVING",
            ).first()

            now = vn_now()
            detail_lines = []

            if action == "split":
                tet_part = round(amt * 0.6)
                living_part = amt - tet_part
                if tet_jar:
                    tet_jar.current_balance = round(float(tet_jar.current_balance or 0) + tet_part, 0)
                    tet_jar.updated_at = now
                    db.add(JarTransaction(
                        jar_id=tet_jar.id, user_id=user_id, amount=tet_part,
                        transaction_type="INCOME_GIG", category="chay_xe_tet",
                        description="Nạp Hũ Tết 60% từ ca chạy", transaction_time=now,
                    ))
                    detail_lines.append(f"• 🧧 <b>Hũ Tiêu Tết:</b> +{tet_part:,.0f}đ (Số dư: {int(tet_jar.current_balance):,.0f}đ)")
                if living_jar:
                    living_jar.current_balance = round(float(living_jar.current_balance or 0) + living_part, 0)
                    living_jar.updated_at = now
                    db.add(JarTransaction(
                        jar_id=living_jar.id, user_id=user_id, amount=living_part,
                        transaction_type="INCOME_GIG", category="chay_xe_living",
                        description="Nạp Hũ Sinh Hoạt 40% từ ca chạy", transaction_time=now,
                    ))
                    detail_lines.append(f"• 🍲 <b>Hũ Sinh Hoạt:</b> +{living_part:,.0f}đ (Số dư: {int(living_jar.current_balance):,.0f}đ)")
            elif action == "tet100":
                if tet_jar:
                    tet_jar.current_balance = round(float(tet_jar.current_balance or 0) + amt, 0)
                    tet_jar.updated_at = now
                    db.add(JarTransaction(
                        jar_id=tet_jar.id, user_id=user_id, amount=amt,
                        transaction_type="INCOME_GIG", category="chay_xe_tet",
                        description="Nạp 100% vào Hũ Tết từ ca chạy", transaction_time=now,
                    ))
                    detail_lines.append(f"• 🧧 <b>Hũ Tiêu Tết:</b> +{amt:,.0f}đ (Số dư: {int(tet_jar.current_balance):,.0f}đ)")
            elif action == "living100":
                if living_jar:
                    living_jar.current_balance = round(float(living_jar.current_balance or 0) + amt, 0)
                    living_jar.updated_at = now
                    db.add(JarTransaction(
                        jar_id=living_jar.id, user_id=user_id, amount=amt,
                        transaction_type="INCOME_GIG", category="chay_xe_living",
                        description="Nạp 100% vào Hũ Sinh Hoạt từ ca chạy", transaction_time=now,
                    ))
                    detail_lines.append(f"• 🍲 <b>Hũ Sinh Hoạt:</b> +{amt:,.0f}đ (Số dư: {int(living_jar.current_balance):,.0f}đ)")

            db.commit()
            answer_telegram_callback(token, cq_id, "Nạp hũ thành công!")

            success_text = (
                f"🎉 <b>Đã nạp thành công {amt:,.0f}đ vào các Hũ!</b>\n\n"
                + "\n".join(detail_lines) +
                f"\n\n⏰ <b>Kỷ luật vàng:</b> Đúng 15h về đến nhà ăn trưa và nghỉ ngơi.\n"
                f"Buổi chiều & tối hãy dành trọn vẹn để học môn trường & phát triển kỹ năng Fullstack / Tiếng Anh nhé bạn!"
            )
            edit_telegram_msg(token, chat_id, message_id, success_text)
            return {"ok": True}

        return {"ok": True}

    # 2. XỬ LÝ KHI NGƯỜI DÙNG NHẮN TIN VĂN BẢN (TEXT COMMANDS)
    if "message" in body:
        msg = body["message"]
        chat_id = str(msg.get("chat", {}).get("id", ""))
        text = msg.get("text", "").strip()

        setting = db.query(NotificationSetting).filter(
            NotificationSetting.telegram_chat_id == chat_id
        ).first()
        token = setting.telegram_bot_token if setting else None
        user_id = setting.user_id if setting else None

        if not token or not text:
            return {"ok": True}

        text_lower = text.lower()

        # Lệnh /start hoặc /help
        if text_lower in ["/start", "/help", "tro giup", "menu"]:
            help_msg = (
                f"👋 <b>Chào bạn! Mình là Trợ Lý Quản Lý Thời Gian & Hũ Tài Chính.</b>\n\n"
                f"Các lệnh hỗ trợ:\n"
                f"• <code>/hu</code>: Xem số dư các hũ tài chính & mục tiêu Tết\n"
                f"• <code>/lich</code>: Xem thời khóa biểu trường & ca chạy hôm nay\n"
                f"• <code>/advice</code>: Nhận lời khuyên AI cân bằng học & kiếm tiền\n\n"
                f"💡 <b>Ghi chép nhanh:</b>\n"
                f"• Gõ <code>chi 50k an trua</code> hoặc <code>tieu 40k xang</code> để trừ hũ\n"
                f"• Gõ <code>chay duoc 250k</code> để nạp tiền ca chạy 10h-14h\n"
                f"• Hoặc chỉ cần chuyển khoản trên App ngân hàng, Bot sẽ tự động hỏi bạn ngay!"
            )
            send_telegram_interactive_msg(token, chat_id, help_msg)
            return {"ok": True}

        # Lệnh /hu
        if text_lower in ["/hu", "hũ", "hu", "so du", "sodu"]:
            jars = db.query(FinancialJar).filter(
                FinancialJar.user_id == user_id if user_id else FinancialJar.user_id.is_(None)
            ).order_by(FinancialJar.id.asc()).all()

            lines = ["🏺 <b>TÌNH HÌNH CÁC HŨ TÀI CHÍNH CỦA BẠN:</b>\n"]
            for j in jars:
                pct = min(100.0, round(j.current_balance / j.target_amount * 100, 1)) if j.target_amount > 0 else 0
                lines.append(f"{j.icon} <b>{j.name}</b>: <code>{int(j.current_balance):,.0f}đ</code> / {int(j.target_amount):,.0f}đ ({pct}%)")

            # Kế hoạch Tết
            plan = db.query(TetEarningPlan).filter(
                TetEarningPlan.user_id == user_id if user_id else TetEarningPlan.user_id.is_(None)
            ).first()
            if plan:
                today = vn_today()
                tet_date = plan.tet_date or datetime.date(2027, 2, 6)
                days_left = max(1, (tet_date - today).days)
                lines.append(f"\n🎯 <b>Còn {days_left} ngày đến Tết Nguyên Đán.</b>")
                lines.append(f"⏰ <b>Ca chạy cố định:</b> 10h - 14h (15h về nhà học tập)")

            send_telegram_interactive_msg(token, chat_id, "\n".join(lines))
            return {"ok": True}

        # Lệnh /lich
        if text_lower in ["/lich", "lich", "thoi khoa bieu", "tkb"]:
            today = vn_today()
            weekday_vn = today.weekday() + 2
            day_names = {2: "Thứ 2", 3: "Thứ 3", 4: "Thứ 4", 5: "Thứ 5", 6: "Thứ 6", 7: "Thứ 7", 8: "Chủ Nhật"}
            classes = db.query(SchoolClassSchedule).filter(
                SchoolClassSchedule.user_id == user_id if user_id else SchoolClassSchedule.user_id.is_(None),
                SchoolClassSchedule.day_of_week == weekday_vn,
                SchoolClassSchedule.is_active == True,
            ).order_by(SchoolClassSchedule.start_time.asc()).all()

            lines = [f"📅 <b>LỊCH TRÌNH HÔM NAY ({day_names.get(weekday_vn, '')} - {today.strftime('%d/%m')}):</b>\n"]
            if classes:
                lines.append("🎓 <b>Lịch trường Phenikaa:</b>")
                for c in classes:
                    lines.append(f"  • {c.start_time} - {c.end_time}: {c.course_name} (Phòng: {c.room or 'N/A'})")
            else:
                lines.append("🎓 Hôm nay không có lịch học trường Phenikaa.")

            lines.append("\n🛵 <b>10:00 - 14:00:</b> Ca chạy xe kiếm tiền Tết (Chỉ tiêu ~250k)")
            lines.append("🏠 <b>14:00 - 15:00:</b> Về nhà ăn trưa, tắm rửa & nghỉ ngơi")
            lines.append("💻 <b>15:00 - 18:00:</b> Học Fullstack & Tiếng Anh")
            lines.append("📚 <b>19:30 - 22:30:</b> Ôn tập kiến thức trường & làm Deadline")

            send_telegram_interactive_msg(token, chat_id, "\n".join(lines))
            return {"ok": True}

        # Nhắn tin nhanh chi tiêu: e.g. "chi 50k an trua", "tieu 40k xang"
        match_chi = re.search(r"(?:chi|tieu|mua|ck)\s+(\d+)(?:k|000)?(?:\s+(.*))?", text_lower)
        if match_chi:
            val_num = int(match_chi.group(1))
            amt = val_num * 1000 if ("k" in text_lower or val_num < 1000) else val_num
            desc = match_chi.group(2) or "Chi tiêu nhanh"

            living_jar = db.query(FinancialJar).filter(
                FinancialJar.user_id == user_id if user_id else FinancialJar.user_id.is_(None),
                FinancialJar.jar_type == "LIVING",
            ).first()

            if living_jar:
                living_jar.current_balance = round(float(living_jar.current_balance or 0) - amt, 0)
                living_jar.updated_at = vn_now()
                db.add(JarTransaction(
                    jar_id=living_jar.id, user_id=user_id, amount=-amt,
                    transaction_type="EXPENSE", category="khac",
                    description=desc.capitalize(), transaction_time=vn_now(),
                ))
                db.commit()
                send_telegram_interactive_msg(
                    token, chat_id,
                    f"✅ <b>Đã trừ {amt:,.0f}đ từ {living_jar.name}!</b>\n"
                    f"Nội dung: {desc.capitalize()}\n"
                    f"Số dư còn lại: <code>{int(living_jar.current_balance):,.0f}đ</code>."
                )
                return {"ok": True}

        # Nhắn tin nhanh nạp ca chạy: e.g. "chay duoc 260k", "kiem duoc 270k"
        match_chay = re.search(r"(?:chay|kiem|thu nhap|nhan)\s+(?:duoc\s+)?(\d+)(?:k|000)?", text_lower)
        if match_chay:
            val_num = int(match_chay.group(1))
            amt = val_num * 1000 if ("k" in text_lower or val_num < 1000) else val_num
            # Kích hoạt flow hỏi phân bổ
            notify_gig_income_detected(db, user_id, amt, "Tin nhắn báo từ người dùng")
            return {"ok": True}

        # Phản hồi mặc định
        send_telegram_interactive_msg(
            token, chat_id,
            "Mình đã nhận được tin nhắn! Bạn có thể gõ <code>/hu</code> để xem hũ, <code>/lich</code> để xem lịch hôm nay hoặc <code>chi 50k ăn trưa</code> để ghi nhanh nhé."
        )
        return {"ok": True}

    return {"ok": True}


@router.post("/telegram-setup-webhook")
def setup_telegram_webhook(
    public_url: str = Query(..., description="URL công khai của backend (e.g. https://your-domain.com)"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Cài đặt Webhook URL cho Telegram Bot để nhận tin nhắn 2 chiều và bấm nút inline."""
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    setting = db.query(NotificationSetting).filter(
        NotificationSetting.user_id == user_id if user_id else NotificationSetting.user_id.is_(None)
    ).first()

    if not setting or not setting.telegram_bot_token:
        raise HTTPException(status_code=400, detail="Chưa cấu hình Telegram Bot Token!")

    token = setting.telegram_bot_token.strip()
    webhook_url = f"{public_url.rstrip('/')}/api/notifications/telegram-webhook"
    api_url = f"https://api.telegram.org/bot{token}/setWebhook?url={webhook_url}"

    try:
        req = urllib.request.Request(api_url)
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return {
                "status": "success",
                "webhook_url": webhook_url,
                "telegram_response": res_data,
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi thiết lập Telegram Webhook: {str(e)}")
