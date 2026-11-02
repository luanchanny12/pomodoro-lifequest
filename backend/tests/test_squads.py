import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_squad_lifecycle_and_chat():
    # 1. Register User A (Leader)
    res_a = client.post("/api/auth/register", json={
        "username": "squad_leader_luan",
        "display_name": "Luân Leader",
        "password": "password123",
        "racer_avatar": "cyber_car"
    })
    if res_a.status_code == 200:
        token_a = res_a.json()["access_token"]
    else:
        log_a = client.post("/api/auth/login", json={"username": "squad_leader_luan", "password": "password123"})
        token_a = log_a.json()["access_token"]

    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Create Goal for User A: 1000h Tiếng Anh
    goal_res_a = client.post("/api/focus/goals", json={
        "title": "1000h Tiếng Anh",
        "target_hours": 1000.0,
        "color": "#06b6d4",
        "category": "Tiếng Anh"
    }, headers=headers_a)
    assert goal_res_a.status_code in (200, 201)
    goal_id_a = goal_res_a.json()["id"]

    # 2. User A creates Squad
    create_res = client.post("/api/squads", json={
        "name": "Chiến Dịch 1000h Tiếng Anh F1",
        "target_title": "1000h Tiếng Anh",
        "target_hours": 1000.0,
        "category": "Tiếng Anh",
        "icon": "🏎️",
        "color": "#06b6d4",
        "description": "Nhóm cày 1000h Tiếng Anh cùng nhau!",
        "goal_id": goal_id_a,
        "vehicle_icon": "🏎️"
    }, headers=headers_a)
    assert create_res.status_code == 200
    squad_data = create_res.json()
    squad_id = squad_data["id"]
    invite_code = squad_data["invite_code"]
    assert invite_code.startswith("SQUAD-")
    assert squad_data["members_count"] == 1
    assert squad_data["members"][0]["role"] == "leader"

    # 3. Register User B (Member)
    res_b = client.post("/api/auth/register", json={
        "username": "squad_member_ngoc",
        "display_name": "Khánh Ngọc",
        "password": "password123",
        "racer_avatar": "rocket"
    })
    if res_b.status_code == 200:
        token_b = res_b.json()["access_token"]
    else:
        log_b = client.post("/api/auth/login", json={"username": "squad_member_ngoc", "password": "password123"})
        token_b = log_b.json()["access_token"]

    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Create Goal for User B: 1000h Tiếng Anh with 200h already done
    goal_res_b = client.post("/api/focus/goals", json={
        "title": "1000h Tiếng Anh",
        "target_hours": 1000.0,
        "color": "#f59e0b",
        "category": "Tiếng Anh"
    }, headers=headers_b)
    assert goal_res_b.status_code in (200, 201)
    goal_id_b = goal_res_b.json()["id"]

    # Log 120 minutes for User B to have 2 hours
    client.post("/api/focus/sessions", json={
        "goal_id": goal_id_b,
        "duration_minutes": 120,
        "session_date": "2026-11-02",
        "topic_note": "Listening practice",
        "source": "manual"
    }, headers=headers_b)

    # 4. User B joins Squad via invite_code
    join_res = client.post("/api/squads/join", json={
        "invite_code": invite_code,
        "goal_id": goal_id_b,
        "vehicle_icon": "🚀"
    }, headers=headers_b)
    assert join_res.status_code == 200
    detail_after_join = join_res.json()
    assert detail_after_join["members_count"] == 2

    # 5. Check Mini-F1 Race Track sorting: User B (2h, 0.2%) should be ahead of User A (0h, 0%)
    members = detail_after_join["members"]
    assert members[0]["user_id"] == client.get("/api/auth/me", headers=headers_b).json()["id"]
    assert members[0]["current_hours"] >= 2.0
    assert members[0]["progress_percent"] >= 0.2

    # 6. Test Group Chat: User B sends message
    send_res = client.post(f"/api/squads/{squad_id}/messages", json={
        "content": "Chào Luân nhé, tui vừa tham gia đua nè! 🔥",
        "emoji": "🔥"
    }, headers=headers_b)
    assert send_res.status_code == 200
    assert send_res.json()["content"] == "Chào Luân nhé, tui vừa tham gia đua nè! 🔥"

    # User A reads messages
    get_msgs_res = client.get(f"/api/squads/{squad_id}/messages", headers=headers_a)
    assert get_msgs_res.status_code == 200
    msgs = get_msgs_res.json()
    assert len(msgs) >= 2 # welcome + join + chat message
    assert any("Chào Luân nhé" in m["content"] for m in msgs)

    # 7. Test get_my_squads
    my_squads_res = client.get("/api/squads/my", headers=headers_a)
    assert my_squads_res.status_code == 200
    assert len(my_squads_res.json()) >= 1
    assert any(s["id"] == squad_id for s in my_squads_res.json())

    # 8. Non-member permissions: User C (stranger)
    res_c = client.post("/api/auth/register", json={
        "username": "squad_stranger_ha",
        "display_name": "Thu Hà",
        "password": "password123",
        "racer_avatar": "cyber_car"
    })
    token_c = res_c.json()["access_token"] if res_c.status_code == 200 else client.post("/api/auth/login", json={"username": "squad_stranger_ha", "password": "password123"}).json()["access_token"]
    headers_c = {"Authorization": f"Bearer {token_c}"}

    forbidden_msgs = client.get(f"/api/squads/{squad_id}/messages", headers=headers_c)
    assert forbidden_msgs.status_code == 403

    forbidden_post = client.post(f"/api/squads/{squad_id}/messages", json={"content": "Lẻn vào chat"}, headers=headers_c)
    assert forbidden_post.status_code == 403

    # 9. Kick permissions
    user_b_id = client.get("/api/auth/me", headers=headers_b).json()["id"]
    user_a_id = client.get("/api/auth/me", headers=headers_a).json()["id"]

    # Member B tries to kick Leader A -> 403 Forbidden
    kick_fail_non_leader = client.delete(f"/api/squads/{squad_id}/members/{user_a_id}", headers=headers_b)
    assert kick_fail_non_leader.status_code == 403

    # Leader A tries to kick themselves -> 400 Bad Request
    kick_self_fail = client.delete(f"/api/squads/{squad_id}/members/{user_a_id}", headers=headers_a)
    assert kick_self_fail.status_code == 400

    # Leader A kicks Member B -> 200 OK
    kick_success = client.delete(f"/api/squads/{squad_id}/members/{user_b_id}", headers=headers_a)
    assert kick_success.status_code == 200

    # Verify detail: only Leader A remains
    detail_after_kick = client.get(f"/api/squads/{squad_id}", headers=headers_a).json()
    assert detail_after_kick["members_count"] == 1
    assert detail_after_kick["members"][0]["user_id"] == user_a_id

    # Member B can no longer read messages -> 403 Forbidden
    b_msgs_after_kick = client.get(f"/api/squads/{squad_id}/messages", headers=headers_b)
    assert b_msgs_after_kick.status_code == 403
