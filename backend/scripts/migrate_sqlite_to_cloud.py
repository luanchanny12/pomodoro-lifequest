"""
Script di chuyển toàn bộ dữ liệu từ SQLite (Local) lên PostgreSQL (Supabase / Neon / Cloud).
Cách dùng:
    python backend/scripts/migrate_sqlite_to_cloud.py
hoặc:
    python backend/scripts/migrate_sqlite_to_cloud.py "postgresql://user:password@host:port/database"
"""

import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
import datetime

# Thêm thư mục backend vào sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(BACKEND_DIR), ".env"))

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

# Import các models
from app.database import Base
from app.models import Player, Level, StudyGoal, StudySessionLog, DailyMatrixTask, NotificationSetting
from app.models_auth import User, CheerLog, VisitorLog, UserFeedback
from app.models_v2 import Base as BaseV2
from app.models_v3 import Base as BaseV3
from app.models_schedule import Base as BaseSchedule


def run_migration(target_db_url: str = None):
    # 1. Xác định target DB URL
    if not target_db_url:
        if len(sys.argv) > 1 and sys.argv[1].strip():
            target_db_url = sys.argv[1].strip()
        else:
            target_db_url = os.getenv("DATABASE_URL")

    if not target_db_url or target_db_url.strip().lower() == "auto":
        print("❌ LỖI: Chưa có đường link DATABASE_URL mục tiêu!")
        print("Vui lòng cung cấp link PostgreSQL qua tham số hoặc set trong file .env:")
        print("Ví dụ: python backend/scripts/migrate_sqlite_to_cloud.py \"postgresql://postgres.xxx:pass@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require\"")
        return False

    if target_db_url.startswith("postgres://"):
        target_db_url = target_db_url.replace("postgres://", "postgresql://", 1)

    import re
    # Loại bỏ channel_binding vì psycopg2 không hỗ trợ tham số này
    target_db_url = re.sub(r"[?&]channel_binding=[^&]+", "", target_db_url)
    if "?" not in target_db_url and "&" in target_db_url:
        target_db_url = target_db_url.replace("&", "?", 1)

    if "neon.tech" in target_db_url and "options=" not in target_db_url:
        m = re.search(r"@([a-z0-9\-]+?)(?:-pooler)?\.[a-z0-9\-\.]*neon\.tech", target_db_url)
        if m:
            endpoint_id = m.group(1)
            sep = "&" if "?" in target_db_url else "?"
            target_db_url += f"{sep}options=endpoint%3D{endpoint_id}"

    # 2. Kết nối Source SQLite
    sqlite_path = os.path.join(BACKEND_DIR, "lifequest.db")
    if not os.path.exists(sqlite_path):
        print(f"❌ Không tìm thấy file SQLite nguồn tại: {sqlite_path}")
        return False

    print("===============================================================")
    print("🚀 BẮT ĐẦU DI CHUYỂN DỮ LIỆU TỪ SQLITE LÊN POSTGRESQL CLOUD")
    print("===============================================================")
    print(f"📂 Nguồn (SQLite): {sqlite_path}")
    masked_url = target_db_url.split("@")[-1] if "@" in target_db_url else target_db_url
    print(f"☁️ Đích (PostgreSQL): ...@{masked_url}")

    src_engine = create_engine(f"sqlite:///{sqlite_path}")
    SrcSession = sessionmaker(bind=src_engine)
    src_db = SrcSession()

    try:
        # 3. Kết nối Target PostgreSQL & Khởi tạo Schema
        print("\n[1/5] Đang kết nối tới máy chủ PostgreSQL Cloud...")
        tgt_engine = create_engine(
            target_db_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 15} if target_db_url.startswith("postgresql") else {},
        )
        
        # Test connection
        with tgt_engine.connect() as conn:
            print("  ✓ Kết nối PostgreSQL thành công!")

        print("\n[2/5] Đang khởi tạo các bảng (Schema) trên PostgreSQL...")
        Base.metadata.create_all(bind=tgt_engine)
        BaseV2.metadata.create_all(bind=tgt_engine)
        BaseV3.metadata.create_all(bind=tgt_engine)
        BaseSchedule.metadata.create_all(bind=tgt_engine)
        print("  ✓ Đã khởi tạo cấu trúc bảng đầy đủ.")

        TgtSession = sessionmaker(bind=tgt_engine)
        tgt_db = TgtSession()

        # 4. Migrate từng bảng theo thứ tự quan hệ khóa ngoại
        print("\n[3/5] Đang sao chép dữ liệu người dùng & thành tích...")

        # 4.1. Users
        src_users = src_db.query(User).all()
        user_id_map = {}
        users_added = 0
        for u in src_users:
            existing = tgt_db.query(User).filter(User.username == u.username).first()
            if existing:
                user_id_map[u.id] = existing.id
            else:
                new_u = User(
                    username=u.username,
                    display_name=u.display_name,
                    password_hash=u.password_hash,
                    salt=u.salt,
                    racer_avatar=u.racer_avatar,
                    cheer_count=u.cheer_count or 0,
                    is_active=bool(u.is_active),
                    is_admin=bool(getattr(u, "is_admin", False)),
                    created_at=u.created_at or datetime.datetime.utcnow(),
                )
                tgt_db.add(new_u)
                tgt_db.flush()
                user_id_map[u.id] = new_u.id
                users_added += 1
        tgt_db.commit()
        print(f"  ✓ Người dùng (Users): {users_added} mới / {len(src_users)} tổng số.")

        # 4.2. Players
        src_players = src_db.query(Player).all()
        players_added = 0
        for p in src_players:
            tgt_uid = user_id_map.get(p.user_id) if p.user_id else None
            existing = tgt_db.query(Player).filter(Player.user_id == tgt_uid).first() if tgt_uid else None
            if not existing:
                new_p = Player(
                    user_id=tgt_uid,
                    level=p.level or 1,
                    exp=p.exp or 0,
                    coins=p.coins or 0,
                    streak=p.streak or 0,
                )
                tgt_db.add(new_p)
                players_added += 1
        tgt_db.commit()
        print(f"  ✓ Nhân vật tay đua (Players): {players_added} bản ghi.")

        # 4.3. Study Goals
        src_goals = src_db.query(StudyGoal).all()
        goal_id_map = {}
        goals_added = 0
        for g in src_goals:
            tgt_uid = user_id_map.get(g.user_id) if g.user_id else None
            new_g = StudyGoal(
                user_id=tgt_uid,
                title=g.title,
                celestial_name=g.celestial_name,
                target_hours=g.target_hours,
                current_hours=g.current_hours,
                color=g.color,
                category=g.category,
                is_completed=bool(g.is_completed),
                notes=g.notes,
                created_at=g.created_at,
            )
            tgt_db.add(new_g)
            tgt_db.flush()
            goal_id_map[g.id] = new_g.id
            goals_added += 1
        tgt_db.commit()
        print(f"  ✓ Mục tiêu học tập (Goals): {goals_added} mục tiêu.")

        # 4.4. Study Session Logs
        src_sessions = src_db.query(StudySessionLog).all()
        sessions_added = 0
        for s in src_sessions:
            tgt_uid = user_id_map.get(s.user_id) if s.user_id else None
            tgt_gid = goal_id_map.get(s.goal_id) if s.goal_id else None
            new_s = StudySessionLog(
                user_id=tgt_uid,
                goal_id=tgt_gid,
                duration_minutes=s.duration_minutes,
                duration_hours=s.duration_hours,
                session_date=s.session_date,
                topic_note=s.topic_note,
                source=s.source,
                created_at=s.created_at,
            )
            tgt_db.add(new_s)
            sessions_added += 1
        tgt_db.commit()
        print(f"  ✓ Nhật ký phiên Pomodoro (Sessions): {sessions_added} phiên.")

        # 4.5. Daily Matrix Tasks
        src_tasks = src_db.query(DailyMatrixTask).all()
        tasks_added = 0
        for t in src_tasks:
            tgt_uid = user_id_map.get(t.user_id) if t.user_id else None
            tgt_gid = goal_id_map.get(t.goal_id) if t.goal_id else None
            new_t = DailyMatrixTask(
                user_id=tgt_uid,
                goal_id=tgt_gid,
                title=t.title,
                description=t.description,
                date=t.date,
                quadrant=t.quadrant,
                is_completed=bool(t.is_completed),
                reflection_note=t.reflection_note,
                created_at=t.created_at,
                completed_at=t.completed_at,
            )
            tgt_db.add(new_t)
            tasks_added += 1
        tgt_db.commit()
        print(f"  ✓ Nhiệm vụ Ma Trận 4 Ô (Tasks): {tasks_added} nhiệm vụ.")

        # 4.6. Notification Settings
        src_notifs = src_db.query(NotificationSetting).all()
        notifs_added = 0
        for n in src_notifs:
            tgt_uid = user_id_map.get(n.user_id) if n.user_id else None
            existing = tgt_db.query(NotificationSetting).filter(NotificationSetting.user_id == tgt_uid).first() if tgt_uid else None
            if not existing:
                new_n = NotificationSetting(
                    user_id=tgt_uid,
                    web_notifications_enabled=bool(n.web_notifications_enabled),
                    pomodoro_end_enabled=bool(n.pomodoro_end_enabled),
                    break_end_enabled=bool(n.break_end_enabled),
                    inactivity_reminder_minutes=n.inactivity_reminder_minutes,
                    morning_reminder_time=n.morning_reminder_time,
                    evening_reminder_time=n.evening_reminder_time,
                    telegram_enabled=bool(n.telegram_enabled),
                    telegram_bot_token=n.telegram_bot_token,
                    telegram_chat_id=n.telegram_chat_id,
                    app_public_url=n.app_public_url,
                    last_morning_sent_date=n.last_morning_sent_date,
                    last_evening_sent_date=n.last_evening_sent_date,
                    updated_at=n.updated_at,
                )
                tgt_db.add(new_n)
                notifs_added += 1
        tgt_db.commit()
        print(f"  ✓ Cấu hình thông báo & Telegram: {notifs_added} cấu hình.")

        # 4.7. Visitor Logs & Feedback
        src_visits = src_db.query(VisitorLog).all()
        for v in src_visits:
            tgt_uid = user_id_map.get(v.user_id) if v.user_id else None
            tgt_db.add(VisitorLog(
                visitor_id=v.visitor_id,
                user_id=tgt_uid,
                is_member=bool(v.is_member),
                device_type=v.device_type,
                path=v.path,
                ip_address=v.ip_address,
                user_agent=v.user_agent,
                visit_date=v.visit_date,
                created_at=v.created_at,
            ))
        tgt_db.commit()
        print(f"  ✓ Lượt truy cập (Visitor Logs): {len(src_visits)} lượt.")

        src_feedbacks = src_db.query(UserFeedback).all()
        for f in src_feedbacks:
            tgt_uid = user_id_map.get(f.user_id) if f.user_id else None
            tgt_db.add(UserFeedback(
                user_id=tgt_uid,
                sender_name=f.sender_name,
                sender_contact=f.sender_contact,
                rating=f.rating,
                category=f.category,
                content=f.content,
                status=f.status,
                admin_note=f.admin_note,
                created_at=f.created_at,
            ))
        tgt_db.commit()
        print(f"  ✓ Hòm thư góp ý (Feedbacks): {len(src_feedbacks)} nhận xét.")

        # 4.8. Levels
        src_levels = src_db.query(Level).all()
        for lvl in src_levels:
            if not tgt_db.query(Level).filter(Level.level == lvl.level).first():
                tgt_db.add(Level(level=lvl.level, exp_required=lvl.exp_required, title=lvl.title))
        tgt_db.commit()

        print("\n===============================================================")
        print("🎉 DI CHUYỂN DỮ LIỆU LÊN CLOUD POSTGRESQL HOÀN TẤT 100%!")
        print("Từ bây giờ, dữ liệu của bạn và bạn bè sẽ được lưu trữ vĩnh viễn 24/7.")
        print("Render có restart hay sleep thì dữ liệu vẫn còn nguyên vẹn!")
        print("===============================================================")
        return True

    except Exception as e:
        print(f"\n❌ Lỗi trong quá trình di chuyển: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        src_db.close()


if __name__ == "__main__":
    run_migration()
