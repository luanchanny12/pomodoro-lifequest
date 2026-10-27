from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Course
from app.schemas import CourseCreate, CourseUpdate, CourseResponse

router = APIRouter(prefix="/api/courses", tags=["Khóa học"])


@router.get("", response_model=List[CourseResponse])
def list_courses(db: Session = Depends(get_db)):
    return db.query(Course).order_by(Course.created_at.desc()).all()


@router.post("", response_model=CourseResponse, status_code=201)
def create_course(data: CourseCreate, db: Session = Depends(get_db)):
    course = Course(**data.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(course_id: int, data: CourseUpdate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Khóa học không tồn tại")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(course, k, v)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Khóa học không tồn tại")
    db.delete(course)
    db.commit()
    return {"message": "Đã xóa khóa học"}
