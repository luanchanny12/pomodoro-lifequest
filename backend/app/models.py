from sqlalchemy import Column, Integer, String, Float, Date, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import date, datetime
from app.database import Base
from sqlalchemy.orm import declarative_base
LegacyBase = declarative_base()


class Goal(LegacyBase):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    target_value = Column(Float, default=0)
    current_value = Column(Float, default=0)
    deadline = Column(Date, nullable=True)
    priority = Column(String, default="trung bình")
    progress_percent = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RoadmapItem(LegacyBase):
    __tablename__ = "roadmap_items"
    id = Column(Integer, primary_key=True, index=True)
    goal_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    deadline = Column(Date, nullable=True)
    is_completed = Column(Boolean, default=False)
    icon = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Course(LegacyBase):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    goal_type = Column(String, nullable=False)
    total_hours = Column(Float, default=0)
    completed_hours = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Task(LegacyBase):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    goal_type = Column(String, nullable=True)
    date = Column(Date, nullable=True)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    status = Column(String, default="chưa làm")
    priority = Column(String, default="trung bình")
    exp_reward = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)


class Sprint(LegacyBase):
    __tablename__ = "sprints"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    goal_type = Column(String, nullable=True)
    status = Column(String, default="đang thực hiện")
    created_at = Column(DateTime, default=datetime.utcnow)
    days = relationship("SprintDay", back_populates="sprint", cascade="all, delete-orphan")


class SprintDay(LegacyBase):
    __tablename__ = "sprint_days"
    id = Column(Integer, primary_key=True, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=False)
    date = Column(Date, nullable=False)
    activity = Column(String, nullable=False)
    is_compulsory = Column(Boolean, default=False)
    time_range = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    sprint = relationship("Sprint", back_populates="days")


class DailyLog(LegacyBase):
    __tablename__ = "daily_logs"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True)
    completion_percent = Column(Float, default=0)
    sleep_hours = Column(Float, nullable=True)
    mood_level = Column(Integer, nullable=True)
    energy_level = Column(Integer, nullable=True)
    note = Column(Text, nullable=True)
    activities = Column(Text, nullable=True)  # JSON array: ["work","sports","gym",...]
    created_at = Column(DateTime, default=datetime.utcnow)


class StudyHour(LegacyBase):
    __tablename__ = "study_hours"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    goal_type = Column(String, nullable=False)
    hours = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    level = Column(Integer, default=1)
    exp = Column(Integer, default=0)
    coins = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    last_streak_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    achievements = relationship("Achievement", back_populates="player", cascade="all, delete-orphan")


class Achievement(Base):
    __tablename__ = "achievements"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    player = relationship("Player", back_populates="achievements")


class Level(Base):
    __tablename__ = "levels"
    id = Column(Integer, primary_key=True, index=True)
    level = Column(Integer, unique=True, nullable=False)
    exp_required = Column(Integer, default=0)
    title = Column(String, nullable=False)


class Vocabulary(LegacyBase):
    __tablename__ = "vocabulary"
    id = Column(Integer, primary_key=True, index=True)
    word = Column(String, nullable=False)
    meaning = Column(String, nullable=False)
    example = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    type = Column(String, default="word")
    created_at = Column(DateTime, default=datetime.utcnow)


class IPA(LegacyBase):
    __tablename__ = "ipa"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    example_word = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BacklogItem(LegacyBase):
    __tablename__ = "backlog_items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    priority = Column(String, default="trung bình")
    status = Column(String, default="trong kho")
    created_at = Column(DateTime, default=datetime.utcnow)


class BrainMemory(LegacyBase):
    __tablename__ = "brain_memory"
    id = Column(Integer, primary_key=True, index=True)
    goal_type = Column(String, nullable=False)
    module = Column(String, nullable=True)
    lesson = Column(String, nullable=True)
    checkpoint = Column(String, nullable=True)
    position_json = Column(Text, nullable=True)
    progress_percent = Column(Float, default=0)
    mastery_level = Column(Float, default=0)
    last_studied = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class V1LearningHistory(LegacyBase):
    __tablename__ = "v1_learning_history"
    id = Column(Integer, primary_key=True, index=True)
    goal_type = Column(String, nullable=False)
    activity_type = Column(String, nullable=True)
    title = Column(String, nullable=True)
    module = Column(String, nullable=True)
    lesson = Column(String, nullable=True)
    duration_minutes = Column(Integer, default=0)
    score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CurrentPosition(LegacyBase):
    __tablename__ = "current_positions"
    id = Column(Integer, primary_key=True, index=True)
    goal_type = Column(String, nullable=False, unique=True)
    current_module = Column(String, nullable=True)
    current_lesson = Column(String, nullable=True)
    current_chapter = Column(String, nullable=True)
    current_test = Column(String, nullable=True)
    current_section = Column(String, nullable=True)
    progress_percent = Column(Float, default=0)
    difficulty_level = Column(Integer, default=1)
    mastery_score = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RoadmapLesson(LegacyBase):
    __tablename__ = "roadmap_lessons"
    id = Column(Integer, primary_key=True, index=True)
    goal_type = Column(String, nullable=False)
    module_name = Column(String, nullable=True)
    lesson_name = Column(String, nullable=True)
    order_index = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    difficulty = Column(Integer, default=1)
    energy_cost = Column(Integer, default=10)
    exp_reward = Column(Integer, default=10)
    estimated_minutes = Column(Integer, default=30)
    prerequisites = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AIConversation(LegacyBase):
    __tablename__ = "ai_conversations"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    context_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Prediction(LegacyBase):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    goal_type = Column(String, nullable=False, unique=True)
    current_pace_hours_per_day = Column(Float, default=0)
    predicted_completion_date = Column(Date, nullable=True)
    confidence_score = Column(String, default="medium")
    recommendation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WeeklyReport(LegacyBase):
    __tablename__ = "weekly_reports"
    id = Column(Integer, primary_key=True, index=True)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    total_hours = Column(Float, default=0)
    top_subject = Column(String, nullable=True)
    neglected_subjects = Column(Text, nullable=True)
    progress_summary = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    plan_next_week = Column(Text, nullable=True)
    life_score = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserStatistic(LegacyBase):
    __tablename__ = "user_statistics"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True)
    total_hours = Column(Float, default=0)
    tasks_completed = Column(Integer, default=0)
    exp_earned = Column(Integer, default=0)
    life_score = Column(Float, default=0)
    streak = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class SmartNotification(LegacyBase):
    __tablename__ = "smart_notifications"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    notification_type = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    scheduled_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class LifeScoreHistory(LegacyBase):
    __tablename__ = "life_score_history"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    score = Column(Float, default=0)
    ielts_score = Column(Float, default=0)
    gpa_score = Column(Float, default=0)
    devops_score = Column(Float, default=0)
    streak_bonus = Column(Float, default=0)
    achievement_bonus = Column(Float, default=0)
    level_bonus = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class PlanSetupSession(LegacyBase):
    __tablename__ = "plan_setup_sessions"
    id = Column(Integer, primary_key=True, index=True)
    chat_session_id = Column(String, default="default", index=True)
    step = Column(String, default="subject")
    data = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class StudyGoal(Base):
    __tablename__ = "study_goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=False)
    celestial_name = Column(String, nullable=True)  # Tên chiêm tinh: Polaris, Sirius, Vega...
    goal_type = Column(String, default="hours")      # 'hours' (theo giờ) hoặc 'deadline' (theo ngày thi)
    target_hours = Column(Float, default=100.0)
    current_hours = Column(Float, default=0.0)
    target_date = Column(Date, nullable=True)        # Ngày thi hoặc hạn chót hoàn thành
    parent_id = Column(Integer, ForeignKey("study_goals.id"), nullable=True) # Mục tiêu cha nếu là mục tiêu con
    planet_type = Column(String, default="earth")    # earth, mars, jupiter, venus, moon, saturn
    planet_data = Column(Text, nullable=True)        # JSON lưu các công trình đã xây dựng trên hành tinh
    color = Column(String, default="#E24A4A")
    category = Column(String, default="Học tập")
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sessions = relationship("StudySessionLog", back_populates="goal", cascade="all, delete-orphan")


class StudySessionLog(Base):
    __tablename__ = "study_session_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    goal_id = Column(Integer, ForeignKey("study_goals.id"), nullable=True)
    duration_minutes = Column(Integer, default=25)
    duration_hours = Column(Float, default=0.42)
    session_date = Column(Date, nullable=False, default=date.today, index=True)
    topic_note = Column(Text, nullable=True)
    source = Column(String, default="pomodoro")  # 'pomodoro' or 'manual'
    created_at = Column(DateTime, default=datetime.utcnow)

    goal = relationship("StudyGoal", back_populates="sessions")


class RewardItem(Base):
    __tablename__ = "reward_items"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=False)
    pearl_cost = Column(Float, default=1.0)
    icon = Column(String, default="🎁")
    category = Column(String, default="giải trí")
    description = Column(Text, nullable=True)
    is_custom = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class RewardRedemption(Base):
    __tablename__ = "reward_redemptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    reward_id = Column(Integer, ForeignKey("reward_items.id"), nullable=True)
    reward_title = Column(String, nullable=False)
    reward_icon = Column(String, default="🎁")
    pearls_spent = Column(Float, default=1.0)
    note = Column(Text, nullable=True)
    redeemed_at = Column(DateTime, default=datetime.utcnow)


class TimeCapsule(Base):
    __tablename__ = "time_capsules"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    goal_id = Column(Integer, ForeignKey("study_goals.id"), nullable=True)
    milestone_hours = Column(Float, nullable=False)
    title = Column(String, default="Thư gửi tương lai")
    message_content = Column(Text, nullable=False)
    is_unlocked = Column(Boolean, default=False)
    unlocked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ConstellationAchievement(Base):
    __tablename__ = "constellation_achievements"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)  # triangulum, sagittarius, aquila, scutum, corona, draco
    title = Column(String, nullable=False)
    archetype = Column(String, nullable=False)      # Tam Giác, Mũi Tên, Đại Bàng, Khiên Thép, Vương Miện, Rồng Thần
    icon = Column(String, default="✨")
    required_completed_goals = Column(Integer, default=1) # Số mục tiêu hoàn thành cần đạt
    shape_pattern = Column(String, default="triangle")   # triangle, arrow, eagle, shield, crown, dragon
    ai_interpretation = Column(Text, nullable=False)     # Lời giải thích triết lý từ AI
    narration_script = Column(Text, nullable=False)      # Bản đọc giọng nói cho Web Speech API
    associated_goal_titles = Column(Text, nullable=True) # Danh sách các mục tiêu đã tạo nên chòm sao
    is_unlocked = Column(Boolean, default=False)
    unlocked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DailyMatrixTask(Base):
    __tablename__ = "daily_matrix_tasks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False, default=date.today, index=True)
    quadrant = Column(Integer, nullable=False, default=2)  # 1: Q1 (Làm ngay), 2: Q2 (Lên lịch), 3: Q3 (Ủy quyền/nhanh), 4: Q4 (Hạn chế/bỏ)
    goal_id = Column(Integer, ForeignKey("study_goals.id"), nullable=True)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    reflection_note = Column(Text, nullable=True)  # Ghi chú tự đánh giá cá nhân hóa (lý do chưa xong, hoặc hoàn thành nhưng thiếu giờ...)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    goal = relationship("StudyGoal")


class NotificationSetting(Base):
    __tablename__ = "notification_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    web_notifications_enabled = Column(Boolean, default=True)
    pomodoro_end_enabled = Column(Boolean, default=True)
    break_end_enabled = Column(Boolean, default=True)
    inactivity_reminder_minutes = Column(Integer, default=60)
    morning_reminder_time = Column(String, default="08:00")
    evening_reminder_time = Column(String, default="21:30")
    telegram_bot_token = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    telegram_enabled = Column(Boolean, default=False)
    app_public_url = Column(String, nullable=True)
    # Lưu ngày đã gửi gần nhất để không gửi trùng khi Render restart / cold start
    last_morning_sent_date = Column(String, nullable=True)
    last_evening_sent_date = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)




