import datetime
from fastapi import APIRouter, Response
from app.database import get_db

router = APIRouter(prefix="/api/calendar", tags=["Calendar Sync (.ics)"])

@router.get("/pomodoro-reminders.ics")
def get_pomodoro_calendar_ics():
    """
    Generates a standard RFC 5545 iCalendar (.ics) file containing
    daily recurring smart study and planning reminders.
    Works natively on iPhone (Apple Calendar) & Android (Google/Samsung Calendar)
    even when the computer is turned off and without internet!
    """
    now = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    today = datetime.datetime.utcnow().strftime("%Y%m%d")

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pomodoro Goal Focus Hub//LifeQuest Calendar 3.0//VI
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Pomodoro Focus & Goal Reminders
X-WR-TIMEZONE:Asia/Ho_Chi_Minh
BEGIN:VEVENT
UID:pomodoro-morning-daily@{today}
DTSTAMP:{now}
DTSTART;TZID=Asia/Ho_Chi_Minh:{today}T080000
DTEND;TZID=Asia/Ho_Chi_Minh:{today}T081500
RRULE:FREQ=DAILY
SUMMARY:🌅 Pomodoro: Kiểm tra Ô 1 & Mục tiêu lớn Ô 2
DESCRIPTION:Chào buổi sáng! Hãy mở app để xem các việc quan trọng khẩn cấp và tiến độ mục tiêu dài hạn hôm nay!
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Nhắc nhở Pomodoro Buổi Sáng
TRIGGER:-PT0M
END:VALARM
END:VEVENT
BEGIN:VEVENT
UID:pomodoro-afternoon-daily@{today}
DTSTAMP:{now}
DTSTART;TZID=Asia/Ho_Chi_Minh:{today}T140000
DTEND;TZID=Asia/Ho_Chi_Minh:{today}T141500
RRULE:FREQ=DAILY
SUMMARY:⚡ Pomodoro: Khởi động 1 phiên tập trung chiều
DESCRIPTION:Bắt đầu buổi chiều đầy năng lượng! Tập trung 25 phút Pomodoro để tạo đà bứt phá.
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Nhắc nhở Pomodoro Chiều
TRIGGER:-PT0M
END:VALARM
END:VEVENT
BEGIN:VEVENT
UID:pomodoro-evening-daily@{today}
DTSTAMP:{now}
DTSTART;TZID=Asia/Ho_Chi_Minh:{today}T213000
DTEND;TZID=Asia/Ho_Chi_Minh:{today}T214500
RRULE:FREQ=DAILY
SUMMARY:🌙 Pomodoro: Lên sẵn Ma Trận 4 Ô cho ngày mai
DESCRIPTION:Chào buổi tối! Dành 5 phút tổng kết thành quả hôm nay và phân loại 4 ô công việc cho ngày mai để ngày mai thức dậy là chiến ngay!
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Nhắc nhở Pomodoro Buổi Tối
TRIGGER:-PT0M
END:VALARM
END:VEVENT
END:VCALENDAR"""

    return Response(
        content=ics_content,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="pomodoro-reminders.ics"'
        },
    )
