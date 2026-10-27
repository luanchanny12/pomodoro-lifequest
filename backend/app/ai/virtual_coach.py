from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
from app.models import DailyLog, Player, Goal, Task
from app.models_v2 import VirtualCoachMessage, LearningPattern, SpacedRepetition
from app.ai.energy_manager import get_max_energy
from app.ai.priority_engine import get_priority_ranking
from app.ai.learning_insight import analyze_skipped_subjects, analyze_best_time
from app.ai.spaced_repetition import get_due_reviews


def generate_coach_message(db: Session) -> dict:
    today = date.today()
    player = db.query(Player).first()
    daily_log = db.query(DailyLog).filter(DailyLog.date == today).first()

    parts = []
    sleep_hours = daily_log.sleep_hours if daily_log and daily_log.sleep_hours else 7

    if sleep_hours < 6:
        parts.append(("sleep", "Hôm nay bạn chỉ ngủ {:.0f} tiếng.".format(sleep_hours),
                      "Khối lượng học giảm còn 70%. Hãy chọn bài nhẹ trước."))

    skipped = analyze_skipped_subjects(db)
    if skipped:
        names = {"ielts": "IELTS", "devops": "DevOps", "gpa": "GPA"}
        subjects = ", ".join(names.get(s, s) for s in skipped)
        parts.append(("skip", f"Bạn đã bỏ {subjects} gần đây.",
                      f"{' '.join(names.get(s, s) for s in skipped)} được ưu tiên hôm nay."))

    due_reviews = get_due_reviews(db)
    if due_reviews:
        parts.append(("review", f"Có {len(due_reviews)} khái niệm cần ôn tập hôm nay.",
                      "Hãy dành 15 phút đầu buổi để ôn."))

    ranking = get_priority_ranking(db)
    if ranking:
        top = ranking[0]["goal_type"]
        top_score = ranking[0]["score"]
        names = {"ielts": "IELTS", "devops": "DevOps", "gpa": "GPA"}
        parts.append(("priority", f"{names.get(top, top)} được ưu tiên nhất (điểm: {top_score}).",
                      f"Bắt đầu với {names.get(top, top)}."))

    if daily_log and daily_log.energy_level:
        energy = daily_log.energy_level
        if energy <= 3:
            parts.append(("energy", "Năng lượng hôm nay thấp.",
                          "Ưu tiên học nhẹ như Vocabulary hoặc IPA."))

    content = "Hôm nay tôi nghĩ bạn nên:"
    actions = []
    for p in parts:
        content += f"\n\n**{p[1]}**\n{p[2]}"
        actions.append(p[2])

    msg = VirtualCoachMessage(
        player_id=player.id if player else 1,
        message_type="daily_brief",
        title="Lời khuyên hôm nay",
        content=content,
        action_label="Xem kế hoạch",
        action_url="/daily-plan",
        priority_score=sum(max(0, 10 - i) for i in range(len(parts))),
        context_json=str(parts)
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "id": msg.id,
        "title": msg.title,
        "content": content,
        "action_label": msg.action_label,
        "action_url": msg.action_url
    }


def get_active_coach_messages(db: Session, limit: int = 3) -> list:
    msgs = db.query(VirtualCoachMessage).filter(
        VirtualCoachMessage.is_dismissed == False
    ).order_by(VirtualCoachMessage.priority_score.desc()).limit(limit).all()
    return [{
        "id": m.id, "message_type": m.message_type,
        "title": m.title, "content": m.content,
        "action_label": m.action_label, "action_url": m.action_url,
        "priority_score": m.priority_score, "created_at": m.created_at.isoformat()
    } for m in msgs]


def dismiss_message(db: Session, msg_id: int):
    msg = db.query(VirtualCoachMessage).filter(VirtualCoachMessage.id == msg_id).first()
    if msg:
        msg.is_dismissed = True
        db.commit()
