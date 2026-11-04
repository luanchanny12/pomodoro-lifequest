import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Ensure backend root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from app.database import Base
import app.models
import app.models_auth
import app.models_squad
import app.models_v2
import app.models_v3
import app.models_schedule

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Model metadata for autogenerate support
target_metadata = Base.metadata

def get_url() -> str:
    # 1) TEST_DATABASE_URL được đặt thủ công -> dùng nó (ưu tiên tuyệt đối)
    test_db = os.getenv("TEST_DATABASE_URL")
    if test_db:
        return test_db

    # 2) Chế độ test: dùng đúng SQLite cách ly của app (KHÔNG BAO GIỜ chạm DB thật)
    if os.getenv("TESTING", "").lower() in ("true", "1") or "pytest" in sys.modules:
        from app.database import engine as _local_engine
        return str(_local_engine.url)

    url = os.getenv("DATABASE_URL")
    if not url:
        url = config.get_main_option("sqlalchemy.url", "sqlite:///./pomodoro.db")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # 3) Chống tai nạn: DATABASE_URL mặc định trong .env trỏ thẳng tới Neon production.
    #    Chạy alembic upgrade/downgrade lúc này sẽ DDL trên DB THẬT (downgrade = DROP bảng).
    #    Phải set ALEMBIC_ALLOW_PROD=true chủ động thì mới cho phép.
    if url.startswith(("postgres://", "postgresql://")) and os.getenv(
        "ALEMBIC_ALLOW_PROD", ""
    ).lower() not in ("true", "1"):
        raise SystemExit(
            "\n[ALEMBIC STOPPED] DATABASE_URL trỏ tới PostgreSQL (rất có thể là Neon production).\n"
            "\n"
            "Nếu ĐÚNG là muốn migration DB này:\n"
            "    ALEMBIC_ALLOW_PROD=true alembic upgrade head\n"
            "DB đã tồn tại schema (19 bảng): hãy chạy `alembic stamp head` TRƯỚC,\n"
            "chỉ `upgrade head` khi có migration MỚI.\n"
            "\n"
            "Nếu muốn thử trên DB cục bộ:\n"
            "    TEST_DATABASE_URL=sqlite:///./alembic_local.db alembic upgrade head\n"
        )
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
