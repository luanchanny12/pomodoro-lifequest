from pydantic import BaseModel
from typing import Optional, List
import datetime


# ===== Knowledge Pack =====
class KnowledgePackCreate(BaseModel):
    title: str
    source_type: str
    source_filename: str


class KnowledgePackResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    source_type: str
    source_filename: str
    total_pages: int = 0
    total_lessons: int = 0
    status: str = "pending"
    error_message: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class KnowledgePackList(BaseModel):
    items: List[KnowledgePackResponse]
    total: int


# ===== Chapter =====
class ChapterResponse(BaseModel):
    id: int
    pack_id: int
    title: str
    description: Optional[str] = None
    order: int = 0
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ===== Lesson =====
class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    duration_minutes: int = 30
    difficulty: int = 3
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    keywords: Optional[List[str]] = None


class LessonResponse(BaseModel):
    id: int
    chapter_id: int
    pack_id: int
    title: str
    description: Optional[str] = None
    order: int = 0
    duration_minutes: int = 30
    difficulty: int = 3
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    keywords: Optional[List[str]] = None
    xp_reward: int = 50
    status: str = "active"
    created_at: datetime.datetime
    progress: Optional['LessonProgressResponse'] = None

    class Config:
        from_attributes = True


class LessonListResponse(BaseModel):
    items: List[LessonResponse]
    total: int


# ===== Flashcard =====
class FlashcardResponse(BaseModel):
    id: int
    lesson_id: int
    question: str
    answer: str
    hint: Optional[str] = None
    difficulty: int = 3

    class Config:
        from_attributes = True


class FlashcardReviewRequest(BaseModel):
    quality: int  # 0-5 SM-2


class FlashcardReviewResponse(BaseModel):
    id: int
    flashcard_id: int
    quality: int
    ease_factor: float = 2.5
    interval_days: int = 0
    next_review_date: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


# ===== Quiz =====
class QuizResponse(BaseModel):
    id: int
    lesson_id: int
    title: str
    description: Optional[str] = None
    time_limit_minutes: int = 10
    passing_score: int = 80
    question_count: int = 0
    attempted: bool = False
    best_score: Optional[int] = None

    class Config:
        from_attributes = True


class QuizQuestionResponse(BaseModel):
    id: int
    question: str
    options: List[str]
    order: int = 0

    class Config:
        from_attributes = True


class QuizSubmitRequest(BaseModel):
    answers: List[int]


class QuizResultResponse(BaseModel):
    quiz_id: int
    score: int
    total_questions: int
    correct_count: int
    passed: bool
    answers: List[dict]
    time_spent_seconds: Optional[int] = None

    class Config:
        from_attributes = True


# ===== Study Session =====
class StudySessionStart(BaseModel):
    lesson_id: int


class StudySessionUpdate(BaseModel):
    duration_minutes: int = 0
    pages_read: int = 0
    notes: Optional[str] = None
    status: str = "in_progress"


class StudySessionResponse(BaseModel):
    id: int
    lesson_id: int
    pack_id: int
    duration_minutes: int = 0
    pages_read: int = 0
    status: str = "in_progress"
    started_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


# ===== Progress =====
class LessonProgressResponse(BaseModel):
    lesson_id: int
    status: str = "not_started"
    progress_percent: int = 0
    total_study_minutes: int = 0
    flashcards_reviewed: int = 0
    quiz_score: Optional[int] = None
    mastery_level: int = 0
    next_review_date: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class PackProgressResponse(BaseModel):
    pack_id: int
    total_lessons: int
    completed_lessons: int
    progress_percent: int
    total_study_minutes: int
    mastery_average: int


# ===== Daily Mission =====
class DailyMissionResponse(BaseModel):
    id: int
    date: datetime.datetime
    title: str
    description: Optional[str] = None
    items: Optional[List[dict]] = None
    total_xp: int = 0
    earned_xp: int = 0
    status: str = "pending"
    completed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class DailyMissionComplete(BaseModel):
    earned_xp: int = 0


# ===== Document Upload =====
class UploadResponse(BaseModel):
    id: int
    title: str
    filename: str
    status: str = "pending"
    message: str = "Đã nhận file, đang xử lý..."
