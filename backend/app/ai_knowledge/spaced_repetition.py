"""
SM-2 Spaced Repetition Algorithm
=================================
Implements the SuperMemo SM-2 algorithm for flashcard reviews.
Review schedule: 1 day → 3 days → 7 days → 14 days → 30 days → 90 days
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models_v3 import FlashcardReview, Flashcard, LessonProgress


SM2_INTERVALS = [1, 3, 7, 14, 30, 90]


def calculate_sm2(
    quality: int,
    prev_ease_factor: float,
    prev_interval: int,
    prev_review_count: int
) -> dict:
    """
    SM-2 Algorithm:
    quality: 0-5 (0=complete blackout, 5=perfect response)

    Returns: { ease_factor, interval_days, next_review_date }
    """
    q = max(0, min(5, quality))

    if q < 3:
        # Failed - reset
        new_interval = 1
        new_review_count = 0
    else:
        new_review_count = prev_review_count + 1
        if new_review_count == 1:
            new_interval = 1
        elif new_review_count == 2:
            new_interval = 3
        else:
            idx = min(new_review_count - 1, len(SM2_INTERVALS) - 1)
            new_interval = SM2_INTERVALS[idx]

    new_ease = prev_ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if new_ease < 1.3:
        new_ease = 1.3

    next_review = datetime.utcnow() + timedelta(days=new_interval)

    return {
        "ease_factor": round(new_ease, 2),
        "interval_days": new_interval,
        "next_review_date": next_review,
        "review_count": new_review_count,
    }


def review_flashcard(
    db: Session,
    flashcard_id: int,
    quality: int
) -> FlashcardReview:
    """Record a flashcard review and calculate next schedule."""
    review = db.query(FlashcardReview).filter(
        FlashcardReview.flashcard_id == flashcard_id
    ).order_by(FlashcardReview.created_at.desc()).first()

    prev_ease = review.ease_factor if review else 2.5
    prev_interval = review.interval_days if review else 0
    prev_count = review.review_count if review else 0

    result = calculate_sm2(quality, prev_ease, prev_interval, prev_count)

    new_review = FlashcardReview(
        flashcard_id=flashcard_id,
        quality=quality,
        ease_factor=result["ease_factor"],
        interval_days=result["interval_days"],
        next_review_date=result["next_review_date"],
        last_reviewed=datetime.utcnow(),
        review_count=result["review_count"],
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review


def get_due_flashcards(db: Session, lesson_id: Optional[int] = None, limit: int = 20):
    """Get flashcards due for review."""
    now = datetime.utcnow()
    query = db.query(Flashcard).join(
        FlashcardReview,
        FlashcardReview.flashcard_id == Flashcard.id,
        isouter=True
    ).filter(
        (FlashcardReview.next_review_date == None) |  # Never reviewed
        (FlashcardReview.next_review_date <= now)
    )

    if lesson_id:
        query = query.filter(Flashcard.lesson_id == lesson_id)

    return query.order_by(FlashcardReview.next_review_date.asc().nullsfirst()).limit(limit).all()


def get_all_due_flashcards(db: Session, limit: int = 50):
    """Get ALL flashcards due for review across all lessons."""
    return get_due_flashcards(db, None, limit)


def update_lesson_mastery(db: Session, lesson_id: int):
    """Recalculate mastery level for a lesson based on flashcard reviews."""
    from app.models_v3 import LessonProgress
    progress = db.query(LessonProgress).filter(
        LessonProgress.lesson_id == lesson_id
    ).first()
    if not progress:
        return

    reviews = db.query(FlashcardReview).join(
        Flashcard, FlashcardReview.flashcard_id == Flashcard.id
    ).filter(
        Flashcard.lesson_id == lesson_id
    ).all()

    if not reviews:
        progress.mastery_level = 0
    else:
        avg_quality = sum(r.quality for r in reviews) / len(reviews)
        progress.mastery_level = min(100, int((avg_quality / 5) * 100))
        progress.flashcards_reviewed = len(set(r.flashcard_id for r in reviews))

        # Set next review date to the earliest due flashcard
        due_dates = [r.next_review_date for r in reviews if r.next_review_date]
        if due_dates:
            progress.next_review_date = min(due_dates)

    db.commit()


def get_review_stats(db: Session) -> dict:
    """Get overall review statistics."""
    from app.models_v3 import Flashcard
    total = db.query(Flashcard).count()
    now = datetime.utcnow()

    due = db.query(FlashcardReview).filter(
        FlashcardReview.next_review_date <= now
    ).count()

    mastered = db.query(FlashcardReview).filter(
        FlashcardReview.ease_factor >= 2.5
    ).count()

    return {
        "total_flashcards": total,
        "due_now": due,
        "mastered": mastered,
        "total_reviews": db.query(FlashcardReview).count(),
    }
