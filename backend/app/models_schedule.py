from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models import LegacyBase as Base


class StudySubject(Base):
    __tablename__ = "study_subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)           # e.g. "Toán giải tích"
    total_weeks = Column(Integer, default=4)        # how many weeks to study
    hours_per_week = Column(Float, default=5.0)     # target hours per week
    created_at = Column(DateTime, default=datetime.utcnow)
    deadline = Column(Date, nullable=True)          # end date
    is_active = Column(Boolean, default=True)
    color = Column(String, default="#00E5FF")        # display color
    slots = relationship("StudySlot", back_populates="subject", cascade="all, delete")


class StudySlot(Base):
    __tablename__ = "study_slots"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("study_subjects.id"))
    date = Column(Date, nullable=False)
    start_time = Column(String, default="08:00")    # HH:MM
    duration_min = Column(Integer, default=60)
    is_done = Column(Boolean, default=False)
    subject = relationship("StudySubject", back_populates="slots")


class WeeklyAvailability(Base):
    __tablename__ = "weekly_availability"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True)
    available_hours = Column(Float, default=0.0)    # hours free that day
    preferred_start = Column(String, default="08:00")  # preferred start time HH:MM
