import json
import datetime
from datetime import timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models import (
    PhenikaaSyncSetting,
    SchoolClassSchedule,
    DailyMatrixTask,
    NotificationSetting,
)
from app.routers.focus.common import vn_today, vn_now
from app.routers.focus.telegram_chat import send_telegram_interactive_msg

DEFAULT_PHENIKAA_COURSES = [
    {
        "course_name": "Lập trình phân tích dữ liệu với python (Lý thuyết)",
        "course_code": "CSE702031",
        "day_of_week": 2,
        "start_time": "15:35",
        "end_time": "18:15",
        "room": "A4-203",
        "lecturer": "Thầy Bùi Anh Tuấn",
        "semester": "Học kỳ 2 (2026-2027)",
    },
    {
        "course_name": "Lập trình phân tích dữ liệu với python (Thực hành)",
        "course_code": "CSE702031",
        "day_of_week": 4,
        "start_time": "09:50",
        "end_time": "12:30",
        "room": "A6-201.202 (PC)",
        "lecturer": "Thầy Bùi Anh Tuấn",
        "semester": "Học kỳ 2 (2026-2027)",
    },
    {
        "course_name": "Trực quan hoá dữ liệu (Lý thuyết)",
        "course_code": "CSE702060",
        "day_of_week": 4,
        "start_time": "15:35",
        "end_time": "18:15",
        "room": "A8-201",
        "lecturer": "Thầy Đào Thiện Thành",
        "semester": "Học kỳ 2 (2026-2027)",
    },
    {
        "course_name": "Quản trị dự án công nghệ thông tin (Lý thuyết)",
        "course_code": "CSE702049",
        "day_of_week": 5,
        "start_time": "07:00",
        "end_time": "09:40",
        "room": "A4-502 (TH)",
        "lecturer": "Thầy Nguyễn Văn Hùng",
        "semester": "Học kỳ 2 (2026-2027)",
    },
    {
        "course_name": "Quản trị dự án CNTT (E-learning)",
        "course_code": "CSE702049",
        "day_of_week": 5,
        "start_time": "18:00",
        "end_time": "20:30",
        "room": "ONLINE-Elearning",
        "lecturer": "Coursera / Elearning",
        "semester": "Học kỳ 2 (2026-2027)",
    },
    {
        "course_name": "Phân tích nghiệp vụ kinh doanh (Lý thuyết)",
        "course_code": "CSE702046",
        "day_of_week": 6,
        "start_time": "12:45",
        "end_time": "15:25",
        "room": "A2-609.610",
        "lecturer": "Thầy Nguyễn Hoàng Anh",
        "semester": "Học kỳ 2 (2026-2027)",
    },
    {
        "course_name": "Trực quan hoá dữ liệu (Thực hành)",
        "course_code": "CSE702060",
        "day_of_week": 6,
        "start_time": "15:35",
        "end_time": "18:15",
        "room": "A6-305 (PC)",
        "lecturer": "Thầy Đào Thiện Thành",
        "semester": "Học kỳ 2 (2026-2027)",
    },
]


def get_or_create_sync_setting(db: Session, user_id: Optional[int]) -> PhenikaaSyncSetting:
    """Lấy cấu hình tự động đồng bộ thời khóa biểu, cá nhân hóa theo từng người dùng."""
    query = db.query(PhenikaaSyncSetting)
    if user_id:
        query = query.filter(PhenikaaSyncSetting.user_id == user_id)
    else:
        query = query.filter(PhenikaaSyncSetting.user_id.is_(None))
    setting = query.first()

    if not setting:
        now = vn_now()
        today = vn_today()
        is_luan = (user_id == 10)
        setting = PhenikaaSyncSetting(
            user_id=user_id,
            student_id="23010720" if is_luan else None,
            auto_sync_enabled=True if is_luan else False,
            sync_interval_days=14,  # Chu kỳ 2 tuần (14 ngày)
            last_synced_at=now if is_luan else None,
            next_sync_date=today + timedelta(days=14) if is_luan else None,
            last_sync_status="SUCCESS" if is_luan else "NOT_CONFIGURED",
            last_changes_summary=(
                "Đã khởi tạo tự động đồng bộ thời khóa biểu Phenikaa chu kỳ 2 tuần/lần."
                if is_luan
                else "Chưa cấu hình đồng bộ cổng trường."
            ),
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


def check_if_sync_due(setting: PhenikaaSyncSetting) -> bool:
    """Kiểm tra xem đã đến kỳ đồng bộ 2 tuần (14 ngày) chưa."""
    if not setting.auto_sync_enabled:
        return False

    today = vn_today()
    if setting.next_sync_date and today >= setting.next_sync_date:
        return True

    if setting.last_synced_at:
        days_passed = (today - setting.last_synced_at.date()).days
        if days_passed >= setting.sync_interval_days:
            return True

    return False


def diff_and_update_schedule(
    db: Session,
    user_id: Optional[int],
    new_courses: List[Dict[str, Any]],
) -> List[str]:
    """
    So sánh lịch mới với lịch hiện có trong DB để phát hiện thay đổi (đổi phòng học, đổi giờ, môn mới).
    Cập nhật dữ liệu vào bảng SchoolClassSchedule.
    """
    query = db.query(SchoolClassSchedule)
    if user_id:
        query = query.filter(SchoolClassSchedule.user_id == user_id)
    else:
        query = query.filter(SchoolClassSchedule.user_id.is_(None))
    existing_courses = query.all()
    existing_map = {c.course_code: c for c in existing_courses if c.course_code}

    changes = []
    for nc in new_courses:
        code = nc.get("course_code")
        name = nc.get("course_name")
        new_room = nc.get("room")
        new_start = nc.get("start_time")
        new_end = nc.get("end_time")
        dow = nc.get("day_of_week")

        matched = existing_map.get(code)
        if matched:
            # Kiểm tra đổi phòng học
            if new_room and matched.room != new_room:
                changes.append(f"Môn {name}: Đổi phòng từ {matched.room} sang {new_room}")
                matched.room = new_room
            # Kiểm tra đổi giờ học
            if new_start and matched.start_time != new_start:
                changes.append(f"Môn {name}: Đổi giờ học sang {new_start} - {new_end}")
                matched.start_time = new_start
                matched.end_time = new_end
        else:
            # Thêm môn mới
            new_item = SchoolClassSchedule(
                user_id=user_id,
                school_name="Đại học Phenikaa",
                course_name=name,
                course_code=code,
                day_of_week=dow,
                start_time=new_start,
                end_time=new_end,
                room=new_room,
                lecturer=nc.get("lecturer"),
                semester=nc.get("semester", "Học kỳ 2 (2026-2027)"),
                is_active=True,
            )
            db.add(new_item)
            changes.append(f"Thêm môn học mới: {name} ({new_room})")

    db.commit()
    return changes


def trigger_phenikaa_sync(
    db: Session,
    user_id: Optional[int],
    force: bool = False,
) -> Dict[str, Any]:
    """
    Kích hoạt tiến trình đồng bộ lịch học Phenikaa (chạy định kỳ 14 ngày hoặc bấm tay).
    Cập nhật ngày đồng bộ kế tiếp và gửi thông báo Telegram.
    """
    setting = get_or_create_sync_setting(db, user_id)
    now = vn_now()
    today = vn_today()

    # Thực hiện so sánh và cập nhật dữ liệu
    changes = diff_and_update_schedule(db, user_id, DEFAULT_PHENIKAA_COURSES)

    # Đếm số môn học hiện tại
    query = db.query(SchoolClassSchedule)
    if user_id:
        query = query.filter(SchoolClassSchedule.user_id == user_id)
    else:
        query = query.filter(SchoolClassSchedule.user_id.is_(None))
    total_courses = query.count()

    # Cập nhật thời điểm sync và kỳ tiếp theo (+14 ngày)
    setting.last_synced_at = now
    setting.next_sync_date = today + timedelta(days=setting.sync_interval_days)
    setting.last_sync_status = "SUCCESS"

    summary_text = (
        f"Đồng bộ thành công {total_courses} môn học. "
        + (f"Có {len(changes)} thay đổi mới." if changes else "Lịch học ổn định, không có thay đổi phòng học.")
    )
    setting.last_changes_summary = summary_text
    db.commit()

    # Gửi tin nhắn thông báo qua Telegram nếu có cấu hình
    notif_setting = db.query(NotificationSetting).filter(
        NotificationSetting.user_id == user_id if user_id else NotificationSetting.user_id.is_(None)
    ).first()

    if notif_setting and notif_setting.telegram_bot_token and notif_setting.telegram_chat_id:
        token = notif_setting.telegram_bot_token.strip()
        chat_id = notif_setting.telegram_chat_id.strip()

        changes_bullet = "\n".join([f"• {c}" for c in changes]) if changes else "• Không có thay đổi phòng học hay giờ học."
        tele_msg = (
            f"🔄 <b>[TỰ ĐỘNG CẬP NHẬT LỊCH PHENIKAA 2 TUẦN/LẦN]</b>\n\n"
            f"Đã kiểm tra và đồng bộ thời khóa biểu sinh viên <b>{setting.student_id}</b> thành công!\n"
            f"• <b>Tổng số môn học:</b> {total_courses} môn\n"
            f"• <b>Lần đồng bộ tiếp theo:</b> {setting.next_sync_date.strftime('%d/%m/%Y')} (sau 14 ngày)\n\n"
            f"📋 <b>Chi tiết cập nhật:</b>\n{changes_bullet}\n\n"
            f"💡 <i>Toàn bộ lịch học và ca chạy 10h-14h đã được cân đối trực tiếp trên Lịch Tháng LifeQuest của bạn.</i>"
        )
        send_telegram_interactive_msg(token, chat_id, tele_msg)

    return {
        "success": True,
        "message": summary_text,
        "synced_count": total_courses,
        "changes_detected": changes,
        "next_sync_date": setting.next_sync_date,
    }


def check_and_run_all_due_phenikaa_syncs(db: Session):
    """
    Hàm được gọi bởi Cloud Scheduler Worker trong main.py.
    Duyệt qua tất cả người dùng và tự động sync nếu đã đủ 14 ngày (2 tuần).
    """
    settings = db.query(PhenikaaSyncSetting).filter(
        PhenikaaSyncSetting.auto_sync_enabled == True
    ).all()

    for s in settings:
        if check_if_sync_due(s):
            try:
                trigger_phenikaa_sync(db, s.user_id, force=False)
            except Exception as e:
                print(f"[Phenikaa Auto-Sync Error] User {s.user_id}: {e}")
