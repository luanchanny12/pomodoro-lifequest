import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date, datetime
from app.database import get_db
from app.models import (
    AIConversation, Prediction, SmartNotification, UserStatistic,
    LifeScoreHistory, WeeklyReport, BrainMemory, CurrentPosition,
    Goal, DailyLog, Task, Player, StudyHour, PlanSetupSession,
)
from app.models_v3 import KnowledgePack, DailyMission
from app.schemas import (
    AIPlannerRequest, AIPlannerResponse, PlanBlock,
    ChatRequest, ChatResponse, DailyReviewResponse, LifeScoreResponse,
    AIConversationResponse, SmartNotificationResponse,
    UserStatisticResponse, UserStatisticsSummary,
    Plan14DaysRequest, Plan14DaysResponse,
)
from app.ai.ai_brain import track_learning, get_next_lesson, get_current_position, get_mastery_summary
from app.ai.ai_planner import generate_daily_plan
from app.ai.ai_predictor import predict_goal_completion, get_all_predictions
from app.ai.ai_reviewer import generate_daily_review, generate_weekly_report, calculate_life_score
from app.ai.energy_manager import get_remaining_energy
from app.ai.ai_planner_14days import generate_14day_plan_with_availability
from app.ai.gemini_bridge import chat_with_gemini, chat_with_gemini_stream, analyze_document_with_gemini
from app.ai.document_parser import parse_uploaded_file
from app.ai.study_planner import generate_study_plan_from_document
from datetime import timedelta


def _build_user_context(db: Session) -> str:
    """Xây dựng context người dùng từ database cho Gemini."""
    from app.models import Player, Task, StudyHour
    from app.models_v2 import FocusScore, SpacedRepetition
    from app.ai.ai_reviewer import calculate_life_score
    from app.services.gamification import get_player

    player = get_player(db)
    goals = db.query(Goal).all()
    today = date.today()
    lines = []

    lines.append(f"Cấp độ: {player.level}, EXP: {player.exp}, Xu: {player.coins}, Streak: {player.streak} ngày")

    ls = calculate_life_score(db)
    lines.append(f"Life Score: {ls['score']}/100 (IELTS: {ls['ielts']}, GPA: {ls['gpa']}, DevOps: {ls['devops']})")

    for g in goals:
        days_left = (g.deadline - today).days if g.deadline else "?"
        lines.append(f"Mục tiêu {g.type}: {g.current_value}/{g.target_value} (còn {days_left} ngày, ưu tiên {g.priority})")

    today_tasks = db.query(Task).filter(Task.date == today).count()
    done_tasks = db.query(Task).filter(Task.date == today, Task.status == "hoàn thành").count()
    lines.append(f"Hôm nay: {done_tasks}/{today_tasks} nhiệm vụ hoàn thành")

    week_hours = db.query(StudyHour).filter(
        StudyHour.date >= today - timedelta(days=7)
    ).all()
    total_hours = sum(h.hours or 0 for h in week_hours)
    lines.append(f"7 ngày qua: {total_hours:.1f} giờ học")

    focus = db.query(FocusScore).filter(FocusScore.date == today.isoformat()).first()
    if focus:
        lines.append(f"Focus hôm nay: {focus.score}/100, ngủ {focus.sleep_hours}h, deep work {focus.deep_work_minutes}ph")

    due = db.query(SpacedRepetition).filter(
        SpacedRepetition.next_review_date <= today
    ).count()
    if due:
        lines.append(f"Cần ôn tập hôm nay: {due} thẻ")

    return "\n".join(lines)

router = APIRouter(prefix="/api/ai", tags=["AI Engine"])


@router.post("/planner", response_model=AIPlannerResponse)
def ai_planner(data: AIPlannerRequest, db: Session = Depends(get_db)):
    """Tạo kế hoạch học tập trong ngày"""
    plan = generate_daily_plan(
        db, user_id=1, query_date=data.date or date.today(),
        energy_level=data.energy_level, sleep_hours=data.sleep_hours, mood=data.mood
    )
    blocks = [PlanBlock(**b) for b in plan.get("blocks", [])]
    return AIPlannerResponse(
        summary=plan.get("summary", ""),
        reason=plan.get("reason", ""),
        priority=plan.get("priority", []),
        blocks=blocks,
        energy=plan.get("energy", 100),
        predicted_completion=plan.get("predicted_completion", "")
    )


@router.get("/brain/{goal_type}")
def ai_brain(goal_type: str, db: Session = Depends(get_db)):
    """Lấy vị trí hiện tại và bài học tiếp theo"""
    pos = get_current_position(db, goal_type)
    next_lesson = get_next_lesson(db, goal_type)
    mastery = get_mastery_summary(db, goal_type)
    return {
        "current_position": {
            "module": pos.current_module if pos else None,
            "lesson": pos.current_lesson if pos else None,
            "progress": pos.progress_percent if pos else 0,
            "mastery": pos.mastery_score if pos else 0
        } if pos else None,
        "next_lesson": next_lesson,
        "mastery_summary": mastery
    }


@router.post("/track")
def ai_track(
    goal_type: str = Query(...),
    activity_type: str = Query("học"),
    title: str = Query(""),
    module: str = Query(None),
    lesson: str = Query(None),
    duration_minutes: int = Query(0),
    score: float = Query(None),
    db: Session = Depends(get_db)
):
    """Ghi lại hoạt động học tập"""
    result = track_learning(
        db, goal_type=goal_type, activity_type=activity_type,
        title=title, module=module, lesson=lesson,
        duration_minutes=duration_minutes, score=score
    )
    return {"status": "ok", "id": result.id, "message": f"Đã ghi nhận hoạt động {title}"}


@router.get("/predictions")
def ai_predictions(db: Session = Depends(get_db)):
    """Dự đoán cho tất cả mục tiêu"""
    return get_all_predictions(db)


@router.get("/predict/{goal_type}")
def ai_predict(goal_type: str, db: Session = Depends(get_db)):
    """Dự đoán cho một mục tiêu cụ thể"""
    result = predict_goal_completion(db, goal_type)
    if "error" in result:
        raise HTTPException(404, result["error"])
    return result


@router.get("/review/daily", response_model=DailyReviewResponse)
def ai_daily_review(review_date: date = Query(None), db: Session = Depends(get_db)):
    """Đánh giá cuối ngày"""
    result = generate_daily_review(db, review_date or date.today())
    return DailyReviewResponse(
        rating=result.get("rating", 5),
        completion_percent=result.get("completion_percent", 0),
        strengths=result.get("strengths", []),
        weaknesses=result.get("weaknesses", []),
        suggestions=result.get("suggestions", [])
    )


@router.get("/review/weekly")
def ai_weekly_review(week_start: date = Query(None), db: Session = Depends(get_db)):
    """Báo cáo tuần"""
    return generate_weekly_report(db, week_start)


@router.post("/chat", response_model=ChatResponse)
def ai_chat(data: ChatRequest, db: Session = Depends(get_db)):
    """Chat với AI Coach (Gemini AI nếu có key, fallback rule-based)"""
    session_id = data.session_id
    message = data.message

    if not message.strip():
        raise HTTPException(400, "Tin nhắn không được để trống")

    user_msg = AIConversation(session_id=session_id, role="user", message=message)
    db.add(user_msg)
    db.commit()

    # Check for active plan setup session first
    existing_setup_session = db.query(PlanSetupSession).filter(
        PlanSetupSession.chat_session_id == session_id
    ).first()
    if existing_setup_session:
        reply = _handle_plan_setup(message, db, session_id)
        ai_msg = AIConversation(session_id=session_id, role="assistant", message=reply)
        db.add(ai_msg)
        db.commit()
        return ChatResponse(reply=reply, session_id=session_id)
    setup_intent = _detect_setup_intent(message)
    if setup_intent:
        _get_or_create_setup_session(db, session_id)
        reply = _handle_plan_setup(message, db, session_id)
        ai_msg = AIConversation(session_id=session_id, role="assistant", message=reply)
        db.add(ai_msg)
        db.commit()
        return ChatResponse(reply=reply, session_id=session_id)

    # Thử Gemini trước (với context database)
    history = [
        {"role": c.role, "message": c.message}
        for c in db.query(AIConversation).filter(
            AIConversation.session_id == session_id
        ).order_by(AIConversation.created_at).limit(20).all()
    ]
    user_context = _build_user_context(db)
    gemini_reply = chat_with_gemini(message, history, user_context)
    if gemini_reply:
        reply = gemini_reply
    else:
        reply = _fallback_chat(message, db, chat_session_id=session_id)

    ai_msg = AIConversation(session_id=session_id, role="assistant", message=reply)
    db.add(ai_msg)
    db.commit()

    return ChatResponse(reply=reply, session_id=session_id)


# ── Intent detection pattern ──────────────────────────────────────────
SETUP_PATTERNS = [
    r"muốn học",
    r"muốn.*học.*\d+.*tiếng",
    r"rảnh.*\d+.*tiếng",
    r"\d+.*tiếng.*ngày",
    r"học.*ielts",
    r"học.*gpa",
    r"học.*devops",
    r"học.*tiếng",      # học tiếng Anh, tiếng Nhật
    r"lập.*trình",
    r"học.*mỗi.*ngày",
    r"lên.*kế.*hoạch",
    r"lên.*lịch",
    r"tạo.*kế.*hoạch",
    r"học tập",
    r"môn.*học",
    r"cần học",
    r"cần.*lên.*lịch",
    r"học như thế nào",
    r"bắt đầu học",
    r"cho mình.*học",
    r"tư vấn.*học",
    r"muốn cải thiện",
    r"đồng ý.*kế hoạch",
    r"đồng ý.*lịch",
    r"tạo kế hoạch",
    r"tạo lịch",
]

def _detect_setup_intent(message: str) -> Optional[dict]:
    """Detect if user wants to create a 14-day study plan."""
    import re
    m = message.lower()
    for pat in SETUP_PATTERNS:
        if re.search(pat, m):
            return {
                "detected": True,
                "goal": m,
                "hours_per_day": 2,
                "work_schedule": "",
            }
    return None


@router.post("/plan-14-days", response_model=Plan14DaysResponse)
def plan_14_days(data: Plan14DaysRequest, db: Session = Depends(get_db)):
    """Tạo kế hoạch học 14 ngày từ mục tiêu + lịch rảnh."""
    result = generate_14day_plan_with_availability(db, goal=data.goal)
    return Plan14DaysResponse(**result)


# ── Plan Setup State Machine ─────────────────────────────────────────
PLAN_SETUP_FLOW = [
    {"step": "subject", "field": "goal",
     "ask": "🎯 **Bạn muốn học môn gì?**\n\nVD: IELTS, lập trình Python, GPA môn Toán, tiếng Nhật,...\n\nNói cho mình biết mục tiêu của bạn nhé!"},
    {"step": "confirm", "field": "confirmed",
     "ask": None},  # generated dynamically
]

def _get_or_create_setup_session(db: Session, chat_session_id: str) -> PlanSetupSession:
    session = db.query(PlanSetupSession).filter(
        PlanSetupSession.chat_session_id == chat_session_id
    ).first()
    if not session:
        session = PlanSetupSession(chat_session_id=chat_session_id)
        db.add(session)
        db.commit()
    return session

def _delete_setup_session(db: Session, chat_session_id: str):
    db.query(PlanSetupSession).filter(
        PlanSetupSession.chat_session_id == chat_session_id
    ).delete()
    db.commit()

def _build_setup_summary(data: dict) -> str:
    lines = ["📋 **Tổng kết thông tin:**\n"]
    if data.get("goal"):
        lines.append(f"🎯 Mục tiêu: **{data['goal']}**")
    if data.get("has_documents") == "có":
        lines.append("📚 Đã có tài liệu (upload Knowledge Center)")
    else:
        lines.append("📚 Không có tài liệu — AI tự soạn")
    if data.get("work_schedule"):
        lines.append(f"💼 Lịch làm việc: **{data['work_schedule']}**")
    if data.get("evening_routine"):
        lines.append(f"🌙 Tối: **{data['evening_routine']}**")
    if data.get("rest_days"):
        lines.append(f"📅 Nghỉ: **{data['rest_days']}**")
    if data.get("hours_per_day"):
        lines.append(f"⏰ Mỗi ngày: **{data['hours_per_day']}**")
    if data.get("preferred_time"):
        lines.append(f"🕐 Khung giờ: **{data['preferred_time']}**")
    if data.get("free_today"):
        lines.append(f"🕐 Hôm nay rảnh: **{data['free_today']}**")
    return "\n".join(lines)

def _handle_plan_setup(message: str, db: Session, chat_session_id: str = "default") -> str:
    """Handle plan setup state machine. Returns AI reply text."""
    import re
    session = _get_or_create_setup_session(db, chat_session_id)
    data = dict(session.data) if session.data else {}

    # ── Get current step info ──
    current_step = session.step
    step_idx = None
    for i, s in enumerate(PLAN_SETUP_FLOW):
        if s["step"] == current_step:
            step_idx = i
            break

    if step_idx is None:
        step_idx = 0
        current_step = PLAN_SETUP_FLOW[0]["step"]

    step_def = PLAN_SETUP_FLOW[step_idx]

    # ── Allow restart ──
    m_lower = message.lower().strip()
    if any(w in m_lower for w in ["làm lại", "bắt đầu lại", "reset", "start over", "nhập lại", "làm lai", "bat dau lai"]):
        _delete_setup_session(db, chat_session_id)
        session = _get_or_create_setup_session(db, chat_session_id)
        data = {}
        return PLAN_SETUP_FLOW[0]["ask"]

    # ── Parse user's response for current step ──
    if current_step == "subject":
        data["goal"] = message.strip()
        # After subject, check if availability exists
        if not _check_availability_exists(db):
            session.data = data
            session.step = "waiting_availability"
            db.commit()
            return ("__NEED_AVAILABILITY__" + json.dumps({"goal": data["goal"]}))
    elif current_step == "waiting_availability":
        data["goal"] = data.get("goal") or message.strip()
    elif current_step == "confirm":
        if any(w in m_lower for w in ["ok", "đồng ý", "đồng y", "yes", "yeah", "được", "duoc", "ok luôn", "ok nha",
                                         "ừ", "u", "tạo đi", "làm đi", "go", "triển", "trien", "làm luôn"]):
            plan_result = generate_14day_plan_with_availability(
                db,
                goal=data.get("goal", message),
            )
            if plan_result.get("success"):
                reply = (
                    f"✅ **Đã tạo kế hoạch 14 ngày thành công!** 🎉\n\n"
                    f"🎯 **Mục tiêu:** {plan_result['goal_name']}\n"
                    f"📅 **{plan_result.get('tasks_created', 0)} tasks** · "
                    f"🗓️ **{plan_result.get('slots_created', 0)} buổi học** được tạo\n\n"
                    f"**Tóm tắt:** {plan_result['summary']}\n\n"
                    f"👉 Vào **Kế hoạch & Nhật ký (Today)** để xem chi tiết!\n\n"
                    f"Sau 14 ngày mình sẽ hỏi bạn để tạo kế hoạch mới nhé! 🚀"
                )
                _delete_setup_session(db, chat_session_id)
                return reply
            else:
                _delete_setup_session(db, chat_session_id)
                return f"❌ Rất tiếc, mình không thể tạo kế hoạch ngay lúc này. Lỗi: {plan_result.get('error', 'không xác định')}\n\nHãy thử lại sau nhé!"
        else:
            return "❓ **Bạn chưa đồng ý?** Nói **\"đồng ý\"** để tạo kế hoạch, hoặc nói **\"làm lại\"** để chọn môn khác."

    # ── Advance to next step ──
    session.data = data
    step_idx += 1

    if step_idx >= len(PLAN_SETUP_FLOW):
        _delete_setup_session(db, chat_session_id)
        return "✅ Đã hoàn tất! Bạn muốn mình tạo kế hoạch 14 ngày chứ?"

    next_step = PLAN_SETUP_FLOW[step_idx]

    if next_step["step"] == "confirm":
        summary = (
            "📋 **Tổng kết thông tin:**\n\n"
            f"🎯 Mục tiêu: **{data.get('goal', '?')}**\n"
            f"📅 Lịch rảnh: Đã lưu trong hệ thống (14 ngày)\n"
        )
        reply = summary + "\n\n✅ **Bạn đồng ý tạo kế hoạch chứ?**\n\n"
        reply += "Nói **\"đồng ý\"** để tạo ngay, hoặc **\"làm lại\"** để chọn môn khác."
        session.step = next_step["step"]
        db.commit()
        return reply

    session.step = next_step["step"]
    db.commit()
    return next_step["ask"]


def _extract_hours(text: str) -> float:
    """Extract number of hours from text like '2 tiếng', '1.5 h', etc."""
    import re
    m = re.search(r"(\d+[.,]?\d*)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return 2.0

def _build_schedule_text(data: dict) -> str:
    parts = []
    if data.get("work_schedule"):
        parts.append(f"Lịch làm việc: {data['work_schedule']}")
    if data.get("evening_routine"):
        parts.append(f"Tối: {data['evening_routine']}")
    if data.get("rest_days"):
        parts.append(f"Nghỉ: {data['rest_days']}")
    if data.get("preferred_time"):
        parts.append(f"Khung giờ học: {data['preferred_time']}")
    if data.get("free_today"):
        parts.append(f"Hôm nay rảnh: {data['free_today']}")
    return "; ".join(parts)


@router.post("/chat/stream")
def ai_chat_stream(data: ChatRequest, db: Session = Depends(get_db)):
    """Chat với AI Coach — streaming response qua SSE."""
    session_id = data.session_id
    message = data.message

    if not message.strip():
        raise HTTPException(400, "Tin nhắn không được để trống")

    user_msg = AIConversation(session_id=session_id, role="user", message=message)
    db.add(user_msg)
    db.commit()

    history = [
        {"role": c.role, "message": c.message}
        for c in db.query(AIConversation).filter(
            AIConversation.session_id == session_id
        ).order_by(AIConversation.created_at).limit(20).all()
    ]
    user_context = _build_user_context(db)

    def generate():
        full_reply = ""
        # Check for active plan setup session first
        existing_session = db.query(PlanSetupSession).filter(
            PlanSetupSession.chat_session_id == session_id
        ).first()
        if existing_session:
            reply = _handle_plan_setup(message, db, session_id)
            full_reply = reply
            yield f"data: {json.dumps({'chunk': reply}, ensure_ascii=False)}\n\n"
            plan_done = "✅" in reply and "tạo kế hoạch" in reply
            yield f"data: {json.dumps({'done': True, 'session_id': session_id, 'plan_created': plan_done})}\n\n"
        elif _detect_setup_intent(message):
            _get_or_create_setup_session(db, session_id)
            reply = _handle_plan_setup(message, db, session_id)
            full_reply = reply
            yield f"data: {json.dumps({'chunk': reply}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"
        else:
            stream_gen = chat_with_gemini_stream(message, history, user_context)
            if stream_gen:
                for chunk in stream_gen:
                    full_reply += chunk
                    yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"
            else:
                reply = _fallback_chat(message, db, chat_session_id=session_id)
                full_reply = reply
                yield f"data: {json.dumps({'chunk': reply}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"

        ai_msg = AIConversation(session_id=session_id, role="assistant", message=full_reply)
        db.add(ai_msg)
        db.commit()

    return StreamingResponse(generate(), media_type="text/event-stream")


def _fallback_chat(message: str, db: Session, chat_session_id: str = "default") -> str:
    """Rule-based fallback khi Gemini không khả dụng."""
    message_lower = message.lower()
    # Check for active plan setup session
    existing_session = db.query(PlanSetupSession).filter(
        PlanSetupSession.chat_session_id == chat_session_id
    ).first()
    if existing_session:
        return _handle_plan_setup(message, db, chat_session_id)
    setup = _detect_setup_intent(message)
    if setup:
        _get_or_create_setup_session(db, chat_session_id)
        return _handle_plan_setup(message, db, chat_session_id)
    if any(w in message_lower for w in ["mệt", "mỏi", "kiệt sức", "stress"]):
        return (
            "Mình hiểu cảm giác của bạn! 😌\n\n"
            "Khi mệt mỏi, đừng cố gắng quá sức nhé. Hãy:\n"
            "• Nghỉ ngơi 15 phút, uống nước, hít thở sâu 🧘\n"
            "• Chọn bài học nhẹ như ôn từ vựng hoặc nghe podcast 🎧\n"
            "• Học 25 phút rồi nghỉ 5 phút — đừng học dồn\n\n"
            "Năng lượng hôm nay của bạn có hạn, hãy dùng nó vào việc quan trọng nhất thôi! 💪"
        )
    elif any(w in message_lower for w in ["chán", "không muốn", "lười", "lười biếng"]):
        return (
            "Cảm giác này rất bình thường, ai cũng gặp mà! 😄\n\n"
            "Bí quyết nhỏ: hãy hứa với mình **chỉ học 5 phút thôi**. \n"
            "Chỉ 5 phút — nếu vẫn thấy chán thì nghỉ, không sao cả.\n\n"
            "Nhưng mình cá là sau 5 phút bạn sẽ học tiếp đấy! 🎯\n"
            "Bắt đầu với việc nhỏ nhất, mở sách ra là được rồi."
        )
    elif any(w in message_lower for w in ["band", "4.0", "5.0", "6.0", "7.0", "ielts", "từ 4", "lên band"]):
        goals = db.query(Goal).filter(Goal.type == "ielts").first()
        return (
            "Chuyện cải thiện IELTS band là hoàn toàn khả thi! 🎯\n\n"
            f"Mình thấy bạn đang có mục tiêu IELTS: "
            + (f"{goals.current_value}/{goals.target_value}" if goals else "chưa thiết lập") + "\n\n"
            "Để lên band hiệu quả, bạn cần:\n"
            "📖 **Từ vựng** — Học 10-15 từ/ngày theo chủ đề\n"
            "🎧 **Listening** — Nghe podcast IELTS 20 phút/ngày\n"
            "✍️ **Writing** — Viết 1 task/tuần, chấm bằng AI\n"
            "🗣️ **Speaking** — Luyện nói 10 phút/ngày với gương\n\n"
            "Quan trọng nhất: **học ĐỀU mỗi ngày 1-2 tiếng** thay vì học dồn! 💪\n\n"
            "👉 Nói **\"Lên kế hoạch 14 ngày giúp mình!\"** để mình tạo lịch học chi tiết từng ngày nhé! 😊"
        )
    elif any(w in message_lower for w in ["tiến độ", "bao giờ", "khi nào", "dự đoán"]):
        preds = get_all_predictions(db)
        reply = "📊 Dự đoán hoàn thành:\n"
        for p in preds:
            reply += f"- {p['goal_type']}: {p.get('predicted_date', '?')} (tự tin: {p.get('confidence', '?')})\n"
        return reply
    elif any(w in message_lower for w in ["kế hoạch", "hôm nay", "làm gì", "học"]):
        plan = generate_daily_plan(db, user_id=1)
        from app.ai_knowledge.daily_planner import get_today_mission
        daily_mission = get_today_mission(db)
        v3_items = []
        if daily_mission and daily_mission.items:
            import json
            v3_items = json.loads(daily_mission.items) if isinstance(daily_mission.items, str) else daily_mission.items

        reply = "📋 Kế hoạch hôm nay:\n\n"
        has_content = False
        if plan.get("blocks"):
            has_content = True
            reply += "⏰ **Lịch học đề xuất:**\n"
            for b in plan.get("blocks", []):
                reply += f"- {b['start_time']}-{b['end_time']}: {b['title']} ({b['goal_type']})\n"
            reply += f"⚡ Năng lượng: {plan.get('energy', 0)}%\n"
        if v3_items:
            has_content = True
            reply += "\n📚 **Bài học từ tài liệu đã upload:**\n"
            for item in v3_items[:5]:
                icon = {'study': '📖', 'review': '🔄', 'quiz': '📝', 'explore': '🔍'}.get(item.get('type', ''), '📌')
                reply += f"- {icon} {item['title']} (+{item['xp']}XP, {item['duration_minutes']}ph)\n"
            reply += "\n👉 Vào **Kế hoạch & Nhật ký** để bắt đầu học!"
        if not has_content:
            pack_count = db.query(KnowledgePack).filter(KnowledgePack.status == "ready").count()
            if pack_count > 0:
                return (
                    "📋 Bạn đã upload tài liệu nhưng chưa có bài học nào hôm nay.\n\n"
                    "Hãy vào **Kế hoạch & Nhật ký** để xem danh sách bài học có sẵn!\n"
                    "Hoặc nếu muốn, mình có thể giúp bạn lên mục tiêu học tập — cho mình biết bạn muốn học gì nhé! 🎯"
                )
            return (
                "📋 Bạn chưa có mục tiêu học tập nào!\n\n"
                "Hãy nói cho mình biết bạn muốn học gì và lịch rảnh, mình sẽ **tạo ngay kế hoạch 14 ngày** cho bạn!\n\n"
                "📌 VD: *\"Mình muốn học IELTS, mỗi ngày rảnh 2 tiếng, đi làm 8h-17h\"*\n"
                "📌 VD: *\"Học lập trình, tối rảnh 1.5 tiếng\"*\n"
                "📌 VD: *\"Lên kế hoạch học GPA, mỗi ngày 3 tiếng\"*\n\n"
                "Hoặc upload tài liệu lên **Knowledge Center** để AI tự động tạo bài học 🚀"
            )
        return reply
    elif any(w in message_lower for w in ["điểm", "life score"]):
        score = calculate_life_score(db)
        return (f"🏆 Life Score: {score['score']}/100\n"
                f"IELTS: {score['ielts']} | GPA: {score['gpa']} | DevOps: {score['devops']}")
    elif any(w in message_lower for w in ["đánh giá", "review"]):
        review = generate_daily_review(db)
        reply = f"📝 Đánh giá hôm nay: {review['rating']}/5 sao\nHoàn thành: {review['completion_percent']}%\n"
        if review.get('suggestions'):
            reply += "Gợi ý: " + ", ".join(review['suggestions'])
        return reply
    elif any(w in message_lower for w in ["năng lượng", "energy"]):
        remaining = get_remaining_energy(db)
        return f"⚡ Năng lượng còn lại: {remaining}%"
    else:
        goal_count = db.query(Goal).count()
        task_count = db.query(Task).count()
        log_count = db.query(DailyLog).count()
        is_new_user = (goal_count == 0 and task_count == 0 and log_count == 0)
        if is_new_user:
            return (
                "Chào mừng bạn đến với LIFE QUEST! 🎉\n\n"
                "Mình thấy bạn là người dùng mới — hãy cùng nhau thiết lập hành trình học tập nhé!\n\n"
                "Để mình giúp bạn, hãy trả lời:\n"
                "1️⃣ **Bạn muốn học gì?** (VD: IELTS, lập trình, GPA, v.v.)\n"
                "2️⃣ **Mỗi ngày bạn rảnh mấy tiếng?**\n"
                "3️⃣ **Khi nào bạn cần đạt mục tiêu?**\n\n"
                "Cứ nói tự nhiên như với bạn bè nhé! 😊"
            )
        else:
            return (
                "👋 Mình luôn sẵn sàng trò chuyện và tư vấn cho bạn!\n\n"
                "Bạn có thể hỏi mình về:\n"
                "📊 **Tiến độ, dự đoán** — \"Bao giờ mình lên được 7.0 IELTS?\"\n"
                "📋 **Kế hoạch hôm nay** — \"Hôm nay mình nên học gì?\"\n"
                "📝 **Đánh giá** — \"Review hôm nay của mình thế nào?\"\n"
                "⚡ **Năng lượng** — \"Năng lượng còn lại\"\n"
                "💬 **Tâm sự** — Cứ nói những gì bạn nghĩ!\n\n"
                "Bạn muốn bắt đầu với điều gì? 🎯"
            )


@router.get("/chat/sessions")
def ai_chat_sessions(db: Session = Depends(get_db)):
    """Lấy danh sách các session chat (id + thời gian + preview)"""
    from sqlalchemy import text
    rows = db.execute(text("""
        SELECT session_id, MIN(created_at) as first_msg, MAX(created_at) as last_msg,
               (SELECT message FROM ai_conversations WHERE session_id = a.session_id AND role = 'user' ORDER BY created_at LIMIT 1) as preview
        FROM ai_conversations a
        WHERE session_id != '' AND session_id IS NOT NULL
        GROUP BY session_id
        ORDER BY last_msg DESC
    """)).fetchall()
    return [
        {
            "session_id": r[0],
            "first_message": r[1].isoformat() if r[1] else None,
            "last_message": r[2].isoformat() if r[2] else None,
            "preview": (r[3] or "")[:100],
        }
        for r in rows
    ]


@router.get("/chat/history/{session_id}", response_model=List[AIConversationResponse])
def ai_chat_history(session_id: str, db: Session = Depends(get_db)):
    """Lấy lịch sử chat"""
    messages = db.query(AIConversation).filter(
        AIConversation.session_id == session_id
    ).order_by(AIConversation.created_at).all()
    return messages


@router.get("/life-score", response_model=LifeScoreResponse)
def ai_life_score(db: Session = Depends(get_db)):
    """Life Score hiện tại"""
    score = calculate_life_score(db)
    return LifeScoreResponse(
        score=score["score"], ielts=score["ielts"],
        gpa=score["gpa"], devops=score["devops"],
        streak=score["streak"], achievement=score["achievement"],
        level=score["level"]
    )


@router.get("/notifications", response_model=List[SmartNotificationResponse])
def ai_notifications(db: Session = Depends(get_db)):
    """Lấy thông báo thông minh"""
    return db.query(SmartNotification).order_by(SmartNotification.created_at.desc()).limit(20).all()


@router.patch("/notifications/read/{notification_id}")
def ai_notification_read(notification_id: int, db: Session = Depends(get_db)):
    """Đánh dấu thông báo đã đọc"""
    notif = db.query(SmartNotification).filter(SmartNotification.id == notification_id).first()
    if not notif:
        raise HTTPException(404, "Thông báo không tồn tại")
    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.commit()
    return {"status": "ok", "message": "Đã đánh dấu đã đọc"}


@router.get("/stats", response_model=UserStatisticsSummary)
def ai_stats(db: Session = Depends(get_db)):
    """Thống kê tổng quan"""
    from datetime import timedelta
    from app.models import Player, Task, Goal

    today = date.today()
    week_ago = today - timedelta(days=7)

    stats = db.query(UserStatistic).filter(
        UserStatistic.date >= week_ago,
        UserStatistic.date <= today
    ).all()

    total_hours = sum(s.total_hours for s in stats)
    total_tasks = sum(s.tasks_completed for s in stats)
    avg_hours = round(total_hours / 7, 1) if stats else 0
    best_day = max(stats, key=lambda s: s.total_hours).date.isoformat() if stats else None

    daily_logs_completed = db.query(UserStatistic).filter(
        UserStatistic.date >= week_ago
    ).count()
    avg_completion = round((daily_logs_completed / 7) * 100, 1) if daily_logs_completed > 0 else 0

    player = db.query(Player).first()
    total_exp = player.exp if player else 0
    streak = player.streak if player else 0

    return UserStatisticsSummary(
        total_hours_7d=total_hours,
        total_tasks_7d=total_tasks,
        avg_daily_hours=avg_hours,
        avg_completion=avg_completion,
        best_day=best_day,
        current_streak=streak,
        total_exp=total_exp
    )


@router.post("/upload-plan")
def ai_upload_plan(
    file: UploadFile = File(...),
    subject: str = Form(...),
    message: str = Form(""),
    db: Session = Depends(get_db),
):
    """Upload tài liệu → AI phân tích + sinh lịch học cá nhân hóa."""
    if not file.filename:
        raise HTTPException(400, "Vui lòng chọn file")
    try:
        file_bytes = file.file.read()
        doc_text = parse_uploaded_file(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception:
        raise HTTPException(400, "Không thể đọc file. Hỗ trợ: PDF, DOCX, TXT")

    result = generate_study_plan_from_document(db, doc_text, subject, message)
    return result
