from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.database import get_db
from app.models import Player
from app.models_v2 import (
    SpacedRepetition, VirtualCoachMessage, FocusScore,
    Quest, QuestProgress, BossFight, ShopItem, Purchase, AvatarState
)
from pydantic import BaseModel
from app.schemas_v2 import (
    ProactiveDashboardResponse, SpacedRepetitionResponse, PriorityScoreResponse,
    AdaptiveDifficultyResponse, VirtualCoachResponse, FocusScoreResponse,
    HeatmapEntry, LifeTimelineEntry, AIReflectionResponse, LearningPatternsResponse,
    QuestResponse, QuestProgressResponse, BossFightResponse,
    ShopItemResponse, PurchaseResponse, AvatarStateResponse, SmartStreakResponse
)
from app.services.gamification import get_player, add_exp, update_streak
from app.models import StudyHour
from app.ai.spaced_repetition import schedule_review, get_due_reviews, get_all_reviews, get_review_stats
from app.ai.knowledge_graph import can_unlock, seed_knowledge_graph
from app.ai.priority_engine import calculate_priority_score, get_priority_ranking
from app.ai.adaptive_difficulty import adjust_difficulty
from app.ai.mental_energy import get_cognitive_load, is_heavy_task, optimize_schedule, get_break_suggestion
from app.ai.learning_insight import detect_patterns, generate_optimal_schedule
from app.ai.focus_score import calculate_focus_score, get_focus_trend
from app.ai.smart_streak import check_recovery_day, get_streak_info
from app.ai.virtual_coach import generate_coach_message, get_active_coach_messages, dismiss_message
from app.ai.predictor_v2 import enhanced_predict, get_all_enhanced_predictions
from app.ai.reflection import generate_reflection
from app.ai.quest_system import seed_quests, check_quests, get_active_quests
from app.ai.boss_system import spawn_boss_for_sprint, defeat_boss, get_sprint_boss
from app.ai.shop import seed_shop, get_shop_items, purchase_item, get_inventory, equip_item
from app.ai.avatar_evolution import check_evolution, get_avatar_info, update_expression
from app.ai.visualization import get_heatmap_data, get_life_timeline
from app.ai.ai_reviewer import calculate_life_score

router = APIRouter(prefix="/api/ai/v2", tags=["AI Engine V2"])


@router.get("/dashboard", response_model=ProactiveDashboardResponse)
def proactive_dashboard(db: Session = Depends(get_db)):
    """AI chủ động phân tích và trả về toàn bộ thông tin cho Dashboard"""
    from datetime import date
    today = date.today()

    coach = generate_coach_message(db)
    focus = calculate_focus_score(db, today)
    ranking = get_priority_ranking(db)
    due = get_due_reviews(db)
    life = calculate_life_score(db)

    blocks = []
    top_goal = ranking[0]["goal_type"] if ranking else "ielts"
    names = {"ielts": "IELTS", "devops": "DevOps", "gpa": "GPA"}

    from app.ai.ai_planner import generate_daily_plan
    plan = generate_daily_plan(db, query_date=today)
    from app.schemas import PlanBlock
    blocks = [PlanBlock(**b) for b in plan.get("blocks", [])]

    quests = get_active_quests(db, quest_type="daily")
    active_quests = [q for q in quests if not q["is_completed"]]
    quest_reminder = None
    if active_quests:
        q = active_quests[0]
        quest_reminder = f"Nhiệm vụ: {q['title']} ({q['progress']}/{q['target']})"

    return ProactiveDashboardResponse(
        sleep_warning=coach.get("content", ""),
        energy_advice=f"Năng lượng: {focus.get('score', 50)}%",
        priority_focus=f"{names.get(top_goal, top_goal)} được ưu tiên nhất",
        next_lesson=f"Tập trung vào {names.get(top_goal, top_goal)}",
        blocks=blocks,
        coach_message=coach.get("content", ""),
        focus_score=focus.get("score", 50),
        life_score=life.get("score", 0),
        prediction_summary="",
        quest_reminder=quest_reminder,
        review_due_count=len(due)
    )


@router.post("/repetition/schedule")
def api_schedule_review(goal_type: str = Query(...), concept_key: str = Query(...),
                        score: float = Query(None), db: Session = Depends(get_db)):
    result = schedule_review(db, goal_type, concept_key, score=score)
    return {"id": result.id, "interval_days": result.interval_days,
            "next_review": result.next_review_date.isoformat() if result.next_review_date else None}


@router.get("/repetition/due", response_model=List[SpacedRepetitionResponse])
def api_due_reviews(goal_type: str = Query(None), db: Session = Depends(get_db)):
    return get_due_reviews(db, goal_type)


@router.get("/repetition/all", response_model=List[SpacedRepetitionResponse])
def api_all_reviews(goal_type: str = Query(None), db: Session = Depends(get_db)):
    return get_all_reviews(db, goal_type)


@router.get("/repetition/stats")
def api_review_stats(db: Session = Depends(get_db)):
    return get_review_stats(db)


@router.get("/knowledge/can-unlock")
def api_can_unlock(goal_type: str = Query(...), module: str = Query(...),
                   lesson: str = Query(...), db: Session = Depends(get_db)):
    return can_unlock(db, goal_type, module, lesson)


@router.get("/priority", response_model=List[PriorityScoreResponse])
def api_priority_ranking(energy: int = Query(100), db: Session = Depends(get_db)):
    return get_priority_ranking(db, energy)


@router.get("/adaptive-difficulty", response_model=AdaptiveDifficultyResponse)
def api_adaptive_difficulty(goal_type: str = Query(...), module: str = Query(...),
                            lesson: str = Query(...), score: float = Query(None),
                            db: Session = Depends(get_db)):
    result = adjust_difficulty(db, goal_type, module, lesson, score)
    return AdaptiveDifficultyResponse(
        lesson_id=0, module=module, lesson=lesson,
        current_difficulty=result["current_difficulty"],
        adjusted_difficulty=result["adjusted_difficulty"],
        reason=result["reason"]
    )


@router.get("/mental-energy/cognitive-load")
def api_cognitive_load(activity: str = Query(...)):
    return {"activity": activity, "cognitive_load": get_cognitive_load(activity),
            "is_heavy": is_heavy_task(activity)}


@router.get("/mental-energy/optimize")
def api_optimize_schedule(blocks: str = Query("[]"), db: Session = Depends(get_db)):
    import json
    try:
        data = json.loads(blocks)
    except:
        return {"error": "Invalid JSON"}
    optimized = optimize_schedule(data)
    breaks = get_break_suggestion(data)
    return {"optimized": optimized, "break_suggestions": breaks}


@router.get("/insights/patterns", response_model=LearningPatternsResponse)
def api_learning_patterns(goal_type: str = Query(None), db: Session = Depends(get_db)):
    patterns = detect_patterns(db)
    return LearningPatternsResponse(
        skipped_subjects=patterns.get("skipped", []),
        best_time_periods={},
        common_mistakes=[],
        efficiency_trend="stable",
        recommended_schedule=[]
    )


@router.get("/insights/schedule")
def api_optimal_schedule(db: Session = Depends(get_db)):
    return generate_optimal_schedule(db)


@router.get("/focus", response_model=FocusScoreResponse)
def api_focus_score(query_date: str = Query(None), db: Session = Depends(get_db)):
    d = date.fromisoformat(query_date) if query_date else date.today()
    result = calculate_focus_score(db, d)
    return FocusScoreResponse(
        id=0, date=d.isoformat(), score=result["score"],
        sleep_hours=result.get("sleep_score", 0) / 25 * 8,
        total_study_minutes=result["total_minutes"],
        task_switches=0,
        tasks_completed=result["tasks_completed"],
        deep_work_minutes=result["total_minutes"]
    )


@router.get("/focus/trend")
def api_focus_trend(days: int = Query(30), db: Session = Depends(get_db)):
    return get_focus_trend(db, days)


@router.get("/streak", response_model=SmartStreakResponse)
def api_smart_streak(db: Session = Depends(get_db)):
    streak_info = get_streak_info(db)
    recovery = check_recovery_day(db)
    return SmartStreakResponse(
        current_streak=streak_info["current_streak"],
        max_streak=streak_info["max_streak"],
        is_recovery_day=recovery["is_recovery_day"],
        recovery_days_used=streak_info["recovery_days_used"],
        message=recovery.get("message", "")
    )


@router.get("/coach", response_model=List[VirtualCoachResponse])
def api_coach_messages(limit: int = Query(3), db: Session = Depends(get_db)):
    return get_active_coach_messages(db, limit)


@router.post("/coach/dismiss")
def api_dismiss_coach(msg_id: int = Query(...), db: Session = Depends(get_db)):
    dismiss_message(db, msg_id)
    return {"status": "ok"}


@router.get("/predict-v2")
def api_predict_v2(goal_type: str = Query(None), db: Session = Depends(get_db)):
    if goal_type:
        return enhanced_predict(db, goal_type)
    return get_all_enhanced_predictions(db)


@router.get("/reflection", response_model=AIReflectionResponse)
def api_reflection(week_start: str = Query(None), db: Session = Depends(get_db)):
    ws = date.fromisoformat(week_start) if week_start else None
    return generate_reflection(db, ws)


@router.get("/quests", response_model=List[QuestResponse])
def api_quests(quest_type: str = Query(None), db: Session = Depends(get_db)):
    check_quests(db)
    return get_active_quests(db, quest_type=quest_type)


@router.post("/quests/check")
def api_check_quests(db: Session = Depends(get_db)):
    result = check_quests(db)
    return {"completed": result}


@router.get("/bosses", response_model=List[BossFightResponse])
def api_bosses(db: Session = Depends(get_db)):
    from app.ai.boss_system import get_all_bosses
    return get_all_bosses(db)


@router.post("/bosses/spawn")
def api_spawn_boss(sprint_id: int = Query(...), db: Session = Depends(get_db)):
    boss = spawn_boss_for_sprint(db, sprint_id)
    if not boss:
        raise HTTPException(400, "Không thể tạo boss cho sprint này")
    return {"id": boss.id, "name": boss.name, "type": boss.boss_type}


@router.post("/bosses/defeat")
def api_defeat_boss(boss_id: int = Query(...), score: int = Query(0),
                    db: Session = Depends(get_db)):
    return defeat_boss(db, boss_id, score)


@router.get("/shop", response_model=List[ShopItemResponse])
def api_shop(item_type: str = Query(None), db: Session = Depends(get_db)):
    return get_shop_items(db, item_type)


@router.post("/shop/buy")
def api_buy_item(item_id: int = Query(...), db: Session = Depends(get_db)):
    return purchase_item(db, 1, item_id)


@router.get("/inventory")
def api_inventory(db: Session = Depends(get_db)):
    return get_inventory(db, 1)


@router.post("/inventory/equip")
def api_equip(purchase_id: int = Query(...), db: Session = Depends(get_db)):
    return equip_item(db, 1, purchase_id)


class FocusSessionRequest(BaseModel):
    minutes: int


@router.post("/focus-session")
def api_focus_session(data: FocusSessionRequest, db: Session = Depends(get_db)):
    if data.minutes < 1:
        raise HTTPException(400, "Thời gian phải >= 1 phút")
    player = get_player(db)
    exp_gained = data.minutes
    coins_gained = exp_gained // 2
    player = add_exp(db, player.id, exp_gained)
    session = StudyHour(
        date=date.today(),
        goal_type="focus",
        hours=round(data.minutes / 60, 2),
    )
    db.add(session)
    db.commit()
    return {
        "success": True,
        "exp_gained": exp_gained,
        "coins_gained": coins_gained,
        "total_exp": player.exp,
        "total_coins": player.coins,
    }


@router.get("/avatar", response_model=AvatarStateResponse)
def api_avatar(db: Session = Depends(get_db)):
    return get_avatar_info(db)


@router.post("/avatar/check-evolution")
def api_check_evolution(db: Session = Depends(get_db)):
    return check_evolution(db)


@router.post("/avatar/expression")
def api_set_expression(expression: str = Query(...), db: Session = Depends(get_db)):
    update_expression(db, 1, expression)
    return {"status": "ok"}


@router.get("/heatmap", response_model=List[HeatmapEntry])
def api_heatmap(goal_type: str = Query(None), days: int = Query(365),
                db: Session = Depends(get_db)):
    return get_heatmap_data(db, goal_type, days)


@router.get("/timeline", response_model=List[LifeTimelineEntry])
def api_timeline(goal_type: str = Query(None), limit: int = Query(50),
                 db: Session = Depends(get_db)):
    return get_life_timeline(db, goal_type, limit)
