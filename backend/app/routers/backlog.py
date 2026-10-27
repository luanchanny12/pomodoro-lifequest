from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import BacklogItem
from app.schemas import BacklogItemCreate, BacklogItemUpdate, BacklogItemResponse

router = APIRouter(prefix="/api/backlog", tags=["Backlog"])


@router.get("", response_model=List[BacklogItemResponse])
def list_backlog(status: str = Query(None), category: str = Query(None), db: Session = Depends(get_db)):
    q = db.query(BacklogItem)
    if status:
        q = q.filter(BacklogItem.status == status)
    if category:
        q = q.filter(BacklogItem.category == category)
    return q.order_by(BacklogItem.created_at.desc()).all()


@router.post("", response_model=BacklogItemResponse, status_code=201)
def create_backlog(data: BacklogItemCreate, db: Session = Depends(get_db)):
    item = BacklogItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=BacklogItemResponse)
def update_backlog(item_id: int, data: BacklogItemUpdate, db: Session = Depends(get_db)):
    item = db.query(BacklogItem).filter(BacklogItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Backlog item không tồn tại")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_backlog(item_id: int, db: Session = Depends(get_db)):
    item = db.query(BacklogItem).filter(BacklogItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Backlog item không tồn tại")
    db.delete(item)
    db.commit()
    return {"ok": True}
