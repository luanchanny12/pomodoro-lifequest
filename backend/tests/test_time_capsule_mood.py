import pytest
import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import TimeCapsule, Player
from app.models_auth import User
from app.routers.auth import hash_password, create_access_token

client = TestClient(app)


@pytest.fixture
def auth_headers():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "test_capsule_user").first()
    if not user:
        pwd_hash, salt = hash_password("CapsulePass@123")
        user = User(
            username="test_capsule_user",
            display_name="Capsule Tester",
            password_hash=pwd_hash,
            salt=salt,
            is_admin=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    player = db.query(Player).filter(Player.user_id == user.id).first()
    if not player:
        player = Player(user_id=user.id, level=1, exp=0, coins=0, streak=0, mood_keys=3)
        db.add(player)
        db.commit()
    else:
        player.mood_keys = 3
        db.commit()

    token = create_access_token(user.id, user.username)
    db.close()
    return {"Authorization": f"Bearer {token}"}


def test_time_capsule_create_with_days_and_mood(auth_headers):
    # 1. Check initial mood balance
    bal_res = client.get("/api/focus/time-capsules/mood-balance", headers=auth_headers)
    assert bal_res.status_code == 200
    initial_keys = bal_res.json()["mood_keys"]

    # 2. Create capsule with unlock_days=30 and mood_tag='khi_met_moi'
    res = client.post(
        "/api/focus/time-capsules",
        json={
            "unlock_days": 30,
            "mood_tag": "khi_met_moi",
            "title": "Gửi tôi sau 30 ngày",
            "message_content": "Bạn đã vượt qua tháng này rất xuất sắc, đừng bỏ cuộc nhé!",
        },
        headers=auth_headers,
    )
    assert res.status_code == 201
    cap = res.json()
    assert cap["unlock_days"] == 30
    assert cap["mood_tag"] == "khi_met_moi"
    assert cap["is_unlocked"] is False
    assert cap["unlock_date"] is not None

    # 3. Writing letter rewards +1 mood key
    bal_after = client.get("/api/focus/time-capsules/mood-balance", headers=auth_headers)
    assert bal_after.status_code == 200
    assert bal_after.json()["mood_keys"] == initial_keys + 1


def test_unlock_emergency_and_random_rescue(auth_headers):
    # 1. Create a locked capsule
    create_res = client.post(
        "/api/focus/time-capsules",
        json={
            "unlock_days": 100,
            "mood_tag": "tiep_lua",
            "title": "Thư tiếp lửa 100 ngày",
            "message_content": "Cố lên, bạn sắp chạm tới mục tiêu lớn rồi!",
        },
        headers=auth_headers,
    )
    assert create_res.status_code == 201
    cap_id = create_res.json()["id"]

    bal_before = client.get("/api/focus/time-capsules/mood-balance", headers=auth_headers).json()["mood_keys"]

    # 2. Emergency unlock with 1 mood key
    unlock_res = client.post(f"/api/focus/time-capsules/{cap_id}/unlock-emergency", headers=auth_headers)
    assert unlock_res.status_code == 200
    unlocked_cap = unlock_res.json()
    assert unlocked_cap["is_unlocked"] is True
    assert unlocked_cap["unlocked_by_key"] is True

    bal_after = client.get("/api/focus/time-capsules/mood-balance", headers=auth_headers).json()["mood_keys"]
    assert bal_after == bal_before - 1

    # 3. Test random rescue draw
    rescue_res = client.post("/api/focus/time-capsules/random-rescue", headers=auth_headers)
    assert rescue_res.status_code == 200
    rescued_cap = rescue_res.json()
    assert "message_content" in rescued_cap


def test_claim_breath_grant(auth_headers):
    bal_before = client.get("/api/focus/time-capsules/mood-balance", headers=auth_headers).json()["mood_keys"]

    grant_res = client.post("/api/focus/time-capsules/claim-breath-grant", headers=auth_headers)
    assert grant_res.status_code == 200
    data = grant_res.json()
    assert data["success"] is True
    assert data["mood_keys"] == bal_before + 1


def test_time_capsule_reseal_and_permanent_preservation(auth_headers):
    # 1. Tạo thư
    create_res = client.post(
        "/api/focus/time-capsules",
        json={
            "unlock_days": 10,
            "title": "Thư lưu trữ vĩnh viễn",
            "message_content": "Lá thư này không bao giờ bị mất!",
        },
        headers=auth_headers,
    )
    assert create_res.status_code == 201
    cap_id = create_res.json()["id"]

    # 2. Mở khóa thư
    unlock_res = client.post(f"/api/focus/time-capsules/{cap_id}/unlock-emergency", headers=auth_headers)
    assert unlock_res.status_code == 200
    assert unlock_res.json()["is_unlocked"] is True

    # 3. Kiểm tra lá thư vẫn tồn tại trong danh sách tất cả các hòm thư (không bao giờ bị mất)
    list_res = client.get("/api/focus/time-capsules", headers=auth_headers)
    assert list_res.status_code == 200
    caps = list_res.json()
    found = [c for c in caps if c["id"] == cap_id]
    assert len(found) == 1
    assert found[0]["is_unlocked"] is True
    assert found[0]["message_content"] == "Lá thư này không bao giờ bị mất!"

    # 4. Niêm phong lại (reseal) trong 60 ngày tới
    reseal_res = client.post(
        f"/api/focus/time-capsules/{cap_id}/reseal",
        json={"unlock_days": 60},
        headers=auth_headers,
    )
    assert reseal_res.status_code == 200
    resealed = reseal_res.json()
    assert resealed["is_unlocked"] is False
    assert resealed["unlock_days"] == 60
    assert resealed["message_content"] == "Lá thư này không bao giờ bị mất!"

