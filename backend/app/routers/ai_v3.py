from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas_v2 import (
    DigitalTwinResponse, RiskScoreResponse, MonthlyReviewResponse,
    HabitDetectionResponse, ActivityLogResponse
)
from app.ai.digital_twin import get_learning_profile, update_twin_from_daily_log, record_activity
from app.ai.risk_engine import get_all_risks, calculate_risk_score
from app.ai.monthly_review import generate_monthly_review
from app.ai.learning_insight import detect_habits

router = APIRouter(prefix="/api/ai/v3", tags=["AI Engine V3"])


@router.get("/twin", response_model=DigitalTwinResponse)
def api_digital_twin(db: Session = Depends(get_db)):
    return get_learning_profile(db)


@router.post("/twin/update")
def api_update_twin(db: Session = Depends(get_db)):
    twin = update_twin_from_daily_log(db)
    return {"status": "ok", "last_updated": twin.last_updated.isoformat()}


@router.post("/twin/activity")
def api_record_activity(goal_type: str = Query(...), activity_type: str = Query(...),
                        duration_minutes: int = Query(...), score: float = Query(None),
                        is_completed: bool = Query(True), module: str = Query(None),
                        lesson: str = Query(None), energy_before: int = Query(None),
                        energy_after: int = Query(None), difficulty: int = Query(3),
                        db: Session = Depends(get_db)):
    act = record_activity(db, 1, goal_type, activity_type, duration_minutes,
                          score, is_completed, module, lesson, energy_before, energy_after, difficulty)
    return {"status": "ok", "activity_id": act.id}


@router.get("/risks", response_model=List[RiskScoreResponse])
def api_all_risks(db: Session = Depends(get_db)):
    return get_all_risks(db)


@router.get("/risks/{goal_type}", response_model=RiskScoreResponse)
def api_goal_risk(goal_type: str, db: Session = Depends(get_db)):
    return calculate_risk_score(db, goal_type)


@router.get("/monthly-review", response_model=MonthlyReviewResponse)
def api_monthly_review(month: int = Query(None), year: int = Query(None),
                       db: Session = Depends(get_db)):
    return generate_monthly_review(db, month, year)


@router.get("/habits", response_model=HabitDetectionResponse)
def api_habits(db: Session = Depends(get_db)):
    habits = detect_habits(db)
    return {"habits": habits}
