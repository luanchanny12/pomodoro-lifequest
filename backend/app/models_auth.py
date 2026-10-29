import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Date
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

class VisitorLog(Base):
    __tablename__ = "visitor_logs"

    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(String, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_member = Column(Boolean, default=False)
    device_type = Column(String, default="desktop")  # mobile, tablet, desktop
    path = Column(String, default="/")
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    visit_date = Column(Date, default=datetime.date.today, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserFeedback(Base):
    __tablename__ = "user_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sender_name = Column(String, default="Khách vãng lai", nullable=False)
    sender_contact = Column(String, nullable=True)
    rating = Column(Integer, default=5)  # 1 - 5
    category = Column(String, default="feature")  # feature, bug, praise, ui, other
    content = Column(Text, nullable=False)
    status = Column(String, default="new")  # new, reviewed, resolved
    admin_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
