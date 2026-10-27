from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import datetime
from app.database import get_db
from app.models import StudyHour
from fastapi import HTTPException
from app.schemas import StudyHourCreate, StudyHourUpdate, StudyHourResponse

router = APIRouter(prefix="/api/study-hours", tags=["Giờ học"])


@router.get("", response_model=List[StudyHourResponse])
def list_study_hours(
    date_from: datetime.date = Query(None),
    date_to: datetime.date = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(StudyHour)
    if date_from:
        q = q.filter(StudyHour.date >= date_from)
    if date_to:
        q = q.filter(StudyHour.date <= date_to)
    return q.order_by(StudyHour.date.desc()).all()


@router.get("/weekly", response_model=List[StudyHourResponse])
def weekly_study_hours(db: Session = Depends(get_db)):
    today = datetime.date.today()
    start = today - datetime.timedelta(days=today.weekday())
    end = start + datetime.timedelta(days=6)
    q = db.query(StudyHour).filter(StudyHour.date >= start, StudyHour.date <= end)
    return q.order_by(StudyHour.date).all()


@router.post("", response_model=StudyHourResponse, status_code=201)
def create_study_hour(data: StudyHourCreate, db: Session = Depends(get_db)):
    entry = StudyHour(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/{hour_id}", response_model=StudyHourResponse)
def update_study_hour(hour_id: int, data: StudyHourUpdate, db: Session = Depends(get_db)):
    entry = db.query(StudyHour).filter(StudyHour.id == hour_id).first()
    if not entry:
        raise HTTPException(404, "Bản ghi học tập không tồn tại")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entry, k, v)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{hour_id}")
def delete_study_hour(hour_id: int, db: Session = Depends(get_db)):
    entry = db.query(StudyHour).filter(StudyHour.id == hour_id).first()
    if not entry:
        raise HTTPException(404, "Bản ghi học tập không tồn tại")
    db.delete(entry)
    db.commit()
    return {"message": "Đã xóa bản ghi học tập"}
