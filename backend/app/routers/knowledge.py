import os
import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models_v3 import KnowledgePack, Chapter, Lesson, LessonProgress
from app.schemas_v3 import (
    KnowledgePackResponse, KnowledgePackList, ChapterResponse,
    LessonResponse, UploadResponse, PackProgressResponse, LessonProgressResponse,
)
from app.ai_knowledge.document_processor import process_uploaded_document

router = APIRouter(prefix="/api/v3/knowledge", tags=["V3 - Knowledge Center"])

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".pptx", ".txt", ".md",
    ".mp4", ".avi", ".mov", ".mkv",
    ".mp3", ".wav", ".m4a",
    ".png", ".jpg", ".jpeg",
}


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a document for AI processing."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"Không hỗ trợ định dạng {ext}")

    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = UPLOAD_DIR / unique_name
    content = await file.read()

    with open(save_path, "wb") as f:
        f.write(content)

    pack = KnowledgePack(
        title=Path(file.filename).stem,
        source_type=ext.replace(".", ""),
        source_filename=file.filename or unique_name,
        source_path=str(save_path),
        status="pending",
    )
    db.add(pack)
    db.commit()
    db.refresh(pack)

    try:
        result = process_uploaded_document(db, content, file.filename or "file", pack.id)
        return UploadResponse(
            id=pack.id,
            title=pack.title,
            filename=pack.source_filename,
            status="ready" if result.get("success") else "error",
            message=result.get("message", "Đã xử lý xong"),
        )
    except Exception as e:
        pack.status = "error"
        pack.error_message = str(e)
        db.commit()
        return UploadResponse(
            id=pack.id,
            title=pack.title,
            filename=pack.source_filename,
            status="error",
            message=f"Lỗi xử lý: {str(e)}",
        )


@router.get("", response_model=KnowledgePackList)
def list_knowledge_packs(search: str = "", db: Session = Depends(get_db)):
    """List all knowledge packs."""
    query = db.query(KnowledgePack).order_by(KnowledgePack.created_at.desc())
    if search:
        query = query.filter(KnowledgePack.title.ilike(f"%{search}%"))
    items = query.all()
    return KnowledgePackList(items=items, total=len(items))


@router.get("/{pack_id}", response_model=KnowledgePackResponse)
def get_knowledge_pack(pack_id: int, db: Session = Depends(get_db)):
    """Get knowledge pack details."""
    pack = db.query(KnowledgePack).filter(KnowledgePack.id == pack_id).first()
    if not pack:
        raise HTTPException(404, "Không tìm thấy knowledge pack")
    return pack


@router.get("/{pack_id}/chapters", response_model=List[ChapterResponse])
def get_pack_chapters(pack_id: int, db: Session = Depends(get_db)):
    """Get all chapters in a knowledge pack."""
    chapters = db.query(Chapter).filter(
        Chapter.pack_id == pack_id
    ).order_by(Chapter.order).all()
    return chapters


@router.get("/{pack_id}/lessons", response_model=List[LessonResponse])
def get_pack_lessons(pack_id: int, db: Session = Depends(get_db)):
    """Get all lessons in a knowledge pack."""
    lessons = db.query(Lesson).filter(
        Lesson.pack_id == pack_id
    ).order_by(Lesson.order).all()

    result = []
    for lesson in lessons:
        progress = db.query(LessonProgress).filter(
            LessonProgress.lesson_id == lesson.id
        ).first()
        lr = LessonResponse(
            id=lesson.id,
            chapter_id=lesson.chapter_id,
            pack_id=lesson.pack_id,
            title=lesson.title,
            description=lesson.description,
            order=lesson.order,
            duration_minutes=lesson.duration_minutes,
            difficulty=lesson.difficulty,
            start_page=lesson.start_page,
            end_page=lesson.end_page,
            keywords=lesson.keywords,
            xp_reward=lesson.xp_reward,
            status=lesson.status,
            created_at=lesson.created_at,
            progress=LessonProgressResponse(
                lesson_id=lesson.id,
                status=progress.status if progress else "not_started",
                progress_percent=progress.progress_percent if progress else 0,
                total_study_minutes=progress.total_study_minutes if progress else 0,
                flashcards_reviewed=progress.flashcards_reviewed if progress else 0,
                quiz_score=progress.quiz_score if progress else None,
                mastery_level=progress.mastery_level if progress else 0,
                next_review_date=progress.next_review_date if progress else None,
            ) if progress else None,
        )
        result.append(lr)
    return result


@router.get("/{pack_id}/progress", response_model=PackProgressResponse)
def get_pack_progress(pack_id: int, db: Session = Depends(get_db)):
    """Get overall progress for a knowledge pack."""
    lessons = db.query(Lesson).filter(Lesson.pack_id == pack_id).all()
    total = len(lessons)
    if total == 0:
        return PackProgressResponse(
            pack_id=pack_id, total_lessons=0, completed_lessons=0,
            progress_percent=0, total_study_minutes=0, mastery_average=0,
        )

    completed = 0
    total_minutes = 0
    total_mastery = 0
    for lesson in lessons:
        progress = db.query(LessonProgress).filter(
            LessonProgress.lesson_id == lesson.id
        ).first()
        if progress:
            if progress.status == "completed":
                completed += 1
            total_minutes += progress.total_study_minutes or 0
            total_mastery += progress.mastery_level or 0

    return PackProgressResponse(
        pack_id=pack_id,
        total_lessons=total,
        completed_lessons=completed,
        progress_percent=int((completed / total) * 100),
        total_study_minutes=total_minutes,
        mastery_average=int(total_mastery / total),
    )


@router.delete("/{pack_id}")
def delete_knowledge_pack(pack_id: int, db: Session = Depends(get_db)):
    """Delete a knowledge pack and all related data."""
    from app.models_v3 import (
        Chapter, Lesson, Flashcard, FlashcardReview, Quiz, QuizQuestion,
        QuizAttempt, StudySession, LessonProgress, DailyMission,
        LearningHistory, AIRecommendation, KnowledgeEmbedding,
    )

    pack = db.query(KnowledgePack).filter(KnowledgePack.id == pack_id).first()
    if not pack:
        raise HTTPException(404, "Không tìm thấy knowledge pack")

    if pack.source_path and os.path.exists(pack.source_path):
        try:
            os.remove(pack.source_path)
        except OSError:
            pass

    lesson_ids = [l.id for l in db.query(Lesson).filter(Lesson.pack_id == pack_id).all()]

    db.query(FlashcardReview).filter(
        FlashcardReview.flashcard_id.in_(
            db.query(Flashcard.id).filter(Flashcard.lesson_id.in_(lesson_ids))
        )
    ).delete(synchronize_session=False)
    db.query(Flashcard).filter(Flashcard.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)
    db.query(QuizAttempt).filter(QuizAttempt.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)
    db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id.in_(
            db.query(Quiz.id).filter(Quiz.lesson_id.in_(lesson_ids))
        )
    ).delete(synchronize_session=False)
    db.query(Quiz).filter(Quiz.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)
    db.query(StudySession).filter(StudySession.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)
    db.query(LessonProgress).filter(LessonProgress.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)
    db.query(LearningHistory).filter(LearningHistory.lesson_id.in_(lesson_ids)).delete(synchronize_session=False)
    db.query(KnowledgeEmbedding).filter(KnowledgeEmbedding.pack_id == pack_id).delete(synchronize_session=False)
    db.query(AIRecommendation).filter(AIRecommendation.pack_id == pack_id).delete(synchronize_session=False)
    db.query(Lesson).filter(Lesson.pack_id == pack_id).delete(synchronize_session=False)
    db.query(Chapter).filter(Chapter.pack_id == pack_id).delete(synchronize_session=False)
    db.delete(pack)
    db.commit()

    return {"message": "Đã xóa knowledge pack"}
