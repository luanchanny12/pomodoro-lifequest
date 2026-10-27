"""
AI Daily Coach
==============
Each morning, AI automatically generates today's study plan:
1. Check what lessons are due for review (spaced repetition)
2. Check progress on ongoing lessons
3. Create a prioritized daily mission
4. Generate personalized coaching message

The AI NEVER generates content - it only schedules existing lessons.
"""

from datetime import datetime, date, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models_v3 import (
    Lesson, LessonProgress, DailyMission,
    Flashcard, FlashcardReview, KnowledgePack, LearningHistory
)
from app.ai_knowledge.spaced_repetition import get_all_due_flashcards


def generate_daily_mission(db: Session) -> DailyMission:
    """Generate today's study mission based on progress and review schedule."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    existing = db.query(DailyMission).filter(
        DailyMission.date >= today,
        DailyMission.date < tomorrow
    ).first()

    if existing:
        return existing

    items = []
    total_xp = 0

    # 1. Due reviews (spaced repetition)
    due_flashcards = get_all_due_flashcards(db, limit=30)
    if due_flashcards:
        due_lessons = set(fc.lesson_id for fc in due_flashcards)
        for lid in list(due_lessons)[:3]:
            lesson = db.query(Lesson).filter(Lesson.id == lid).first()
            if lesson:
                pack = db.query(KnowledgePack).filter(KnowledgePack.id == lesson.pack_id).first()
                items.append({
                    "type": "review",
                    "lesson_id": lesson.id,
                    "title": f"Ôn tập: {lesson.title}",
                    "pack_title": pack.title if pack else "",
                    "duration_minutes": 10,
                    "xp": 20,
                })
                total_xp += 20

    # 2. Next uncompleted lessons
    in_progress = db.query(LessonProgress).filter(
        LessonProgress.status.in_(["not_started", "studying"]),
    ).order_by(LessonProgress.updated_at.asc()).limit(3).all()

    for lp in in_progress:
        lesson = db.query(Lesson).filter(Lesson.id == lp.lesson_id).first()
        if lesson:
            pack = db.query(KnowledgePack).filter(KnowledgePack.id == lesson.pack_id).first()
            items.append({
                "type": "study",
                "lesson_id": lesson.id,
                "title": f"Học: {lesson.title}",
                "pack_title": pack.title if pack else "",
                "duration_minutes": lesson.duration_minutes or 25,
                "xp": lesson.xp_reward or 50,
            })
            total_xp += lesson.xp_reward or 50

    # 3. Available quizzes
    from app.models_v3 import Quiz, QuizAttempt
    recent_quizzes = db.query(Quiz).limit(3).all()
    for quiz in recent_quizzes:
        last_attempt = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == quiz.id
        ).order_by(QuizAttempt.created_at.desc()).first()

        if not last_attempt or (last_attempt.passed != True):
            lesson = db.query(Lesson).filter(Lesson.id == quiz.lesson_id).first()
            items.append({
                "type": "quiz",
                "lesson_id": quiz.lesson_id,
                "quiz_id": quiz.id,
                "title": f"Bài kiểm tra: {quiz.title}",
                "duration_minutes": quiz.time_limit_minutes or 10,
                "xp": 30,
            })
            total_xp += 30
            break

    if not items:
        items.append({
            "type": "explore",
            "title": "Xem tổng quan kho kiến thức",
            "duration_minutes": 5,
            "xp": 10,
        })
        total_xp = 10

    title = _generate_mission_title(db, items)

    mission = DailyMission(
        date=today,
        title=title,
        description=f"Hôm nay có {len(items)} nhiệm vụ, tổng cộng {total_xp} XP",
        items=items,
        lesson_ids=[it.get("lesson_id") for it in items if it.get("lesson_id")],
        total_xp=total_xp,
        status="pending",
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission


def _generate_mission_title(db: Session, items: list) -> str:
    """Generate a human-readable mission title."""
    review_count = sum(1 for it in items if it["type"] == "review")
    study_count = sum(1 for it in items if it["type"] == "study")
    quiz_count = sum(1 for it in items if it["type"] == "quiz")

    parts = []
    if study_count:
        parts.append(f"học {study_count} bài")
    if review_count:
        parts.append(f"ôn {review_count} bài")
    if quiz_count:
        parts.append(f"làm {quiz_count} quiz")

    return ", ".join(parts) + " hôm nay" if parts else "Khám phá kho kiến thức"


def complete_mission_item(
    db: Session,
    lesson_id: int,
    duration_minutes: int,
    action: str = "study"
):
    """Record a completed learning action and update progress."""
    from app.models_v3 import LearningHistory

    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        return

    progress = db.query(LessonProgress).filter(
        LessonProgress.lesson_id == lesson_id
    ).first()
    if not progress:
        return

    xp_earned = 0

    if action == "study":
        progress.status = "studying"
        progress.total_study_minutes += duration_minutes
        xp_earned = lesson.xp_reward or 50

        if duration_minutes >= (lesson.duration_minutes or 30) * 0.8:
            progress.progress_percent = min(100, progress.progress_percent + 25)
            if progress.progress_percent >= 100:
                progress.status = "completed"
                progress.completed_at = datetime.utcnow()
                xp_earned = (lesson.xp_reward or 50) * 2

    elif action == "review":
        progress.flashcards_reviewed += 1
        xp_earned = 10

    elif action == "quiz":
        xp_earned = 30

    history = LearningHistory(
        date=datetime.utcnow(),
        pack_id=lesson.pack_id,
        lesson_id=lesson_id,
        action=action,
        duration_minutes=duration_minutes,
        xp_earned=xp_earned,
    )
    db.add(history)
    db.commit()


def get_today_mission(db: Session) -> Optional[DailyMission]:
    """Get today's mission."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    return db.query(DailyMission).filter(
        DailyMission.date >= today,
        DailyMission.date < tomorrow
    ).first()
