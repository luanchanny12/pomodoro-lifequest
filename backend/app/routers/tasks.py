from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import datetime
from app.database import get_db
from app.models import Task
from app.schemas import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/api/tasks", tags=["Nhiệm vụ"])


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Nhiệm vụ không tồn tại")
    return task


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    task_date: datetime.date = Query(None, alias="date"),
    status: str = Query(None),
    goal_type: str = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Task)
    if task_date:
        q = q.filter(Task.date == task_date)
    if status:
        q = q.filter(Task.status == status)
    if goal_type:
        q = q.filter(Task.goal_type == goal_type)
    return q.order_by(Task.created_at.desc()).all()


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Nhiệm vụ không tồn tại")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(task, k, v)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Nhiệm vụ không tồn tại")
    db.delete(task)
    db.commit()
    return {"message": "Đã xóa nhiệm vụ"}
