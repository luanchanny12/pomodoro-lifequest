from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from datetime import datetime
from app.models import LegacyBase as Base


class SpacedRepetition(Base):
    __tablename__ = "spaced_repetition"
    id = Column(Integer, primary_key=True, index=True)
    goal_type = Column(String, nullable=False)
    module = Column(String, nullable=True)
    lesson = Column(String, nullable=True)
    concept_key = Column(String, nullable=False)
    concept_label = Column(String, nullable=True)
    review_count = Column(Integer, default=0)
    retention_score = Column(Float, default=0.0)
    mastery = Column(Integer, default=0)
    interval_days = Column(Integer, default=1)
    next_review_date = Column(DateTime, nullable=True)
    last_reviewed = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class KnowledgeGraph(Base):
    __tablename__ = "knowledge_graph"
    id = Column(Integer, primary_key=True, index=True)
    goal_type = Column(String, nullable=False)
    module = Column(String, nullable=False)
    lesson = Column(String, nullable=False)
    prerequisite_goal_type = Column(String, nullable=True)
    prerequisite_module = Column(String, nullable=True)
    prerequisite_lesson = Column(String, nullable=True)
    is_mandatory = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class LearningPattern(Base):
    __tablename__ = "learning_patterns"
    id = Column(Integer, primary_key=True, index=True)
    goal_type = Column(String, nullable=False)
    pattern_type = Column(String, nullable=False)
    pattern_key = Column(String, nullable=False)
    pattern_value = Column(String, nullable=True)
    insight = Column(Text, nullable=True)
    score = Column(Float, default=0.0)
    sample_size = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LearningInsight(Base):
    __tablename__ = "learning_insights"
    id = Column(Integer, primary_key=True, index=True)
    goal_type = Column(String, nullable=False)
    activity_type = Column(String, nullable=False)
    best_hour = Column(Integer, nullable=True)
    best_day = Column(String, nullable=True)
    avg_score = Column(Float, default=0.0)
    total_sessions = Column(Integer, default=0)
    trend_direction = Column(String, default="stable")
    recommendation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FocusScore(Base):
    __tablename__ = "focus_scores"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False, unique=True)
    score = Column(Integer, default=50)
    sleep_hours = Column(Float, default=7)
    total_study_minutes = Column(Integer, default=0)
    task_switches = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    tasks_total = Column(Integer, default=0)
    screen_time_minutes = Column(Integer, default=0)
    deep_work_minutes = Column(Integer, default=0)
    distraction_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class MentalEnergyLog(Base):
    __tablename__ = "mental_energy_logs"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False)
    activity_type = Column(String, nullable=False)
    hour = Column(Integer, nullable=True)
    cognitive_load = Column(Integer, default=50)
    is_heavy = Column(Boolean, default=False)
    duration_minutes = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Quest(Base):
    __tablename__ = "quests"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    quest_type = Column(String, nullable=False)
    goal_type = Column(String, nullable=True)
    requirement_type = Column(String, nullable=False)
    requirement_value = Column(Integer, default=1)
    requirement_goal = Column(String, nullable=True)
    exp_reward = Column(Integer, default=100)
    coin_reward = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class QuestProgress(Base):
    __tablename__ = "quest_progress"
    id = Column(Integer, primary_key=True, index=True)
    quest_id = Column(Integer, ForeignKey("quests.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    progress = Column(Integer, default=0)
    target = Column(Integer, default=1)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BossFight(Base):
    __tablename__ = "boss_fights"
    id = Column(Integer, primary_key=True, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    goal_type = Column(String, nullable=False)
    boss_type = Column(String, nullable=False)
    difficulty = Column(Integer, default=3)
    exp_reward = Column(Integer, default=500)
    coin_reward = Column(Integer, default=50)
    is_defeated = Column(Boolean, default=False)
    defeated_at = Column(DateTime, nullable=True)
    score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class ShopItem(Base):
    __tablename__ = "shop_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    item_type = Column(String, nullable=False)
    price = Column(Integer, default=0)
    rarity = Column(String, default="common")
    icon = Column(String, nullable=True)
    animation_url = Column(String, nullable=True)
    effect_json = Column(Text, nullable=True)
    is_limited = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Purchase(Base):
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("shop_items.id"), nullable=False)
    price_paid = Column(Integer, default=0)
    is_equipped = Column(Boolean, default=False)
    purchased_at = Column(DateTime, default=datetime.utcnow)


class AvatarState(Base):
    __tablename__ = "avatar_state"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, unique=True)
    evolution_stage = Column(Integer, default=0)
    evolution_label = Column(String, default="Tân Thủ")
    exp_to_next = Column(Integer, default=500)
    current_expression = Column(String, default="neutral")
    accessory = Column(String, nullable=True)
    aura = Column(String, nullable=True)
    theme = Column(String, default="default")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VirtualCoachMessage(Base):
    __tablename__ = "virtual_coach_messages"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    message_type = Column(String, nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    action_label = Column(String, nullable=True)
    action_url = Column(String, nullable=True)
    priority_score = Column(Integer, default=0)
    is_dismissed = Column(Boolean, default=False)
    context_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class LearningActivity(Base):
    __tablename__ = "learning_activities"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    goal_type = Column(String, nullable=False)
    module = Column(String, nullable=True)
    lesson = Column(String, nullable=True)
    activity_type = Column(String, nullable=False)
    duration_minutes = Column(Integer, default=0)
    score = Column(Float, nullable=True)
    is_completed = Column(Boolean, default=False)
    difficulty = Column(Integer, default=3)
    energy_before = Column(Integer, nullable=True)
    energy_after = Column(Integer, nullable=True)


class DigitalTwin(Base):
    __tablename__ = "digital_twins"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, unique=True)
    learning_speed = Column(Float, default=1.0)
    focus_time_minutes = Column(Integer, default=25)
    effective_hours = Column(String, default="[]")
    favorite_subjects = Column(String, default="[]")
    skipped_subjects = Column(String, default="[]")
    forgetting_speed = Column(Float, default=1.0)
    absorption_rate = Column(Float, default=0.7)
    avg_task_completion_minutes = Column(Integer, default=45)
    avg_break_minutes = Column(Integer, default=10)
    avg_daily_energy = Column(Integer, default=6)
    consistency_score = Column(Float, default=0.5)
    total_sessions = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)
