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

@router.get("/ai-buddy/prompt", response_model=AIBuddyPromptResponse)
def get_ai_buddy_prompt(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    today = datetime.date.today()
    VN_TZ = datetime.timezone(datetime.timedelta(hours=7))
    current_hour = datetime.datetime.now(VN_TZ).hour

    if not user:
        return AIBuddyPromptResponse(
            message="Chào bạn! Hãy đăng nhập để lưu trữ mục tiêu cá nhân, ma trận 4 ô và cùng đua Top với bạn bè nhé! 🚀",
            action_type="open_login",
            action_label="Đăng nhập ngay 🔑",
            action_target="auth",
            mood="friendly",
        )

    name = user.display_name or f"@{user.username}"
    goals = db.query(StudyGoal).filter(StudyGoal.user_id == user.id, StudyGoal.is_completed == False).all()
    today_tasks = db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user.id, DailyMatrixTask.date == today).all()
    today_sessions = db.query(StudySessionLog).filter(StudySessionLog.user_id == user.id, StudySessionLog.session_date == today).all()
    today_hours = round(sum(s.duration_hours for s in today_sessions), 1)

    q1_pending = [t for t in today_tasks if t.quadrant == 1 and not t.is_completed]
    q2_pending = [t for t in today_tasks if t.quadrant == 2 and not t.is_completed]

    # Rule 0: User has no goals yet
    if not goals:
        return AIBuddyPromptResponse(
            message=f"Chào {name}! Bạn chưa có mục tiêu học tập nào trong vũ trụ. Hãy tạo mục tiêu đầu tiên để bắt đầu hành trình nào! 🎯",
            action_type="open_goal_modal",
            action_label="Tạo mục tiêu ngay ✨",
            action_target="goals",
            mood="friendly",
        )

    # Rule 1: Late evening (after 20:00 / 8 PM) -> Reminder to plan for tomorrow
    if current_hour >= 20 or current_hour < 5:
        tomorrow = today + datetime.timedelta(days=1)
        tomorrow_tasks = db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == user.id, DailyMatrixTask.date == tomorrow).count()
        if tomorrow_tasks == 0:
            return AIBuddyPromptResponse(
                message=f"Tối rồi {name} ơi! 🌙 Hãy dành 3 phút lên trước Ma Trận 4 Ô cho ngày mai để sáng dậy có lộ trình rõ ràng, làm việc cực mượt nha!",
                action_type="plan_tomorrow",
                action_label="Lên lịch ngày mai 🌙",
                action_target="matrix",
                mood="cozy",
            )

    # Rule 2: There are critical Q1 tasks pending
    if q1_pending:
        task_name = q1_pending[0].title
        return AIBuddyPromptResponse(
            message=f"Chào {name}, trong Ô 1 bạn đang có việc khẩn cấp: '{task_name}'. Xử lý dứt điểm trước để tâm trí thảnh thơi nhé! 🚀",
            action_type="open_matrix",
            action_label="Xem việc Ô 1 ngay",
            action_target="matrix",
            mood="urgent",
        )

    # Rule 3: There are important Q2 tasks related to big goals
    if q2_pending:
        task = q2_pending[0]
        goal = db.query(StudyGoal).filter(StudyGoal.id == task.goal_id, StudyGoal.user_id == user.id).first() if task.goal_id else None
        if goal:
            return AIBuddyPromptResponse(
                message=f"Chào {name}! Hôm nay có nhiệm vụ '{task.title}' thuộc mục tiêu '{goal.title}' trong Ô 2 kìa. Khởi động 25 phút Pomodoro nhẹ nhàng nhé? ✨",
                action_type="start_pomodoro",
                action_label="Học ngay 25p Pomodoro",
                action_target="pomodoro",
                suggested_goal_id=goal.id,
                mood="friendly",
            )
        else:
            return AIBuddyPromptResponse(
                message=f"Chào {name}! Trong Ô 2 hôm nay bạn có việc quan trọng: '{task.title}'. Tập trung 1 phiên Pomodoro giải quyết nó nào! 🎯",
                action_type="open_matrix",
                action_label="Mở Ma Trận 4 Ô",
                action_target="matrix",
                mood="friendly",
            )

    # Rule 4: If completed sessions today
    if today_hours > 0:
        return AIBuddyPromptResponse(
            message=f"Phong độ tuyệt vời {name} ơi! 🔥 Hôm nay bạn đã cày được {today_hours}h Pomodoro. Tiếp tục giữ vững đà tập trung nhé!",
            action_type="start_pomodoro",
            action_label="Làm thêm 1 hiệp Pomodoro 🍅",
            action_target="pomodoro",
            suggested_goal_id=goals[0].id if goals else None,
            mood="friendly",
        )

    # Rule 5: Suggest focusing on a big goal
    if goals:
        least_goal = sorted(goals, key=lambda g: g.current_hours)[0]
        return AIBuddyPromptResponse(
            message=f"Chào {name}! Mục tiêu lớn '{least_goal.title}' đang đợi bạn bứt phá nè! Cùng làm một hiệp Pomodoro 25 phút để tích lũy ngọc nhé! 🎧💎",
            action_type="start_pomodoro",
            action_label=f"Bắt đầu: {least_goal.title[:15]}...",
            action_target="pomodoro",
            suggested_goal_id=least_goal.id,
            mood="friendly",
        )

    # Rule 6: Generic friendly encouragement
    return AIBuddyPromptResponse(
        message=f"Chào {name}! Sẵn sàng cho một phiên Pomodoro bứt phá mục tiêu hôm nay chưa nào? 🌟",
        action_type="open_matrix",
        action_label="Mở Ma Trận 4 Ô",
        action_target="matrix",
        mood="friendly",
    )


