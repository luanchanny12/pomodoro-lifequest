"""
Document Processing Pipeline
=============================
1. Parse raw file (txt, pdf, docx, pptx)
2. Extract text content page by page
3. Send to Gemini for structural analysis
4. Return chapters, lessons, and metadata

AI MUST NOT generate external content - only process what's in the document.
"""

import os
import json
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session

from app.ai.gemini_bridge import call_gemini
from app.ai.document_parser import parse_uploaded_file


def parse_document(file_bytes: bytes, filename: str) -> str:
    """Parse any supported document format and return raw text."""
    ext = Path(filename).suffix.lower()

    if ext == ".pptx":
        return _parse_pptx(file_bytes)
    elif ext == ".mp4" or ext == ".avi" or ext == ".mov" or ext == ".mkv":
        return _parse_video_placeholder(filename)
    elif ext == ".mp3" or ext == ".wav" or ext == ".m4a":
        return _parse_audio_placeholder(filename)
    elif ext == ".png" or ext == ".jpg" or ext == ".jpeg":
        return _parse_image_placeholder(filename)
    else:
        return parse_uploaded_file(file_bytes, filename)


def _parse_pptx(file_bytes: bytes) -> str:
    """Extract text from PowerPoint slides."""
    from pptx import Presentation
    import io
    prs = Presentation(io.BytesIO(file_bytes))
    pages = []
    for i, slide in enumerate(prs.slides, 1):
        texts = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                texts.append(shape.text.strip())
        if texts:
            pages.append(f"--- Trang {i} ---\n" + "\n".join(texts))
    return "\n\n".join(pages)


def _parse_video_placeholder(filename: str) -> str:
    """Placeholder for video transcription pipeline."""
    return f"[Video file: {filename}. Transciption pipeline will process this file.]"


def _parse_audio_placeholder(filename: str) -> str:
    """Placeholder for audio transcription pipeline."""
    return f"[Audio file: {filename}. Transciption pipeline will process this file.]"


def _parse_image_placeholder(filename: str) -> str:
    """Placeholder for OCR pipeline."""
    return f"[Image file: {filename}. OCR pipeline will process this file.]"


def extract_structure_with_ai(
    full_text: str,
    filename: str,
    total_pages_estimate: int = 0
) -> dict:
    """
    Send document text to Gemini AI to extract:
    - Document title and description
    - Chapters with start/end pages
    - Lessons within each chapter
    - Keywords for each lesson
    - Estimated study time per lesson

    Returns a structured dict with chapters and lessons.
    The AI is instructed to ONLY use content from the document.
    """
    MAX_CHARS = 15000
    text_chunk = full_text[:MAX_CHARS]

    prompt = (
        f"Phân tích nội dung tài liệu sau đây (file: {filename}).\n\n"
        f"=== NỘI DUNG TÀI LIỆU ===\n{text_chunk}\n\n"
        f"=== NHIỆM VỤ ===\n"
        f"Dựa CHỈ vào nội dung tài liệu trên, hãy:\n"
        f"1. Xác định tiêu đề và mô tả ngắn cho tài liệu\n"
        f"2. Chia tài liệu thành các chương (chapter) dựa trên cấu trúc thực tế\n"
        f"3. Trong mỗi chương, chia thành các bài học (lesson) theo CHỦ ĐỀ, không theo số trang cố định\n"
        f"4. Mỗi bài học cần: tên, mô tả ngắn, trang bắt đầu, trang kết thúc, từ khóa, thời gian học ước tính (phút), độ khó (1-5)\n\n"
        f"QUAN TRỌNG: Chỉ sử dụng nội dung có trong tài liệu. KHÔNG thêm kiến thức từ bên ngoài. "
        f"Nếu tài liệu không có cấu trúc rõ ràng, hãy chia dựa trên nội dung thực tế."
    )

    schema = {
        "title": "str - Tiêu đề tài liệu",
        "description": "str - Mô tả ngắn",
        "chapters": [
            {
                "title": "str - Tên chương",
                "description": "str - Mô tả chương",
                "order": "int - Thứ tự",
                "start_page": "int - Trang bắt đầu",
                "end_page": "int - Trang kết thúc",
                "lessons": [
                    {
                        "title": "str - Tên bài học",
                        "description": "str - Mô tả bài học",
                        "order": "int - Thứ tự trong chương",
                        "start_page": "int - Trang bắt đầu",
                        "end_page": "int - Trang kết thúc",
                        "duration_minutes": "int - Thời gian học ước tính (phút)",
                        "difficulty": "int - Độ khó 1-5",
                        "keywords": ["str - Từ khóa"]
                    }
                ]
            }
        ]
    }

    result = call_gemini(prompt, schema)

    if isinstance(result, dict) and "error" not in result:
        return result

    return {
        "title": Path(filename).stem,
        "description": "Tự động phân tích từ tài liệu",
        "chapters": [],
        "_fallback": True
    }


def extract_flashcards_with_ai(lesson_text: str, lesson_title: str) -> List[dict]:
    """
    Generate flashcards from lesson content.
    AI must ONLY use concepts found in the provided text.
    """
    prompt = (
        f"Dựa vào nội dung bài học sau, tạo flashcard hỏi-đáp.\n\n"
        f"Tên bài: {lesson_title}\n"
        f"Nội dung:\n{lesson_text[:6000]}\n\n"
        f"Tạo 5 flashcard với câu hỏi và câu trả lời từ nội dung trên.\n"
        f"QUAN TRỌNG: Chỉ dùng thông tin có trong nội dung. KHÔNG thêm kiến thức ngoài."
    )

    schema = {
        "flashcards": [
            {
                "question": "str - Câu hỏi",
                "answer": "str - Câu trả lời",
                "difficulty": "int - Độ khó 1-5"
            }
        ]
    }

    result = call_gemini(prompt, schema)

    if isinstance(result, dict) and "flashcards" in result:
        return result["flashcards"]
    return []


def extract_quiz_with_ai(lesson_text: str, lesson_title: str) -> List[dict]:
    """
    Generate quiz questions from lesson content.
    AI must ONLY use concepts found in the provided text.
    """
    prompt = (
        f"Dựa vào nội dung bài học sau, tạo câu hỏi trắc nghiệm.\n\n"
        f"Tên bài: {lesson_title}\n"
        f"Nội dung:\n{lesson_text[:6000]}\n\n"
        f"Tạo 5 câu hỏi trắc nghiệm 4 đáp án từ nội dung trên.\n"
        f"Mỗi câu hỏi phải có đáp án đúng và giải thích ngắn.\n"
        f"QUAN TRỌNG: Chỉ dùng thông tin có trong nội dung. KHÔNG thêm kiến thức ngoài."
    )

    schema = {
        "questions": [
            {
                "question": "str - Câu hỏi",
                "options": ["str - Đáp án A", "str - Đáp án B", "str - Đáp án C", "str - Đáp án D"],
                "correct_answer": "int - Index đáp án đúng (0-3)",
                "explanation": "str - Giải thích ngắn",
                "difficulty": "int - Độ khó 1-5"
            }
        ]
    }

    result = call_gemini(prompt, schema)

    if isinstance(result, dict) and "questions" in result:
        return result["questions"]
    return []


def process_uploaded_document(
    db: Session,
    file_bytes: bytes,
    filename: str,
    pack_id: int
) -> dict:
    """
    Full pipeline for processing an uploaded document:
    1. Parse document to text
    2. Extract structure with AI (chapters + lessons)
    3. For each lesson, generate flashcards and quizzes
    4. Create daily mission with first lessons

    Returns processing result with counts.
    """
    from app.models_v3 import (
        KnowledgePack, Chapter as ChapterModel,
        Lesson as LessonModel, Flashcard, Quiz,
        QuizQuestion, DailyMission, LessonProgress
    )

    full_text = parse_document(file_bytes, filename)
    total_pages = _estimate_pages(full_text, filename)

    pack = db.query(KnowledgePack).filter(KnowledgePack.id == pack_id).first()
    if not pack:
        return {"error": "Pack not found"}

    pack.status = "processing"
    pack.total_pages = total_pages
    db.commit()

    try:
        structure = extract_structure_with_ai(full_text, filename, total_pages)

        if structure.get("_fallback"):
            title = structure.get("title", Path(filename).stem)
            pack.title = title
            pack.description = structure.get("description", "")
            _create_single_lesson_fallback(db, pack, full_text, filename)
        else:
            if structure.get("title"):
                pack.title = structure["title"]
            if structure.get("description"):
                pack.description = structure["description"]

            chapters = structure.get("chapters", [])
            if not chapters:
                chapters = [{
                    "title": "Chương 1",
                    "description": "Nội dung chính",
                    "order": 1,
                    "lessons": [{
                        "title": "Bài học 1",
                        "description": "Nội dung chính của tài liệu",
                        "order": 1,
                        "start_page": 1,
                        "end_page": total_pages,
                        "duration_minutes": 30,
                        "difficulty": 3,
                        "keywords": []
                    }]
                }]

            for ch_data in chapters:
                chapter = ChapterModel(
                    pack_id=pack.id,
                    title=ch_data.get("title", "Chương"),
                    description=ch_data.get("description", ""),
                    order=ch_data.get("order", 1),
                    start_page=ch_data.get("start_page"),
                    end_page=ch_data.get("end_page"),
                )
                db.add(chapter)
                db.flush()

                lessons = ch_data.get("lessons", [])
                for l_data in lessons:
                    lesson = LessonModel(
                        chapter_id=chapter.id,
                        pack_id=pack.id,
                        title=l_data.get("title", f"Bài {l_data.get('order', 1)}"),
                        description=l_data.get("description", ""),
                        order=l_data.get("order", 1),
                        duration_minutes=l_data.get("duration_minutes", 30),
                        difficulty=l_data.get("difficulty", 3),
                        start_page=l_data.get("start_page"),
                        end_page=l_data.get("end_page"),
                        keywords=l_data.get("keywords", []),
                    )
                    db.add(lesson)
                    db.flush()

                    _generate_lesson_content(db, lesson, full_text)
                    _create_lesson_progress(db, lesson)

        total = db.query(LessonModel).filter(LessonModel.pack_id == pack.id).count()
        pack.total_lessons = total
        pack.status = "ready"
        db.commit()

        return {
            "success": True,
            "pack_id": pack.id,
            "total_lessons": total,
            "message": f"Đã xử lý xong tài liệu với {total} bài học"
        }

    except Exception as e:
        pack.status = "error"
        pack.error_message = str(e)
        db.commit()
        import logging
        logging.error(f"Document processing error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Có lỗi khi xử lý tài liệu"
        }


def _create_single_lesson_fallback(db, pack, full_text, filename):
    """Create a single lesson when AI structure extraction fails."""
    from app.models_v3 import Chapter as ChapterModel, Lesson as LessonModel
    chapter = ChapterModel(
        pack_id=pack.id,
        title="Nội dung chính",
        description=f"Tài liệu: {filename}",
        order=1,
    )
    db.add(chapter)
    db.flush()

    lesson = LessonModel(
        chapter_id=chapter.id,
        pack_id=pack.id,
        title=Path(filename).stem,
        description="Nội dung chính của tài liệu",
        order=1,
        duration_minutes=30,
        difficulty=3,
    )
    db.add(lesson)
    db.flush()

    _generate_lesson_content(db, lesson, full_text)


def _generate_lesson_content(db, lesson, full_text):
    """Generate flashcards and quizzes for a lesson."""
    from app.models_v3 import Flashcard, Quiz, QuizQuestion

    keywords = lesson.keywords or []
    if not keywords:
        keywords = []

    lesson_text_start = max(0, (lesson.start_page or 1) - 1)
    lesson_text_end = min(len(full_text) // 2000, (lesson.end_page or 1))
    lesson_text = _extract_pages(full_text, lesson_text_start, lesson_text_end)

    flashcards = extract_flashcards_with_ai(lesson_text, lesson.title)
    for fc in flashcards[:5]:
        db.add(Flashcard(
            lesson_id=lesson.id,
            question=fc.get("question", ""),
            answer=fc.get("answer", ""),
            difficulty=fc.get("difficulty", 3),
        ))

    quiz = Quiz(
        lesson_id=lesson.id,
        title=f"Bài kiểm tra: {lesson.title}",
        time_limit_minutes=10,
        passing_score=80,
    )
    db.add(quiz)
    db.flush()

    questions = extract_quiz_with_ai(lesson_text, lesson.title)
    for qi, q_data in enumerate(questions[:5]):
        db.add(QuizQuestion(
            quiz_id=quiz.id,
            question=q_data.get("question", ""),
            options=q_data.get("options", ["A", "B", "C", "D"]),
            correct_answer=q_data.get("correct_answer", 0),
            explanation=q_data.get("explanation"),
            difficulty=q_data.get("difficulty", 3),
            order=qi,
        ))

    quiz.question_count = min(len(questions), 5)
    db.flush()


def _create_lesson_progress(db, lesson):
    """Create initial progress record for a lesson."""
    from app.models_v3 import LessonProgress
    progress = LessonProgress(
        lesson_id=lesson.id,
        pack_id=lesson.pack_id,
    )
    db.add(progress)


def _estimate_pages(text: str, filename: str) -> int:
    """Estimate number of pages based on text length."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return max(1, len(text) // 2500)
    return max(1, len(text) // 3000)


def _extract_pages(text: str, start_page: int, end_page: int) -> str:
    """Extract relevant portion of text for a page range."""
    chars_per_page = 3000
    start = max(0, start_page * chars_per_page)
    end = min(len(text), end_page * chars_per_page)
    return text[start:end]
