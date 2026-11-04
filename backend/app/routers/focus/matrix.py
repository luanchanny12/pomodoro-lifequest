from typing import List, Optional, Dict, Any
import datetime
import math
import os
import re
import threading
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.cache import get_cache, set_cache, invalidate_user_cache
from app.models import (
    StudyGoal,
    StudySessionLog,
    RewardItem,
    RewardRedemption,
    TimeCapsule,
    ConstellationAchievement,
    UserConstellationUnlock,
    DailyMatrixTask,
    Player,
    Achievement,
)
from app.schemas import (
    StudyGoalCreate,
    StudyGoalUpdate,
    StudyGoalResponse,
    PlanetBuildUpdateRequest,
    StudySessionLogCreate,
    StudySessionLogUpdate,
    StudySessionLogResponse,
    FocusStatsResponse,
    DailyFocusStat,
    RewardItemCreate,
    RewardItemResponse,
    RewardRedeemRequest,
    RewardRedemptionResponse,
    PearlsBalanceResponse,
    TopicPlanetResponse,
    TopicGalaxyResponse,
    TimeWarpOracleResponse,
    TimeCapsuleCreate,
    TimeCapsuleResponse,
    MoodBalanceResponse,
    ConstellationAchievementResponse,
    ConstellationCheckResponse,
    DailyMatrixTaskCreate,
    DailyMatrixTaskUpdate,
    DailyMatrixTaskReflectionUpdate,
    DailyMatrixTaskResponse,
    MonthlyMatrixSummaryResponse,
    AIBuddyPromptResponse,
)
from app.models_auth import User
from app.routers.auth import (
    get_current_user_optional,
    get_client_ip,
    _check_rate_limit,
    _record_failed_attempt,
)
from app.routers.focus.common import (
    DEFAULT_CELESTIALS,
    _get_real_user,
    _verify_resource_ownership,
    VN_TZ,
    vn_now,
    vn_today,
    _propagate_goal_hours,
    _reconcile_parent_goals,
    _update_user_streak,
    _format_goal_response,
    _format_session_response,
)

router = APIRouter()

# ==========================================
# ── DAILY 4-QUADRANT MATRIX (EISENHOWER) ──
# ==========================================

def _auto_rollover_tasks(db: Session, user: Optional[User], target_date: datetime.date) -> int:
    """
    Tự động chuyển giao các công việc chưa hoàn thành sang ngày tiếp theo:
    1. Nếu target_date == vn_today():
       Tự động gom các việc chưa hoàn thành từ các ngày quá khứ gần nhất (tối đa 14 ngày)
       chưa từng được hoàn thành vào/sau ngày đó và chưa có mặt ở ngày hôm nay -> tự động chuyển sang ngày hôm nay.
    2. Nếu target_date == vn_today() + 1 ngày (ngày mai):
       Tự động gom các việc chưa hoàn thành của ngày hôm nay sang ngày mai để lập kế hoạch tối hôm trước.
    """
    current_today = vn_today()
    tomorrow = current_today + datetime.timedelta(days=1)

    if target_date != current_today and target_date != tomorrow:
        return 0

    target_user_id = user.id if user else None

    # Lấy danh sách tiêu đề công việc đã có ở ngày đích (để chống trùng lặp)
    dest_query = db.query(DailyMatrixTask).filter(DailyMatrixTask.date == target_date)
    if user:
        dest_query = dest_query.filter(DailyMatrixTask.user_id == user.id)
    else:
        dest_query = dest_query.filter(DailyMatrixTask.user_id.is_(None))
    dest_tasks = dest_query.all()
    existing_dest_titles = {t.title.strip().lower() for t in dest_tasks if t.title}

    rolled_count = 0

    if target_date == current_today:
        min_date = current_today - datetime.timedelta(days=14)
        past_query = db.query(DailyMatrixTask).filter(
            DailyMatrixTask.date >= min_date,
            DailyMatrixTask.date < current_today,
            DailyMatrixTask.is_completed == False,
        )
        if user:
            past_query = past_query.filter(DailyMatrixTask.user_id == user.id)
        else:
            past_query = past_query.filter(DailyMatrixTask.user_id.is_(None))
        past_uncompleted = past_query.order_by(DailyMatrixTask.date.desc(), DailyMatrixTask.id.desc()).all()

        if not past_uncompleted:
            return 0

        # Lấy ngày hoàn thành muộn nhất của mỗi tiêu đề (để chỉ bỏ qua nếu việc đó đã được hoàn thành vào/sau ngày của task)
        completed_rows = (
            db.query(DailyMatrixTask.title, func.max(DailyMatrixTask.date))
            .filter(
                DailyMatrixTask.date >= min_date,
                DailyMatrixTask.date <= current_today,
                DailyMatrixTask.is_completed == True,
            )
        )
        if user:
            completed_rows = completed_rows.filter(DailyMatrixTask.user_id == user.id)
        else:
            completed_rows = completed_rows.filter(DailyMatrixTask.user_id.is_(None))

        latest_completed_map = {
            row[0].strip().lower(): row[1]
            for row in completed_rows.group_by(DailyMatrixTask.title).all()
            if row[0]
        }

        for t in past_uncompleted:
            if not t.title:
                continue
            clean_title = t.title.strip().lower()
            if clean_title in existing_dest_titles:
                continue
            # Chỉ bỏ qua nếu công việc này đã từng được hoàn thành vào ngày t.date hoặc một ngày sau t.date
            if clean_title in latest_completed_map and latest_completed_map[clean_title] >= t.date:
                continue

            note = t.reflection_note or ""
            note_clean = re.sub(r"^Tự động chuyển từ [^:]+:\s*", "", note).strip()
            reflection_note = f"Tự động chuyển từ {t.date.strftime('%d/%m')}" + (f": {note_clean}" if note_clean and note_clean != "chưa hoàn thành" else "")

            new_task = DailyMatrixTask(
                user_id=target_user_id,
                title=t.title,
                description=t.description,
                date=current_today,
                quadrant=t.quadrant,
                goal_id=t.goal_id,
                reflection_note=reflection_note,
                order_index=t.order_index or 0,
            )
            db.add(new_task)
            existing_dest_titles.add(clean_title)
            rolled_count += 1

    elif target_date == tomorrow:
        today_query = db.query(DailyMatrixTask).filter(
            DailyMatrixTask.date == current_today,
            DailyMatrixTask.is_completed == False,
        )
        if user:
            today_query = today_query.filter(DailyMatrixTask.user_id == user.id)
        else:
            today_query = today_query.filter(DailyMatrixTask.user_id.is_(None))
        today_uncompleted = today_query.order_by(DailyMatrixTask.order_index.asc(), DailyMatrixTask.id.asc()).all()

        if not today_uncompleted:
            return 0

        for t in today_uncompleted:
            if not t.title:
                continue
            clean_title = t.title.strip().lower()
            if clean_title in existing_dest_titles:
                continue

            note = t.reflection_note or ""
            note_clean = re.sub(r"^Tự động chuyển từ [^:]+:\s*", "", note).strip()
            reflection_note = f"Tự động chuyển từ hôm nay ({current_today.strftime('%d/%m')})" + (f": {note_clean}" if note_clean and note_clean != "chưa hoàn thành" else "")

            new_task = DailyMatrixTask(
                user_id=target_user_id,
                title=t.title,
                description=t.description,
                date=tomorrow,
                quadrant=t.quadrant,
                goal_id=t.goal_id,
                reflection_note=reflection_note,
                order_index=t.order_index or 0,
            )
            db.add(new_task)
            existing_dest_titles.add(clean_title)
            rolled_count += 1

    if rolled_count > 0:
        db.commit()
        invalidate_user_cache(user)

    return rolled_count


@router.get("/matrix", response_model=List[DailyMatrixTaskResponse])
def get_matrix_tasks(
    task_date: Optional[datetime.date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    real_user = _get_real_user(user)
    current_today = vn_today()
    target_date = task_date or current_today

    # 1. Luôn tự động chuyển giao việc tồn đọng từ các ngày trước sang ngày hôm nay
    _auto_rollover_tasks(db, real_user, current_today)

    # 2. Nếu đang xem ngày mai, tự động chuyển việc tồn đọng của hôm nay sang ngày mai
    if target_date == current_today + datetime.timedelta(days=1):
        _auto_rollover_tasks(db, real_user, target_date)

    uid_str = f"u_{real_user.id}" if real_user else "u_guest"
    cache_key = f"cache:matrix:{uid_str}:{target_date.isoformat()}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    query = db.query(DailyMatrixTask).filter(DailyMatrixTask.date == target_date)
    if real_user:
        query = query.filter(DailyMatrixTask.user_id == real_user.id)
    else:
        query = query.filter(DailyMatrixTask.user_id.is_(None))
    tasks = (
        query
        .order_by(DailyMatrixTask.quadrant.asc(), DailyMatrixTask.order_index.asc(), DailyMatrixTask.id.asc())
        .all()
    )

    goal_query = db.query(StudyGoal)
    if real_user:
        goal_query = goal_query.filter(StudyGoal.user_id == real_user.id)
    else:
        goal_query = goal_query.filter(StudyGoal.user_id.is_(None))
    goals_map = {g.id: g for g in goal_query.all()}
    result = []
    for t in tasks:
        goal = goals_map.get(t.goal_id) if t.goal_id else None
        result.append(
            DailyMatrixTaskResponse(
                id=t.id,
                title=t.title,
                description=t.description,
                date=t.date,
                quadrant=t.quadrant,
                goal_id=t.goal_id,
                goal_title=goal.title if goal else None,
                goal_color=goal.color if goal else None,
                is_completed=t.is_completed,
                completed_at=t.completed_at,
                reflection_note=t.reflection_note,
                order_index=t.order_index or 0,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
        )
    set_cache(cache_key, [item.model_dump() for item in result], ttl_seconds=120)
    return result


@router.post("/matrix", response_model=DailyMatrixTaskResponse, status_code=201)
def create_matrix_task(
    data: DailyMatrixTaskCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
    request: Request = None,
):
    if not user and isinstance(request, Request) and not os.getenv("PYTEST_CURRENT_TEST"):
        client_ip = get_client_ip(request)
        _check_rate_limit(f"guest_write:{client_ip}", 60, 60, "Bạn đang tạo công việc quá nhanh. Vui lòng thử lại sau!")
        _record_failed_attempt(f"guest_write:{client_ip}")

    task_date = data.date or datetime.date.today()
    quadrant = max(1, min(4, data.quadrant))
    clean_title = data.title.strip()

    if data.goal_id:
        target_goal = db.query(StudyGoal).filter(StudyGoal.id == data.goal_id).first()
        if not target_goal:
            raise HTTPException(status_code=404, detail="Mục tiêu không tồn tại")
        _verify_resource_ownership(target_goal, user)

    # Chống double click / spam request trùng lặp trong vòng 3 giây
    recent_duplicate = (
        db.query(DailyMatrixTask)
        .filter(
            DailyMatrixTask.user_id == (user.id if user else None),
            DailyMatrixTask.title == clean_title,
            DailyMatrixTask.date == task_date,
            DailyMatrixTask.quadrant == quadrant,
        )
        .order_by(DailyMatrixTask.created_at.desc())
        .first()
    )
    if recent_duplicate and recent_duplicate.created_at:
        diff_sec = (datetime.datetime.utcnow() - recent_duplicate.created_at).total_seconds()
        if diff_sec < 3.0:
            goal = db.query(StudyGoal).filter(StudyGoal.id == recent_duplicate.goal_id).first() if recent_duplicate.goal_id else None
            return DailyMatrixTaskResponse(
                id=recent_duplicate.id,
                title=recent_duplicate.title,
                description=recent_duplicate.description,
                date=recent_duplicate.date,
                quadrant=recent_duplicate.quadrant,
                goal_id=recent_duplicate.goal_id,
                goal_title=goal.title if goal else None,
                goal_color=goal.color if goal else None,
                is_completed=recent_duplicate.is_completed,
                completed_at=recent_duplicate.completed_at,
                reflection_note=recent_duplicate.reflection_note,
                order_index=recent_duplicate.order_index or 0,
                created_at=recent_duplicate.created_at,
                updated_at=recent_duplicate.updated_at,
            )

    task = DailyMatrixTask(
        user_id=user.id if user else None,
        title=clean_title,
        description=data.description,
        date=task_date,
        quadrant=quadrant,
        goal_id=data.goal_id,
        reflection_note=data.reflection_note,
        order_index=0,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    invalidate_user_cache(user)

    goal = db.query(StudyGoal).filter(StudyGoal.id == task.goal_id).first() if task.goal_id else None
    return DailyMatrixTaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        date=task.date,
        quadrant=task.quadrant,
        goal_id=task.goal_id,
        goal_title=goal.title if goal else None,
        goal_color=goal.color if goal else None,
        is_completed=task.is_completed,
        completed_at=task.completed_at,
        reflection_note=task.reflection_note,
        order_index=task.order_index or 0,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.put("/matrix/{task_id}", response_model=DailyMatrixTaskResponse)
def update_matrix_task(
    task_id: int,
    data: DailyMatrixTaskUpdate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    task = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    _verify_resource_ownership(task, user)

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.date is not None:
        task.date = data.date
    if data.quadrant is not None:
        task.quadrant = max(1, min(4, data.quadrant))
    if data.goal_id is not None:
        if data.goal_id > 0:
            target_goal = db.query(StudyGoal).filter(StudyGoal.id == data.goal_id).first()
            if not target_goal:
                raise HTTPException(status_code=404, detail="Mục tiêu không tồn tại")
            _verify_resource_ownership(target_goal, user)
            task.goal_id = data.goal_id
        else:
            task.goal_id = None
    if data.is_completed is not None:
        current_today = vn_today()
        if data.is_completed is True and task.date < current_today and not task.is_completed:
            raise HTTPException(
                status_code=400,
                detail="Không thể hoàn thành bù công việc của ngày trong quá khứ! Công việc chưa xong đã được tự động chuyển sang ngày hôm nay."
            )
        task.is_completed = data.is_completed
        task.completed_at = datetime.datetime.utcnow() if data.is_completed else None
    if data.reflection_note is not None:
        task.reflection_note = data.reflection_note
    if data.order_index is not None:
        task.order_index = data.order_index

    task.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(task)
    invalidate_user_cache(user)

    goal = db.query(StudyGoal).filter(StudyGoal.id == task.goal_id).first() if task.goal_id else None
    return DailyMatrixTaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        date=task.date,
        quadrant=task.quadrant,
        goal_id=task.goal_id,
        goal_title=goal.title if goal else None,
        goal_color=goal.color if goal else None,
        is_completed=task.is_completed,
        completed_at=task.completed_at,
        reflection_note=task.reflection_note,
        order_index=task.order_index or 0,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.patch("/matrix/{task_id}/toggle", response_model=DailyMatrixTaskResponse)
def toggle_matrix_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    task = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    _verify_resource_ownership(task, user)

    # KHÔNG ĐƯỢC HOÀN THÀNH BÙ CÔNG VIỆC CHƯA XONG TRONG QUÁ KHỨ
    current_today = vn_today()
    if task.date < current_today and not task.is_completed:
        raise HTTPException(
            status_code=400,
            detail="Không thể hoàn thành bù công việc của ngày trong quá khứ! Công việc chưa xong đã được tự động chuyển sang ngày tiếp theo để bạn tiếp tục thực hiện."
        )

    task.is_completed = not task.is_completed
    task.completed_at = datetime.datetime.utcnow() if task.is_completed else None
    task.updated_at = datetime.datetime.utcnow()

    if task.is_completed:
        # Chỉ kéo dài streak nếu hoàn thành công việc của ngày hôm nay
        if task.date == current_today:
            _update_user_streak(db, user, task.date)
            # Dọn dẹp bản sao tự động chuyển sang ngày mai nếu hôm nay đã hoàn thành xong
            tomorrow = current_today + datetime.timedelta(days=1)
            tomorrow_copy_query = db.query(DailyMatrixTask).filter(
                DailyMatrixTask.date == tomorrow,
                DailyMatrixTask.is_completed == False,
            )
            real_user = _get_real_user(user)
            if real_user:
                tomorrow_copy_query = tomorrow_copy_query.filter(DailyMatrixTask.user_id == real_user.id)
            else:
                tomorrow_copy_query = tomorrow_copy_query.filter(DailyMatrixTask.user_id.is_(None))
            clean_task_title = task.title.strip().lower()
            for t_copy in tomorrow_copy_query.all():
                if t_copy.title.strip().lower() == clean_task_title:
                    if t_copy.reflection_note and "tự động chuyển từ" in t_copy.reflection_note.lower():
                        db.delete(t_copy)

    db.commit()
    db.refresh(task)
    invalidate_user_cache(user)

    goal = db.query(StudyGoal).filter(StudyGoal.id == task.goal_id).first() if task.goal_id else None
    return DailyMatrixTaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        date=task.date,
        quadrant=task.quadrant,
        goal_id=task.goal_id,
        goal_title=goal.title if goal else None,
        goal_color=goal.color if goal else None,
        is_completed=task.is_completed,
        completed_at=task.completed_at,
        reflection_note=task.reflection_note,
        order_index=task.order_index or 0,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.patch("/matrix/{task_id}/reflection", response_model=DailyMatrixTaskResponse)
def update_matrix_task_reflection(
    task_id: int,
    data: DailyMatrixTaskReflectionUpdate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    task = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    _verify_resource_ownership(task, user)

    task.reflection_note = data.reflection_note
    task.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(task)
    invalidate_user_cache(user)

    goal = db.query(StudyGoal).filter(StudyGoal.id == task.goal_id).first() if task.goal_id else None
    return DailyMatrixTaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        date=task.date,
        quadrant=task.quadrant,
        goal_id=task.goal_id,
        goal_title=goal.title if goal else None,
        goal_color=goal.color if goal else None,
        is_completed=task.is_completed,
        completed_at=task.completed_at,
        reflection_note=task.reflection_note,
        order_index=task.order_index or 0,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.delete("/matrix/{task_id}")
def delete_matrix_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    task = db.query(DailyMatrixTask).filter(DailyMatrixTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    _verify_resource_ownership(task, user)
    db.delete(task)
    db.commit()
    invalidate_user_cache(user)
    return {"message": "Đã xóa công việc", "id": task_id}


@router.post("/matrix/rollover")
def rollover_matrix_tasks(
    from_date: datetime.date = Query(..., description="Ngày cần chuyển các việc chưa xong"),
    to_date: datetime.date = Query(..., description="Ngày đích nhận việc"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    target_user_id = user.id if user else None
    query = db.query(DailyMatrixTask).filter(
        DailyMatrixTask.date == from_date,
        DailyMatrixTask.is_completed == False,
    )
    if user:
        query = query.filter(DailyMatrixTask.user_id == user.id)
    else:
        query = query.filter(DailyMatrixTask.user_id.is_(None))
    uncompleted = query.all()

    # Chống nhân bản trùng lặp khi người dùng bấm chuyển giao việc nhiều lần
    existing_dest_query = db.query(DailyMatrixTask).filter(DailyMatrixTask.date == to_date)
    if user:
        existing_dest_query = existing_dest_query.filter(DailyMatrixTask.user_id == user.id)
    else:
        existing_dest_query = existing_dest_query.filter(DailyMatrixTask.user_id.is_(None))
    existing_titles = {t.title.strip().lower() for t in existing_dest_query.all()}

    rolled_count = 0
    for t in uncompleted:
        clean_t = t.title.strip().lower()
        if clean_t in existing_titles:
            continue
        new_task = DailyMatrixTask(
            user_id=target_user_id,
            title=t.title,
            description=t.description,
            date=to_date,
            quadrant=t.quadrant,
            goal_id=t.goal_id,
            reflection_note=f"Chuyển từ {from_date.strftime('%d/%m')}: {t.reflection_note or 'chưa hoàn thành'}",
            order_index=0,
        )
        db.add(new_task)
        existing_titles.add(clean_t)
        rolled_count += 1

    db.commit()
    invalidate_user_cache(user)
    return {
        "message": f"Đã chuyển {rolled_count} việc chưa hoàn thành sang ngày {to_date.strftime('%d/%m/%Y')}",
        "count": rolled_count,
    }


@router.get("/matrix/monthly-summary", response_model=MonthlyMatrixSummaryResponse)
def get_monthly_matrix_summary(
    year: int = Query(..., description="Năm", ge=2020, le=2100),
    month: int = Query(..., description="Tháng 1-12", ge=1, le=12),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    start_date = datetime.date(year, month, 1)
    if month == 12:
        end_date = datetime.date(year + 1, 1, 1)
    else:
        end_date = datetime.date(year, month + 1, 1)

    query = db.query(DailyMatrixTask).filter(
        DailyMatrixTask.date >= start_date,
        DailyMatrixTask.date < end_date,
    )
    if user:
        query = query.filter(DailyMatrixTask.user_id == user.id)
        user_goals = db.query(StudyGoal).filter(StudyGoal.user_id == user.id).all()
    else:
        query = query.filter(DailyMatrixTask.user_id.is_(None))
        user_goals = db.query(StudyGoal).filter(StudyGoal.user_id.is_(None)).all()
    tasks = query.all()

    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.is_completed])
    completion_rate = round((completed_tasks / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0

    q1_tasks = [t for t in tasks if t.quadrant == 1]
    q2_tasks = [t for t in tasks if t.quadrant == 2]
    q3_tasks = [t for t in tasks if t.quadrant == 3]
    q4_tasks = [t for t in tasks if t.quadrant == 4]

    q1_count = len(q1_tasks)
    q2_count = len(q2_tasks)
    q3_count = len(q3_tasks)
    q4_count = len(q4_tasks)

    q1_completed = len([t for t in q1_tasks if t.is_completed])
    q2_completed = len([t for t in q2_tasks if t.is_completed])
    q3_completed = len([t for t in q3_tasks if t.is_completed])
    q4_completed = len([t for t in q4_tasks if t.is_completed])

    q1_percent = round((q1_count / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0
    q2_percent = round((q2_count / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0
    q3_percent = round((q3_count / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0
    q4_percent = round((q4_count / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0

    total_big_goals_active = len([g for g in user_goals if not g.is_completed])
    total_big_goals_completed = len([g for g in user_goals if g.is_completed])

    reflection_logs = []
    goals_map = {g.id: g.title for g in user_goals}
    for t in sorted(tasks, key=lambda x: x.date, reverse=True):
        if t.reflection_note and t.reflection_note.strip():
            reflection_logs.append(
                {
                    "task_id": t.id,
                    "task_title": t.title,
                    "date": t.date.strftime("%d/%m/%Y"),
                    "quadrant": t.quadrant,
                    "is_completed": t.is_completed,
                    "goal_title": goals_map.get(t.goal_id),
                    "reflection_note": t.reflection_note,
                }
            )

    return MonthlyMatrixSummaryResponse(
        year=year,
        month=month,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_rate=completion_rate,
        q1_count=q1_count,
        q1_completed=q1_completed,
        q2_count=q2_count,
        q2_completed=q2_completed,
        q3_count=q3_count,
        q3_completed=q3_completed,
        q4_count=q4_count,
        q4_completed=q4_completed,
        q1_percent=q1_percent,
        q2_percent=q2_percent,
        q3_percent=q3_percent,
        q4_percent=q4_percent,
        total_big_goals_active=total_big_goals_active,
        total_big_goals_completed=total_big_goals_completed,
        reflection_logs=reflection_logs,
    )


