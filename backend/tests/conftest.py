import os
import sys

# Kích hoạt chế độ test cô lập ngay khi pytest khởi động
os.environ["TESTING"] = "true"

# Đảm bảo đường dẫn backend nằm trong sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
from app.database import Base, engine

@pytest.fixture(scope="session", autouse=True)
def initialize_test_database():
    """Khởi tạo toàn bộ schema bảng trên database SQLite cô lập (test_isolated.db)."""
    Base.metadata.create_all(bind=engine)
    yield
