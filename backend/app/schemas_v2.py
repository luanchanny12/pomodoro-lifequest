from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas import PlanBlock


class SpacedRepetitionResponse(BaseModel):
    id: int
    concept_key: str
    concept_label: Optional[str] = None
    review_count: int
    retention_score: float
    mastery: int
    interval_days: int
    next_review_date: Optional[datetime] = None
    last_reviewed: Optional[datetime] = None
    class Config:
        from_attributes = True


class KnowledgeGraphResponse(BaseModel):
    id: int
    module: str
    lesson: str
    prerequisite_module: Optional[str] = None
    prerequisite_lesson: Optional[str] = None
    is_mandatory: bool
    class Config:
        from_attributes = True


class LearningPatternResponse(BaseModel):
    id: int
    goal_type: str
    pattern_type: str
    pattern_key: str
    pattern_value: Optional[str] = None
    insight: Optional[str] = None
    score: float
    sample_size: int
    class Config:
        from_attributes = True


class LearningInsightResponse(BaseModel):
    id: int
    goal_type: str
    activity_type: str
    best_hour: Optional[int] = None
    avg_score: float
    total_sessions: int
    trend_direction: str
    recommendation: Optional[str] = None
    class Config:
        from_attributes = True


class FocusScoreResponse(BaseModel):
    id: int
    date: str
    score: int
    sleep_hours: float
    total_study_minutes: int
    task_switches: int
    tasks_completed: int
    deep_work_minutes: int
    class Config:
        from_attributes = True


class MentalEnergyResponse(BaseModel):
    activity_type: str
    cognitive_load: int
    is_heavy: bool
    hour: Optional[int] = None


class QuestResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    quest_type: str
    goal_type: Optional[str] = None
    requirement_type: str
    requirement_value: int
    exp_reward: int
    coin_reward: int
    class Config:
        from_attributes = True


class QuestProgressResponse(BaseModel):
    id: int
    quest_id: int
    progress: int
    target: int
    is_completed: bool
    class Config:
        from_attributes = True


class BossFightResponse(BaseModel):
    id: int
    sprint_id: int
    name: str
    description: Optional[str] = None
    goal_type: str
    boss_type: str
    difficulty: int
    exp_reward: int
    coin_reward: int
    is_defeated: bool
    score: int
    class Config:
        from_attributes = True


class ShopItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    item_type: str
    price: int
    rarity: str
    icon: Optional[str] = None
    is_limited: bool
    class Config:
        from_attributes = True


class PurchaseResponse(BaseModel):
    id: int
    item_id: int
    price_paid: int
    is_equipped: bool
    class Config:
        from_attributes = True


class AvatarStateResponse(BaseModel):
    evolution_stage: int
    evolution_label: str
    exp_to_next: int
    current_expression: str
    accessory: Optional[str] = None
    aura: Optional[str] = None
    theme: str
    class Config:
        from_attributes = True


class VirtualCoachResponse(BaseModel):
    id: int
    message_type: str
    title: Optional[str] = None
    content: str
    action_label: Optional[str] = None
    action_url: Optional[str] = None
    priority_score: int
    created_at: datetime
    class Config:
        from_attributes = True


class ProactiveDashboardResponse(BaseModel):
    sleep_warning: Optional[str] = None
    energy_advice: Optional[str] = None
    priority_focus: str = ""
    next_lesson: str = ""
    blocks: List[PlanBlock] = []
    coach_message: Optional[str] = None
    focus_score: int = 50
    life_score: float = 0
    prediction_summary: str = ""
    quest_reminder: Optional[str] = None
    review_due_count: int = 0


class PriorityScoreResponse(BaseModel):
    goal_type: str
    score: float
    deadline_weight: float
    difficulty_factor: float
    learning_gap: float
    energy_factor: float
    retention_factor: float


class AdaptiveDifficultyResponse(BaseModel):
    lesson_id: int
    module: str
    lesson: str
    current_difficulty: int
    adjusted_difficulty: int
    reason: str


class HeatmapEntry(BaseModel):
    date: str
    count: int
    intensity: int


class LifeTimelineEntry(BaseModel):
    date: str
    activity: str
    completed: bool
    goal_type: str


class AIReflectionResponse(BaseModel):
    week_start: str
    total_hours: float
    changes: dict = {}
    strengths: list = []
    weaknesses: list = []
    root_causes: list = []
    recommendations: list = []


class LearningPatternsResponse(BaseModel):
    skipped_subjects: list = []
    best_time_periods: dict = {}
    common_mistakes: list = []
    efficiency_trend: str = "stable"
    recommended_schedule: list = []


class SmartStreakResponse(BaseModel):
    current_streak: int
    max_streak: int
    is_recovery_day: bool
    recovery_days_used: int
    message: str = ""


class DigitalTwinResponse(BaseModel):
    learning_speed: float
    focus_time_minutes: int
    effective_hours: list = []
    favorite_subjects: list = []
    skipped_subjects: list = []
    forgetting_speed: float
    absorption_rate: float
    avg_task_completion_minutes: int
    avg_break_minutes: int
    avg_daily_energy: int
    consistency_score: float
    total_sessions: int


class RiskScoreResponse(BaseModel):
    goal_type: str
    risk: str
    score: int
    message: str
    deadline_days: int
    current_pace: float
    needed_pace: float
    trend: str


class MonthlyReviewResponse(BaseModel):
    month: int
    year: int
    summary: str
    total_days: int
    active_days: int
    completion_rate: float
    total_study_hours: float
    total_tasks: int
    completed_tasks: int
    task_completion_rate: float
    avg_mood: float
    avg_energy: float
    avg_sleep: float
    hours_by_goal: dict = {}
    goal_progress: list = []
    risks: list = []
    strengths: list = []
    weaknesses: list = []
    predictions: list = []
    recommendations: list = []


class HabitDetectionResponse(BaseModel):
    habits: list = []


class ActivityLogResponse(BaseModel):
    id: int
    goal_type: str
    activity_type: str
    duration_minutes: int
    score: Optional[float] = None
    is_completed: bool
    difficulty: int
    energy_before: Optional[int] = None
    energy_after: Optional[int] = None
    class Config:
        from_attributes = True
