import datetime
import json
import os
import hmac
import threading
from typing import Optional
import urllib.request
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import NotificationSetting, DailyMatrixTask, StudySessionLog
from app.models_auth import User
from app.routers.auth import get_current_user_optional, get_current_user
from app.schemas import (
    NotificationSettingsResponse,
    NotificationSettingsUpdate,
    TelegramTestRequest,
    TelegramSummaryTestRequest,
    WindowsToastRequest,
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


def _is_interval_due(now_vn: datetime.datetime, setting: NotificationSetting, uncompleted_count: int) -> bool:
    interval_hours = getattr(setting, "telegram_interval_hours", 0) or 0
    if interval_hours <= 0:
        return False
    # Chỉ nhắc nhở khi còn công việc chưa hoàn thành
    if uncompleted_count <= 0:
        return False
    # Giới hạn khung giờ hoạt động (08:00 đến 22:00) tránh làm phiền ban đêm
    if now_vn.hour < 8 or now_vn.hour >= 22:
        return False

    last_sent = getattr(setting, "last_interval_sent_at", None)
    if not last_sent:
        # Chưa từng gửi nhắc định kỳ: kiểm tra xem đã qua giờ sáng ít nhất interval_hours chưa
        morning_hour, morning_minute = _parse_hhmm(setting.morning_reminder_time, "08:00")
        morning_dt = now_vn.replace(hour=morning_hour, minute=morning_minute, second=0, microsecond=0)
        return now_vn >= morning_dt + datetime.timedelta(hours=interval_hours)

    if last_sent.tzinfo is None:
        last_sent_vn = last_sent.replace(tzinfo=datetime.timezone.utc).astimezone(
            datetime.timezone(datetime.timedelta(hours=7))
        )
    else:
        last_sent_vn = last_sent.astimezone(datetime.timezone(datetime.timedelta(hours=7)))

    delta_seconds = (now_vn - last_sent_vn).total_seconds()
    # Biên độ dung sai 60 giây
    return delta_seconds >= (interval_hours * 3600 - 60)


def format_telegram_task_message(
    display_name: str,
    app_url: str,
    tasks: list,
    today_hours: float,
    mode: str,
    date_str: str,
    include_task_details: bool = True,
) -> str:
    completed = [t for t in tasks if getattr(t, "is_completed", False)]
    uncompleted = [t for t in tasks if not getattr(t, "is_completed", False)]
    total_tasks = len(tasks)

    if mode == "morning":
        lines = [
            "🌅 <b>[Pomodoro LifeQuest] Khởi Động Ngày Mới!</b>",
            f"Xin chào <b>{display_name}</b>, chúc bạn một ngày mới tràn đầy năng lượng! ✨",
            "",
        ]
        if include_task_details and total_tasks > 0:
            lines.append(f"📋 <b>CÔNG VIỆC HÔM NAY ({date_str}):</b>")
            q1_tasks = [t for t in uncompleted if getattr(t, "quadrant", 2) == 1]
            q2_tasks = [t for t in uncompleted if getattr(t, "quadrant", 2) == 2]
            other_tasks = [t for t in uncompleted if getattr(t, "quadrant", 2) in (3, 4)]

            if q1_tasks:
                lines.append("🔥 <b>Ô 1 (Làm Ngay - Quan trọng & Khẩn):</b>")
                for t in q1_tasks[:5]:
                    lines.append(f"  ▫️ {t.title}")
            if q2_tasks:
                lines.append("⭐ <b>Ô 2 (Mục Tiêu Lớn - Dài hạn):</b>")
                for t in q2_tasks[:5]:
                    lines.append(f"  ▫️ {t.title}")
            if other_tasks:
                lines.append("⚡ <b>Ô 3 & 4 (Khác):</b>")
                for t in other_tasks[:3]:
                    lines.append(f"  ▫️ {t.title}")

            lines.append("")
            lines.append(f"💡 <i>Mục tiêu hôm nay: {total_tasks} việc. Hãy bắt đầu ngay với việc Ô 1 nhé!</i>")
        else:
            lines.append("✨ <b>Hôm nay bạn chưa lên lịch Ma Trận 4 Ô!</b>")
            lines.append("Hãy dành 3 phút mở app lên lịch để có ngày làm việc thật năng suất và rõ ràng nhé!")

        lines.append("")
        lines.append(f"👉 <a href='{app_url}'>Mở Focus Hub & Bắt đầu Pomodoro</a>")
        return "\n".join(lines)

    elif mode == "evening":
        percent = int((len(completed) / total_tasks * 100)) if total_tasks > 0 else 0
        lines = [
            f"🌙 <b>[Pomodoro LifeQuest] Tổng Kết Ngày ({date_str})</b>",
            f"Chào <b>{display_name}</b>, cùng nhìn lại thành quả hôm nay nhé:",
            "",
            f"📊 <b>Tiến độ: {len(completed)}/{total_tasks} việc ({percent}%)</b> | ⏱️ <b>{today_hours}h Focus</b>",
            "",
        ]

        if include_task_details:
            if completed:
                lines.append("✅ <b>CÔNG VIỆC ĐÃ HOÀN THÀNH:</b>")
                for t in completed[:6]:
                    lines.append(f"  ✔ {t.title}")
                lines.append("")

            if uncompleted:
                lines.append("⏳ <b>CÔNG VIỆC CHƯA HOÀN THÀNH:</b>")
                for t in uncompleted[:6]:
                    q_label = f" (Ô {t.quadrant})" if getattr(t, "quadrant", None) else ""
                    lines.append(f"  ▫️ {t.title}{q_label}")
                lines.append("")

        if total_tasks > 0 and len(uncompleted) == 0:
            lines.append("🎉 <i>Xuất sắc! Bạn đã hoàn thành trọn vẹn 100% mục tiêu hôm nay! Hãy nghỉ ngơi thật ngon nhé!</i>")
        elif total_tasks > 0:
            lines.append("💡 <i>Đừng lo nếu chưa xong hết! Hãy nghỉ ngơi và chuyển giao sang ngày mai để tiếp tục chinh phục nhé!</i>")
        else:
            lines.append("📝 <i>Hãy dành 3 phút lên trước Ma Trận 4 Ô cho ngày mai để sáng dậy có lộ trình rõ ràng nhé!</i>")

        lines.append("")
        lines.append(f"👉 <a href='{app_url}'>Mở ứng dụng tổng kết & lên lịch ngày mai</a>")
        return "\n".join(lines)

    elif mode == "interval":
        lines = [
            "⏰ <b>[Pomodoro LifeQuest] Nhắc Nhở Công Việc Đang Chờ!</b>",
            f"<b>{display_name}</b> ơi, bạn vẫn còn <b>{len(uncompleted)} công việc</b> chưa hoàn thành hôm nay:",
            "",
        ]
        q1_tasks = [t for t in uncompleted if getattr(t, "quadrant", 2) == 1]
        q2_tasks = [t for t in uncompleted if getattr(t, "quadrant", 2) == 2]

        if q1_tasks:
            lines.append("🔥 <b>Việc ưu tiên cần làm ngay:</b>")
            for t in q1_tasks[:3]:
                lines.append(f"  ▫️ {t.title}")
        if q2_tasks:
            lines.append("⭐ <b>Mục tiêu dài hạn:</b>")
            for t in q2_tasks[:3]:
                lines.append(f"  ▫️ {t.title}")
        if not q1_tasks and not q2_tasks:
            for t in uncompleted[:4]:
                lines.append(f"  ▫️ {t.title}")

        lines.append("")
        lines.append("⏱️ Hãy bật ngay 1 phiên Pomodoro 25 phút để dứt điểm việc này thôi nào! Cố lên nhé! 💪")
        lines.append("")
        lines.append(f"👉 <a href='{app_url}'>Bấm vào đây để vào phiên Focus ngay</a>")
        return "\n".join(lines)

    return ""


def check_and_send_scheduled_reminders(db: Session, force: bool = False) -> dict:
    with _send_lock:
        return _check_and_send_scheduled_reminders_locked(db, force)


def _check_and_send_scheduled_reminders_locked(db: Session, force: bool = False) -> dict:
    settings = db.query(NotificationSetting).filter(
        NotificationSetting.telegram_enabled == True,
        NotificationSetting.telegram_bot_token.isnot(None),
        NotificationSetting.telegram_chat_id.isnot(None),
    ).all()
    if not settings:
        return {"status": "skipped", "reason": "Không có tài khoản nào bật Telegram nhắc nhở"}

    tz_vn = datetime.timezone(datetime.timedelta(hours=7))
    now_vn = datetime.datetime.now(tz_vn)
    today_vn = now_vn.date()
    today_str = now_vn.strftime("%Y-%m-%d")
    date_display_str = now_vn.strftime("%d/%m/%Y")
    current_time_str = now_vn.strftime("%H:%M")

    sent_any = False
    details = []

    for setting in settings:
        bot_token = (setting.telegram_bot_token or "").strip()
        chat_id = (setting.telegram_chat_id or "").strip()
        if not bot_token or not chat_id:
            continue

        app_url = (setting.app_public_url or os.getenv("APP_PUBLIC_URL") or "https://pomodoro-lifequest.vercel.app").rstrip("/")
        morning_time = setting.morning_reminder_time or "08:00"
        evening_time = setting.evening_reminder_time or "21:30"
        include_details = getattr(setting, "telegram_task_reminder_enabled", True)
        if include_details is None:
            include_details = True

        # Lấy danh sách nhiệm vụ hôm nay và giờ học của user
        tasks = []
        today_hours = 0.0
        display_name = "Bạn"

        if setting.user_id:
            user_record = db.query(User).filter(User.id == setting.user_id).first()
            if user_record and user_record.display_name:
                display_name = user_record.display_name

            tasks = (
                db.query(DailyMatrixTask)
                .filter(DailyMatrixTask.user_id == setting.user_id, DailyMatrixTask.date == today_vn)
                .order_by(DailyMatrixTask.quadrant.asc(), DailyMatrixTask.order_index.asc())
                .all()
            )

            sessions = (
                db.query(StudySessionLog)
                .filter(StudySessionLog.user_id == setting.user_id, StudySessionLog.session_date == today_vn)
                .all()
            )
            today_hours = round(sum(s.duration_hours for s in sessions), 1)

        uncompleted_count = len([t for t in tasks if not getattr(t, "is_completed", False)])

        # 1. Check Morning
        morning_due = _is_due(now_vn, morning_time, setting.last_morning_sent_date, today_str)
        if force or morning_due:
            msg = format_telegram_task_message(
                display_name=display_name,
                app_url=app_url,
                tasks=tasks,
                today_hours=today_hours,
                mode="morning",
                date_str=date_display_str,
                include_task_details=include_details,
            )
            try:
                send_telegram_msg(bot_token, chat_id, msg)
                if morning_due:
                    setting.last_morning_sent_date = today_str
                    db.commit()
                sent_any = True
                details.append(f"Đã gửi thông báo sáng tới Chat ID {chat_id[:4]}***")
            except Exception as e:
                db.rollback()
                details.append(f"Lỗi gửi sáng (Chat ID {chat_id[:4]}***): {str(e)}")

        # 2. Check Evening
        evening_due = _is_due(now_vn, evening_time, setting.last_evening_sent_date, today_str)
        if force or evening_due:
            msg = format_telegram_task_message(
                display_name=display_name,
                app_url=app_url,
                tasks=tasks,
                today_hours=today_hours,
                mode="evening",
                date_str=date_display_str,
                include_task_details=include_details,
            )
            try:
                send_telegram_msg(bot_token, chat_id, msg)
                if evening_due:
                    setting.last_evening_sent_date = today_str
                    db.commit()
                sent_any = True
                details.append(f"Đã gửi thông báo tối tới Chat ID {chat_id[:4]}***")
            except Exception as e:
                db.rollback()
                details.append(f"Lỗi gửi tối (Chat ID {chat_id[:4]}***): {str(e)}")

        # 3. Check In-Day Periodic Interval Reminder (nhắc nhở việc chưa xong sau mỗi N giờ)
        interval_due = _is_interval_due(now_vn, setting, uncompleted_count)
        if interval_due and not morning_due and not evening_due:
            msg = format_telegram_task_message(
                display_name=display_name,
                app_url=app_url,
                tasks=tasks,
                today_hours=today_hours,
                mode="interval",
                date_str=date_display_str,
                include_task_details=include_details,
            )
            try:
                send_telegram_msg(bot_token, chat_id, msg)
                setting.last_interval_sent_at = datetime.datetime.utcnow()
                db.commit()
                sent_any = True
                details.append(f"Đã gửi nhắc nhở việc chưa xong (định kỳ) tới Chat ID {chat_id[:4]}***")
            except Exception as e:
                db.rollback()
                details.append(f"Lỗi gửi nhắc định kỳ (Chat ID {chat_id[:4]}***): {str(e)}")

    return {
        "status": "success",
        "current_time_vn": current_time_str,
        "sent_any": sent_any,
        "details": details,
    }


def _get_or_create_settings(db: Session, user_id: Optional[int] = None) -> NotificationSetting:
    if user_id:
        setting = db.query(NotificationSetting).filter(NotificationSetting.user_id == user_id).first()
        if not setting:
            setting = NotificationSetting(
                user_id=user_id,
                web_notifications_enabled=True,
                pomodoro_end_enabled=True,
                break_end_enabled=True,
                inactivity_reminder_minutes=60,
                morning_reminder_time="08:00",
                evening_reminder_time="21:30",
                telegram_enabled=False,
                telegram_interval_hours=0,
                telegram_task_reminder_enabled=True,
                updated_at=datetime.datetime.utcnow(),
            )
            db.add(setting)
            db.commit()
            db.refresh(setting)
        return setting

    # Khách vãng lai: Trả về cài đặt mặc định hoàn toàn an toàn, tuyệt đối không truy cập/tiết lộ bot token của ai
    return NotificationSetting(
        id=0,
        user_id=None,
        web_notifications_enabled=True,
        pomodoro_end_enabled=True,
        break_end_enabled=True,
        inactivity_reminder_minutes=60,
        morning_reminder_time="08:00",
        evening_reminder_time="21:30",
        telegram_enabled=False,
        telegram_bot_token=None,
        telegram_chat_id=None,
        telegram_interval_hours=0,
        telegram_task_reminder_enabled=True,
        updated_at=datetime.datetime.utcnow(),
    )


@router.get("/settings", response_model=NotificationSettingsResponse)
def get_notification_settings(
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    return _get_or_create_settings(db, user_id=user.id if user else None)


@router.put("/settings", response_model=NotificationSettingsResponse)
def update_notification_settings(
    data: NotificationSettingsUpdate,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    # Khách vãng lai muốn cấu hình Telegram bắt buộc phải đăng nhập
    if (data.telegram_enabled or data.telegram_bot_token or data.telegram_chat_id) and not user:
        raise HTTPException(
            status_code=401,
            detail="Vui lòng đăng nhập tài khoản để liên kết Bot Telegram cá nhân an toàn!"
        )

    user_id = user.id if user else None

    # Khách vãng lai: trả về cài đặt client-side
    if not user_id:
        dummy = _get_or_create_settings(db, None)
        for field, val in data.model_dump(exclude_unset=True).items():
            if hasattr(dummy, field):
                setattr(dummy, field, val)
        return dummy

    # Ràng buộc độc quyền: 1 Telegram Chat ID chỉ thuộc 1 tài khoản
    if data.telegram_chat_id and data.telegram_chat_id.strip():
        clean_chat_id = data.telegram_chat_id.strip()
        existing = db.query(NotificationSetting).filter(
            NotificationSetting.telegram_chat_id == clean_chat_id,
            NotificationSetting.user_id != user_id
        ).first()
        if existing and existing.user_id is not None and user_id is not None:
            raise HTTPException(
                status_code=400,
                detail="Mã Telegram Chat ID này đã được liên kết với một tài khoản khác! Mỗi tài khoản chỉ được dùng 1 Telegram duy nhất."
            )

    setting = _get_or_create_settings(db, user_id=user_id)
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(setting, field, val)
    if user_id and not setting.user_id:
        setting.user_id = user_id
    setting.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(setting)
    return setting


@router.post("/test-windows")
def test_windows_notification(user: User = Depends(get_current_user)):
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


@router.post("/send-windows")
def send_windows_notification(
    data: WindowsToastRequest,
    user: User = Depends(get_current_user)
):
    """
    Triggers a native Windows Toast notification directly on the host machine for real app events
    (Pomodoro finished, break ended, study reminders).
    Yêu cầu xác thực danh tính để chống RCE / Command Injection.
    """
    import sys
    if sys.platform != "win32":
        return {"success": False, "message": "Chỉ khả dụng trên Windows."}
    from windows_notifier import send_windows_toast
    success = send_windows_toast(data.title, data.message)
    return {"success": success, "message": "Notification dispatched."}


@router.api_route("/telegram-trigger-check", methods=["GET", "POST"])
def trigger_telegram_check(
    force: bool = False,
    x_pinger_token: Optional[str] = Header(None, alias="X-Pinger-Token"),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Called periodically by background scheduler or external pingers (Cron-job.org / UptimeRobot)
    to check scheduled notifications and keep cloud backend awake 24/7.
    Chống lạm dụng bot: Chỉ chấp nhận force=True khi có token pinger bí mật hoặc quyền Admin.
    """
    expected_token = os.getenv("PINGER_SECRET_TOKEN")
    provided_token = x_pinger_token or token
    is_authorized_pinger = bool(
        expected_token and provided_token and hmac.compare_digest(provided_token.strip(), expected_token.strip())
    )
    is_admin = bool(user and getattr(user, "is_admin", False))

    if force and not (is_authorized_pinger or is_admin):
        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền cưỡng ép (force=true) gửi thông báo Telegram toàn hệ thống!"
        )

    return check_and_send_scheduled_reminders(db, force=bool(force and (is_authorized_pinger or is_admin)))


@router.post("/test-telegram")
def test_telegram_notification(
    data: TelegramTestRequest,
    user: User = Depends(get_current_user)
):
    """
    Sends a test message to the user's Telegram via Telegram Bot API.
    Bắt buộc đăng nhập để chống kẻ xấu biến server thành proxy spam tin nhắn ẩn danh.
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
        err_raw = e.read().decode("utf-8", errors="ignore")
        if "chat not found" in err_raw.lower():
            bot_username = "bot của bạn"
            try:
                me_req = urllib.request.Request(f"https://api.telegram.org/bot{token}/getMe")
                with urllib.request.urlopen(me_req, timeout=5) as me_res:
                    me_data = json.loads(me_res.read().decode("utf-8"))
                    if me_data.get("ok"):
                        b_user = me_data.get("result", {}).get("username")
                        if b_user:
                            bot_username = f"@{b_user} (https://t.me/{b_user})"
            except Exception:
                pass
            raise HTTPException(
                status_code=400,
                detail=(
                    f"⚠️ Bot chưa thể gửi tin vì bạn chưa bấm START trong Telegram! "
                    f"Theo bảo mật của Telegram: Người dùng phải là người bắt đầu trò chuyện trước. "
                    f"👉 Hãy mở bot {bot_username}, bấm nút 'START' (Bắt đầu) hoặc gửi '/start'. "
                    f"Sau đó quay lại đây bấm 'Bắn Thử Tin Nhắn' là nhận được ngay!"
                ),
            )
        elif "unauthorized" in err_raw.lower():
            raise HTTPException(
                status_code=400,
                detail="⚠️ Bot Token không hợp lệ. Vui lòng kiểm tra lại mã Token được cấp bởi @BotFather.",
            )
        else:
            raise HTTPException(status_code=400, detail=f"Telegram API Error ({e.code}): {err_raw}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể kết nối Telegram: {str(e)}")


@router.post("/test-telegram-summary")
def test_telegram_summary_notification(
    data: TelegramSummaryTestRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sends a test summary message (morning, evening, or interval) to user's Telegram
    using their actual daily tasks and study time today.
    """
    setting = db.query(NotificationSetting).filter(NotificationSetting.user_id == user.id).first()
    if not setting or not setting.telegram_bot_token or not setting.telegram_chat_id:
        raise HTTPException(
            status_code=400,
            detail="Bạn chưa lưu cấu hình Telegram Bot Token hoặc Chat ID. Vui lòng điền và bấm 'Lưu Cài Đặt' trước khi thử!",
        )

    bot_token = setting.telegram_bot_token.strip()
    chat_id = setting.telegram_chat_id.strip()

    # Giờ VN hôm nay
    vn_tz = datetime.timezone(datetime.timedelta(hours=7))
    now_vn = datetime.datetime.now(vn_tz)
    today_vn = now_vn.date()
    date_display_str = today_vn.strftime("%d/%m/%Y")

    display_name = user.display_name or "Bạn"
    app_url = setting.app_public_url or "https://pomodoro-lifequest.vercel.app"
    include_details = getattr(setting, "telegram_task_reminder_enabled", True)
    if include_details is None:
        include_details = True

    # Lấy danh sách nhiệm vụ hôm nay và giờ học
    tasks = (
        db.query(DailyMatrixTask)
        .filter(DailyMatrixTask.user_id == user.id, DailyMatrixTask.date == today_vn)
        .order_by(DailyMatrixTask.quadrant.asc(), DailyMatrixTask.order_index.asc())
        .all()
    )

    sessions = (
        db.query(StudySessionLog)
        .filter(StudySessionLog.user_id == user.id, StudySessionLog.session_date == today_vn)
        .all()
    )
    today_hours = round(sum(s.duration_hours for s in sessions), 1)

    msg = format_telegram_task_message(
        display_name=display_name,
        app_url=app_url,
        tasks=tasks,
        today_hours=today_hours,
        mode=data.mode,
        date_str=date_display_str,
        include_task_details=include_details,
    )

    try:
        res = send_telegram_msg(bot_token, chat_id, msg)
        if not res.get("ok"):
            raise HTTPException(status_code=400, detail="Lỗi Telegram: " + str(res))
        return {
            "message": f"Đã bắn thử tin nhắn tổng kết ({data.mode}) thành công đến Telegram!",
            "ok": True,
            "preview": msg[:150] + "...",
        }
    except urllib.error.HTTPError as e:
        err_raw = e.read().decode("utf-8", errors="ignore")
        if "chat not found" in err_raw.lower():
            raise HTTPException(
                status_code=400,
                detail="⚠️ Bot chưa gửi được tin nhắn vì bạn chưa bấm START trong Telegram! Hãy mở bot, gõ /start và thử lại.",
            )
        elif "unauthorized" in err_raw.lower():
            raise HTTPException(
                status_code=400,
                detail="⚠️ Bot Token không hợp lệ. Vui lòng kiểm tra lại token được cấp bởi @BotFather.",
            )
        else:
            raise HTTPException(status_code=400, detail=f"Telegram API Error ({e.code}): {err_raw}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể gửi tin Telegram: {str(e)}")
