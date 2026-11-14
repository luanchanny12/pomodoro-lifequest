import datetime
import json
import uuid
import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
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
)
from app.routers.auth import get_current_user_optional, get_current_user
from app.routers.focus.common import _get_real_user, vn_today, vn_now
from app.ai.gemini_bridge import call_gemini

router = APIRouter()


def _generate_heuristic_breakdown(
    title: str,
    today: datetime.date,
    target: datetime.date,
    daily_hours: float,
    notes_or_syllabus: Optional[str] = None,
    quadrant: int = 1,
) -> tuple:
    """
    Fallback thông minh khi Gemini API chưa cấu hình hoặc mất mạng.
    Tự động phân rã theo phương pháp sư phạm Spaced Repetition:
    - Giai đoạn 1: Khởi động & Nắm vững nền tảng
    - Giai đoạn 2: Luyện tập chuyên sâu & Vận dụng
    - Giai đoạn 3: Giải đề thi thử / Bấm giờ
    - Giai đoạn 4: Tổng kết & Tự tin vào thi
    """
    days_span = (target - today).days + 1
    if days_span < 1:
        days_span = 1

    # Trích xuất các ý trong đề cương nếu người dùng nhập
    syllabus_points = []
    if notes_or_syllabus:
        raw_lines = [line.strip("- *• \t\r") for line in notes_or_syllabus.replace(";", "\n").split("\n")]
        syllabus_points = [line for line in raw_lines if len(line) >= 3]

    duration_mins = int(max(30, min(240, daily_hours * 60)))
    tasks = []

    # Chia các ngày
    step_dates = [today + datetime.timedelta(days=i) for i in range(days_span)]

    if days_span == 1:
        tasks.append(
            AIBreakdownTaskItem(
                date=today.isoformat(),
                title=f"Tập trung dứt điểm: {title}",
                quadrant=quadrant,
                duration_minutes=duration_mins,
                notes=f"Ôn tập cấp tốc, nắm chắc các định nghĩa và công thức cốt lõi.",
            )
        )
        explanation = (
            f"Kỳ hạn còn duy nhất 1 ngày ({today.strftime('%d/%m')}). Kế hoạch tập trung 100% vào việc "
            f"Ô 1 khẩn cấp để xử lý dứt điểm các kiến thức then chốt nhất."
        )
    else:
        for idx, d in enumerate(step_dates):
            day_num = idx + 1
            if syllabus_points and idx < len(syllabus_points):
                topic_focus = syllabus_points[idx]
            else:
                topic_focus = f"Phần trọng tâm {day_num}"

            if idx == 0:
                t_title = f"Khởi động & Nắm vững nền tảng: {topic_focus}"
                t_notes = "Đọc tài liệu, ghi chú các khái niệm cốt lõi vào sổ tay."
            elif idx == days_span - 1:
                t_title = f"Tổng ôn & Chuẩn bị tinh thần thi: {title}"
                t_notes = "Xem lại các lỗi sai, kiểm tra lại phòng thi, số báo danh và công cụ."
            elif idx == days_span - 2:
                t_title = f"Giải đề thi thử & Bấm giờ chuẩn: {title}"
                t_notes = "Làm đề thi thử bấm giờ nghiêm túc để kiểm tra tốc độ và độ chính xác."
            else:
                t_title = f"Ôn tập chuyên sâu & Luyện bài tập: {topic_focus}"
                t_notes = "Làm bài tập vận dụng, giải đáp các thắc mắc còn vướng."

            tasks.append(
                AIBreakdownTaskItem(
                    date=d.isoformat(),
                    title=t_title,
                    quadrant=quadrant,
                    duration_minutes=duration_mins,
                    notes=t_notes,
                )
            )

        explanation = (
            f"Kế hoạch gồm {days_span} ngày (từ {today.strftime('%d/%m')} đến {target.strftime('%d/%m')}), "
            f"mỗi ngày {daily_hours}h được phân bổ theo phương pháp Spaced Repetition (Lý thuyết nền tảng → "
            f"Luyện tập chuyên sâu → Thi thử bấm giờ → Tổng kết). Toàn bộ được xếp vào Ô 1 để ưu tiên xử lý mỗi ngày."
        )

    return explanation, tasks


@router.post("/ai/breakdown-preview", response_model=AIBreakdownProposalResponse)
def preview_ai_breakdown(
    req: AIBreakdownPreviewRequest,
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Phân tích và tạo bản ĐỀ XUẤT chia nhỏ nhiệm vụ lớn ra từng ngày.
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

    # 1. Thử gọi Gemini AI nếu có API Key
    prompt = f"""
Bạn là AI Coach chuyên gia lập kế hoạch học tập cá nhân hóa của LifeQuest.
Nhiệm vụ: Hãy chia nhỏ mục tiêu/kỳ thi lớn sau đây thành từng nhiệm vụ cụ thể cho từng ngày từ hôm nay ({today.isoformat()}) đến ngày hạn chót ({target.isoformat()}).

MỤC TIÊU LỚN: {req.title}
HẠN CHÓT / NGÀY THI: {target.isoformat()} (tổng cộng {days_span} ngày)
THỜI LƯỢNG HỌC MỖI NGÀY: {daily_hours} giờ ({int(daily_hours * 60)} phút)
ĐỀ CƯƠNG / GHI CHÚ BỔ SUNG: {req.notes_or_syllabus or 'Không có'}

YÊU CẦU:
1. Giải trình chi tiết bằng tiếng Việt: Tại sao chia như vậy? Phương pháp phân bổ thời gian ra sao?
2. Trả về đúng {days_span} nhiệm vụ tương ứng với từng ngày từ {today.isoformat()} đến {target.isoformat()}.
3. Mỗi nhiệm vụ phải có tiêu đề rõ ràng, hành động cụ thể, thời lượng (phút), quadrant=1 (Ô 1: Làm ngay) và ghi chú hướng dẫn.
"""
    schema = {
        "explanation": "str - Đoạn giải trình ngắn gọn, ấm áp, logic tại sao lại chia lịch như vậy",
        "tasks": [
            {
                "date": "str - Định dạng YYYY-MM-DD",
                "title": "str - Tên nhiệm vụ cụ thể của ngày",
                "duration_minutes": "int - Số phút ước tính (VD: 90)",
                "quadrant": "int - 1 (Ô 1: Làm ngay)",
                "notes": "str - Ghi chú ngắn về tài liệu hoặc nội dung cần làm"
            }
        ]
    }

    explanation = ""
    tasks = []

    try:
        ai_res = call_gemini(prompt, schema)
        if isinstance(ai_res, dict) and "tasks" in ai_res and isinstance(ai_res["tasks"], list) and len(ai_res["tasks"]) > 0:
            explanation = ai_res.get("explanation", "").strip()
            for t in ai_res["tasks"]:
                t_date = t.get("date") or today.isoformat()
                t_title = t.get("title") or req.title
                t_quadrant = int(t.get("quadrant", 1))
                t_duration = int(t.get("duration_minutes", int(daily_hours * 60)))
                t_notes = t.get("notes") or ""
                tasks.append(
                    AIBreakdownTaskItem(
                        date=t_date,
                        title=t_title,
                        quadrant=t_quadrant,
                        duration_minutes=t_duration,
                        notes=t_notes,
                    )
                )
    except Exception:
        pass

    # Nếu Gemini không trả về đủ hoặc lỗi, dùng bộ sinh phương pháp sư phạm dự phòng
    if not tasks:
        explanation, tasks = _generate_heuristic_breakdown(
            title=req.title,
            today=today,
            target=target,
            daily_hours=daily_hours,
            notes_or_syllabus=req.notes_or_syllabus,
            quadrant=quadrant,
        )

    return AIBreakdownProposalResponse(
        title=req.title,
        target_date=target.isoformat(),
        explanation=explanation,
        days_count=len(tasks),
        tasks=tasks,
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
