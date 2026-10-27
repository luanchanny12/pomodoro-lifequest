from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()


class KnowledgePack(Base):
    __tablename__ = "knowledge_packs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    source_type = Column(String, nullable=False)  # pdf, docx, pptx, txt, video, audio, image
    source_filename = Column(String, nullable=False)
    source_path = Column(String, nullable=True)
    total_pages = Column(Integer, default=0)
    total_lessons = Column(Integer, default=0)
    status = Column(String, default="pending")  # pending, processing, ready, error
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Chapter(Base):
    __tablename__ = "chapters"
    id = Column(Integer, primary_key=True, index=True)
    pack_id = Column(Integer, ForeignKey("knowledge_packs.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, default=0)
    start_page = Column(Integer, nullable=True)
    end_page = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Lesson(Base):
    __tablename__ = "lessons"
    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False)
    pack_id = Column(Integer, ForeignKey("knowledge_packs.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, default=0)
    duration_minutes = Column(Integer, default=30)
    difficulty = Column(Integer, default=3)  # 1-5
    start_page = Column(Integer, nullable=True)
    end_page = Column(Integer, nullable=True)
    keywords = Column(JSON, nullable=True)
    xp_reward = Column(Integer, default=50)
    status = Column(String, default="active")  # active, completed, archived
    created_at = Column(DateTime, default=datetime.utcnow)


class Flashcard(Base):
    __tablename__ = "flashcards"
    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    hint = Column(Text, nullable=True)
    difficulty = Column(Integer, default=3)
    created_at = Column(DateTime, default=datetime.utcnow)


class FlashcardReview(Base):
    __tablename__ = "flashcard_reviews"
    id = Column(Integer, primary_key=True, index=True)
    flashcard_id = Column(Integer, ForeignKey("flashcards.id"), nullable=False)
    quality = Column(Integer, nullable=False)  # 0-5 (SM-2 algorithm)
    review_count = Column(Integer, default=0)
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=0)
    next_review_date = Column(DateTime, nullable=True)
    last_reviewed = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    time_limit_minutes = Column(Integer, default=10)
    passing_score = Column(Integer, default=80)
    question_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # ["A", "B", "C", "D"]
    correct_answer = Column(Integer, nullable=False)  # index
    explanation = Column(Text, nullable=True)
    difficulty = Column(Integer, default=3)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    score = Column(Integer, nullable=True)
    total_questions = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    answers = Column(JSON, nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)
    passed = Column(Boolean, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StudySession(Base):
    __tablename__ = "study_sessions"
    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    pack_id = Column(Integer, ForeignKey("knowledge_packs.id"), nullable=False)
    duration_minutes = Column(Integer, default=0)
    pages_read = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    status = Column(String, default="in_progress")  # in_progress, completed, abandoned
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    pack_id = Column(Integer, ForeignKey("knowledge_packs.id"), nullable=False)
    status = Column(String, default="not_started")  # not_started, studying, completed, reviewing
    progress_percent = Column(Integer, default=0)
    total_study_minutes = Column(Integer, default=0)
    flashcards_reviewed = Column(Integer, default=0)
    quiz_score = Column(Integer, nullable=True)
    quiz_attempts = Column(Integer, default=0)
    mastery_level = Column(Integer, default=0)  # 0-100
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    next_review_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DailyMission(Base):
    __tablename__ = "daily_missions"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    lesson_ids = Column(JSON, nullable=True)
    items = Column(JSON, nullable=True)
    total_xp = Column(Integer, default=0)
    earned_xp = Column(Integer, default=0)
    status = Column(String, default="pending")  # pending, in_progress, completed, skipped
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class LearningHistory(Base):
    __tablename__ = "learning_history"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)
    pack_id = Column(Integer, ForeignKey("knowledge_packs.id"), nullable=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    action = Column(String, nullable=False)  # study, review, quiz, flashcard
    duration_minutes = Column(Integer, default=0)
    xp_earned = Column(Integer, default=0)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"
    id = Column(Integer, primary_key=True, index=True)
    pack_id = Column(Integer, ForeignKey("knowledge_packs.id"), nullable=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    recommendation_type = Column(String, nullable=False)  # review, study, quiz, flashcard
    priority = Column(Integer, default=0)
    message = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class KnowledgeEmbedding(Base):
    __tablename__ = "knowledge_embeddings"
    id = Column(Integer, primary_key=True, index=True)
    pack_id = Column(Integer, ForeignKey("knowledge_packs.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, default=0)
    page_number = Column(Integer, nullable=True)
    embedding = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
