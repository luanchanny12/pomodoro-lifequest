import os
import json
import time
import hmac
import base64
import hashlib
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models_auth import User
from app.models import Player, StudyGoal, NotificationSetting

SECRET_KEY = os.getenv("SECRET_KEY", "pomodoro-cosmic-secret-key-super-safe-2026")

router = APIRouter(prefix="/api/auth", tags=["Authentication & Multi-User"])

# --- Security Helpers ---

def hash_password(password: str, salt: Optional[str] = None) -> tuple:
    if not salt:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return pwd_hash, salt

def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    calc_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(calc_hash, expected_hash)

def create_access_token(user_id: int, username: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "exp": int(time.time()) + (60 * 24 * 3600),  # 60 days
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(payload_bytes).decode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{b64_payload}.{signature}"

def decode_access_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        b64_payload, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload_bytes = base64.urlsafe_b64decode(b64_payload.encode("utf-8"))
        payload = json.loads(payload_bytes.decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

# --- Dependencies ---

def get_current_user_optional(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[User]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id, User.is_active == True).first()

def get_current_user(user: Optional[User] = Depends(get_current_user_optional)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# --- Schemas ---

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    display_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=4)
    racer_avatar: Optional[str] = "rocket"

class LoginRequest(BaseModel):
    username: str
    password: str

class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    racer_avatar: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str
    racer_avatar: str
    cheer_count: int
    level: int = 1
    exp: int = 0
    coins: int = 0
    streak: int = 0

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Endpoints ---

def _build_user_response(user: User, db: Session) -> UserResponse:
    player = db.query(Player).filter(Player.user_id == user.id).first()
    if not player:
        player = Player(user_id=user.id, level=1, exp=0, coins=0, streak=0)
        db.add(player)
        db.commit()
        db.refresh(player)

    return UserResponse(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        racer_avatar=user.racer_avatar or "rocket",
        cheer_count=user.cheer_count or 0,
        level=player.level,
        exp=player.exp,
        coins=player.coins,
        streak=player.streak,
    )

@router.post("/register", response_model=AuthResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    clean_username = data.username.strip().lower()
    if db.query(User).filter(User.username == clean_username).first():
        raise HTTPException(status_code=400, detail="Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác!")

    clean_display = data.display_name.strip()
    pwd_hash, salt = hash_password(data.password)

    valid_avatars = {"rocket", "cyber_car", "quantum_saucer", "lightning", "lightcycle"}
    chosen_avatar = data.racer_avatar if data.racer_avatar in valid_avatars else "rocket"

    try:
        user = User(
            username=clean_username,
            display_name=clean_display,
            password_hash=pwd_hash,
            salt=salt,
            racer_avatar=chosen_avatar,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Khởi tạo Player profile riêng cho user
        player = Player(user_id=user.id, level=1, exp=0, coins=0, streak=0)
        db.add(player)

        # Khởi tạo StudyGoal mặc định cho user
        default_goal = StudyGoal(
            user_id=user.id,
            title="1000 Giờ Học Tiếng Anh",
            celestial_name="Sirius",
            target_hours=1000.0,
            current_hours=0.0,
            color="#E24A4A",
            category="Tiếng Anh",
            notes="Mục tiêu chinh phục 1000 giờ học tập & tập trung Pomodoro.",
        )
        db.add(default_goal)

        # Khởi tạo cài đặt thông báo riêng cho user
        setting = NotificationSetting(
            user_id=user.id,
            web_notifications_enabled=True,
            pomodoro_end_enabled=True,
            break_end_enabled=True,
            inactivity_reminder_minutes=60,
            morning_reminder_time="08:00",
            evening_reminder_time="21:30",
            telegram_enabled=False,
        )
        db.add(setting)

        db.commit()
    except Exception as e:
        db.rollback()
        import logging
        logging.error(f"Register failed for user {clean_username}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Không thể tạo tài khoản. Vui lòng thử lại sau hoặc liên hệ quản trị viên."
        )

    token = create_access_token(user.id, user.username)
    return AuthResponse(
        access_token=token,
        user=_build_user_response(user, db)
    )

@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    clean_username = data.username.strip().lower()
    user = db.query(User).filter(User.username == clean_username).first()
    if not user or not verify_password(data.password, user.salt, user.password_hash):
        raise HTTPException(status_code=400, detail="Tên đăng nhập hoặc mật khẩu không chính xác!")

    token = create_access_token(user.id, user.username)
    return AuthResponse(
        access_token=token,
        user=_build_user_response(user, db)
    )

@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _build_user_response(user, db)

@router.put("/profile", response_model=UserResponse)
def update_profile(data: ProfileUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.display_name:
        user.display_name = data.display_name.strip()
    if data.racer_avatar:
        valid_avatars = {"rocket", "cyber_car", "quantum_saucer", "lightning", "lightcycle"}
        if data.racer_avatar in valid_avatars:
            user.racer_avatar = data.racer_avatar
    db.commit()
    db.refresh(user)
    return _build_user_response(user, db)
