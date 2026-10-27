from sqlalchemy.orm import Session
from app.models import V1LearningHistory, CurrentPosition
from app.models_v2 import LearningPattern


def adjust_difficulty(db: Session, goal_type: str, module: str,
                      lesson: str, last_score: float = None) -> dict:
    history = db.query(V1LearningHistory).filter(
        V1LearningHistory.goal_type == goal_type,
        V1LearningHistory.module == module,
        V1LearningHistory.lesson == lesson
    ).order_by(V1LearningHistory.created_at.desc()).limit(5).all()

    if not history and last_score is None:
        return {"current_difficulty": 1, "adjusted_difficulty": 1, "reason": "Chưa có dữ liệu"}

    scores = [h.score for h in history if h.score is not None]
    if last_score is not None:
        scores.append(last_score)

    if not scores:
        return {"current_difficulty": 1, "adjusted_difficulty": 1, "reason": "Chưa có điểm"}

    avg_score = sum(scores) / len(scores)
    pos = db.query(CurrentPosition).filter(CurrentPosition.goal_type == goal_type).first()
    current_difficulty = pos.difficulty_level if pos else 1

    if avg_score >= 80 and len(scores) >= 2:
        new_difficulty = min(5, current_difficulty + 1)
        reason = f"Điểm TB {avg_score:.0f} - Tăng độ khó lên {new_difficulty}"
        _record_pattern(db, goal_type, module, lesson, avg_score, new_difficulty)
        return {"current_difficulty": current_difficulty, "adjusted_difficulty": new_difficulty, "reason": reason}

    if avg_score < 40 and len(scores) >= 2:
        new_difficulty = max(1, current_difficulty - 1)
        reason = f"Điểm TB {avg_score:.0f} - Giảm độ khó xuống {new_difficulty}, ôn lại"
        return {"current_difficulty": current_difficulty, "adjusted_difficulty": new_difficulty, "reason": reason}

    return {"current_difficulty": current_difficulty, "adjusted_difficulty": current_difficulty,
            "reason": f"Điểm TB {avg_score:.0f} - Giữ nguyên độ khó"}


def suggest_remedial(db: Session, goal_type: str, module: str, lesson: str, last_score: float) -> str:
    if last_score < 40:
        return f"Cần ôn lại {module} - {lesson} trước khi học tiếp"
    return ""


def _record_pattern(db: Session, goal_type: str, module: str, lesson: str, score: float, new_difficulty: int):
    key = f"{module}_{lesson}" if module else lesson
    existing = db.query(LearningPattern).filter(
        LearningPattern.goal_type == goal_type,
        LearningPattern.pattern_key == key
    ).first()
    if existing:
        existing.score = (existing.score + score) / 2
        existing.pattern_value = str(new_difficulty)
    else:
        db.add(LearningPattern(
            goal_type=goal_type, pattern_type="adaptive_difficulty",
            pattern_key=key, pattern_value=str(new_difficulty),
            insight=f"Điểm {score:.0f} -> độ khó {new_difficulty}",
            score=score, sample_size=1
        ))
    db.commit()
