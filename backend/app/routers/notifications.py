import datetime
import json
import os
import threading
import urllib.request
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import NotificationSetting
from app.schemas import (
    NotificationSettingsResponse,
    NotificationSettingsUpdate,
    TelegramTestRequest,
)

router = APIRouter(prefix="/api/notifications", tags=["Notification Engine & Telegram"])


# Tránh 2 luồng (scheduler nền + API ping) gửi trùng cùng lúc
_send_lock = threading.Lock()

# Nếu server ngủ/restart đúng phút hẹn, vẫn gửi bù trong vòng 90 phút.
REMINDER_WINDOW_MINUTES = 90


def send_telegram_msg(token: str, chat_id: str, message: str) -> dict:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({"chat_id": chat_id, "text": message, "parse_mode": "HTML"}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        res_body = response.read().decode("utf-8")
        return json.loads(res_body)


def _parse_hhmm(value, fallback: str):
    for raw in (value, fallback):
        try:
            hour, minute = str(raw).strip().split(":")[:2]
            hour, minute = int(hour), int(minute)
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return hour, minute
        except (TypeError, ValueError):
            continue
    return 8, 0


def _is_due(now_vn: datetime.datetime, target_hhmm: str, last_sent_date, today_str: str) -> bool:
    if last_sent_date == today_str:
        return False
    hour, minute = _parse_hhmm(target_hhmm, "00:00")
    scheduled = now_vn.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return scheduled <= now_vn < scheduled + datetime.timedelta(minutes=REMINDER_WINDOW_MINUTES)


def check_and_send_scheduled_reminders(db: Session, force: bool = False) -> dict:
    with _send_lock:
        return _check_and_send_scheduled_reminders_locked(db, force)


def _check_and_send_scheduled_reminders_locked(db: Session, force: bool = False) -> dict:
    setting = db.query(NotificationSetting).first()
    if not setting or not setting.telegram_enabled or not setting.telegram_bot_token or not setting.telegram_chat_id:
        return {"status": "skipped", "reason": "Telegram disabled or credentials missing"}

    tz_vn = datetime.timezone(datetime.timedelta(hours=7))
    now_vn = datetime.datetime.now(tz_vn)
    today_str = now_vn.strftime("%Y-%m-%d")
    current_time_str = now_vn.strftime("%H:%M")
    app_url = (setting.app_public_url or os.getenv("APP_PUBLIC_URL") or "https://pomodoro-lifequest.vercel.app").rstrip("/")

    morning_time = setting.morning_reminder_time or "08:00"
    evening_time = setting.evening_reminder_time or "21:30"

    sent_any = False
    details = []

    # Check Morning
    if force or _is_due(now_vn, morning_time, setting.last_morning_sent_date, today_str):
        msg = (
            "🌅 <b>[Pomodoro Goal Focus] Chào Buổi Sáng!</b>\n\n"
            "✨ Ngày mới đã bắt đầu! Đã đến lúc xem lại:\n"
            "🔥 <b>Ô 1:</b> Các việc quan trọng & khẩn cấp cần giải quyết ngay.\n"
            "⭐ <b>Ô 2:</b> Mục tiêu lớn dài hạn hôm nay.\n\n"
            f"👉 <a href='{app_url}'>Bấm vào đây để mở ứng dụng</a>"
        )
        try:
            send_telegram_msg(setting.telegram_bot_token.strip(), setting.telegram_chat_id.strip(), msg)
            setting.last_morning_sent_date = today_str
            db.commit()
            sent_any = True
            details.append("Đã gửi thông báo buổi sáng")
        except Exception as e:
            db.rollback()
            details.append(f"Lỗi gửi sáng: {str(e)}")

    # Check Evening
    if force or _is_due(now_vn, evening_time, setting.last_evening_sent_date, today_str):
        msg = (
            "🌙 <b>[Pomodoro Goal Focus] Chào Buổi Tối!</b>\n\n"
            "🎯 Bạn đã hoàn thành các mục tiêu hôm nay chưa?\n"
            "📋 Hãy dành 5 phút tổng kết thành quả và lên sẵn <b>Ma Trận 4 Ô</b> cho ngày mai nhé!\n\n"
            f"👉 <a href='{app_url}'>Bấm vào đây để mở ứng dụng</a>"
        )
        try:
            send_telegram_msg(setting.telegram_bot_token.strip(), setting.telegram_chat_id.strip(), msg)
            setting.last_evening_sent_date = today_str
            db.commit()
            sent_any = True
            details.append("Đã gửi thông báo buổi tối")
        except Exception as e:
            db.rollback()
            details.append(f"Lỗi gửi tối: {str(e)}")

    return {
        "status": "success",
        "current_time_vn": current_time_str,
        "sent_any": sent_any,
        "details": details,
    }


def _get_or_create_settings(db: Session) -> NotificationSetting:
    setting = db.query(NotificationSetting).first()
    if not setting:
        setting = NotificationSetting(
            web_notifications_enabled=True,
            pomodoro_end_enabled=True,
            break_end_enabled=True,
            inactivity_reminder_minutes=60,
            morning_reminder_time="08:00",
            evening_reminder_time="21:30",
            telegram_enabled=False,
            updated_at=datetime.datetime.utcnow(),
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.get("/settings", response_model=NotificationSettingsResponse)
def get_notification_settings(db: Session = Depends(get_db)):
    return _get_or_create_settings(db)


@router.put("/settings", response_model=NotificationSettingsResponse)
def update_notification_settings(
    data: NotificationSettingsUpdate, db: Session = Depends(get_db)
):
    setting = _get_or_create_settings(db)
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(setting, field, val)
    setting.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(setting)
    return setting


@router.post("/test-windows")
def test_windows_notification():
    """
    Triggers a native Windows Toast notification directly on the host machine.
    """
    import sys
    if sys.platform != "win32":
        return {
            "message": "Hệ thống đang chạy trên Linux Cloud (Render). Thông báo Windows Native chỉ hoạt động trên máy tính cá nhân Windows.",
            "success": False,
        }
    from windows_notifier import send_windows_toast

    success = send_windows_toast(
        "🔔 Pomodoro Focus Hub: Thông Báo Windows",
        "Thử nghiệm thông báo Windows Native gốc thành công! Dù bạn tắt trình duyệt vẫn nhận được nhé!",
    )
    if not success:
        raise HTTPException(
            status_code=500, detail="Không thể gửi thông báo Windows Toast"
        )
    return {"message": "Đã gửi thông báo Windows Toast thành công!", "success": True}


@router.api_route("/telegram-trigger-check", methods=["GET", "POST"])
def trigger_telegram_check(force: bool = False, db: Session = Depends(get_db)):
    """
    Called periodically by background scheduler or external pingers (Cron-job.org / UptimeRobot)
    to check scheduled notifications and keep cloud backend awake 24/7.
    Hỗ trợ cả GET và POST để dùng được với mọi dịch vụ uptime monitor.
    """
    return check_and_send_scheduled_reminders(db, force=force)


@router.post("/test-telegram")
def test_telegram_notification(data: TelegramTestRequest):
    """
    Sends a test message to the user's Telegram via Telegram Bot API.
    """
    token = data.bot_token.strip()
    chat_id = data.chat_id.strip()
    if not token or not chat_id:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp Bot Token và Chat ID")

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    text = (
        data.message
        or "🔔 Pomodoro Focus Hub: Kết nối Telegram thành công! Từ bây giờ, bạn sẽ nhận được thông báo nhắc nhở học tập ngay trên điện thoại di động!"
    )

    payload = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "HTML"}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            res_data = json.loads(res_body)
            if not res_data.get("ok"):
                raise HTTPException(status_code=400, detail="Lỗi phản hồi từ Telegram: " + str(res_data))
            return {"message": "Đã gửi tin nhắn đến Telegram thành công!", "ok": True}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        raise HTTPException(status_code=400, detail=f"Telegram API Error ({e.code}): {err_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể kết nối Telegram: {str(e)}")
