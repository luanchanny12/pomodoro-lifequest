from pydantic import BaseModel, Field, confloat
from typing import Optional, List, Dict, Any
import datetime


class GoalCreate(BaseModel):
    name: str
    type: str
    target_value: confloat(allow_inf_nan=False, ge=0.0, le=1000000.0) = 0.0
    current_value: confloat(allow_inf_nan=False, ge=0.0, le=1000000.0) = 0.0
    deadline: Optional[datetime.date] = None
    priority: str = "trung bình"

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_value: Optional[confloat(allow_inf_nan=False, ge=0.0, le=1000000.0)] = None
    current_value: Optional[confloat(allow_inf_nan=False, ge=0.0, le=1000000.0)] = None
    deadline: Optional[datetime.date] = None
    priority: Optional[str] = None
    progress_percent: Optional[confloat(allow_inf_nan=False, ge=0.0, le=100.0)] = None

class GoalResponse(BaseModel):
    id: int
    name: str
    type: str
    target_value: float
    current_value: float
    deadline: Optional[datetime.date] = None
    priority: str
    progress_percent: float
    created_at: datetime.datetime
    updated_at: datetime.datetime
    class Config:
        from_attributes = True




class RoadmapItemCreate(BaseModel):
    goal_type: str
    title: str
    description: Optional[str] = None
    order_index: int = 0
    deadline: Optional[datetime.date] = None
    icon: Optional[str] = None

class RoadmapItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    deadline: Optional[datetime.date] = None
    is_completed: Optional[bool] = None
    icon: Optional[str] = None

class RoadmapItemResponse(BaseModel):
    id: int
    goal_type: str
    title: str
    description: Optional[str] = None
    order_index: int
    deadline: Optional[datetime.date] = None
    is_completed: bool
    icon: Optional[str] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class CourseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    goal_type: str
    total_hours: float = 0

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    total_hours: Optional[float] = None
    completed_hours: Optional[float] = None

class CourseResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    goal_type: str
    total_hours: float
    completed_hours: float
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    goal_type: Optional[str] = None
    date: Optional[datetime.date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    priority: str = "trung bình"
    exp_reward: int = 10

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    goal_type: Optional[str] = None
    date: Optional[datetime.date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    exp_reward: Optional[int] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    goal_type: Optional[str] = None
    date: Optional[datetime.date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: str
    priority: str
    exp_reward: int
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class SprintCreate(BaseModel):
    name: str
    start_date: datetime.date
    end_date: datetime.date
    goal_type: Optional[str] = None
    status: str = "đang thực hiện"

class SprintUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    goal_type: Optional[str] = None
    status: Optional[str] = None

class SprintResponse(BaseModel):
    id: int
    name: str
    start_date: datetime.date
    end_date: datetime.date
    goal_type: Optional[str] = None
    status: str
    created_at: datetime.datetime
    days: list = []
    class Config:
        from_attributes = True




class SprintDayCreate(BaseModel):
    sprint_id: int
    date: datetime.date
    activity: str
    is_compulsory: bool = False
    time_range: Optional[str] = None
    note: Optional[str] = None

class SprintDayUpdate(BaseModel):
    activity: Optional[str] = None
    is_compulsory: Optional[bool] = None
    time_range: Optional[str] = None
    note: Optional[str] = None

class SprintDayResponse(BaseModel):
    id: int
    sprint_id: int
    date: datetime.date
    activity: str
    is_compulsory: bool
    time_range: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class DailyLogCreate(BaseModel):
    date: datetime.date
    completion_percent: float = 0
    sleep_hours: Optional[float] = None
    mood_level: Optional[int] = None
    energy_level: Optional[int] = None
    note: Optional[str] = None
    activities: Optional[str] = None

class DailyLogUpdate(BaseModel):
    completion_percent: Optional[float] = None
    sleep_hours: Optional[float] = None
    mood_level: Optional[int] = None
    energy_level: Optional[int] = None
    note: Optional[str] = None
    activities: Optional[str] = None

class DailyLogResponse(BaseModel):
    id: int
    date: datetime.date
    completion_percent: float
    sleep_hours: Optional[float] = None
    mood_level: Optional[int] = None
    energy_level: Optional[int] = None
    note: Optional[str] = None
    activities: Optional[str] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class StudyHourCreate(BaseModel):
    date: datetime.date
    goal_type: str
    hours: float = 0

class StudyHourUpdate(BaseModel):
    hours: Optional[float] = None

class StudyHourResponse(BaseModel):
    id: int
    date: datetime.date
    goal_type: str
    hours: float
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class PlayerResponse(BaseModel):
    id: int
    level: int
    exp: int
    coins: int
    streak: int
    last_streak_date: Optional[datetime.date] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class AchievementResponse(BaseModel):
    id: int
    player_id: int
    code: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    unlocked_at: datetime.datetime
    class Config:
        from_attributes = True




class LevelResponse(BaseModel):
    id: int
    level: int
    exp_required: int
    title: str
    class Config:
        from_attributes = True




class VocabularyCreate(BaseModel):
    word: str
    meaning: str
    example: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = "word"

class VocabularyUpdate(BaseModel):
    word: Optional[str] = None
    meaning: Optional[str] = None
    example: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = None

class VocabularyResponse(BaseModel):
    id: int
    word: str
    meaning: str
    example: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = "word"
    created_at: datetime.datetime
    class Config:
        from_attributes = True



class VocabularyBulkItem(BaseModel):
    word: str
    meaning: str
    example: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = "word"

class VocabularyBulkCreate(BaseModel):
    items: List[VocabularyBulkItem]

class VocabularyImportResult(BaseModel):
    total: int
    imported: int
    errors: List[str]


class IPACreate(BaseModel):
    symbol: str
    description: Optional[str] = None
    example_word: Optional[str] = None

class IPAUpdate(BaseModel):
    description: Optional[str] = None
    example_word: Optional[str] = None

class IPAResponse(BaseModel):
    id: int
    symbol: str
    description: Optional[str] = None
    example_word: Optional[str] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class BacklogItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: str = "trung bình"

class BacklogItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

class BacklogItemResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: str
    status: str
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class BrainMemoryCreate(BaseModel):
    goal_type: str
    module: Optional[str] = None
    lesson: Optional[str] = None
    checkpoint: Optional[str] = None
    position_json: Optional[str] = None
    progress_percent: float = 0
    mastery_level: float = 0

class BrainMemoryResponse(BaseModel):
    id: int
    goal_type: str
    module: Optional[str] = None
    lesson: Optional[str] = None
    checkpoint: Optional[str] = None
    position_json: Optional[str] = None
    progress_percent: float
    mastery_level: float
    last_studied: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    class Config:
        from_attributes = True




class LearningHistoryCreate(BaseModel):
    goal_type: str
    activity_type: str = "học"
    title: str = ""
    module: Optional[str] = None
    lesson: Optional[str] = None
    duration_minutes: int = 0
    score: Optional[float] = None

class LearningHistoryResponse(BaseModel):
    id: int
    goal_type: str
    activity_type: Optional[str] = None
    title: Optional[str] = None
    module: Optional[str] = None
    lesson: Optional[str] = None
    duration_minutes: int
    score: Optional[float] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class CurrentPositionCreate(BaseModel):
    goal_type: str
    current_module: Optional[str] = None
    current_lesson: Optional[str] = None
    current_chapter: Optional[str] = None
    current_test: Optional[str] = None
    current_section: Optional[str] = None
    difficulty_level: int = 1

class CurrentPositionUpdate(BaseModel):
    current_module: Optional[str] = None
    current_lesson: Optional[str] = None
    current_chapter: Optional[str] = None
    current_test: Optional[str] = None
    current_section: Optional[str] = None
    progress_percent: Optional[float] = None
    difficulty_level: Optional[int] = None
    mastery_score: Optional[float] = None

class CurrentPositionResponse(BaseModel):
    id: int
    goal_type: str
    current_module: Optional[str] = None
    current_lesson: Optional[str] = None
    current_chapter: Optional[str] = None
    current_test: Optional[str] = None
    current_section: Optional[str] = None
    progress_percent: float
    difficulty_level: int
    mastery_score: float
    created_at: datetime.datetime
    updated_at: datetime.datetime
    class Config:
        from_attributes = True




class RoadmapLessonCreate(BaseModel):
    goal_type: str
    module_name: Optional[str] = None
    lesson_name: Optional[str] = None
    order_index: int = 0
    description: Optional[str] = None
    difficulty: int = 1
    energy_cost: int = 10
    exp_reward: int = 10
    estimated_minutes: int = 30
    prerequisites: Optional[str] = None

class RoadmapLessonUpdate(BaseModel):
    module_name: Optional[str] = None
    lesson_name: Optional[str] = None
    order_index: Optional[int] = None
    description: Optional[str] = None
    difficulty: Optional[int] = None
    energy_cost: Optional[int] = None
    exp_reward: Optional[int] = None
    estimated_minutes: Optional[int] = None
    prerequisites: Optional[str] = None
    is_completed: Optional[bool] = None

class RoadmapLessonResponse(BaseModel):
    id: int
    goal_type: str
    module_name: Optional[str] = None
    lesson_name: Optional[str] = None
    order_index: int
    description: Optional[str] = None
    difficulty: int
    energy_cost: int
    exp_reward: int
    estimated_minutes: int
    prerequisites: Optional[str] = None
    is_completed: bool
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class AIConversationCreate(BaseModel):
    role: str = "user"
    message: str
    context_json: Optional[str] = None

class AIConversationResponse(BaseModel):
    id: int
    session_id: str
    role: str
    message: str
    context_json: Optional[str] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class PredictionResponse(BaseModel):
    id: int
    goal_type: str
    current_pace_hours_per_day: float
    predicted_completion_date: Optional[datetime.date] = None
    confidence_score: str
    recommendation: Optional[str] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class WeeklyReportResponse(BaseModel):
    id: int
    week_start: datetime.date
    week_end: datetime.date
    total_hours: float
    top_subject: Optional[str] = None
    neglected_subjects: Optional[str] = None
    progress_summary: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    plan_next_week: Optional[str] = None
    life_score: float
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class UserStatisticCreate(BaseModel):
    date: datetime.date
    total_hours: float = 0
    tasks_completed: int = 0
    exp_earned: int = 0
    life_score: float = 0
    streak: int = 0

class UserStatisticResponse(BaseModel):
    id: int
    date: datetime.date
    total_hours: float
    tasks_completed: int
    exp_earned: int
    life_score: float
    streak: int
    created_at: datetime.datetime
    class Config:
        from_attributes = True



class UserStatisticsSummary(BaseModel):
    total_hours_7d: float = 0
    total_tasks_7d: int = 0
    avg_daily_hours: float = 0
    avg_completion: float = 0
    best_day: Optional[str] = None
    current_streak: int = 0
    total_exp: int = 0


class SmartNotificationCreate(BaseModel):
    title: str
    message: Optional[str] = None
    notification_type: Optional[str] = None
    scheduled_at: Optional[datetime.datetime] = None

class SmartNotificationResponse(BaseModel):
    id: int
    title: str
    message: Optional[str] = None
    notification_type: Optional[str] = None
    is_read: bool
    scheduled_at: Optional[datetime.datetime] = None
    read_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class LifeScoreHistoryCreate(BaseModel):
    date: datetime.date
    score: float = 0
    ielts_score: float = 0
    gpa_score: float = 0
    devops_score: float = 0

class LifeScoreHistoryResponse(BaseModel):
    id: int
    date: datetime.date
    score: float
    ielts_score: float
    gpa_score: float
    devops_score: float
    streak_bonus: float
    achievement_bonus: float
    level_bonus: float
    created_at: datetime.datetime
    class Config:
        from_attributes = True




class AIPlannerRequest(BaseModel):
    date: Optional[datetime.date] = None
    energy_level: int = 5
    sleep_hours: float = 7
    mood: int = 5

class PlanBlock(BaseModel):
    start_time: str
    end_time: str
    goal_type: str
    title: str
    description: str = ""
    difficulty: int = 1
    energy_cost: int = 10
    exp_reward: int = 10

class AIPlannerResponse(BaseModel):
    summary: str = ""
    reason: str = ""
    priority: list = []
    blocks: List[PlanBlock] = []
    energy: int = 100
    predicted_completion: str = ""


class Plan14DaysRequest(BaseModel):
    goal: str

class Plan14DaysResponse(BaseModel):
    success: bool
    summary: str = ""
    goal_type: str = ""
    goal_name: str = ""
    tasks_created: int = 0
    slots_created: int = 0
    error: str = ""

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class ChatResponse(BaseModel):
    reply: str
    session_id: str = "default"


class DailyReviewResponse(BaseModel):
    rating: int = 5
    completion_percent: float = 0
    strengths: list = []
    weaknesses: list = []
    suggestions: list = []


class LifeScoreResponse(BaseModel):
    score: float = 0
    ielts: float = 0
    gpa: float = 0
    devops: float = 0
    streak: float = 0
    achievement: float = 0
    level: float = 0


# ==========================================
# Pomodoro Focus Hub & Goal Tracking Schemas
# ==========================================

class StudyGoalCreate(BaseModel):
    title: str
    celestial_name: Optional[str] = None
    goal_type: Optional[str] = "hours"  # 'hours' or 'deadline'
    target_hours: confloat(allow_inf_nan=False, ge=0.1, le=100000.0) = 100.0
    current_hours: confloat(allow_inf_nan=False, ge=0.0, le=100000.0) = 0.0
    target_date: Optional[datetime.date] = None
    parent_id: Optional[int] = None
    planet_type: Optional[str] = "earth"
    planet_data: Optional[str] = None
    color: str = "#E24A4A"
    category: str = "Học tập"
    notes: Optional[str] = None

class StudyGoalUpdate(BaseModel):
    title: Optional[str] = None
    celestial_name: Optional[str] = None
    goal_type: Optional[str] = None
    target_hours: Optional[confloat(allow_inf_nan=False, ge=0.1, le=100000.0)] = None
    current_hours: Optional[confloat(allow_inf_nan=False, ge=0.0, le=100000.0)] = None
    target_date: Optional[datetime.date] = None
    parent_id: Optional[int] = None
    planet_type: Optional[str] = None
    planet_data: Optional[str] = None
    color: Optional[str] = None
    category: Optional[str] = None
    is_completed: Optional[bool] = None
    notes: Optional[str] = None

class PlanetBuildUpdateRequest(BaseModel):
    planet_data: str

class StudyGoalResponse(BaseModel):
    id: int
    title: str
    celestial_name: Optional[str] = "Polaris"
    goal_type: Optional[str] = "hours"
    target_hours: float = 0.0
    current_hours: float = 0.0
    target_date: Optional[datetime.date] = None
    parent_id: Optional[int] = None
    parent_title: Optional[str] = None
    planet_type: Optional[str] = "earth"
    planet_data: Optional[str] = None
    sub_goals_count: int = 0
    days_left: Optional[int] = None
    hours_per_day_needed: Optional[float] = None
    color: Optional[str] = "#E24A4A"
    category: Optional[str] = "Học tập"
    is_completed: bool = False
    completed_at: Optional[datetime.datetime] = None
    notes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    progress_percent: float = 0.0
    remaining_hours: float = 0.0

    class Config:
        from_attributes = True



class StudySessionLogCreate(BaseModel):
    goal_id: Optional[int] = None
    duration_minutes: int = Field(..., ge=1, le=1440)
    session_date: Optional[datetime.date] = None
    topic_note: Optional[str] = None
    source: str = "manual"  # 'manual' | 'pomodoro'

class StudySessionLogUpdate(BaseModel):
    goal_id: Optional[int] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=1440)
    session_date: Optional[datetime.date] = None
    topic_note: Optional[str] = None
    source: Optional[str] = None

class StudySessionLogResponse(BaseModel):
    id: int
    goal_id: Optional[int] = None
    goal_title: Optional[str] = None
    goal_color: Optional[str] = None
    duration_minutes: int = 0
    duration_hours: float = 0.0
    session_date: Optional[datetime.date] = None
    topic_note: Optional[str] = None
    source: Optional[str] = "manual"
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True



class DailyFocusStat(BaseModel):
    date: str
    hours: float
    minutes: int

class FocusStatsResponse(BaseModel):
    total_hours: float
    today_hours: float
    week_hours: float
    total_sessions: int
    pomodoro_sessions: int
    completed_goals: int
    active_goals: int
    last_7_days: List[DailyFocusStat]


# ==========================================
# Dopamine, Rewards & Galaxy Schemas
# ==========================================

class RewardItemCreate(BaseModel):
    title: str
    pearl_cost: float
    icon: str = "🎁"
    category: str = "giải trí"
    description: Optional[str] = None

class RewardItemResponse(BaseModel):
    id: int
    title: str
    pearl_cost: float
    icon: str
    category: str
    description: Optional[str] = None
    is_custom: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True



class RewardRedeemRequest(BaseModel):
    reward_id: int
    note: Optional[str] = None

class RewardRedemptionResponse(BaseModel):
    id: int
    reward_id: Optional[int] = None
    reward_title: str
    reward_icon: str
    pearls_spent: float
    note: Optional[str] = None
    redeemed_at: datetime.datetime

    class Config:
        from_attributes = True



class PearlsBalanceResponse(BaseModel):
    total_earned_pearls: float
    spent_pearls: float
    available_pearls: float

class TopicPlanetResponse(BaseModel):
    goal_id: int
    name: str                       # Tên chiêm tinh (Polaris, Sirius, Vega...)
    real_title: str                 # Tên mục tiêu thực tế ("1000h Tiếng Anh")
    is_completed: bool              # Đã hoàn thành (DONE) chưa
    current_hours: float
    target_hours: float
    progress_percent: float
    session_count: int
    level: int                      # 1 to 5
    color: str
    category: Optional[str] = "Học tập"
    notes: Optional[str] = None
    last_studied: Optional[str] = None
    is_recent: bool = False
    goal_type: Optional[str] = "hours"
    target_date: Optional[datetime.date] = None
    parent_id: Optional[int] = None
    planet_type: Optional[str] = "earth"
    planet_data: Optional[str] = "[]"
    sub_goals_count: int = 0

class ConstellationAchievementResponse(BaseModel):
    id: int
    code: str
    title: str
    archetype: Optional[str] = "Học giả"
    icon: Optional[str] = "Sparkles"
    required_completed_goals: int = 1
    shape_pattern: Optional[str] = "triangle"
    ai_interpretation: Optional[str] = ""
    narration_script: Optional[str] = ""
    associated_goal_titles: Optional[str] = None
    is_unlocked: bool = False
    unlocked_at: Optional[datetime.datetime] = None
    progress_percent: float = 0.0

    class Config:
        from_attributes = True



class ConstellationCheckResponse(BaseModel):
    newly_unlocked: Optional[ConstellationAchievementResponse] = None
    total_unlocked: int
    total_constellations: int

class TopicGalaxyResponse(BaseModel):
    planets: List[TopicPlanetResponse]
    total_goals: int
    completed_goals: int
    sun_stats: Dict[str, Any] = {}
    constellation_links: List[List[str]] = []
    active_archetype: Optional[str] = None

class TimeWarpOracleResponse(BaseModel):
    goal_id: Optional[int] = None
    goal_title: Optional[str] = None
    goal_type: Optional[str] = "hours"
    target_hours: float
    current_hours: float
    remaining_hours: float
    average_daily_hours: float
    projected_finish_date: Optional[str] = None
    days_remaining: Optional[int] = None
    target_date: Optional[str] = None
    days_until_deadline: Optional[int] = None
    hours_per_day_needed: Optional[float] = None
    total_user_sessions: int = 0
    hours_warped_recent: float = 0.0
    scenarios: Optional[dict] = None

class TimeCapsuleCreate(BaseModel):
    goal_id: Optional[int] = None
    milestone_hours: float
    title: str = "Thư gửi tương lai"
    message_content: str

class TimeCapsuleResponse(BaseModel):
    id: int
    goal_id: Optional[int] = None
    milestone_hours: float
    title: str
    message_content: str
    is_unlocked: bool
    unlocked_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class DailyMatrixTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: Optional[datetime.date] = None
    quadrant: int = Field(2, ge=1, le=4)  # 1: Q1, 2: Q2, 3: Q3, 4: Q4
    goal_id: Optional[int] = None
    reflection_note: Optional[str] = None


class DailyMatrixTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime.date] = None
    quadrant: Optional[int] = Field(None, ge=1, le=4)
    goal_id: Optional[int] = None
    is_completed: Optional[bool] = None
    reflection_note: Optional[str] = None
    order_index: Optional[int] = None


class DailyMatrixTaskReflectionUpdate(BaseModel):
    reflection_note: str


class DailyMatrixTaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    date: Optional[datetime.date] = None
    quadrant: int = 1
    goal_id: Optional[int] = None
    goal_title: Optional[str] = None
    goal_color: Optional[str] = None
    is_completed: bool = False
    completed_at: Optional[datetime.datetime] = None
    reflection_note: Optional[str] = None
    order_index: Optional[int] = 0
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class MonthlyMatrixSummaryResponse(BaseModel):
    year: int
    month: int
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    q1_count: int
    q1_completed: int
    q2_count: int
    q2_completed: int
    q3_count: int
    q3_completed: int
    q4_count: int
    q4_completed: int
    q1_percent: float
    q2_percent: float
    q3_percent: float
    q4_percent: float
    total_big_goals_active: int
    total_big_goals_completed: int
    reflection_logs: List[Dict[str, Any]] = []


class AIBuddyPromptResponse(BaseModel):
    message: str
    action_type: str  # 'start_pomodoro', 'open_matrix', 'plan_tomorrow', 'celebrate'
    action_label: str
    action_target: Optional[str] = None
    suggested_goal_id: Optional[int] = None
    mood: str = "friendly"  # 'friendly', 'urgent', 'celebrating', 'cozy'

class NotificationSettingsResponse(BaseModel):
    id: int
    web_notifications_enabled: bool = True
    pomodoro_end_enabled: bool = True
    break_end_enabled: bool = True
    inactivity_reminder_minutes: int = 60
    morning_reminder_time: str = "08:00"
    evening_reminder_time: str = "21:30"
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_enabled: bool = False
    app_public_url: Optional[str] = None
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class NotificationSettingsUpdate(BaseModel):
    web_notifications_enabled: Optional[bool] = None
    pomodoro_end_enabled: Optional[bool] = None
    break_end_enabled: Optional[bool] = None
    inactivity_reminder_minutes: Optional[int] = None
    morning_reminder_time: Optional[str] = None
    evening_reminder_time: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_enabled: Optional[bool] = None
    app_public_url: Optional[str] = None


class TelegramTestRequest(BaseModel):
    bot_token: str
    chat_id: str
    message: Optional[str] = None


class WindowsToastRequest(BaseModel):
    title: str
    message: str
