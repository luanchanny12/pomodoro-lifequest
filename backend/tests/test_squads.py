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


def _auth_user(username: str, display_name: str) -> dict:
    from app.database import SessionLocal
    from app.models_auth import User
    from app.routers.auth import hash_password, create_access_token

    db = SessionLocal()
    u = db.query(User).filter(User.username == username).first()
    if not u:
        pwd_hash, salt = hash_password("password123")
        u = User(
            username=username,
            display_name=display_name,
            password_hash=pwd_hash,
            salt=salt,
            racer_avatar="cyber_car",
            is_active=True,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    token = create_access_token(u.id, u.username)
    uid = u.id
    db.close()
    headers = {"Authorization": f"Bearer {token}"}
    return {"id": uid, "username": username, "headers": headers}


def test_squad_kick_member():
    u_lead = _auth_user("sq_kick_lead", "Kick Leader")
    u_mem = _auth_user("sq_kick_mem", "Kick Member")
    u_other = _auth_user("sq_kick_other", "Kick Other")

    # Leader creates squad
    s_res = client.post("/api/squads", json={
        "name": "Nhóm Test Quyền Kick",
        "target_title": "100h Dev",
        "target_hours": 100.0,
        "category": "Lập trình",
    }, headers=u_lead["headers"])
    assert s_res.status_code == 200
    s_data = s_res.json()
    s_id = s_data["id"]
    inv = s_data["invite_code"]

    # Member joins
    j_res = client.post("/api/squads/join", json={"invite_code": inv}, headers=u_mem["headers"])
    assert j_res.status_code == 200

    # 1. Non-member (u_other) tries to kick -> 403
    k_other = client.delete(f"/api/squads/{s_id}/members/{u_mem['id']}", headers=u_other["headers"])
    assert k_other.status_code == 403

    # 2. Member tries to kick leader -> 403
    k_mem = client.delete(f"/api/squads/{s_id}/members/{u_lead['id']}", headers=u_mem["headers"])
    assert k_mem.status_code == 403

    # 3. Leader kicks themselves -> 400
    k_self = client.delete(f"/api/squads/{s_id}/members/{u_lead['id']}", headers=u_lead["headers"])
    assert k_self.status_code == 400

    # 4. Leader kicks non-existent member -> 404
    k_none = client.delete(f"/api/squads/{s_id}/members/99999", headers=u_lead["headers"])
    assert k_none.status_code == 404

    # 5. Leader kicks member -> 200 OK
    k_ok = client.delete(f"/api/squads/{s_id}/members/{u_mem['id']}", headers=u_lead["headers"])
    assert k_ok.status_code == 200
    assert "ra khỏi nhóm" in k_ok.json()["message"]

    # Member is no longer in squad
    d_after = client.get(f"/api/squads/{s_id}", headers=u_lead["headers"]).json()
    assert d_after["members_count"] == 1
    assert not any(m["user_id"] == u_mem["id"] for m in d_after["members"])


def test_squad_tie_break():
    u1 = _auth_user("sq_tie_u1", "Tie Racer 1")
    u2 = _auth_user("sq_tie_u2", "Tie Racer 2")

    # User 1 creates Goal 10h and logs 5h (300 mins <= 1440 max)
    g1 = client.post("/api/focus/goals", json={"title": "Đua F1 Tie", "target_hours": 10.0}, headers=u1["headers"]).json()
    client.post("/api/focus/sessions", json={
        "goal_id": g1["id"],
        "duration_minutes": 300, # 5 hours
        "session_date": "2026-11-02",
        "topic_note": "5h lap",
        "source": "manual"
    }, headers=u1["headers"])

    # User 2 creates Goal 10h and logs 5h
    g2 = client.post("/api/focus/goals", json={"title": "Đua F1 Tie", "target_hours": 10.0}, headers=u2["headers"]).json()
    client.post("/api/focus/sessions", json={
        "goal_id": g2["id"],
        "duration_minutes": 300, # 5 hours
        "session_date": "2026-11-02",
        "topic_note": "5h lap",
        "source": "manual"
    }, headers=u2["headers"])

    # u1 creates squad
    s_res = client.post("/api/squads", json={
        "name": "F1 Tie-Break Arena",
        "target_title": "Đua F1 Tie",
        "target_hours": 10.0,
        "goal_id": g1["id"],
    }, headers=u1["headers"]).json()
    s_id = s_res["id"]
    inv = s_res["invite_code"]

    # u2 joins
    client.post("/api/squads/join", json={"invite_code": inv, "goal_id": g2["id"]}, headers=u2["headers"])

    # Check detail: both at 50% (5.0h)
    detail = client.get(f"/api/squads/{s_id}", headers=u1["headers"]).json()
    mems = detail["members"]
    assert len(mems) == 2
    assert mems[0]["progress_percent"] == 50.0
    assert mems[1]["progress_percent"] == 50.0

    # Deterministic order: both have same progress & hours & streak,
    # tie-breaker places earlier user first stably
    first_id = mems[0]["user_id"]
    second_id = mems[1]["user_id"]
    assert first_id != second_id

    # Now u2 logs 12 more minutes -> u2 has 5.2h -> u2 immediately takes position #1!
    client.post("/api/focus/sessions", json={
        "goal_id": g2["id"],
        "duration_minutes": 12,
        "session_date": "2026-11-02",
        "topic_note": "Overtake",
        "source": "manual"
    }, headers=u2["headers"])

    detail2 = client.get(f"/api/squads/{s_id}", headers=u1["headers"]).json()
    assert detail2["members"][0]["user_id"] == u2["id"]
    assert detail2["members"][0]["current_hours"] > detail2["members"][1]["current_hours"]


def test_squad_chat_permission():
    u_lead = _auth_user("sq_perm_lead", "Chat Leader")
    u_stranger = _auth_user("sq_perm_stranger", "Chat Stranger")

    s_res = client.post("/api/squads", json={
        "name": "Nhóm Bảo Mật Chat",
        "target_title": "Bảo Mật",
        "target_hours": 50.0,
    }, headers=u_lead["headers"]).json()
    s_id = s_res["id"]

    # Stranger cannot view messages
    res_get = client.get(f"/api/squads/{s_id}/messages", headers=u_stranger["headers"])
    assert res_get.status_code == 403

    # Stranger cannot send message
    res_send = client.post(f"/api/squads/{s_id}/messages", json={"content": "Tin nhắn lén"}, headers=u_stranger["headers"])
    assert res_send.status_code == 403

    # Empty content is rejected with 400
    res_empty = client.post(f"/api/squads/{s_id}/messages", json={"content": "   "}, headers=u_lead["headers"])
    assert res_empty.status_code == 400


def test_squad_race_concurrent_finish():
    u1 = _auth_user("sq_race_u1", "Racer Alpha")
    u2 = _auth_user("sq_race_u2", "Racer Beta")

    g1 = client.post("/api/focus/goals", json={"title": "10h Sprint", "target_hours": 10.0}, headers=u1["headers"]).json()
    g2 = client.post("/api/focus/goals", json={"title": "10h Sprint", "target_hours": 10.0}, headers=u2["headers"]).json()

    s = client.post("/api/squads", json={
        "name": "Sprint Finish Arena",
        "target_title": "10h Sprint",
        "target_hours": 10.0,
        "goal_id": g1["id"],
    }, headers=u1["headers"]).json()
    s_id = s["id"]
    inv = s["invite_code"]

    client.post("/api/squads/join", json={"invite_code": inv, "goal_id": g2["id"]}, headers=u2["headers"])

    # Both finish 10 hours (600 mins) to reach 100% lap completion
    client.post("/api/focus/sessions", json={"goal_id": g1["id"], "duration_minutes": 600, "session_date": "2026-11-02", "source": "manual"}, headers=u1["headers"])
    client.post("/api/focus/sessions", json={"goal_id": g2["id"], "duration_minutes": 600, "session_date": "2026-11-02", "source": "manual"}, headers=u2["headers"])

    # Verify both reach 100% and response renders cleanly with no division by zero or ordering anomalies
    detail = client.get(f"/api/squads/{s_id}", headers=u1["headers"]).json()
    assert detail["members_count"] == 2
    for m in detail["members"]:
        assert m["progress_percent"] == 100.0
        assert m["current_hours"] >= 10.0

