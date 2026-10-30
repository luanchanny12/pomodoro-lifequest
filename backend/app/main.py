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
from fastapi.middleware.gzip import GZipMiddleware
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
    from sqlalchemy import text, inspect
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        is_sqlite = engine.dialect.name == "sqlite"

        columns_to_add = [
            ("daily_matrix_tasks", "order_index", "INTEGER DEFAULT 0"),
            ("daily_matrix_tasks", "user_id", "INTEGER"),
            ("study_goals", "celestial_name", "VARCHAR"),
            ("study_goals", "user_id", "INTEGER"),
            ("study_goals", "goal_type", "VARCHAR DEFAULT 'hours'"),
            ("study_goals", "target_date", "DATE"),
            ("study_goals", "parent_id", "INTEGER"),
            ("study_goals", "planet_type", "VARCHAR DEFAULT 'earth'"),
            ("study_goals", "planet_data", "TEXT"),
            ("notification_settings", "app_public_url", "VARCHAR"),
            ("notification_settings", "last_morning_sent_date", "VARCHAR"),
            ("notification_settings", "last_evening_sent_date", "VARCHAR"),
            ("notification_settings", "user_id", "INTEGER"),
            ("players", "user_id", "INTEGER"),
            ("study_session_logs", "user_id", "INTEGER"),
            ("users", "is_admin", "BOOLEAN DEFAULT FALSE"),
            ("cheer_logs", "is_read", "BOOLEAN DEFAULT FALSE"),
            ("reward_items", "user_id", "INTEGER"),
            ("reward_redemptions", "user_id", "INTEGER"),
            ("time_capsules", "user_id", "INTEGER"),
        ]

        for tbl, col, col_def in columns_to_add:
            try:
                if is_sqlite:
                    cols = {c["name"] for c in inspector.get_columns(tbl)}
                    if col not in cols:
                        db.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_def}"))
                        db.commit()
                else:
                    db.execute(text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col} {col_def}"))
                    db.commit()
            except Exception:
                db.rollback()

        for idx_stmt in [
            "CREATE INDEX IF NOT EXISTS ix_study_session_logs_session_date ON study_session_logs (session_date)",
            "CREATE INDEX IF NOT EXISTS ix_study_session_logs_user_id ON study_session_logs (user_id)",
            "CREATE INDEX IF NOT EXISTS ix_daily_matrix_tasks_user_date ON daily_matrix_tasks (user_id, date)",
        ]:
            try:
                db.execute(text(idx_stmt))
                db.commit()
            except Exception:
                db.rollback()

        # Khởi tạo tài khoản Quản trị viên (Admin) nếu chưa tồn tại
        from app.models_auth import User as AuthUser
        admin_account = db.query(AuthUser).filter(AuthUser.username == "admin").first()
        admin_pass_env = os.getenv("ADMIN_DEFAULT_PASSWORD")
        is_prod = os.getenv("RENDER") is not None or os.getenv("ENVIRONMENT") == "production"

        if not admin_account:
            if is_prod and not admin_pass_env:
                print("[Security Warning] Production environment detected without ADMIN_DEFAULT_PASSWORD. Auto-admin creation skipped.")
            else:
                from app.routers.auth import hash_password
                pwd_hash, salt = hash_password(admin_pass_env or "Admin@123456")
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
        elif admin_pass_env:
            # Nếu người quản trị cấu hình ADMIN_DEFAULT_PASSWORD trên Render/môi trường, cập nhật mật khẩu an toàn
            from app.routers.auth import hash_password
            pwd_hash, salt = hash_password(admin_pass_env)
            admin_account.password_hash = pwd_hash
            admin_account.salt = salt
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

is_prod_env = os.getenv("RENDER") is not None or os.getenv("ENVIRONMENT") == "production"
enable_docs = not is_prod_env or os.getenv("ENABLE_DOCS", "false").lower() == "true"

app = FastAPI(
    title="Pomodoro Goal Focus Hub",
    version="3.0.0",
    lifespan=lifespan,
    docs_url="/docs" if enable_docs else None,
    redoc_url="/redoc" if enable_docs else None,
    openapi_url="/openapi.json" if enable_docs else None,
)

# Middleware gắn HTTP Security Headers phòng thủ theo chuẩn OWASP
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
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
        "https://pomodoro-lifequest.vercel.app",
        "https://pomodoro-lifequest.onrender.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https:\/\/(pomodoro-lifequest[a-zA-Z0-9-]*\.(vercel\.app|onrender\.com))$" if not allowed_origins_env else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

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
