"""
Tiện ích kiểm tra kết nối Database PostgreSQL (Supabase / Neon / Render Postgres).
Cách dùng:
    python backend/scripts/test_db_connection.py [DATABASE_URL]
"""

import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(BACKEND_DIR), ".env"))

from sqlalchemy import create_engine, text

def check_connection(url: str = None):
    if not url:
        if len(sys.argv) > 1 and sys.argv[1].strip():
            url = sys.argv[1].strip()
        else:
            url = os.getenv("DATABASE_URL")

    if not url or url.strip().lower() == "auto":
        print("ℹ️ DATABASE_URL chưa được cấu hình. Hệ thống hiện đang dùng SQLite local.")
        return

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    masked = url.split("@")[-1] if "@" in url else url
    print(f"🔍 Đang kiểm tra kết nối đến: ...@{masked}")

    try:
        engine = create_engine(url, connect_args={"connect_timeout": 10} if url.startswith("postgresql") else {})
        with engine.connect() as conn:
            res = conn.execute(text("SELECT version();")).scalar()
            print(f"✅ KẾT NỐI THÀNH CÔNG VỚI POSTGRESQL!\nPhiên bản server: {res}")
            return True
    except Exception as e:
        print(f"❌ KẾT NỐI THẤT BẠI: {str(e)}")
        return False

if __name__ == "__main__":
    check_connection()
