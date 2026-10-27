from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Goal
from app.schemas import GoalCreate, GoalUpdate, GoalResponse

router = APIRouter(prefix="/api/goals", tags=["Mục tiêu"])


@router.get("", response_model=List[GoalResponse])
def list_goals(db: Session = Depends(get_db)):
    return db.query(Goal).order_by(Goal.created_at.desc()).all()


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Mục tiêu không tồn tại")
    return goal


@router.post("", response_model=GoalResponse, status_code=201)
def create_goal(data: GoalCreate, db: Session = Depends(get_db)):
    goal = Goal(**data.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(goal_id: int, data: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Mục tiêu không tồn tại")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(goal, k, v)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Mục tiêu không tồn tại")
    db.delete(goal)
    db.commit()
    return {"message": "Đã xóa mục tiêu"}
