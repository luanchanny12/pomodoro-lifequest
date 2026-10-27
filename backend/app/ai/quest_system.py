from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
from app.models import Player, Task, StudyHour, DailyLog
from app.models_v2 import Quest, QuestProgress


DAILY_QUESTS = [
    {"title": "Người Học Chăm Chỉ", "desc": "Hoàn thành 3 nhiệm vụ trong ngày",
     "rtype": "tasks_completed", "rval": 3, "exp": 100, "coin": 10},
    {"title": "Chiến Binh Thời Gian", "desc": "Học 2 tiếng trong ngày",
     "rtype": "study_minutes", "rval": 120, "exp": 150, "coin": 15},
    {"title": "Người Giữ Lửa", "desc": "Ghi nhật ký cuối ngày",
     "rtype": "daily_log", "rval": 1, "exp": 80, "coin": 8},
]

WEEKLY_QUESTS = [
    {"title": "Đệ Tử Chân Truyền", "desc": "Học 5 ngày trong tuần",
     "rtype": "study_days", "rval": 5, "exp": 500, "coin": 50},
    {"title": "Bách Chiến Bách Thắng", "desc": "Hoàn thành 20 nhiệm vụ",
     "rtype": "tasks_weekly", "rval": 20, "exp": 800, "coin": 80},
    {"title": "Người Khổng Lồ", "desc": "Học 15 tiếng trong tuần",
     "rtype": "hours_weekly", "rval": 15, "exp": 1000, "coin": 100},
]

MONTHLY_QUESTS = [
    {"title": "Huyền Thoại", "desc": "Streak 30 ngày",
     "rtype": "streak_30", "rval": 30, "exp": 3000, "coin": 300},
    {"title": "Bậc Thầy", "desc": "Đạt Level 5",
     "rtype": "level_5", "rval": 5, "exp": 5000, "coin": 500},
]


def seed_quests(db: Session):
    if db.query(Quest).first():
        return
    for q in DAILY_QUESTS:
        db.add(Quest(title=q["title"], description=q["desc"], quest_type="daily",
                     requirement_type=q["rtype"], requirement_value=q["rval"],
                     exp_reward=q["exp"], coin_reward=q["coin"]))
    for q in WEEKLY_QUESTS:
        db.add(Quest(title=q["title"], description=q["desc"], quest_type="weekly",
                     requirement_type=q["rtype"], requirement_value=q["rval"],
                     exp_reward=q["exp"], coin_reward=q["coin"]))
    for q in MONTHLY_QUESTS:
        db.add(Quest(title=q["title"], description=q["desc"], quest_type="monthly",
                     requirement_type=q["rtype"], requirement_value=q["rval"],
                     exp_reward=q["exp"], coin_reward=q["coin"]))
    db.commit()


def check_quests(db: Session, player_id: int = 1) -> list:
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        return []

    quests = db.query(Quest).filter(Quest.is_active == True).all()
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    day_tasks = db.query(Task).filter(Task.date == today).count()
    day_done = db.query(Task).filter(Task.date == today, Task.status == "hoàn thành").count()
    day_minutes = sum((r.hours or 0) * 60 for r in
                      db.query(StudyHour).filter(StudyHour.date == today).all())
    has_log = db.query(DailyLog).filter(DailyLog.date == today).first() is not None

    week_study_days = db.query(StudyHour).filter(
        StudyHour.date >= week_start, StudyHour.date <= today
    ).distinct(StudyHour.date).count()
    week_tasks_done = db.query(Task).filter(
        Task.date >= week_start, Task.date <= today,
        Task.status == "hoàn thành"
    ).count()
    week_hours = sum(r.hours or 0 for r in db.query(StudyHour).filter(
        StudyHour.date >= week_start, StudyHour.date <= today
    ).all())

    results = []
    for quest in quests:
        progress = db.query(QuestProgress).filter(
            QuestProgress.quest_id == quest.id,
            QuestProgress.player_id == player_id
        ).first()
        if not progress:
            progress = QuestProgress(quest_id=quest.id, player_id=player_id,
                                     target=quest.requirement_value)
            db.add(progress)
            db.flush()

        if progress.is_completed:
            continue

        current = 0
        rt = quest.requirement_type
        if rt == "tasks_completed":
            current = day_done
        elif rt == "study_minutes":
            current = day_minutes
        elif rt == "daily_log":
            current = 1 if has_log else 0
        elif rt == "study_days":
            current = week_study_days
        elif rt == "tasks_weekly":
            current = week_tasks_done
        elif rt == "hours_weekly":
            current = int(week_hours)
        elif rt == "streak_30":
            current = player.streak
        elif rt == "level_5":
            current = player.level

        progress.progress = min(current, quest.requirement_value)
        if current >= quest.requirement_value and not progress.is_completed:
            progress.is_completed = True
            progress.completed_at = datetime.utcnow()
            player.exp += quest.exp_reward
            player.coins += quest.coin_reward
            results.append({
                "quest_id": quest.id,
                "title": quest.title,
                "exp_reward": quest.exp_reward,
                "coin_reward": quest.coin_reward
            })

        db.commit()

    return results


def get_active_quests(db: Session, player_id: int = 1, quest_type: str = None) -> list:
    query = db.query(Quest).filter(Quest.is_active == True)
    if quest_type:
        query = query.filter(Quest.quest_type == quest_type)

    results = []
    for quest in query.all():
        progress = db.query(QuestProgress).filter(
            QuestProgress.quest_id == quest.id,
            QuestProgress.player_id == player_id
        ).first()
        results.append({
            "id": quest.id,
            "title": quest.title,
            "description": quest.description,
            "quest_type": quest.quest_type,
            "requirement_type": quest.requirement_type,
            "requirement_value": quest.requirement_value,
            "exp_reward": quest.exp_reward,
            "coin_reward": quest.coin_reward,
            "progress": progress.progress if progress else 0,
            "target": quest.requirement_value,
            "is_completed": progress.is_completed if progress else False
        })
    return results
