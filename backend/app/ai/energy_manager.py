"""
Energy Manager - Quản lý năng lượng và độ khó
"""
from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
from app.models import DailyLog, Task, RoadmapLesson, StudyHour

ENERGY_COST = {
    "ipa": 10,
    "vocabulary": 15,
    "listening": 30,
    "reading": 60,
    "writing": 70,
    "linux": 40,
    "docker": 60,
    "aws": 90,
    "kubernetes": 120,
    "english": 25,
    "math": 50,
    "gpa": 50,
    "ielts": 30,
    "devops": 60,
}

DIFFICULTY_MAP = {
    1: {"label": "Rất dễ", "color": "green", "exp_multiplier": 1.0},
    2: {"label": "Dễ", "color": "blue", "exp_multiplier": 1.5},
    3: {"label": "Trung bình", "color": "yellow", "exp_multiplier": 2.0},
    4: {"label": "Khó", "color": "orange", "exp_multiplier": 3.0},
    5: {"label": "Rất khó", "color": "red", "exp_multiplier": 5.0},
}


def get_energy_for_task(task_type: str) -> int:
    """Lấy năng lượng tiêu hao cho một loại nhiệm vụ"""
    task_type_lower = task_type.lower()
    if task_type_lower in ENERGY_COST:
        return ENERGY_COST[task_type_lower]

    for key, cost in ENERGY_COST.items():
        if key in task_type_lower or task_type_lower in key:
            return cost

    return 30


def get_max_energy(sleep_hours: float) -> int:
    """Tính năng lượng tối đa dựa trên giờ ngủ"""
    if sleep_hours <= 0:
        return 50
    if sleep_hours < 4:
        return int(50 * (sleep_hours / 8))
    if sleep_hours < 6:
        return int(70 * (sleep_hours / 8))
    if sleep_hours < 8:
        return int(90 * (sleep_hours / 8))
    return 100


def get_remaining_energy(db: Session, query_date: date = None) -> int:
    """Tính năng lượng còn lại trong ngày"""
    if query_date is None:
        query_date = date.today()

    # Get sleep from daily log
    daily_log = db.query(DailyLog).filter(DailyLog.date == query_date).first()
    sleep_hours = daily_log.sleep_hours if daily_log and daily_log.sleep_hours else 7
    max_energy = get_max_energy(sleep_hours)

    # Subtract energy used by completed tasks
    tasks_done = db.query(Task).filter(
        Task.date == query_date,
        Task.status == "hoàn thành"
    ).all()

    used = 0
    for t in tasks_done:
        if t.goal_type:
            used += get_energy_for_task(t.goal_type)
        else:
            used += get_energy_for_task(t.title)

    return max(0, max_energy - used)


def can_do_task(db: Session, task_type: str, query_date: date = None) -> bool:
    """Kiểm tra xem có đủ năng lượng để làm nhiệm vụ không"""
    remaining = get_remaining_energy(db, query_date)
    needed = get_energy_for_task(task_type)
    return remaining >= needed
