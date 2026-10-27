from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import RoadmapItem
from app.schemas import RoadmapItemCreate, RoadmapItemUpdate, RoadmapItemResponse

router = APIRouter(prefix="/api/roadmaps", tags=["Lộ trình"])


@router.get("", response_model=List[RoadmapItemResponse])
def list_roadmaps(goal_type: str = Query(None), db: Session = Depends(get_db)):
    q = db.query(RoadmapItem)
    if goal_type:
        q = q.filter(RoadmapItem.goal_type == goal_type)
    return q.order_by(RoadmapItem.order_index).all()


@router.post("", response_model=RoadmapItemResponse, status_code=201)
def create_roadmap(data: RoadmapItemCreate, db: Session = Depends(get_db)):
    item = RoadmapItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=RoadmapItemResponse)
def update_roadmap(item_id: int, data: RoadmapItemUpdate, db: Session = Depends(get_db)):
    item = db.query(RoadmapItem).filter(RoadmapItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Mục lộ trình không tồn tại")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_roadmap(item_id: int, db: Session = Depends(get_db)):
    item = db.query(RoadmapItem).filter(RoadmapItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Mục lộ trình không tồn tại")
    db.delete(item)
    db.commit()
    return {"message": "Đã xóa mục lộ trình"}
