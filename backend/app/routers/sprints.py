from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Sprint, SprintDay
from app.schemas import SprintCreate, SprintUpdate, SprintResponse, SprintDayCreate, SprintDayUpdate, SprintDayResponse

router = APIRouter(prefix="/api/sprints", tags=["Sprint"])


@router.get("", response_model=List[SprintResponse])
def list_sprints(db: Session = Depends(get_db)):
    return db.query(Sprint).order_by(Sprint.created_at.desc()).all()


@router.post("", response_model=SprintResponse, status_code=201)
def create_sprint(data: SprintCreate, db: Session = Depends(get_db)):
    sprint = Sprint(**data.model_dump())
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


@router.get("/{sprint_id}", response_model=SprintResponse)
def get_sprint(sprint_id: int, db: Session = Depends(get_db)):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(404, "Sprint không tồn tại")
    return sprint


@router.put("/{sprint_id}", response_model=SprintResponse)
def update_sprint(sprint_id: int, data: SprintUpdate, db: Session = Depends(get_db)):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(404, "Sprint không tồn tại")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sprint, k, v)
    db.commit()
    db.refresh(sprint)
    return sprint


@router.delete("/{sprint_id}")
def delete_sprint(sprint_id: int, db: Session = Depends(get_db)):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(404, "Sprint không tồn tại")
    db.delete(sprint)
    db.commit()
    return {"message": "Đã xóa sprint"}


@router.get("/{sprint_id}/days", response_model=List[SprintDayResponse])
def list_sprint_days(sprint_id: int, db: Session = Depends(get_db)):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(404, "Sprint không tồn tại")
    return db.query(SprintDay).filter(SprintDay.sprint_id == sprint_id).order_by(SprintDay.date).all()


@router.post("/sprint-days", response_model=SprintDayResponse, status_code=201)
def create_sprint_day(data: SprintDayCreate, db: Session = Depends(get_db)):
    sprint = db.query(Sprint).filter(Sprint.id == data.sprint_id).first()
    if not sprint:
        raise HTTPException(404, "Sprint không tồn tại")
    day = SprintDay(**data.model_dump())
    db.add(day)
    db.commit()
    db.refresh(day)
    return day


@router.patch("/sprint-days/{day_id}", response_model=SprintDayResponse)
def update_sprint_day(day_id: int, data: SprintDayUpdate, db: Session = Depends(get_db)):
    day = db.query(SprintDay).filter(SprintDay.id == day_id).first()
    if not day:
        raise HTTPException(404, "Ngày sprint không tồn tại")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(day, k, v)
    db.commit()
    db.refresh(day)
    return day


@router.delete("/sprint-days/{day_id}")
def delete_sprint_day(day_id: int, db: Session = Depends(get_db)):
    day = db.query(SprintDay).filter(SprintDay.id == day_id).first()
    if not day:
        raise HTTPException(404, "Ngày sprint không tồn tại")
    db.delete(day)
    db.commit()
    return {"message": "Đã xóa ngày sprint"}
