"""
AI Reviewer - Tự động đánh giá cuối ngày và cuối tuần
"""
from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
import json
from app.models import (
    DailyLog, Task, WeeklyReport, BrainMemory, StudyHour,
    Player, LifeScoreHistory, Goal, UserStatistic
)


def generate_daily_review(db: Session, review_date: date = None) -> dict:
    """Tự động đánh giá cuối ngày"""
    if review_date is None:
        review_date = date.today()

    tasks = db.query(Task).filter(Task.date == review_date).all()
    total = len(tasks)
    completed = len([t for t in tasks if t.status == "hoàn thành"])
    completion_percent = (completed / total * 100) if total > 0 else 0

    daily_log = db.query(DailyLog).filter(DailyLog.date == review_date).first()

    strengths = []
    weaknesses = []
    suggestions = []

    if total == 0:
        suggestions.append("Chưa có nhiệm vụ nào hôm nay. Hãy tạo kế hoạch học tập ở mục 'Hôm nay học gì?' để AI đề xuất!")
    else:
        goal_types = set()
        for t in tasks:
            if t.goal_type:
                goal_types.add(t.goal_type)

        for g in sorted(goal_types):
            g_tasks = [t for t in tasks if t.goal_type == g]
            g_done = len([t for t in g_tasks if t.status == "hoàn thành"])
            names = {"ielts": "IELTS", "devops": "DevOps", "gpa": "GPA"}
            if g_done == len(g_tasks) and len(g_tasks) > 0:
                strengths.append(f"{names.get(g, g)} hoàn thành tốt")
            elif g_done < len(g_tasks) and g_done > 0:
                weaknesses.append(f"{names.get(g, g)} chưa hoàn thành hết")
                suggestions.append(f"Mai ưu tiên {names.get(g, g)} trước")

        if completion_percent < 50:
            weaknesses.append("Hoàn thành dưới 50% kế hoạch")
            suggestions.append("Chia nhỏ nhiệm vụ để dễ hoàn thành hơn")
        elif completion_percent >= 80:
            strengths.append(f"Hoàn thành {int(completion_percent)}% kế hoạch")

    if daily_log and daily_log.sleep_hours and daily_log.sleep_hours < 6:
        weaknesses.append("Ngủ ít hơn 6 tiếng")
        suggestions.append("Cố gắng ngủ đủ 7-8 tiếng để phục hồi năng lượng")

    rating = 3 if total == 0 else _calculate_rating(completion_percent, daily_log)
    completed_tasks_count = len([t for t in tasks if t.status == "hoàn thành"])
    total_minutes = sum(
        _time_diff_minutes(t.start_time, t.end_time)
        for t in tasks if t.start_time and t.end_time
    )

    if daily_log:
        daily_log.completion_percent = completion_percent
        db.commit()

    return {
        "rating": rating,
        "completion_percent": round(completion_percent, 1),
        "total_tasks": total,
        "completed_tasks": completed_tasks_count,
        "total_minutes": total_minutes,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "suggestions": suggestions
    }


def _calculate_rating(completion: float, daily_log: DailyLog = None) -> int:
    rating = 5
    if completion < 30:
        rating = 2
    elif completion < 50:
        rating = 3
    elif completion < 70:
        rating = 4
    else:
        rating = 5

    if daily_log:
        if daily_log.mood_level and daily_log.mood_level <= 3:
            rating = max(1, rating - 1)
        if daily_log.energy_level and daily_log.energy_level >= 7:
            rating = min(5, rating + 1)
    return rating


def _time_diff_minutes(start: str, end: str) -> int:
    try:
        fmt = "%H:%M"
        s = datetime.strptime(start, fmt)
        e = datetime.strptime(end, fmt)
        diff = (e - s).total_seconds() / 60
        return max(0, int(diff))
    except (ValueError, TypeError):
        return 0


def generate_weekly_report(db: Session, week_start: date = None) -> dict:
    """Tạo báo cáo tuần"""
    if week_start is None:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    records = db.query(StudyHour).filter(
        StudyHour.date >= week_start,
        StudyHour.date <= week_end
    ).all()
    total_hours = sum(r.hours for r in records)

    by_goal = {}
    for r in records:
        by_goal.setdefault(r.goal_type, 0)
        by_goal[r.goal_type] += r.hours

    top_subject = max(by_goal, key=by_goal.get) if by_goal else "Không có"
    neglected = [g for g in by_goal if by_goal[g] < 1]

    tasks_done = db.query(Task).filter(
        Task.date >= week_start, Task.date <= week_end,
        Task.status == "hoàn thành"
    ).count()
    tasks_total = db.query(Task).filter(
        Task.date >= week_start, Task.date <= week_end
    ).count()

    strengths = []
    weaknesses = []
    for g, h in by_goal.items():
        if h >= 3:
            strengths.append(f"{g}: {h}h")
        elif h < 1:
            weaknesses.append(f"{g} bị bỏ quên")

    summary = f"Tuần này học {total_hours}h, hoàn thành {tasks_done}/{tasks_total} nhiệm vụ"

    existing = db.query(WeeklyReport).filter(
        WeeklyReport.week_start == week_start
    ).first()
    if not existing:
        life_score = _calc_life_score_component(db)
        existing = WeeklyReport(
            week_start=week_start, week_end=week_end,
            total_hours=total_hours, top_subject=top_subject,
            neglected_subjects=json.dumps(neglected, ensure_ascii=False),
            progress_summary=summary,
            strengths=json.dumps(strengths, ensure_ascii=False),
            weaknesses=json.dumps(weaknesses, ensure_ascii=False),
            plan_next_week=json.dumps(
                [f"Tiếp tục {top_subject}"] +
                ([f"Cải thiện {', '.join(neglected)}"] if neglected else []),
                ensure_ascii=False
            ),
            life_score=life_score.get("score", 0)
        )
        db.add(existing)
        db.commit()
        db.refresh(existing)

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "total_hours": total_hours,
        "top_subject": top_subject,
        "neglected_subjects": neglected,
        "progress_summary": summary,
        "strengths": strengths,
        "weaknesses": weaknesses,
    }


def calculate_life_score(db: Session) -> dict:
    """Tính Life Score (0-100)"""
    return _calc_life_score_component(db)


def _calc_life_score_component(db: Session) -> dict:
    """Calculate life score based on StudySlot completion + gamification."""
    player = db.query(Player).first()
    streak_bonus = min(20, (player.streak or 0) * 2) if player else 0
    level_bonus = min(30, (player.level or 1) * 3) if player else 0
    achievement_count = len(player.achievements) if player and hasattr(player, 'achievements') and player.achievements else 0
    achievement_bonus = min(10, achievement_count * 2)

    # Study progress from StudySlot completion
    study_score = 0
    try:
        from app.models_schedule import StudySlot
        total_slots = db.query(StudySlot).count()
        done_slots = db.query(StudySlot).filter(StudySlot.is_done == True).count()
        if total_slots > 0:
            study_score = min(40, (done_slots / total_slots) * 40)
    except Exception:
        pass

    score = min(100, study_score + streak_bonus + level_bonus + achievement_bonus)

    result = {
        "score": round(score, 1),
        "streak": streak_bonus,
        "achievement": achievement_bonus,
        "level": level_bonus,
        "study": round(study_score, 1),
        "ielts": 0, "gpa": 0, "devops": 0,  # kept for schema compatibility
    }

    today = date.today()
    existing = db.query(LifeScoreHistory).filter(LifeScoreHistory.date == today).first()
    if not existing:
        try:
            history = LifeScoreHistory(
                date=today, score=score, ielts_score=0, gpa_score=0,
                devops_score=0, streak_bonus=streak_bonus,
                achievement_bonus=achievement_bonus, level_bonus=level_bonus
            )
            db.add(history)
            db.commit()
        except Exception:
            db.rollback()

    return result

