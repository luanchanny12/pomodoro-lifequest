import os
import asyncio
from dotenv import load_dotenv
# Load .env từ thư mục gốc dự án (và backend/.env nếu có)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
load_dotenv(os.path.join(PROJECT_ROOT, "backend", ".env"))
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import (
    auth,
    race_track,
    admin,
    analytics_feedback,
    focus_hub,
    notifications,
    calendar_sync,
)
import app.models
import app.models_auth
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    import app.models
    import app.models_auth
    Base.metadata.create_all(bind=engine)
    from app.models import Player, Level
    from sqlalchemy import text
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        for stmt in [
            "ALTER TABLE daily_matrix_tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0",
            "UPDATE daily_matrix_tasks SET order_index = 0 WHERE order_index IS NULL",
            "ALTER TABLE study_goals ADD COLUMN celestial_name VARCHAR",
            "ALTER TABLE notification_settings ADD COLUMN app_public_url VARCHAR",
            "ALTER TABLE notification_settings ADD COLUMN last_morning_sent_date VARCHAR",
            "ALTER TABLE notification_settings ADD COLUMN last_evening_sent_date VARCHAR",
            "ALTER TABLE players ADD COLUMN user_id INTEGER",
            "ALTER TABLE study_goals ADD COLUMN user_id INTEGER",
            "ALTER TABLE study_session_logs ADD COLUMN user_id INTEGER",
            "ALTER TABLE daily_matrix_tasks ADD COLUMN user_id INTEGER",
            "ALTER TABLE notification_settings ADD COLUMN user_id INTEGER",
            "ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE",
            "ALTER TABLE cheer_logs ADD COLUMN is_read BOOLEAN DEFAULT FALSE",
            "ALTER TABLE study_goals ADD COLUMN goal_type VARCHAR DEFAULT 'hours'",
            "ALTER TABLE study_goals ADD COLUMN target_date DATE",
            "ALTER TABLE study_goals ADD COLUMN parent_id INTEGER",
            "ALTER TABLE study_goals ADD COLUMN planet_type VARCHAR DEFAULT 'earth'",
            "ALTER TABLE study_goals ADD COLUMN planet_data TEXT",
        ]:
            try:
                db.execute(text(stmt))
                db.commit()
            except Exception:
                db.rollback()

        # Đảm bảo có tài khoản Quản trị viên (Admin)
        from app.models_auth import User as AuthUser
        admin_account = db.query(AuthUser).filter(AuthUser.username == "admin").first()
        if not admin_account:
            from app.routers.auth import hash_password
            pwd_hash, salt = hash_password(os.getenv("ADMIN_DEFAULT_PASSWORD", "Admin@123456"))
            admin_account = AuthUser(
                username="admin",
                display_name="Quản Trị Viên (Luân)",
                password_hash=pwd_hash,
                salt=salt,
                racer_avatar="rocket",
                is_admin=True,
            )
            db.add(admin_account)
            db.commit()
            db.refresh(admin_account)
            if not db.query(Player).filter(Player.user_id == admin_account.id).first():
                db.add(Player(user_id=admin_account.id, level=1, exp=0, coins=0, streak=0))
                db.commit()
        else:
            if not admin_account.is_admin:
                admin_account.is_admin = True
                db.commit()
        if not db.query(Level).first():
            levels = [
                Level(level=1, exp_required=0, title="Tân Thủ"),
                Level(level=2, exp_required=100, title="Người Học"),
                Level(level=3, exp_required=300, title="Học Viên"),
                Level(level=4, exp_required=600, title="Người Cố Gắng"),
                Level(level=5, exp_required=1000, title="Người Kiên Trì"),
                Level(level=6, exp_required=1500, title="Chiến Binh"),
                Level(level=7, exp_required=2100, title="Hiệp Sĩ"),
                Level(level=8, exp_required=2800, title="Nhà Vô Địch"),
                Level(level=9, exp_required=3600, title="Bậc Thầy"),
                Level(level=10, exp_required=4500, title="Huyền Thoại"),
            ]
            db.add_all(levels)
        if not db.query(Player).first():
            db.add(Player(level=1, exp=0, coins=0, streak=0))
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Lifespan Warning] Non-critical startup error: {e}")
    finally:
        db.close()

    # Khởi chạy background worker gửi thông báo Telegram 24/7 trên Cloud
    def _run_scheduled_telegram_check():
        from app.database import SessionLocal
        from app.routers.notifications import check_and_send_scheduled_reminders

        worker_db = SessionLocal()
        try:
            check_and_send_scheduled_reminders(worker_db, force=False)
        finally:
            worker_db.close()

    async def cloud_telegram_scheduler_worker():
        while True:
            try:
                await asyncio.sleep(45)
                # Chạy trong thread riêng để không block event loop khi gọi Telegram API
                await asyncio.to_thread(_run_scheduled_telegram_check)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(10)

    scheduler_task = asyncio.create_task(cloud_telegram_scheduler_worker())

    try:
        yield
    finally:
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass

app = FastAPI(title="Pomodoro Goal Focus Hub", version="3.0.0", lifespan=lifespan)

# Middleware gắn HTTP Security Headers phòng thủ theo chuẩn OWASP
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# CORS Configuration
allowed_origins_env = os.getenv("CORS_ORIGINS", "")
if allowed_origins_env.strip():
    allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://pomodoro-lifequest.onrender.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.onrender\.com|https://.*\.vercel\.app" if not allowed_origins_env else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chỉ mount đúng 7 router lõi thực tế đang hoạt động
app.include_router(auth.router)
app.include_router(race_track.router)
app.include_router(admin.router)
app.include_router(analytics_feedback.router)
app.include_router(focus_hub.router)
app.include_router(notifications.router)
app.include_router(calendar_sync.router)

@app.get("/")
def root():
    return {
        "app": "LIFE QUEST",
        "version": "3.0.0",
        "description": "Hệ thống quản lý học tập gamification LIFE OS"
    }


@app.get("/api/health")
def health():
    """Endpoint nhẹ để Render / uptime monitor kiểm tra dịch vụ."""
    return {"status": "ok", "version": "3.1.0-auth-race"}
