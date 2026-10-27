"""
AI Daily Coach Router
======================
Provides the daily coaching experience:
- Today's mission (what to study)
- Complete mission items
- Get learning history
- Get review stats
- Get AI coaching message
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.models_v3 import DailyMission, LearningHistory, LessonProgress, KnowledgePack, Lesson
from app.schemas_v3 import (
    DailyMissionResponse, DailyMissionComplete,
)
from app.ai_knowledge.daily_planner import generate_daily_mission, complete_mission_item, get_today_mission
from app.ai_knowledge.spaced_repetition import get_review_stats

router = APIRouter(prefix="/api/v3/daily", tags=["V3 - Daily Coach"])


@router.get("/mission", response_model=DailyMissionResponse)
def get_or_create_daily_mission(db: Session = Depends(get_db)):
    """Get today's mission, or generate if not exists."""
    mission = get_today_mission(db)
    if not mission:
        mission = generate_daily_mission(db)
    return mission


@router.post("/mission/{mission_id}/complete", response_model=DailyMissionResponse)
def complete_daily_mission(
    mission_id: int,
    data: DailyMissionComplete,
    db: Session = Depends(get_db),
):
    """Mark today's mission as completed."""
    mission = db.query(DailyMission).filter(DailyMission.id == mission_id).first()
    if not mission:
        raise HTTPException(404, "Không tìm thấy nhiệm vụ")

    mission.status = "completed"
    mission.earned_xp = data.earned_xp or mission.total_xp
    mission.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(mission)
    return mission


@router.post("/mission/{mission_id}/skip")
def skip_daily_mission(mission_id: int, db: Session = Depends(get_db)):
    """Skip today's mission."""
    mission = db.query(DailyMission).filter(DailyMission.id == mission_id).first()
    if not mission:
        raise HTTPException(404, "Không tìm thấy nhiệm vụ")
    mission.status = "skipped"
    db.commit()
    return {"message": "Đã bỏ qua nhiệm vụ hôm nay"}


@router.get("/history", response_model=List[dict])
def get_learning_history(
    days: int = 7,
    db: Session = Depends(get_db),
):
    """Get recent learning history."""
    since = datetime.utcnow() - timedelta(days=days)
    history = db.query(LearningHistory).filter(
        LearningHistory.created_at >= since
    ).order_by(LearningHistory.created_at.desc()).limit(50).all()

    return [
        {
            "id": h.id,
            "date": h.date.isoformat(),
            "action": h.action,
            "duration_minutes": h.duration_minutes,
            "xp_earned": h.xp_earned,
            "lesson_id": h.lesson_id,
            "pack_id": h.pack_id,
        }
        for h in history
    ]


@router.get("/stats")
def get_learning_stats(db: Session = Depends(get_db)):
    """Get overall learning statistics."""
    review_stats = get_review_stats(db)

    total_lessons = db.query(Lesson).count()
    completed = db.query(LessonProgress).filter(
        LessonProgress.status == "completed"
    ).count()
    studying = db.query(LessonProgress).filter(
        LessonProgress.status == "studying"
    ).count()

    total_study_minutes = db.query(LessonProgress).with_entities(
        LessonProgress.total_study_minutes
    ).all()
    total_minutes = sum(m[0] or 0 for m in total_study_minutes)

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_xp = db.query(LearningHistory).filter(
        LearningHistory.created_at >= today
    ).all()
    today_xp_total = sum(h.xp_earned or 0 for h in today_xp)
    today_minutes = sum(h.duration_minutes or 0 for h in today_xp)

    return {
        "total_packs": db.query(KnowledgePack).count(),
        "total_lessons": total_lessons,
        "completed_lessons": completed,
        "studying_lessons": studying,
        "completion_rate": int((completed / total_lessons) * 100) if total_lessons > 0 else 0,
        "total_study_minutes": total_minutes,
        "today_xp": today_xp_total,
        "today_minutes": today_minutes,
        "review_stats": review_stats,
    }


@router.get("/coach")
def get_ai_coach_message(db: Session = Depends(get_db)):
    """Get AI coaching message for today."""
    from app.ai.gemini_bridge import chat_with_gemini

    mission = get_today_mission(db)
    stats = get_learning_stats(db)

    context = f"""
=== HÔM NAY ===
Nhiệm vụ: {mission.title if mission else "Chưa có"}
Tiến độ: {stats['completion_rate']}% hoàn thành
Học hôm nay: {stats['today_minutes']} phút, {stats['today_xp']} XP

=== TỔNG QUAN ===
Tổng số bài: {stats['total_lessons']}
Đã học: {stats['completed_lessons']}
Đang học: {stats['studying_lessons']}
Tổng thời gian: {stats['total_study_minutes']} phút
"""

    message = "Hãy đưa ra lời động viên ngắn gọn và nhắc nhở về việc học hôm nay dựa trên dữ liệu trên. Trả lời bằng tiếng Việt, tối đa 3 câu."
    reply = chat_with_gemini(message, system_context=context)

    return {
        "message": reply or "Chúc bạn một ngày học tập hiệu quả!",
        "today_mission": mission.title if mission else "",
        "stats": stats,
    }
