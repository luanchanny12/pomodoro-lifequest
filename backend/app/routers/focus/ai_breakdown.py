import datetime
import json
import uuid
import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DailyMatrixTask, StudyGoal, AIBreakdownLog
from app.models_auth import User
from app.schemas import (
    AIBreakdownTaskItem,
    AIBreakdownPreviewRequest,
    AIBreakdownProposalResponse,
    AIApplyBreakdownRequest,
    AIRollbackRequest,
    AIBreakdownLogResponse,
    BulkImportTasksRequest,
    ParseScheduleTextRequest,
    NotebookLMSourceItem,
    NotebookLMStudyGuide,
    AskSourcesRequest,
    AskSourcesResponse,
)
from app.routers.auth import get_current_user_optional, get_current_user
from app.routers.focus.common import _get_real_user, vn_today, vn_now
from app.ai.gemini_bridge import call_gemini
from app.ai.document_parser import parse_uploaded_file

router = APIRouter()


def _generate_heuristic_breakdown(
    title: str,
    today: datetime.date,
    target: datetime.date,
    daily_hours: float,
    notes_or_syllabus: Optional[str] = None,
    sources: Optional[List[NotebookLMSourceItem]] = None,
    quadrant: int = 1,
) -> tuple:
    """
    Fallback thông minh khi Gemini API chưa cấu hình hoặc mất mạng.
    Tự động phân rã theo phong cách NotebookLM Studio & Spaced Repetition:
    - Study Guide / Briefing Doc
    - Khái niệm cốt lõi & Câu hỏi ôn tập then chốt
    - Kịch bản Podcast Audio Overview (Host 1 & Host 2)
    - Lộ trình Ô 1 theo ngày có neo nguồn tài liệu
    """
    days_span = (target - today).days + 1
    if days_span < 1:
        days_span = 1

    # Trích xuất các ý trong đề cương hoặc sources nếu người dùng nhập
    syllabus_points = []
    source_names = [s.name for s in sources] if sources else []
    sources_summary = f"Đã nạp {len(sources)} tài liệu nguồn: " + ", ".join(source_names) if sources else None

    combined_text = ""
    if notes_or_syllabus:
        combined_text += notes_or_syllabus + "\n"
    if sources:
        for s in sources:
            combined_text += f"\n{s.name}\n{s.content[:3000]}\n"

    if combined_text:
        raw_lines = [line.strip("- *• \t\r") for line in combined_text.replace(";", "\n").split("\n")]
        syllabus_points = [line for line in raw_lines if len(line) >= 4 and not line.startswith("http")]

    duration_mins = int(max(30, min(240, daily_hours * 60)))
    tasks = []
    step_dates = [today + datetime.timedelta(days=i) for i in range(days_span)]

    # 1. Sinh danh sách tasks theo ngày
    if days_span == 1:
        primary_ref = source_names[0] if source_names else "Tài liệu môn học"
        tasks.append(
            AIBreakdownTaskItem(
                date=today.isoformat(),
                title=f"Tập trung dứt điểm: {title}",
                quadrant=quadrant,
                duration_minutes=duration_mins,
                notes=f"Ôn tập cấp tốc, nắm chắc các định nghĩa và công thức cốt lõi.",
                source_reference=f"Trọng tâm từ {primary_ref}",
                key_question=f"Bạn đã thuộc lòng các công thức và thuật ngữ then chốt của {title} chưa?",
            )
        )
        explanation = (
            f"Kỳ hạn còn duy nhất 1 ngày ({today.strftime('%d/%m')}). NotebookLM đã tối ưu 100% vào việc "
            f"Ô 1 khẩn cấp để xử lý dứt điểm các kiến thức then chốt nhất từ tài liệu."
        )
    else:
        for idx, d in enumerate(step_dates):
            day_num = idx + 1
            if syllabus_points and idx < len(syllabus_points):
                topic_focus = syllabus_points[idx][:50]
            else:
                topic_focus = f"Chương trọng tâm {day_num}"

            src_tag = source_names[idx % len(source_names)] if source_names else f"Tài liệu phần {day_num}"

            if idx == 0:
                t_title = f"Nền tảng & Khái niệm cốt lõi: {topic_focus}"
                t_notes = "Đọc kỹ tài liệu nguồn, lập sơ đồ tư duy cho các định nghĩa cơ bản."
                t_q = f"Khái niệm cốt lõi của {topic_focus} là gì và có ứng dụng gì?"
            elif idx == days_span - 1:
                t_title = f"Tổng duyệt & Sẵn sàng bước vào phòng thi: {title}"
                t_notes = "Xem lại sổ tay công thức, các lỗi sai thường gặp và kiểm tra phòng thi."
                t_q = f"Tự tin 100% với danh mục kiến thức của {title} trước giờ thi?"
            elif idx == days_span - 2:
                t_title = f"Giải đề thi thử & Bấm giờ chuẩn 90p: {title}"
                t_notes = "Làm đề thi mẫu bấm giờ nghiêm túc để kiểm tra tốc độ và phản xạ."
                t_q = f"Tốc độ làm bài và điểm số đề thử đã đạt mục tiêu chưa?"
            else:
                t_title = f"Luyện chuyên sâu & Vận dụng bài tập: {topic_focus}"
                t_notes = "Thực hành giải các dạng bài tập, đối chiếu đáp án với tài liệu mẫu."
                t_q = f"Dạng bài tập tính toán/phân tích của {topic_focus} gồm những bước nào?"

            tasks.append(
                AIBreakdownTaskItem(
                    date=d.isoformat(),
                    title=t_title,
                    quadrant=quadrant,
                    duration_minutes=duration_mins,
                    notes=t_notes,
                    source_reference=f"Nguồn: {src_tag}",
                    key_question=t_q,
                )
            )

        explanation = (
            f"Kế hoạch gồm {days_span} ngày (từ {today.strftime('%d/%m')} đến {target.strftime('%d/%m')}), "
            f"mỗi ngày {daily_hours}h được NotebookLM Studio neo chặt vào tài liệu nguồn theo phương pháp Spaced Repetition "
            f"(Khái niệm nền tảng → Vận dụng thực chiến → Thi thử bấm giờ → Tổng kết). Toàn bộ được xếp vào Ô 1 để ưu tiên xử lý."
        )

    # 2. Sinh NotebookLM Study Guide
    core_concepts = []
    if syllabus_points:
        for p in syllabus_points[:4]:
            core_concepts.append({
                "concept": p[:40],
                "explanation": f"Khái niệm mấu chốt được trích xuất từ tài liệu {title}.",
                "source": source_names[0] if source_names else "Tài liệu môn học"
            })
    else:
        core_concepts = [
            {"concept": f"Tổng quan lý thuyết {title}", "explanation": "Các định nghĩa, nguyên lý và khung sườn cơ bản.", "source": "Đề cương"},
            {"concept": "Các mô hình & Phương pháp áp dụng", "explanation": "Các bước tiến hành giải bài tập và nghiên cứu tình huống.", "source": "Bài giảng"},
            {"concept": "Quy trình giải quyết vấn đề", "explanation": "Thuật toán và cách trình bày chuẩn trong bài thi.", "source": "Giáo trình"},
        ]

    exam_questions = [
        f"Trình bày định nghĩa và sự khác biệt giữa các mô hình cốt lõi của môn {title}?",
        f"Phân tích một tình huống thực tế áp dụng kiến thức của {title}?",
        f"Các lỗi sai thường gặp khi làm phần bài tập trắc nghiệm và tự luận của môn này là gì?",
    ]

    audio_script = (
        f"Host A: Xin chào! Chào mừng bạn đến với bản tóm tắt âm thanh NotebookLM Studio cho môn {title}.\n"
        f"Host B: Chào các bạn! Kỳ thi của chúng ta sẽ diễn ra vào ngày {target.strftime('%d/%m')}. Bạn có chính xác {days_span} ngày để làm chủ toàn bộ tài liệu này.\n"
        f"Host A: Đúng vậy! Điểm mấu chốt ở đây là đừng cố học dồn vào đêm hôm trước. Lộ trình đã chia mỗi ngày {daily_hours} tiếng vào Ô 1: khởi đầu từ việc nắm chắc các khái niệm nền tảng, sau đó luyện đề thi thử có bấm giờ.\n"
        f"Host B: Đặc biệt hãy chú ý các câu hỏi tự kiểm tra mỗi ngày nhé. Nắm vững bản chất sẽ giúp bạn tự tin đạt điểm tối đa. Chúc bạn ôn tập thật tốt và bứt phá điểm số!"
    )

    study_guide = NotebookLMStudyGuide(
        briefing_summary=(
            f"Bản tin chiến lược ôn thi môn {title}: Tổng thời gian {days_span} ngày, mỗi ngày {daily_hours}h. "
            f"Chiến lược phân rã kiến thức từ nguồn tài liệu giúp tối ưu hóa khả năng ghi nhớ dài hạn, "
            f"loại bỏ hoàn toàn cảm giác quá tải trước kỳ thi."
        ),
        core_concepts=core_concepts,
        exam_questions=exam_questions,
        difficulty_assessment=f"Độ khó: Trung bình - Khá. Cần đặc biệt chú ý phần bài tập vận dụng và giải đề bấm giờ trước ngày thi 2 ngày.",
        audio_overview_script=audio_script,
    )

    return explanation, tasks, study_guide, sources_summary


@router.post("/ai/upload-source")
async def upload_source_document(
    file: UploadFile = File(...),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Bóc tách file tài liệu môn học (.pdf, .docx, .txt) thành văn bản để nạp vào NotebookLM Studio.
    """
    filename = file.filename or "tailieu.txt"
    content_bytes = await file.read()

    if len(content_bytes) > 30 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File quá lớn (tối đa 30MB)!")

    try:
        parsed_text = parse_uploaded_file(content_bytes, filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không thể đọc file {filename}: {str(e)}")

    if not parsed_text or not parsed_text.strip():
        raise HTTPException(status_code=400, detail=f"File {filename} không chứa văn bản có thể trích xuất!")

    words = len(parsed_text.split())
    estimated_pages = max(1, words // 350)
    ext = filename.split(".")[-1].lower() if "." in filename else "text"

    return {
        "name": filename,
        "content": parsed_text.strip(),
        "source_type": ext,
        "words_count": words,
        "page_count": estimated_pages,
    }


@router.post("/ai/breakdown-preview", response_model=AIBreakdownProposalResponse)
def preview_ai_breakdown(
    req: AIBreakdownPreviewRequest,
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Phân tích và tạo bản ĐỀ XUẤT NotebookLM Studio chia nhỏ nhiệm vụ lớn ra từng ngày.
    TUYỆT ĐỐI KHÔNG LƯU VÀO DATABASE ở bước này để người dùng xem trước và duyệt.
    """
    today = vn_today()
    try:
        target = datetime.date.fromisoformat(req.target_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Ngày hạn chót không đúng định dạng YYYY-MM-DD!")

    if target < today:
        target = today

    days_span = max(1, (target - today).days + 1)
    daily_hours = req.daily_hours or 1.5
    quadrant = req.quadrant or 1

    # Chuẩn bị context tài liệu nguồn (Sources Context)
    sources_text = ""
    sources_summary = None
    if req.sources and len(req.sources) > 0:
        sources_summary = f"Đã nạp {len(req.sources)} tài liệu nguồn: " + ", ".join([s.name for s in req.sources])
        for s in req.sources:
            snippet = s.content[:6000]
            sources_text += f"\n--- TÀI LIỆU NGUỒN: {s.name} ({s.source_type}, {s.words_count} từ) ---\n{snippet}\n"

    # 1. Thử gọi Gemini AI NotebookLM Studio Engine nếu có API Key
    prompt = f"""
Bạn là AI Academic Engine của NotebookLM Studio trong LifeQuest.
Nhiệm vụ: Phân tích sâu các tài liệu nguồn sau đây để lập Kế Hoạch Học Tập & Ôn Thi Cá Nhân Hóa cho sinh viên từ {today.isoformat()} đến ngày thi {target.isoformat()}.

MỤC TIÊU / KỲ THI: {req.title}
HẠN CHÓT / NGÀY THI: {target.isoformat()} (tổng cộng {days_span} ngày)
THỜI LƯỢNG HỌC MỖI NGÀY: {daily_hours} giờ ({int(daily_hours * 60)} phút)
GHI CHÚ / ĐỀ CƯƠNG: {req.notes_or_syllabus or 'Không có'}
CÁC NGUỒN TÀI LIỆU ĐÃ NẠP:
{sources_text if sources_text else 'Chưa có tài liệu đính kèm, hãy lập kế hoạch dựa trên đề cương và kiến thức chuẩn của môn học.'}

YÊU CẦU ĐẶC BIỆT CỦA NOTEBOOKLM STUDIO:
1. explanation: Giải trình chiến lược tổng thể ngắn gọn, ấm áp, logic tại sao lại chia lịch như vậy.
2. study_guide:
   - briefing_summary: Bản tin định hướng chiến lược học tập, phân tích bối cảnh và mẹo thi then chốt.
   - core_concepts: Mảng gồm 3-6 khái niệm cốt lõi kèm giải thích ngắn và trích nguồn (concept, explanation, source).
   - exam_questions: Mảng gồm 3-5 câu hỏi tự kiểm tra / dự đoán đề thi trắc nghiệm hoặc tự luận từ tài liệu.
   - difficulty_assessment: Đánh giá độ khó và cảnh báo các bẫy điểm số.
   - audio_overview_script: Kịch bản đàm thoại Podcast Audio Overview giữa 2 chuyên gia (Host A và Host B) đàm thoại sinh động, súc tích (khoảng 150-250 từ) tóm tắt các điểm thú vị và mẹo thi của môn này.
3. tasks: Đúng {days_span} nhiệm vụ tương ứng với từng ngày từ {today.isoformat()} đến {target.isoformat()}.
   - date: YYYY-MM-DD
   - title: Tên công việc cụ thể
   - quadrant: 1 (Ô 1: Làm ngay)
   - duration_minutes: số phút ước tính
   - notes: Ghi chú hành động
   - source_reference: Chỉ rõ đọc tài liệu nào, chương nào, trang nào từ nguồn
   - key_question: Câu hỏi tự kiểm tra kiến thức của ngày hôm đó
"""

    schema = {
        "explanation": "str",
        "study_guide": {
            "briefing_summary": "str",
            "core_concepts": [
                {
                    "concept": "str",
                    "explanation": "str",
                    "source": "str"
                }
            ],
            "exam_questions": ["str"],
            "difficulty_assessment": "str",
            "audio_overview_script": "str"
        },
        "tasks": [
            {
                "date": "str",
                "title": "str",
                "duration_minutes": "int",
                "quadrant": "int",
                "notes": "str",
                "source_reference": "str",
                "key_question": "str"
            }
        ]
    }

    explanation = ""
    tasks = []
    study_guide = None

    try:
        ai_res = call_gemini(prompt, schema)
        if isinstance(ai_res, dict) and "tasks" in ai_res and isinstance(ai_res["tasks"], list) and len(ai_res["tasks"]) > 0:
            explanation = ai_res.get("explanation", "").strip()

            sg_raw = ai_res.get("study_guide")
            if isinstance(sg_raw, dict):
                study_guide = NotebookLMStudyGuide(
                    briefing_summary=sg_raw.get("briefing_summary", ""),
                    core_concepts=sg_raw.get("core_concepts", []),
                    exam_questions=sg_raw.get("exam_questions", []),
                    difficulty_assessment=sg_raw.get("difficulty_assessment"),
                    audio_overview_script=sg_raw.get("audio_overview_script"),
                )

            for t in ai_res["tasks"]:
                t_date = t.get("date") or today.isoformat()
                t_title = t.get("title") or req.title
                t_quadrant = int(t.get("quadrant", 1))
                t_duration = int(t.get("duration_minutes", int(daily_hours * 60)))
                t_notes = t.get("notes") or ""
                t_src = t.get("source_reference")
                t_q = t.get("key_question")
                tasks.append(
                    AIBreakdownTaskItem(
                        date=t_date,
                        title=t_title,
                        quadrant=t_quadrant,
                        duration_minutes=t_duration,
                        notes=t_notes,
                        source_reference=t_src,
                        key_question=t_q,
                    )
                )
    except Exception:
        pass

    # Nếu Gemini không trả về đủ hoặc lỗi, dùng bộ sinh phương pháp sư phạm dự phòng
    if not tasks:
        explanation, tasks, study_guide, fallback_src_summary = _generate_heuristic_breakdown(
            title=req.title,
            today=today,
            target=target,
            daily_hours=daily_hours,
            notes_or_syllabus=req.notes_or_syllabus,
            sources=req.sources,
            quadrant=quadrant,
        )
        if not sources_summary:
            sources_summary = fallback_src_summary

    return AIBreakdownProposalResponse(
        title=req.title,
        target_date=target.isoformat(),
        explanation=explanation,
        days_count=len(tasks),
        tasks=tasks,
        study_guide=study_guide,
        sources_summary=sources_summary,
    )


@router.post("/ai/ask-sources", response_model=AskSourcesResponse)
def ask_sources(
    req: AskSourcesRequest,
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Hỏi đáp tương tác trực tiếp với các nguồn tài liệu đã nạp (Q&A with Sources).
    Chỉ trả lời dựa trên tài liệu được cung cấp.
    """
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Vui lòng nhập câu hỏi!")

    sources_context = ""
    for s in req.sources:
        sources_context += f"\n--- NGUỒN: {s.name} ---\n{s.content[:8000]}\n"

    prompt = f"""
Bạn là AI trợ lý nghiên cứu của NotebookLM Studio trong LifeQuest.
Nhiệm vụ: Trả lời câu hỏi của người dùng về môn học "{req.subject}" CHỈ DỰA TRÊN các tài liệu nguồn sau đây:

{sources_context if sources_context else 'Không có tài liệu nguồn nào được cung cấp.'}

CÂU HỎI CỦA NGƯỜI DÙNG: {question}

YÊU CẦU:
1. Trả lời chính xác, ngắn gọn, súc tích bằng tiếng Việt.
2. Trích dẫn rõ nguồn/chương/mục nếu có trong tài liệu.
3. Nếu trong tài liệu không có thông tin, hãy nói rõ là tài liệu chưa đề cập và gợi ý khái quát.
4. Đưa ra 2-3 câu hỏi gợi mở tiếp theo (suggested_followups).
"""
    schema = {
        "answer": "str",
        "citations": ["str"],
        "suggested_followups": ["str"]
    }

    try:
        ai_res = call_gemini(prompt, schema)
        if isinstance(ai_res, dict) and "answer" in ai_res and ai_res["answer"]:
            return AskSourcesResponse(
                answer=ai_res.get("answer", ""),
                citations=ai_res.get("citations", []),
                suggested_followups=ai_res.get("suggested_followups", [])
            )
    except Exception:
        pass

    # Heuristic fallback
    answer = f"Dựa trên các tài liệu đã nạp cho môn {req.subject}: Về câu hỏi '{question}', bạn nên tập trung vào các định nghĩa cốt lõi và các dạng bài tập thực hành được nêu trong giáo trình/slide."
    citations = [s.name for s in req.sources[:2]] if req.sources else ["Đề cương môn học"]
    suggested_followups = [
        "Có ví dụ minh họa cụ thể trong tài liệu không?",
        "Dạng bài tập này thường chiếm bao nhiêu điểm trong đề thi?",
    ]
    return AskSourcesResponse(
        answer=answer,
        citations=citations,
        suggested_followups=suggested_followups
    )


@router.post("/ai/apply-breakdown")
def apply_ai_breakdown(
    req: AIApplyBreakdownRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Lưu các nhiệm vụ đã được người dùng PHÊ DUYỆT vào database (vào Ô 1 để xuất hiện trên Lịch).
    Lưu vết batch_id để người dùng có thể HOÀN TÁC (Rollback) bất cứ lúc nào.
    """
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    if not req.tasks:
        raise HTTPException(status_code=400, detail="Không có nhiệm vụ nào trong danh sách được duyệt!")

    try:
        target_date_obj = datetime.date.fromisoformat(req.target_date)
    except ValueError:
        target_date_obj = vn_today()

    batch_id = f"aibk_{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"

    created_goal_id = None
    if req.create_parent_goal:
        parent_goal = StudyGoal(
            user_id=user_id,
            title=req.title,
            goal_type="deadline",
            target_date=target_date_obj,
            category="Lịch thi" if "thi" in req.title.lower() else "Deadline",
            color="#0284c7" if "thi" in req.title.lower() else "#f97316",
            notes=req.explanation,
        )
        db.add(parent_goal)
        db.commit()
        db.refresh(parent_goal)
        created_goal_id = parent_goal.id

    created_task_ids = []
    for item in req.tasks:
        try:
            task_date = datetime.date.fromisoformat(item.date)
        except ValueError:
            task_date = target_date_obj

        notes_combined = item.notes or ""
        extras = []
        if item.source_reference:
            extras.append(f"📌 {item.source_reference}")
        if item.key_question:
            extras.append(f"❓ {item.key_question}")
        if extras:
            notes_combined = f"{notes_combined} | {' • '.join(extras)}".strip(" |")

        if item.duration_minutes:
            notes_combined = f"{item.duration_minutes} phút | {notes_combined}".strip(" |")

        task = DailyMatrixTask(
            user_id=user_id,
            title=item.title,
            date=task_date,
            quadrant=item.quadrant if item.quadrant in (1, 2, 3, 4) else 1,
            description=notes_combined or f"AI chia nhỏ từ: {req.title}",
            goal_id=created_goal_id,
            is_completed=False,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        created_task_ids.append(task.id)

    # Ghi nhận batch log để phục vụ hoàn tác
    log = AIBreakdownLog(
        user_id=user_id,
        batch_id=batch_id,
        title=req.title,
        target_date=target_date_obj,
        explanation=req.explanation,
        created_task_ids=json.dumps(created_task_ids),
        created_goal_id=created_goal_id,
        task_count=len(created_task_ids),
        is_reverted=False,
    )
    db.add(log)
    db.commit()

    return {
        "ok": True,
        "batch_id": batch_id,
        "count": len(created_task_ids),
        "message": f"Đã thêm thành công {len(created_task_ids)} nhiệm vụ vào Lịch Deadline!",
    }


@router.post("/ai/rollback-breakdown")
def rollback_ai_breakdown(
    req: AIRollbackRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    HOÀN TÁC (Rollback): Xóa sạch toàn bộ các task thuộc batch_id chỉ định.
    ĐẢM BẢO 100% dữ liệu cũ khác của người dùng không bao giờ bị ảnh hưởng.
    """
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    query = db.query(AIBreakdownLog).filter(AIBreakdownLog.batch_id == req.batch_id)
    if user_id:
        query = query.filter(AIBreakdownLog.user_id == user_id)
    else:
        query = query.filter(AIBreakdownLog.user_id.is_(None))

    log = query.first()
    if not log:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử đợt chia AI này để hoàn tác!")

    if log.is_reverted:
        return {
            "ok": True,
            "message": "Đợt chia lịch này đã được hoàn tác trước đó rồi!",
            "deleted_count": 0,
        }

    try:
        task_ids = json.loads(log.created_task_ids)
    except Exception:
        task_ids = []

    deleted_count = 0
    if task_ids:
        del_query = db.query(DailyMatrixTask).filter(DailyMatrixTask.id.in_(task_ids))
        if user_id:
            del_query = del_query.filter(DailyMatrixTask.user_id == user_id)
        else:
            del_query = del_query.filter(DailyMatrixTask.user_id.is_(None))
        deleted_count = del_query.delete(synchronize_session=False)

    if log.created_goal_id:
        goal_query = db.query(StudyGoal).filter(StudyGoal.id == log.created_goal_id)
        if user_id:
            goal_query = goal_query.filter(StudyGoal.user_id == user_id)
        else:
            goal_query = goal_query.filter(StudyGoal.user_id.is_(None))
        goal_query.delete(synchronize_session=False)

    log.is_reverted = True
    log.reverted_at = datetime.datetime.utcnow()
    db.commit()

    return {
        "ok": True,
        "message": f"Đã hoàn tác thành công và xóa sạch {deleted_count} nhiệm vụ của lần chia này!",
        "deleted_count": deleted_count,
        "batch_id": req.batch_id,
    }


@router.get("/ai/breakdown-history", response_model=List[AIBreakdownLogResponse])
def get_breakdown_history(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Lấy danh sách các đợt AI đã chia lịch gần đây để người dùng xem lại hoặc hoàn tác.
    """
    real_user = _get_real_user(user)
    query = db.query(AIBreakdownLog)
    if real_user:
        query = query.filter(AIBreakdownLog.user_id == real_user.id)
    else:
        query = query.filter(AIBreakdownLog.user_id.is_(None))

    logs = query.order_by(AIBreakdownLog.created_at.desc()).limit(20).all()
    return logs


@router.post("/ai/parse-text-schedule")
def parse_schedule_text(
    req: ParseScheduleTextRequest,
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Dùng AI bóc tách thời khóa biểu, lịch thi hoặc đề cương thô (dán từ website trường)
    thành danh sách các task có ngày, giờ, phòng thi rõ ràng.
    """
    raw_text = req.text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Vui lòng dán nội dung thời khóa biểu hoặc đề cương!")

    today = vn_today()
    prompt = f"""
Bạn là AI chuyên gia bóc tách dữ liệu lịch học và lịch thi của sinh viên Việt Nam.
Hãy phân tích đoạn văn bản sau đây và trích xuất danh sách các môn thi/nhiệm vụ học tập:

VĂN BẢN ĐẦU VÀO:
{raw_text}

NGÀY HIỆN TẠI THAM CHIẾU: {today.isoformat()}
HẠN CHÓT NẾU CÓ: {req.target_date or 'Tự trích xuất từ văn bản'}

YÊU CẦU:
Trích xuất thành danh sách JSON các công việc:
- date: YYYY-MM-DD (nếu văn bản ghi 15/11/2026 thì đổi thành 2026-11-15, nếu không có năm thì lấy năm 2026)
- title: Tên môn thi / công việc (VD: Lịch thi: Thương mại điện tử)
- quadrant: 1 (Ô 1: Làm ngay)
- duration_minutes: số phút ước tính (VD: 90)
- notes: thông tin ca thi, phòng thi hoặc hình thức thi (VD: 18:50 - 20:20 (Ca 6) | Phòng A4-201.202 | Trắc nghiệm)
"""
    schema = {
        "summary": "str - Tóm tắt ngắn nội dung đã bóc tách",
        "tasks": [
            {
                "date": "str",
                "title": "str",
                "quadrant": "int",
                "duration_minutes": "int",
                "notes": "str"
            }
        ]
    }

    try:
        ai_res = call_gemini(prompt, schema)
        if isinstance(ai_res, dict) and "tasks" in ai_res and len(ai_res["tasks"]) > 0:
            return ai_res
    except Exception:
        pass

    # Heuristic line parser nếu Gemini offline
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    extracted = []
    for l in lines:
        date_match = re.search(r"(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?", l)
        if date_match:
            d = int(date_match.group(1))
            m = int(date_match.group(2))
            y = int(date_match.group(3)) if date_match.group(3) else today.year
            if y < 100:
                y += 2000
            try:
                dt = datetime.date(y, m, d)
            except ValueError:
                dt = today
        else:
            dt = today

        extracted.append({
            "date": dt.isoformat(),
            "title": l[:80],
            "quadrant": 1,
            "duration_minutes": 90,
            "notes": l,
        })

    return {
        "summary": f"Đã trích xuất {len(extracted)} mục từ văn bản của bạn.",
        "tasks": extracted,
    }


@router.post("/import/tasks")
def bulk_import_tasks(
    req: BulkImportTasksRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Import trực tiếp danh sách task từ file CSV hoặc JSON với batch_id để có thể HOÀN TÁC.
    """
    real_user = _get_real_user(user)
    user_id = real_user.id if real_user else None

    if not req.tasks:
        raise HTTPException(status_code=400, detail="Danh sách task import rỗng!")

    batch_id = f"import_{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
    created_task_ids = []

    for item in req.tasks:
        try:
            task_date = datetime.date.fromisoformat(item.date)
        except ValueError:
            task_date = vn_today()

        task = DailyMatrixTask(
            user_id=user_id,
            title=item.title,
            date=task_date,
            quadrant=item.quadrant if item.quadrant in (1, 2, 3, 4) else 1,
            description=item.notes or "Import từ file ngoài",
            is_completed=False,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        created_task_ids.append(task.id)

    log = AIBreakdownLog(
        user_id=user_id,
        batch_id=batch_id,
        title=req.title or "Import Danh Sách Ngoài",
        target_date=vn_today(),
        explanation=f"Import {len(created_task_ids)} nhiệm vụ từ file ngoài.",
        created_task_ids=json.dumps(created_task_ids),
        created_goal_id=None,
        task_count=len(created_task_ids),
        is_reverted=False,
    )
    db.add(log)
    db.commit()

    return {
        "ok": True,
        "batch_id": batch_id,
        "count": len(created_task_ids),
        "message": f"Đã import thành công {len(created_task_ids)} nhiệm vụ vào Lịch!",
    }
