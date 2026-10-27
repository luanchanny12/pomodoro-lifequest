from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models_v3 import (
    Lesson, Flashcard, FlashcardReview, Quiz, QuizQuestion,
    QuizAttempt, StudySession, LessonProgress, LearningHistory,
)
from app.schemas_v3 import (
    LessonResponse, LessonProgressResponse, LessonListResponse,
    FlashcardResponse, FlashcardReviewRequest, FlashcardReviewResponse,
    QuizResponse, QuizQuestionResponse, QuizSubmitRequest, QuizResultResponse,
    StudySessionStart, StudySessionUpdate, StudySessionResponse,
)
from app.ai_knowledge.spaced_repetition import (
    review_flashcard, get_due_flashcards, update_lesson_mastery,
)
from app.ai_knowledge.daily_planner import complete_mission_item

router = APIRouter(prefix="/api/v3/learning", tags=["V3 - Learning"])


# ===== Lessons =====
@router.get("/lessons", response_model=List[LessonResponse])
def list_lessons(
    pack_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List lessons with optional filters."""
    query = db.query(Lesson).order_by(Lesson.order)
    if pack_id:
        query = query.filter(Lesson.pack_id == pack_id)
    if status:
        query = query.filter(Lesson.status == status)

    lessons = query.all()
    result = []
    for lesson in lessons:
        progress = db.query(LessonProgress).filter(
            LessonProgress.lesson_id == lesson.id
        ).first()
        result.append(LessonResponse(
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
        ))
    return result


@router.get("/lessons/{lesson_id}", response_model=LessonResponse)
def get_lesson(lesson_id: int, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(404, "Không tìm thấy bài học")
    progress = db.query(LessonProgress).filter(LessonProgress.lesson_id == lesson.id).first()
    return LessonResponse(
        id=lesson.id, chapter_id=lesson.chapter_id, pack_id=lesson.pack_id,
        title=lesson.title, description=lesson.description,
        order=lesson.order, duration_minutes=lesson.duration_minutes,
        difficulty=lesson.difficulty, start_page=lesson.start_page,
        end_page=lesson.end_page, keywords=lesson.keywords,
        xp_reward=lesson.xp_reward, status=lesson.status,
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


# ===== Study Sessions =====
@router.post("/study/start", response_model=StudySessionResponse)
def start_study_session(data: StudySessionStart, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == data.lesson_id).first()
    if not lesson:
        raise HTTPException(404, "Không tìm thấy bài học")

    progress = db.query(LessonProgress).filter(
        LessonProgress.lesson_id == lesson.id
    ).first()
    if not progress:
        progress = LessonProgress(lesson_id=lesson.id, pack_id=lesson.pack_id)
        db.add(progress)

    if progress.status == "not_started":
        progress.status = "studying"
        progress.started_at = datetime.utcnow()

    session = StudySession(
        lesson_id=lesson.id,
        pack_id=lesson.pack_id,
        status="in_progress",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.put("/study/{session_id}", response_model=StudySessionResponse)
def update_study_session(session_id: int, data: StudySessionUpdate, db: Session = Depends(get_db)):
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Không tìm thấy phiên học")

    session.duration_minutes = data.duration_minutes
    session.pages_read = data.pages_read
    if data.notes:
        session.notes = data.notes

    if data.status == "completed":
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        complete_mission_item(db, session.lesson_id, data.duration_minutes, "study")
    else:
        session.status = data.status

    db.commit()
    db.refresh(session)
    return session


# ===== Flashcards =====
@router.get("/flashcards/{lesson_id}", response_model=List[FlashcardResponse])
def get_lesson_flashcards(lesson_id: int, db: Session = Depends(get_db)):
    flashcards = db.query(Flashcard).filter(Flashcard.lesson_id == lesson_id).all()
    return flashcards


@router.get("/flashcards/due", response_model=List[FlashcardResponse])
def get_due_flashcards_endpoint(
    lesson_id: Optional[int] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Get flashcards due for review."""
    flashcards = get_due_flashcards(db, lesson_id, limit)
    return flashcards


@router.post("/flashcards/{flashcard_id}/review", response_model=FlashcardReviewResponse)
def review_flashcard_endpoint(
    flashcard_id: int,
    data: FlashcardReviewRequest,
    db: Session = Depends(get_db),
):
    """Submit a flashcard review quality score."""
    flashcard = db.query(Flashcard).filter(Flashcard.id == flashcard_id).first()
    if not flashcard:
        raise HTTPException(404, "Không tìm thấy flashcard")

    review = review_flashcard(db, flashcard_id, data.quality)
    update_lesson_mastery(db, flashcard.lesson_id)

    return FlashcardReviewResponse(
        id=review.id,
        flashcard_id=review.flashcard_id,
        quality=review.quality,
        ease_factor=review.ease_factor,
        interval_days=review.interval_days,
        next_review_date=review.next_review_date,
    )


# ===== Quizzes =====
@router.get("/quizzes/{lesson_id}", response_model=List[QuizResponse])
def get_lesson_quizzes(lesson_id: int, db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).filter(Quiz.lesson_id == lesson_id).all()
    result = []
    for quiz in quizzes:
        best_attempt = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == quiz.id
        ).order_by(QuizAttempt.score.desc().nullsfirst()).first()
        result.append(QuizResponse(
            id=quiz.id,
            lesson_id=quiz.lesson_id,
            title=quiz.title,
            description=quiz.description,
            time_limit_minutes=quiz.time_limit_minutes,
            passing_score=quiz.passing_score,
            question_count=quiz.question_count,
            attempted=best_attempt is not None,
            best_score=best_attempt.score if best_attempt else None,
        ))
    return result


@router.get("/quizzes/{quiz_id}/questions", response_model=List[QuizQuestionResponse])
def get_quiz_questions(quiz_id: int, db: Session = Depends(get_db)):
    questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz_id
    ).order_by(QuizQuestion.order).all()
    return questions


@router.post("/quizzes/{quiz_id}/submit", response_model=QuizResultResponse)
def submit_quiz(
    quiz_id: int,
    data: QuizSubmitRequest,
    db: Session = Depends(get_db),
):
    """Submit quiz answers and get results."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Không tìm thấy bài kiểm tra")

    questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz_id
    ).order_by(QuizQuestion.order).all()

    if not questions:
        raise HTTPException(400, "Bài kiểm tra chưa có câu hỏi")

    correct = 0
    answers_detail = []
    for i, q in enumerate(questions):
        user_answer = data.answers[i] if i < len(data.answers) else -1
        is_correct = user_answer == q.correct_answer
        if is_correct:
            correct += 1
        answers_detail.append({
            "question_id": q.id,
            "user_answer": user_answer,
            "correct_answer": q.correct_answer,
            "is_correct": is_correct,
            "explanation": q.explanation,
        })

    total = len(questions)
    score = int((correct / total) * 100)
    passed = score >= quiz.passing_score

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        lesson_id=quiz.lesson_id,
        score=score,
        total_questions=total,
        correct_count=correct,
        answers=answers_detail,
        passed=passed,
        completed_at=datetime.utcnow(),
    )
    db.add(attempt)

    progress = db.query(LessonProgress).filter(
        LessonProgress.lesson_id == quiz.lesson_id
    ).first()
    if progress:
        progress.quiz_score = max(progress.quiz_score or 0, score)
        progress.quiz_attempts = (progress.quiz_attempts or 0) + 1

    complete_mission_item(db, quiz.lesson_id, 0, "quiz")
    db.commit()

    return QuizResultResponse(
        quiz_id=quiz_id,
        score=score,
        total_questions=total,
        correct_count=correct,
        passed=passed,
        answers=answers_detail,
    )


# ===== Progress =====
@router.get("/progress", response_model=List[LessonProgressResponse])
def get_all_progress(db: Session = Depends(get_db)):
    progresses = db.query(LessonProgress).all()
    return [LessonProgressResponse(
        lesson_id=p.lesson_id,
        status=p.status,
        progress_percent=p.progress_percent,
        total_study_minutes=p.total_study_minutes,
        flashcards_reviewed=p.flashcards_reviewed,
        quiz_score=p.quiz_score,
        mastery_level=p.mastery_level,
        next_review_date=p.next_review_date,
    ) for p in progresses]
