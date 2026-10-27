from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models_v2 import SpacedRepetition

INTERVALS = [1, 3, 7, 14, 30, 60, 120]
MIN_RETENTION = 0.3


def schedule_review(db: Session, goal_type: str, concept_key: str,
                    concept_label: str = None, score: float = None,
                    module: str = None, lesson: str = None):
    record = db.query(SpacedRepetition).filter(
        SpacedRepetition.goal_type == goal_type,
        SpacedRepetition.concept_key == concept_key
    ).first()

    if not record:
        record = SpacedRepetition(
            goal_type=goal_type, module=module, lesson=lesson,
            concept_key=concept_key, concept_label=concept_label,
            review_count=0, retention_score=0.0, mastery=0,
            interval_days=1, next_review_date=datetime.utcnow()
        )
        db.add(record)

    if score is not None:
        record.retention_score = (record.retention_score * 0.6 + score * 0.4)
        record.review_count += 1
        idx = min(record.review_count, len(INTERVALS) - 1)
        record.interval_days = INTERVALS[idx]
        record.mastery = _calc_mastery(record.retention_score, record.review_count)
        record.next_review_date = datetime.utcnow() + timedelta(days=record.interval_days)
    else:
        record.review_count += 1
        idx = min(record.review_count, len(INTERVALS) - 1)
        record.interval_days = INTERVALS[idx]
        record.mastery = _calc_mastery(record.retention_score, record.review_count)
        record.next_review_date = datetime.utcnow() + timedelta(days=record.interval_days)

    record.last_reviewed = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return record


def get_due_reviews(db: Session, goal_type: str = None) -> list:
    now = datetime.utcnow()
    query = db.query(SpacedRepetition).filter(
        SpacedRepetition.next_review_date <= now
    )
    if goal_type:
        query = query.filter(SpacedRepetition.goal_type == goal_type)
    return query.order_by(SpacedRepetition.next_review_date).all()


def get_all_reviews(db: Session, goal_type: str = None) -> list:
    query = db.query(SpacedRepetition)
    if goal_type:
        query = query.filter(SpacedRepetition.goal_type == goal_type)
    return query.all()


def get_review_stats(db: Session) -> dict:
    total = db.query(SpacedRepetition).count()
    now = datetime.utcnow()
    due = db.query(SpacedRepetition).filter(
        SpacedRepetition.next_review_date <= now
    ).count()
    mastered = db.query(SpacedRepetition).filter(
        SpacedRepetition.mastery >= 80
    ).count()
    return {"total": total, "due_now": due, "mastered": mastered}


def update_review_result(db: Session, record_id: int, score: float):
    record = db.query(SpacedRepetition).filter(SpacedRepetition.id == record_id).first()
    if not record:
        return None
    return schedule_review(db, record.goal_type, record.concept_key,
                           score=score, module=record.module, lesson=record.lesson)


def _calc_mastery(retention: float, count: int) -> int:
    base = retention * 100 * 0.6
    count_bonus = min(40, count * 8)
    return min(100, int(base + count_bonus))
