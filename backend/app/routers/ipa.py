from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import IPA
from app.schemas import IPACreate, IPAUpdate, IPAResponse

router = APIRouter(prefix="/api/ipa", tags=["IPA"])


@router.get("", response_model=List[IPAResponse])
def list_ipa(db: Session = Depends(get_db)):
    return db.query(IPA).order_by(IPA.symbol).all()


@router.post("", response_model=IPAResponse, status_code=201)
def create_ipa(data: IPACreate, db: Session = Depends(get_db)):
    existing = db.query(IPA).filter(IPA.symbol == data.symbol).first()
    if existing:
        raise HTTPException(400, "Ký hiệu IPA đã tồn tại")
    item = IPA(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{ipa_id}", response_model=IPAResponse)
def update_ipa(ipa_id: int, data: IPAUpdate, db: Session = Depends(get_db)):
    item = db.query(IPA).filter(IPA.id == ipa_id).first()
    if not item:
        raise HTTPException(404, "Ký hiệu IPA không tồn tại")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{ipa_id}")
def delete_ipa(ipa_id: int, db: Session = Depends(get_db)):
    item = db.query(IPA).filter(IPA.id == ipa_id).first()
    if not item:
        raise HTTPException(404, "Ký hiệu IPA không tồn tại")
    db.delete(item)
    db.commit()
    return {"message": "Đã xóa ký hiệu IPA"}
