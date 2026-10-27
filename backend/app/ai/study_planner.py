from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models import Player, Goal, Task, StudyHour
from app.models_v2 import FocusScore, SpacedRepetition
from app.ai.gemini_bridge import analyze_document_with_gemini
from app.ai.ai_reviewer import calculate_life_score
from app.services.gamification import get_player


def _build_user_profile(db: Session) -> str:
    """Xây dựng profile người dùng cho study planner."""
    player = get_player(db)
    goals = db.query(Goal).all()
    today = date.today()
    lines = []

    lines.append(f"Cấp độ: {player.level} | EXP: {player.exp} | Xu: {player.coins} | Streak: {player.streak}")

    ls = calculate_life_score(db)
    lines.append(f"Life Score: {ls['score']}/100")

    for g in goals:
        days = (g.deadline - today).days if g.deadline else "?"
        lines.append(f"  - {g.name} ({g.type}): {g.current_value}/{g.target_value}, còn {days} ngày")

    tasks = db.query(Task).filter(Task.date >= today, Task.status != "hoàn thành").count()
    lines.append(f"Tồn đọng: {tasks} nhiệm vụ chưa hoàn thành")

    week_hours = db.query(StudyHour).filter(StudyHour.date >= today - timedelta(days=7)).all()
    total = sum(h.hours or 0 for h in week_hours)
    lines.append(f"7 ngày qua: {total:.1f}h học")

    # Focus pattern: khung giờ nào học tốt nhất
    scores = db.query(FocusScore).order_by(FocusScore.date.desc()).limit(14).all()
    if scores:
        avg_deep = sum(s.deep_work_minutes or 0 for s in scores) / len(scores)
        avg_focus = sum(s.score or 0 for s in scores) / len(scores)
        lines.append(f"Focus TB 14 ngày: {avg_focus:.0f}/100, Deep work TB: {avg_deep:.0f}ph/ngày")

    # Năng lượng
    from app.ai.energy_manager import get_remaining_energy
    energy = get_remaining_energy(db)
    lines.append(f"Năng lượng hiện tại: {energy}%")

    # Ôn tập tồn đọng
    due = db.query(SpacedRepetition).filter(SpacedRepetition.next_review_date <= today).count()
    if due:
        lines.append(f"Ôn tập đến hạn: {due} thẻ")

    return "\n".join(lines)


def generate_study_plan_from_document(db: Session, doc_text: str, subject: str, user_message: str) -> dict:
    """
    Nhận nội dung tài liệu + subject + lịch cá nhân → Gemini sinh lịch học.
    Trả về dict gồm summary, tasks (list dict), predicted_hours.
    """
    profile = _build_user_profile(db)
    prompt = (
        f"Người dùng muốn học: {subject}\n"
        f"Lời nhắn: {user_message}\n\n"
        f"=== NỘI DUNG TÀI LIỆU (trích xuất) ===\n{doc_text[:8000]}\n\n"
        f"=== HỒ SƠ NGƯỜI DÙNG ===\n{profile}"
    )
    result = analyze_document_with_gemini(prompt)
    return result
