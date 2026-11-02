import datetime
import random
import string
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

def generate_squad_code() -> str:
    """Generate a memorable squad invite code like SQUAD-7K9A"""
    chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"SQUAD-{chars}"

class StudySquad(Base):
    __tablename__ = "study_squads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    target_title = Column(String, nullable=False) # e.g. "1000h Tiếng Anh"
    target_hours = Column(Float, default=1000.0) # e.g. 1000.0
    category = Column(String, default="Chung") # e.g. "Ngoại ngữ", "Lập trình", "Kỷ luật"
    icon = Column(String, default="🏎️") # e.g. "🏎️", "🚀", "⚡", "🛸", "🔥"
    color = Column(String, default="#06b6d4") # theme color
    description = Column(Text, nullable=True)
    invite_code = Column(String, unique=True, index=True, default=generate_squad_code)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    members = relationship("StudySquadMember", back_populates="squad", cascade="all, delete-orphan")
    messages = relationship("StudySquadMessage", back_populates="squad", cascade="all, delete-orphan")

class StudySquadMember(Base):
    __tablename__ = "study_squad_members"

    id = Column(Integer, primary_key=True, index=True)
    squad_id = Column(Integer, ForeignKey("study_squads.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    goal_id = Column(Integer, ForeignKey("study_goals.id"), nullable=True) # Linked personal goal
    role = Column(String, default="member") # "leader" | "member"
    vehicle_icon = Column(String, default="🏎️") # Racer icon: "🏎️", "🚀", "⚡", "🛸", "🏍️", "🚗"
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)

    squad = relationship("StudySquad", back_populates="members")

class StudySquadMessage(Base):
    __tablename__ = "study_squad_messages"

    id = Column(Integer, primary_key=True, index=True)
    squad_id = Column(Integer, ForeignKey("study_squads.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Null if system bot
    sender_name = Column(String, default="Thành viên nhóm")
    sender_avatar = Column(String, nullable=True)
    message_type = Column(String, default="text") # "text" | "system_speedup" | "system_join"
    content = Column(Text, nullable=False)
    emoji = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    squad = relationship("StudySquad", back_populates="messages")
