from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import datetime
from app.database import get_db
from app.models import DailyLog
from app.schemas import DailyLogCreate, DailyLogUpdate, DailyLogResponse

router = APIRouter(prefix="/api/daily-logs", tags=["Nhật ký"])


@router.get("", response_model=List[DailyLogResponse])
def list_daily_logs(log_date: datetime.date = Query(None, alias="date"), db: Session = Depends(get_db)):
    q = db.query(DailyLog)
    if log_date:
        q = q.filter(DailyLog.date == log_date)
    return q.order_by(DailyLog.date.desc()).all()


@router.get("/latest", response_model=DailyLogResponse)
def get_latest_log(db: Session = Depends(get_db)):
    log = db.query(DailyLog).order_by(DailyLog.date.desc()).first()
    if not log:
        raise HTTPException(404, "Chưa có nhật ký nào")
    return log


@router.post("", response_model=DailyLogResponse, status_code=201)
def create_daily_log(data: DailyLogCreate, db: Session = Depends(get_db)):
    existing = db.query(DailyLog).filter(DailyLog.date == data.date).first()
    if existing:
        raise HTTPException(400, "Nhật ký cho ngày này đã tồn tại")
    log = DailyLog(**data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.put("/{log_id}", response_model=DailyLogResponse)
def update_daily_log(log_id: int, data: DailyLogUpdate, db: Session = Depends(get_db)):
    log = db.query(DailyLog).filter(DailyLog.id == log_id).first()
    if not log:
        raise HTTPException(404, "Nhật ký không tồn tại")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(log, k, v)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}")
def delete_daily_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(DailyLog).filter(DailyLog.id == log_id).first()
    if not log:
        raise HTTPException(404, "Nhật ký không tồn tại")
    db.delete(log)
    db.commit()
    return {"message": "Đã xóa nhật ký"}
