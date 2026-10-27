import json, io, os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Vocabulary
from app.schemas import VocabularyCreate, VocabularyUpdate, VocabularyResponse, VocabularyBulkCreate, VocabularyBulkItem, VocabularyImportResult

router = APIRouter(prefix="/api/vocabulary", tags=["Từ vựng"])


@router.get("", response_model=List[VocabularyResponse])
def list_vocabulary(search: str = Query(None), db: Session = Depends(get_db)):
    q = db.query(Vocabulary)
    if search:
        q = q.filter(Vocabulary.word.ilike(f"%{search}%") | Vocabulary.meaning.ilike(f"%{search}%"))
    return q.order_by(Vocabulary.created_at.desc()).all()


@router.post("", response_model=VocabularyResponse, status_code=201)
def create_vocabulary(data: VocabularyCreate, db: Session = Depends(get_db)):
    item = Vocabulary(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{vocab_id}", response_model=VocabularyResponse)
def update_vocabulary(vocab_id: int, data: VocabularyUpdate, db: Session = Depends(get_db)):
    item = db.query(Vocabulary).filter(Vocabulary.id == vocab_id).first()
    if not item:
        raise HTTPException(404, "Từ vựng không tồn tại")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{vocab_id}")
def delete_vocabulary(vocab_id: int, db: Session = Depends(get_db)):
    item = db.query(Vocabulary).filter(Vocabulary.id == vocab_id).first()
    if not item:
        raise HTTPException(404, "Từ vựng không tồn tại")
    db.delete(item)
    db.commit()
    return {"message": "Đã xóa từ vựng"}


@router.post("/bulk", response_model=VocabularyImportResult)
def bulk_create_vocabulary(data: VocabularyBulkCreate, db: Session = Depends(get_db)):
    imported = 0
    errors = []
    for i, item in enumerate(data.items):
        try:
            vocab = Vocabulary(**item.model_dump())
            db.add(vocab)
            imported += 1
        except Exception as e:
            errors.append(f"Dòng {i+1}: {str(e)}")
    db.commit()
    return VocabularyImportResult(total=len(data.items), imported=imported, errors=errors)


@router.post("/import", response_model=VocabularyImportResult)
async def import_vocabulary_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    items = []
    errors = []

    if ext == ".json":
        content = await file.read()
        raw = json.loads(content)
        if isinstance(raw, list):
            for i, item in enumerate(raw):
                try:
                    items.append(VocabularyBulkItem(
                        word=item.get("word", ""),
                        meaning=item.get("meaning", ""),
                        example=item.get("example"),
                        category=item.get("category"),
                        type=item.get("type", "word"),
                    ))
                except Exception as e:
                    errors.append(f"Dòng {i+1}: {str(e)}")
        elif isinstance(raw, dict) and "items" in raw:
            for i, item in enumerate(raw["items"]):
                try:
                    items.append(VocabularyBulkItem(**item))
                except Exception as e:
                    errors.append(f"Dòng {i+1}: {str(e)}")
        else:
            raise HTTPException(400, "JSON phải là mảng hoặc object có trường 'items'")

    elif ext == ".xlsx":
        try:
            import openpyxl
            content = await file.read()
            wb = openpyxl.load_workbook(io.BytesIO(content))
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            if not rows:
                raise HTTPException(400, "File Excel rỗng")
            header = [str(h).lower().strip() if h else "" for h in rows[0]]
            col_map = {}
            for col in ("word", "meaning", "example", "category", "type"):
                if col in header:
                    col_map[col] = header.index(col)
            if "word" not in col_map or "meaning" not in col_map:
                raise HTTPException(400, 'File Excel phải có cột "word" và "meaning"')
            for i, row in enumerate(rows[1:], 2):
                try:
                    vals = [str(c) if c is not None else "" for c in row]
                    word = vals[col_map["word"]].strip()
                    meaning = vals[col_map["meaning"]].strip()
                    if not word or not meaning:
                        errors.append(f"Dòng {i}: Thiếu word hoặc meaning")
                        continue
                    items.append(VocabularyBulkItem(
                        word=word,
                        meaning=meaning,
                        example=vals[col_map["example"]].strip() if "example" in col_map and len(vals) > col_map["example"] else None,
                        category=vals[col_map["category"]].strip() if "category" in col_map and len(vals) > col_map["category"] else None,
                        type=vals[col_map["type"]].strip() if "type" in col_map and len(vals) > col_map["type"] else "word",
                    ))
                except Exception as e:
                    errors.append(f"Dòng {i}: {str(e)}")
        except ImportError:
            raise HTTPException(500, "openpyxl chưa được cài đặt")
    else:
        raise HTTPException(400, "Chỉ hỗ trợ file .json hoặc .xlsx")

    imported = 0
    for item in items:
        try:
            db.add(Vocabulary(**item.model_dump()))
            imported += 1
        except Exception as e:
            errors.append(str(e))
    db.commit()
    return VocabularyImportResult(total=len(items), imported=imported, errors=errors)
