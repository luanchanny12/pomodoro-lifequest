import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", ".env")
load_dotenv(env_path)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.strip().lower() != "auto":
    import re
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Loại bỏ channel_binding vì psycopg2 không hỗ trợ tham số này trong URL
    DATABASE_URL = re.sub(r"[?&]channel_binding=[^&]+", "", DATABASE_URL)
    if "?" not in DATABASE_URL and "&" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("&", "?", 1)

    # Tự động thêm endpoint parameter cho Neon nếu thiếu (tránh lỗi libpq SNI cũ)
    if "neon.tech" in DATABASE_URL and "options=" not in DATABASE_URL:
        m = re.search(r"@([a-z0-9\-]+?)(?:-pooler)?\.[a-z0-9\-\.]*neon\.tech", DATABASE_URL)
        if m:
            endpoint_id = m.group(1)
            sep = "&" if "?" in DATABASE_URL else "?"
            DATABASE_URL += f"{sep}options=endpoint%3D{endpoint_id}"

    is_postgres = DATABASE_URL.startswith("postgresql")
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,   # tự kết nối lại khi Supabase/Neon đóng connection idle
        pool_recycle=300,
        connect_args={"connect_timeout": 10} if is_postgres else {},
    )
else:
    DB_PATH = os.path.join(BACKEND_DIR, "lifequest.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
