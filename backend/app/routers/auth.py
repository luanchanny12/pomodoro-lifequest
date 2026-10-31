import os
import re
import json
import time
import hmac
import base64
import hashlib
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models_auth import User
from app.models import Player, StudyGoal, NotificationSetting

RAW_SECRET_KEY = os.getenv("SECRET_KEY")
INSECURE_SECRETS = {
    "pomodoro-cosmic-secret-key-super-safe-2026",
    "secret",
    "secret-key",
    "change-me",
    "123456",
}
is_production = os.getenv("RENDER") is not None or os.getenv("ENVIRONMENT") == "production"

if not RAW_SECRET_KEY or RAW_SECRET_KEY.strip() in INSECURE_SECRETS:
    if is_production:
        raise RuntimeError("CRITICAL SECURITY ERROR: Strong SECRET_KEY must be configured in environment on production!")
    # Sinh secret ngẫu nhiên bảo mật cao per-process trong môi trường phát triển nếu chưa cấu hình .env
    SECRET_KEY = secrets.token_hex(32)
else:
    SECRET_KEY = RAW_SECRET_KEY.strip()

router = APIRouter(prefix="/api/auth", tags=["Authentication & Multi-User"])

# --- Security Helpers ---

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def hash_password(password: str, salt: Optional[str] = None) -> tuple:
    if not salt:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return pwd_hash, salt

def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    calc_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(calc_hash, expected_hash)

def create_access_token(user_id: int, username: str, salt: Optional[str] = None) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "pv": salt[:8] if salt else None,
        "exp": int(time.time()) + (14 * 24 * 3600),  # 14 ngày
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
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên!",
        )
    # Thu hồi token cũ nếu mật khẩu đã được đổi sau thời điểm cấp token
    if payload.get("pv") and getattr(user, "salt", None):
        if payload["pv"] != user.salt[:8]:
            return None
    return user

def get_current_user(user: Optional[User] = Depends(get_current_user_optional)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if not getattr(user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền Quản trị viên (Admin) để thực hiện thao tác này.",
        )
    return user

# --- Schemas ---

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    display_name: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)
    racer_avatar: Optional[str] = "rocket"

class LoginRequest(BaseModel):
    username: str
    password: str

class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    racer_avatar: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str
    racer_avatar: Optional[str] = "rocket"
    cheer_count: Optional[int] = 0
    is_admin: bool = False
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

    today = datetime.date.today()
    effective_streak = player.streak or 0
    if player.last_streak_date and player.last_streak_date < today - datetime.timedelta(days=1):
        effective_streak = 0

    return UserResponse(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        racer_avatar=user.racer_avatar or "rocket",
        cheer_count=user.cheer_count or 0,
        is_admin=bool(getattr(user, "is_admin", False)),
        level=player.level,
        exp=player.exp,
        coins=player.coins,
        streak=effective_streak,
    )

@router.post("/register", response_model=AuthResponse)
def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    _check_rate_limit(f"reg:{client_ip}", max_attempts=5, window_seconds=600, message="Bạn đã đăng ký tài khoản quá nhiều lần.")

    clean_username = data.username.strip().lower()
    if not re.match(r"^[a-zA-Z0-9_]{3,30}$", clean_username):
        raise HTTPException(
            status_code=400,
            detail="Tên đăng nhập không hợp lệ. Chỉ được chứa chữ cái không dấu, số và dấu gạch dưới (từ 3 đến 30 ký tự)!"
        )

    if db.query(User).filter(User.username == clean_username).first():
        raise HTTPException(status_code=400, detail="Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác!")

    clean_display = data.display_name.strip()
    if len(clean_display) < 2 or len(clean_display) > 50:
        raise HTTPException(
            status_code=400,
            detail="Tên hiển thị phải có độ dài từ 2 đến 50 ký tự!"
        )

    if len(data.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Mật khẩu phải có độ dài tối thiểu 6 ký tự!"
        )

    pwd_hash, salt = hash_password(data.password)

    valid_avatars = {"rocket", "cyber_car", "quantum_saucer", "lightning", "lightcycle"}
    chosen_avatar = data.racer_avatar if data.racer_avatar in valid_avatars else "rocket"

    # Mọi tài khoản mới đăng ký mặc định là Thành viên thông thường (is_admin = False).
    # Quyền Quản trị viên chỉ được cấp bởi Admin trong Admin Portal hoặc tài khoản admin hệ thống.
    is_admin_flag = False

    try:
        user = User(
            username=clean_username,
            display_name=clean_display,
            password_hash=pwd_hash,
            salt=salt,
            racer_avatar=chosen_avatar,
            is_admin=is_admin_flag,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Khởi tạo Player profile riêng cho user
        player = Player(user_id=user.id, level=1, exp=0, coins=0, streak=0)
        db.add(player)

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

    token = create_access_token(user.id, user.username, user.salt)
    return AuthResponse(
        access_token=token,
        user=_build_user_response(user, db)
    )

# In-memory sliding window rate limiter against brute-force attacks and DoS
_RATE_LIMIT_STORE = {}


def _check_rate_limit(key: str, max_attempts: int, window_seconds: int, message: str = "Quá nhiều yêu cầu. Vui lòng thử lại sau!"):
    now = time.time()
    attempts = [t for t in _RATE_LIMIT_STORE.get(key, []) if now - t < window_seconds]
    _RATE_LIMIT_STORE[key] = attempts
    if len(attempts) >= max_attempts:
        retry_after = int(window_seconds - (now - attempts[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"{message} (Vui lòng thử lại sau {max(1, retry_after)} giây)",
        )


def _record_failed_attempt(key: str):
    now = time.time()
    if key not in _RATE_LIMIT_STORE:
        _RATE_LIMIT_STORE[key] = []
    _RATE_LIMIT_STORE[key].append(now)


def _reset_attempts(key: str):
    _RATE_LIMIT_STORE.pop(key, None)


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    clean_username = data.username.strip().lower()

    # Rate limit by IP and (IP + username)
    _check_rate_limit(f"login_ip:{client_ip}", max_attempts=30, window_seconds=300, message="Quá nhiều lần thử đăng nhập từ thiết bị của bạn.")
    _check_rate_limit(f"login_pair:{client_ip}:{clean_username}", max_attempts=10, window_seconds=300, message="Đăng nhập tài khoản này thất bại quá nhiều lần.")

    user = db.query(User).filter(User.username == clean_username).first()
    if not user or not verify_password(data.password, user.salt, user.password_hash):
        _record_failed_attempt(f"login_ip:{client_ip}")
        _record_failed_attempt(f"login_pair:{client_ip}:{clean_username}")
        raise HTTPException(status_code=400, detail="Tên đăng nhập hoặc mật khẩu không chính xác!")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên!")

    _reset_attempts(f"login_pair:{client_ip}:{clean_username}")
    token = create_access_token(user.id, user.username, user.salt)
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


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mọi user tự đổi mật khẩu của chính mình (yêu cầu mật khẩu hiện tại)."""
    if not verify_password(data.current_password, user.salt, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác!")

    if len(data.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 6 ký tự!")

    pwd_hash, salt = hash_password(data.new_password.strip())
    user.password_hash = pwd_hash
    user.salt = salt
    db.commit()

    return {"message": "Đã đổi mật khẩu thành công!", "success": True}
