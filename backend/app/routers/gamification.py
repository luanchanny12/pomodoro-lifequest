from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Level, Achievement
from app.schemas import PlayerResponse, AchievementResponse, LevelResponse
from app.services.gamification import get_player, add_exp, add_coins, check_streak, update_streak, unlock_achievement

router = APIRouter(prefix="/api", tags=["Game hóa"])


class AddExpRequest(BaseModel):
    player_id: int
    amount: int


class UnlockAchievementRequest(BaseModel):
    player_id: int
    code: str


class AddCoinsRequest(BaseModel):
    amount: int


@router.get("/player", response_model=PlayerResponse)
def get_player_endpoint(db: Session = Depends(get_db)):
    return get_player(db)


@router.post("/player/add-exp", response_model=PlayerResponse)
def add_exp_endpoint(data: AddExpRequest, db: Session = Depends(get_db)):
    try:
        return add_exp(db, data.player_id, data.amount)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/player/achievements", response_model=List[AchievementResponse])
def list_achievements(db: Session = Depends(get_db)):
    player = get_player(db)
    return db.query(Achievement).filter(Achievement.player_id == player.id).all()


@router.post("/player/add-coins", response_model=PlayerResponse)
def add_coins_endpoint(data: AddCoinsRequest, db: Session = Depends(get_db)):
    player = get_player(db)
    try:
        return add_coins(db, player.id, data.amount)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/player/update-streak", response_model=PlayerResponse)
def update_streak_endpoint(db: Session = Depends(get_db)):
    player = get_player(db)
    return update_streak(db, player.id)


@router.get("/player/check-streak", response_model=PlayerResponse)
def check_streak_endpoint(db: Session = Depends(get_db)):
    player = get_player(db)
    return check_streak(db, player.id)


@router.post("/player/unlock-achievement", response_model=AchievementResponse)
def unlock_achievement_endpoint(data: UnlockAchievementRequest, db: Session = Depends(get_db)):
    try:
        return unlock_achievement(db, data.player_id, data.code)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/levels", response_model=List[LevelResponse])
def list_levels(db: Session = Depends(get_db)):
    return db.query(Level).order_by(Level.level).all()
