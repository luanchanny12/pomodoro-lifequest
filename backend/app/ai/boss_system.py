from sqlalchemy.orm import Session
from datetime import datetime
from app.models import Player, Sprint, Task
from app.models_v2 import BossFight


BOSS_TEMPLATES = {
    "ielts": [
        {"name": "IELTS Mock Test", "desc": "Hoàn thành bài thi thử IELTS đầy đủ",
         "type": "mock_test", "diff": 4, "exp": 800, "coin": 80},
        {"name": "Writing Challenge", "desc": "Viết 2 Task đạt 6.0+",
         "type": "writing", "diff": 3, "exp": 500, "coin": 50},
    ],
    "devops": [
        {"name": "Mini Project", "desc": "Deploy ứng dụng lên AWS với Docker",
         "type": "project", "diff": 5, "exp": 1200, "coin": 120},
        {"name": "CI/CD Pipeline", "desc": "Xây dựng pipeline CI/CD hoàn chỉnh",
         "type": "pipeline", "diff": 4, "exp": 1000, "coin": 100},
    ],
    "gpa": [
        {"name": "Final Quiz", "desc": "Đạt 8/10 câu đúng trong bài quiz tổng hợp",
         "type": "quiz", "diff": 3, "exp": 600, "coin": 60},
        {"name": "Presentation", "desc": "Thuyết trình đồ án cuối kỳ",
         "type": "presentation", "diff": 4, "exp": 900, "coin": 90},
    ],
}


def spawn_boss_for_sprint(db: Session, sprint_id: int) -> BossFight:
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        return None

    templates = BOSS_TEMPLATES.get(sprint.goal_type, [])
    if not templates:
        return None

    template = templates[sprint_id % len(templates)]
    boss = BossFight(
        sprint_id=sprint_id,
        name=template["name"],
        description=template["desc"],
        goal_type=sprint.goal_type,
        boss_type=template["type"],
        difficulty=template["diff"],
        exp_reward=template["exp"],
        coin_reward=template["coin"]
    )
    db.add(boss)
    db.commit()
    db.refresh(boss)
    return boss


def defeat_boss(db: Session, boss_id: int, score: int = 0) -> dict:
    boss = db.query(BossFight).filter(BossFight.id == boss_id).first()
    if not boss:
        return {"error": "Boss không tồn tại"}

    boss.is_defeated = True
    boss.defeated_at = datetime.utcnow()
    boss.score = score

    player = db.query(Player).first()
    if player:
        player.exp += boss.exp_reward
        player.coins += boss.coin_reward

    db.commit()

    return {
        "defeated": True,
        "exp_reward": boss.exp_reward,
        "coin_reward": boss.coin_reward,
        "score": score
    }


def get_sprint_boss(db: Session, sprint_id: int) -> BossFight:
    return db.query(BossFight).filter(BossFight.sprint_id == sprint_id).first()


def get_all_bosses(db: Session) -> list:
    return db.query(BossFight).order_by(BossFight.created_at.desc()).all()
