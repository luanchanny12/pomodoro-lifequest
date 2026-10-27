"""
AI Brain - Lưu toàn bộ lịch sử học tập, tự động suy luận bước tiếp theo
"""
from sqlalchemy.orm import Session
from datetime import datetime, date
import json
from app.models import BrainMemory, V1LearningHistory, CurrentPosition, Task, Vocabulary, IPA, RoadmapLesson


def track_learning(db: Session, goal_type: str, activity_type: str = "học",
                   title: str = "", module: str = None, lesson: str = None,
                   duration_minutes: int = 0, score: float = None):
    """Ghi lại hoạt động học tập và cập nhật vị trí hiện tại"""
    history = V1LearningHistory(
        goal_type=goal_type, activity_type=activity_type, title=title,
        module=module, lesson=lesson, duration_minutes=duration_minutes, score=score
    )
    db.add(history)

    memory = db.query(BrainMemory).filter(
        BrainMemory.goal_type == goal_type,
        BrainMemory.module == module,
        BrainMemory.lesson == lesson
    ).first()
    if not memory:
        memory = BrainMemory(
            goal_type=goal_type, module=module, lesson=lesson,
            progress_percent=0, mastery_level=0
        )
        db.add(memory)
    memory.last_studied = datetime.utcnow()
    if score is not None:
        memory.mastery_level = min(100, (memory.mastery_level + score) / 2)
    memory.progress_percent = min(100, memory.progress_percent + 5)

    if module or lesson:
        pos = get_current_position(db, goal_type)
        if not pos:
            pos = CurrentPosition(goal_type=goal_type)
            db.add(pos)
        if module:
            pos.current_module = module
        if lesson:
            pos.current_lesson = lesson
        pos.progress_percent = min(100, pos.progress_percent + 2)

    db.commit()
    db.refresh(history)
    return history


def get_next_lesson(db: Session, goal_type: str) -> dict:
    """AI tự suy luận bài học tiếp theo dựa trên vị trí hiện tại và lịch sử"""
    current_pos = get_current_position(db, goal_type)

    # Find next lesson based on CurrentPosition
    if current_pos and current_pos.current_lesson:
        # User has a position — find the lesson AFTER the current one
        current_lesson = db.query(RoadmapLesson).filter(
            RoadmapLesson.goal_type == goal_type,
            RoadmapLesson.lesson_name == current_pos.current_lesson
        ).first()
        if current_lesson:
            next_lesson = db.query(RoadmapLesson).filter(
                RoadmapLesson.goal_type == goal_type,
                RoadmapLesson.is_completed == False,
                RoadmapLesson.order_index > current_lesson.order_index
            ).order_by(RoadmapLesson.order_index).first()
        else:
            next_lesson = None
    else:
        # No current position — take first incomplete lesson
        next_lesson = db.query(RoadmapLesson).filter(
            RoadmapLesson.goal_type == goal_type,
            RoadmapLesson.is_completed == False
        ).order_by(RoadmapLesson.order_index).first()

    if not next_lesson:
        # Check if all lessons are done
        all_done = db.query(RoadmapLesson).filter(
            RoadmapLesson.goal_type == goal_type
        ).count()
        if all_done > 0:
            # Suggest review of completed lessons or mark done
            last_studied = db.query(RoadmapLesson).filter(
                RoadmapLesson.goal_type == goal_type
            ).order_by(RoadmapLesson.order_index.desc()).first()
            if last_studied:
                return {
                    "goal_type": goal_type,
                    "next_lesson_id": last_studied.id,
                    "module_name": last_studied.module_name,
                    "lesson_name": f"Ôn tập: {last_studied.lesson_name}",
                    "description": "Ôn lại bài học gần nhất để củng cố kiến thức",
                    "difficulty": max(1, last_studied.difficulty - 1),
                    "energy_cost": max(5, last_studied.energy_cost - 5),
                    "order_index": last_studied.order_index + 1,
                    "current_position": {
                        "module": current_pos.current_module if current_pos else None,
                        "lesson": current_pos.current_lesson if current_pos else None,
                        "progress": current_pos.progress_percent if current_pos else 0
                    },
                    "last_studied": None,
                    "recent_tasks": [],
                    "suggestion": f"Đã hoàn thành lộ trình {goal_type}! Ôn tập lại để nhớ lâu hơn.",
                    "done": False
                }
            return {"message": "Chúc mừng! Bạn đã hoàn thành tất cả bài học.", "done": True}
        return {"message": "Chưa có lộ trình cho mục tiêu này.", "done": False}

    last_history = db.query(V1LearningHistory).filter(
        V1LearningHistory.goal_type == goal_type
    ).order_by(V1LearningHistory.created_at.desc()).first()

    recent_tasks = db.query(Task).filter(
        Task.goal_type == goal_type,
        Task.status == "hoàn thành"
    ).order_by(Task.date.desc()).limit(3).all()

    result = {
        "goal_type": goal_type,
        "next_lesson_id": next_lesson.id,
        "module_name": next_lesson.module_name,
        "lesson_name": next_lesson.lesson_name,
        "description": next_lesson.description,
        "difficulty": next_lesson.difficulty,
        "energy_cost": next_lesson.energy_cost,
        "order_index": next_lesson.order_index,
        "current_position": {
            "module": current_pos.current_module if current_pos else None,
            "lesson": current_pos.current_lesson if current_pos else None,
            "progress": current_pos.progress_percent if current_pos else 0
        },
        "last_studied": last_history.title if last_history else None,
        "recent_tasks": [t.title for t in recent_tasks],
        "suggestion": f"Tiếp theo: {next_lesson.module_name} - {next_lesson.lesson_name}"
    }
    return result


def update_current_position(db: Session, goal_type: str, **kwargs):
    """Cập nhật vị trí hiện tại"""
    pos = db.query(CurrentPosition).filter(CurrentPosition.goal_type == goal_type).first()
    if not pos:
        pos = CurrentPosition(goal_type=goal_type)
        db.add(pos)

    for key, value in kwargs.items():
        if hasattr(pos, key) and value is not None:
            setattr(pos, key, value)
    pos.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pos)
    return pos


def get_current_position(db: Session, goal_type: str):
    """Lấy vị trí hiện tại"""
    return db.query(CurrentPosition).filter(CurrentPosition.goal_type == goal_type).first()


def get_mastery_summary(db: Session, goal_type: str) -> dict:
    """Tổng quan mức độ thành thạo"""
    memories = db.query(BrainMemory).filter(BrainMemory.goal_type == goal_type).all()
    if not memories:
        return {"goal_type": goal_type, "total_modules": 0, "mastery": 0, "progress": 0, "modules": []}

    modules = []
    total_mastery = 0
    total_progress = 0
    for m in memories:
        modules.append({
            "module": m.module, "lesson": m.lesson,
            "progress": m.progress_percent, "mastery": m.mastery_level,
            "last_studied": m.last_studied.isoformat() if m.last_studied else None
        })
        total_mastery += m.mastery_level
        total_progress += m.progress_percent

    return {
        "goal_type": goal_type,
        "total_modules": len(modules),
        "mastery": round(total_mastery / len(modules), 1),
        "progress": round(total_progress / len(modules), 1),
        "modules": modules
    }
