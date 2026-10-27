from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models import Player, Level, Achievement, DailyLog, Task

DAILY_LOG_BONUS = 100
TASK_COMPLETE_BONUS = 20
STREAK_7_BONUS = 300
SPRINT_COMPLETE_BONUS = 1000


def get_player(db: Session) -> Player:
    player = db.query(Player).first()
    if not player:
        player = Player(level=1, exp=0, coins=0, streak=0)
        db.add(player)
        db.commit()
        db.refresh(player)
    return player


def add_exp(db: Session, player_id: int, amount: int) -> Player:
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise ValueError("Người chơi không tồn tại")
    player.exp += amount
    player.coins += amount // 2
    level_def = db.query(Level).filter(Level.level > player.level).order_by(Level.level).first()
    while level_def and player.exp >= level_def.exp_required:
        player.level = level_def.level
        level_def = db.query(Level).filter(Level.level > player.level).order_by(Level.level).first()
    db.commit()
    db.refresh(player)
    return player


def add_coins(db: Session, player_id: int, amount: int) -> Player:
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise ValueError("Người chơi không tồn tại")
    player.coins += amount
    db.commit()
    db.refresh(player)
    return player


def update_streak(db: Session, player_id: int) -> Player:
    return check_streak(db, player_id)


def check_streak(db: Session, player_id: int) -> Player:
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise ValueError("Người chơi không tồn tại")
    today = date.today()
    has_activity = db.query(DailyLog).filter(DailyLog.date == today).first()
    if not has_activity:
        task_done = db.query(Task).filter(Task.date == today, Task.status == "hoàn thành").first()
        if not task_done:
            return player
    if player.last_streak_date:
        if player.last_streak_date == today:
            return player
        if player.last_streak_date == today - timedelta(days=1):
            player.streak += 1
        else:
            player.streak = 1
    else:
        player.streak = 1
    player.last_streak_date = today
    if player.streak > 0 and player.streak % 7 == 0:
        player = add_exp(db, player_id, STREAK_7_BONUS)
        unlock_achievement(db, player_id, "STREAK_7")
    db.commit()
    db.refresh(player)
    return player


def unlock_achievement(db: Session, player_id: int, code: str) -> Achievement:
    existing = db.query(Achievement).filter(
        Achievement.player_id == player_id, Achievement.code == code
    ).first()
    if existing:
        return existing
    ach_def = {
        "FIRST_TASK": {"name": "Người Bắt Đầu", "description": "Hoàn thành nhiệm vụ đầu tiên", "icon": "🎯"},
        "STREAK_7": {"name": "Kiên Trì", "description": "Duy trì chuỗi 7 ngày", "icon": "🔥"},
        "LEVEL_5": {"name": "Học Viên", "description": "Đạt cấp độ 5", "icon": "⭐"},
        "LEVEL_10": {"name": "Cao Thủ", "description": "Đạt cấp độ 10", "icon": "👑"},
        "STUDY_50": {"name": "Miệt Mài", "description": "Học 50 giờ", "icon": "📚"},
        "SPRINT_MASTER": {"name": "Chạy Nước Rút", "description": "Hoàn thành 1 sprint", "icon": "💨"},
        "DAILY_30": {"name": "Kỷ Luật", "description": "Ghi nhật ký 30 ngày", "icon": "📅"},
    }
    info = ach_def.get(code)
    if not info:
        raise ValueError(f"Mã thành tựu '{code}' không hợp lệ")
    ach = Achievement(
        player_id=player_id, code=code, name=info["name"],
        description=info["description"], icon=info["icon"]
    )
    db.add(ach)
    db.commit()
    db.refresh(ach)
    return ach


def get_player_stats(db: Session, player_id: int) -> Player:
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise ValueError("Người chơi không tồn tại")
    return player
