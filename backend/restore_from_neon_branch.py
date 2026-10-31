"""
Script khôi phục dữ liệu người dùng từ Branch Neon đã restore về thời điểm trước đó.
Cách dùng:
  D:\\python38\\python.exe backend/restore_from_neon_branch.py "<RECOVERY_DATABASE_URL>"

Ví dụ:
  D:\\python38\\python.exe backend/restore_from_neon_branch.py "postgresql://neondb_owner:npg_xxx@ep-xxx.neon.tech/neondb?sslmode=require"
"""

import sys
import os
import io

# Đảm bảo in tiếng Việt trên console Windows không bị UnicodeEncodeError
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Đảm bảo app import được
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import (
    StudyGoal, StudySessionLog, DailyMatrixTask, TimeCapsule,
    RewardItem, RewardRedemption, UserConstellationUnlock, Player, Achievement
)
from app.models_auth import User
from app.database import SessionLocal as MainSessionLocal


def restore_user_data(recovery_db_url: str, target_username: str = "luanchanny1211"):
    import re
    if recovery_db_url.startswith("postgres://"):
        recovery_db_url = recovery_db_url.replace("postgres://", "postgresql://", 1)
    recovery_db_url = re.sub(r"[?&]channel_binding=[^&]+", "", recovery_db_url)
    if os.name == "nt" and "neon.tech" in recovery_db_url and "options=" not in recovery_db_url:
        m = re.search(r"@([a-z0-9\-]+)\.[a-z0-9\-\.]*neon\.tech", recovery_db_url)
        if m:
            endpoint_id = m.group(1)
            sep = "&" if "?" in recovery_db_url else "?"
            recovery_db_url += f"{sep}options=endpoint%3D{endpoint_id}"

    print(f"[*] Đang kết nối tới DB phục hồi...")
    rec_engine = create_engine(recovery_db_url)
    RecSession = sessionmaker(bind=rec_engine)
    rec_db = RecSession()
    main_db = MainSessionLocal()

    try:
        # Tìm user trong cả 2 DB
        rec_user = rec_db.query(User).filter(User.username == target_username).first()
        if not rec_user:
            print(f"[!] Không tìm thấy user '{target_username}' trong DB phục hồi!")
            return

        main_user = main_db.query(User).filter(User.username == target_username).first()
        if not main_user:
            print(f"[!] Không tìm thấy user '{target_username}' trong DB chính!")
            return

        print(f"[+] Tìm thấy user '{target_username}': RecID={rec_user.id}, MainID={main_user.id}")

        # 1. Khôi phục Mục Tiêu Lớn (StudyGoal)
        old_goals = rec_db.query(StudyGoal).filter(StudyGoal.user_id == rec_user.id).all()
        print(f"[*] Tìm thấy {len(old_goals)} mục tiêu trong DB phục hồi.")
        
        goal_id_map = {} # old_id -> new_id
        # Tạo trước các goal cha (parent_id is None)
        parent_goals = [g for g in old_goals if not g.parent_id]
        child_goals = [g for g in old_goals if g.parent_id]

        for g in parent_goals:
            new_g = StudyGoal(
                user_id=main_user.id,
                title=g.title,
                target_hours=g.target_hours,
                current_hours=g.current_hours,
                color=g.color,
                category=g.category,
                notes=g.notes,
                is_completed=g.is_completed,
                completed_at=g.completed_at,
                planet_type=g.planet_type,
                planet_data=g.planet_data,
                goal_type=g.goal_type,
                target_date=g.target_date,
                created_at=g.created_at,
                updated_at=g.updated_at,
            )
            main_db.add(new_g)
            main_db.flush()
            goal_id_map[g.id] = new_g.id

        for g in child_goals:
            new_parent_id = goal_id_map.get(g.parent_id)
            new_g = StudyGoal(
                user_id=main_user.id,
                title=g.title,
                target_hours=g.target_hours,
                current_hours=g.current_hours,
                parent_id=new_parent_id,
                color=g.color,
                category=g.category,
                notes=g.notes,
                is_completed=g.is_completed,
                completed_at=g.completed_at,
                planet_type=g.planet_type,
                planet_data=g.planet_data,
                goal_type=g.goal_type,
                target_date=g.target_date,
                created_at=g.created_at,
                updated_at=g.updated_at,
            )
            main_db.add(new_g)
            main_db.flush()
            goal_id_map[g.id] = new_g.id

        print(f"[OK] Đã khôi phục {len(old_goals)} mục tiêu vào DB chính.")

        # 2. Khôi phục Ma Trận 4 Ô (DailyMatrixTask)
        old_tasks = rec_db.query(DailyMatrixTask).filter(DailyMatrixTask.user_id == rec_user.id).all()
        print(f"[*] Tìm thấy {len(old_tasks)} nhiệm vụ ma trận trong DB phục hồi.")
        for t in old_tasks:
            new_t = DailyMatrixTask(
                user_id=main_user.id,
                title=t.title,
                description=t.description,
                date=t.date,
                quadrant=t.quadrant,
                goal_id=goal_id_map.get(t.goal_id),
                is_completed=t.is_completed,
                completed_at=t.completed_at,
                reflection_note=t.reflection_note,
                order_index=t.order_index,
                created_at=t.created_at if hasattr(t, "created_at") else None,
            )
            main_db.add(new_t)

        print(f"[OK] Đã khôi phục {len(old_tasks)} nhiệm vụ ma trận 4 ô.")

        # 3. Khôi phục Nhật Ký Học (StudySessionLog)
        old_sessions = rec_db.query(StudySessionLog).filter(StudySessionLog.user_id == rec_user.id).all()
        print(f"[*] Tìm thấy {len(old_sessions)} phiên học trong DB phục hồi.")
        for s in old_sessions:
            new_s = StudySessionLog(
                user_id=main_user.id,
                goal_id=goal_id_map.get(s.goal_id),
                duration_minutes=s.duration_minutes,
                duration_hours=s.duration_hours,
                session_type=s.session_type,
                session_date=s.session_date,
                topic_note=s.topic_note,
                source=s.source,
                reflection_note=s.reflection_note,
                created_at=s.created_at,
                completed_at=s.completed_at,
            )
            main_db.add(new_s)

        # 4. Cập nhật Player & EXP / Streak nếu có
        rec_player = rec_db.query(Player).filter(Player.user_id == rec_user.id).first()
        if rec_player:
            main_player = main_db.query(Player).filter(Player.user_id == main_user.id).first()
            if main_player:
                main_player.level = max(main_player.level, rec_player.level)
                main_player.exp = max(main_player.exp, rec_player.exp)
                main_player.coins = max(main_player.coins, rec_player.coins)
                main_player.streak = max(main_player.streak, rec_player.streak)
                if rec_player.last_streak_date and (not main_player.last_streak_date or main_player.last_streak_date < rec_player.last_streak_date):
                    main_player.last_streak_date = rec_player.last_streak_date

        main_db.commit()
        print("\n🎉 HOÀN TẤT KHÔI PHỤC DỮ LIỆU THÀNH CÔNG 100%!")

    except Exception as e:
        main_db.rollback()
        print(f"[LỖI] Quá trình khôi phục gặp lỗi: {e}")
        raise e
    finally:
        rec_db.close()
        main_db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Vui lòng truyền URL kết nối của Branch Neon phục hồi:")
        print("python backend/restore_from_neon_branch.py \"<RECOVERY_DATABASE_URL>\"")
        sys.exit(1)

    recovery_url = sys.argv[1].strip()
    restore_user_data(recovery_url)
