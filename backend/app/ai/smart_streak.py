from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models import DailyLog, Player


SMART_STREAK_LIMIT = 3


def check_recovery_day(db: Session, query_date: date = None) -> dict:
    if query_date is None:
        query_date = date.today()

    player = db.query(Player).first()
    if not player:
        return {"is_recovery_day": False, "message": ""}

    recovery_days_used = getattr(player, 'recovery_days_used', 0)
    if not hasattr(player, 'recovery_days_used'):
        player.recovery_days_used = 0

    daily_log = db.query(DailyLog).filter(DailyLog.date == query_date).first()
    if not daily_log:
        return {"is_recovery_day": False, "message": ""}

    mood_low = daily_log.mood_level and daily_log.mood_level <= 3
    energy_low = daily_log.energy_level and daily_log.energy_level <= 3
    sick = daily_log.note and any(w in daily_log.note.lower() for w in ["ốm", "sick", "bệnh", "đau", "mệt"])

    needs_recovery = mood_low or energy_low or sick

    if needs_recovery and recovery_days_used < SMART_STREAK_LIMIT:
        player.recovery_days_used = recovery_days_used + 1
        db.commit()
        return {
            "is_recovery_day": True,
            "recovery_days_used": player.recovery_days_used,
            "message": "Hôm nay là Recovery Day - không mất streak. Nghỉ ngơi nhé!"
        }

    return {
        "is_recovery_day": False,
        "recovery_days_used": recovery_days_used,
        "message": ""
    }


def get_streak_info(db: Session) -> dict:
    player = db.query(Player).first()
    if not player:
        return {"current_streak": 0, "max_streak": 0, "recovery_days_used": 0}

    recovery_used = getattr(player, 'recovery_days_used', 0)
    max_streak = getattr(player, 'max_streak', 0) if hasattr(player, 'max_streak') else player.streak

    return {
        "current_streak": player.streak,
        "max_streak": max(player.streak, max_streak),
        "recovery_days_used": recovery_used,
        "recovery_days_left": max(0, SMART_STREAK_LIMIT - recovery_used)
    }
