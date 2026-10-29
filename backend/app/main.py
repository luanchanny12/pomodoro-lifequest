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
    goals, roadmaps, courses, tasks, sprints, daily_logs, study_hours,
    gamification, vocabulary, ipa, exports, backlog, ai, ai_v2, ai_v3,
    knowledge, learning, daily_coach, schedule, focus_hub, notifications,
    calendar_sync, auth, race_track, admin, analytics_feedback
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
    from app.models_v2 import Base as BaseV2
    BaseV2.metadata.create_all(bind=engine)
    from app.models_v3 import Base as BaseV3
    BaseV3.metadata.create_all(bind=engine)
    from app.models_schedule import Base as BaseSchedule
    BaseSchedule.metadata.create_all(bind=engine)
    from sqlalchemy import text
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        for stmt in [
            "ALTER TABLE vocabulary ADD COLUMN type VARCHAR DEFAULT 'word'",
            "ALTER TABLE daily_logs ADD COLUMN activities TEXT",
            "ALTER TABLE study_goals ADD COLUMN celestial_name VARCHAR",
            "ALTER TABLE notification_settings ADD COLUMN app_public_url VARCHAR",
            "ALTER TABLE notification_settings ADD COLUMN last_morning_sent_date VARCHAR",
            "ALTER TABLE notification_settings ADD COLUMN last_evening_sent_date VARCHAR",
            "ALTER TABLE players ADD COLUMN user_id INTEGER",
            "ALTER TABLE study_goals ADD COLUMN user_id INTEGER",
            "ALTER TABLE study_session_logs ADD COLUMN user_id INTEGER",
            "ALTER TABLE daily_matrix_tasks ADD COLUMN user_id INTEGER",
            "ALTER TABLE notification_settings ADD COLUMN user_id INTEGER",
            "ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0",
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
        from app.ai.knowledge_graph import seed_knowledge_graph
        seed_knowledge_graph(db)
        from app.ai.quest_system import seed_quests
        seed_quests(db)
        from app.ai.shop import seed_shop
        seed_shop(db)
        from app.ai.avatar_evolution import get_or_create_avatar
        player = db.query(Player).first()
        if player:
            get_or_create_avatar(db, player.id)

        # Clean up old seed data so new users start fresh.
        # CHỈ chạy khi bật rõ ràng RESET_SEED_DATA_ON_START=true, tránh xoá dữ liệu
        # người dùng mỗi lần Render restart/deploy.
        if os.getenv("RESET_SEED_DATA_ON_START", "false").strip().lower() in ("1", "true", "yes"):
            for table in ["roadmap_lessons", "current_positions", "brain_memory", "roadmap_items", "predictions", "weekly_reports", "user_statistics", "v1_learning_history", "life_score_history"]:
                try:
                    db.execute(text(f"DELETE FROM {table}"))
                except Exception:
                    db.rollback()
            db.commit()
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(race_track.router)
app.include_router(admin.router)
app.include_router(analytics_feedback.router)
app.include_router(focus_hub.router)
app.include_router(notifications.router)
app.include_router(calendar_sync.router)
app.include_router(goals.router)
app.include_router(roadmaps.router)
app.include_router(courses.router)
app.include_router(tasks.router)
app.include_router(sprints.router)
app.include_router(daily_logs.router)
app.include_router(study_hours.router)
app.include_router(gamification.router)
app.include_router(vocabulary.router)
app.include_router(ipa.router)
app.include_router(exports.router)
app.include_router(backlog.router)
app.include_router(ai.router)
app.include_router(ai_v2.router)
app.include_router(ai_v3.router)
app.include_router(knowledge.router)
app.include_router(learning.router)
app.include_router(daily_coach.router)
app.include_router(schedule.router)

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
