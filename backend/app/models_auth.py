import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    salt = Column(String, nullable=False)
    racer_avatar = Column(String, default="rocket")  # rocket, cyber_car, quantum_saucer, lightning, lightcycle
    cheer_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CheerLog(Base):
    __tablename__ = "cheer_logs"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, nullable=True)
    sender_name = Column(String, default="Một người bạn")
    target_user_id = Column(Integer, index=True, nullable=False)
    emoji = Column(String, default="🔥")
    message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
