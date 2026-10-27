from sqlalchemy.orm import Session
from app.models import Player
from app.models_v2 import AvatarState

EVOLUTION_STAGES = [
    {"stage": 0, "label": "Tân Thủ", "exp_needed": 0},
    {"stage": 1, "label": "Người Học", "exp_needed": 500},
    {"stage": 2, "label": "Nhà Thám Hiểm", "exp_needed": 1500},
    {"stage": 3, "label": "Chuyên Gia", "exp_needed": 3000},
    {"stage": 4, "label": "Bậc Thầy", "exp_needed": 5000},
    {"stage": 5, "label": "Huyền Thoại", "exp_needed": 10000},
]


def get_or_create_avatar(db: Session, player_id: int = 1) -> AvatarState:
    avatar = db.query(AvatarState).filter(AvatarState.player_id == player_id).first()
    if not avatar:
        avatar = AvatarState(player_id=player_id)
        db.add(avatar)
        db.commit()
        db.refresh(avatar)
    return avatar


def check_evolution(db: Session, player_id: int = 1) -> dict:
    player = db.query(Player).filter(Player.id == player_id).first()
    avatar = get_or_create_avatar(db, player_id)

    if not player:
        return {"evolved": False, "error": "Player not found"}

    current_stage = avatar.evolution_stage
    for i, stage in enumerate(EVOLUTION_STAGES):
        if player.exp >= stage["exp_needed"] and i > current_stage:
            avatar.evolution_stage = i
            avatar.evolution_label = stage["label"]
            next_exp = EVOLUTION_STAGES[i + 1]["exp_needed"] if i + 1 < len(EVOLUTION_STAGES) else player.exp * 2
            avatar.exp_to_next = next_exp
            avatar.current_expression = "happy"
            db.commit()
            return {
                "evolved": True,
                "new_stage": i,
                "new_label": stage["label"],
                "message": f"Avatar tiến hóa thành {stage['label']}!"
            }

    next_idx = min(current_stage + 1, len(EVOLUTION_STAGES) - 1)
    avatar.exp_to_next = EVOLUTION_STAGES[next_idx]["exp_needed"]
    db.commit()

    return {
        "evolved": False,
        "current_stage": current_stage,
        "current_label": avatar.evolution_label,
        "exp_needed": avatar.exp_to_next,
        "exp_current": player.exp
    }


def update_expression(db: Session, player_id: int, expression: str):
    avatar = get_or_create_avatar(db, player_id)
    valid = ["neutral", "happy", "sad", "tired", "excited", "determined"]
    if expression in valid:
        avatar.current_expression = expression
        db.commit()


def get_avatar_info(db: Session, player_id: int = 1) -> dict:
    avatar = get_or_create_avatar(db, player_id)
    player = db.query(Player).filter(Player.id == player_id).first()
    return {
        "evolution_stage": avatar.evolution_stage,
        "evolution_label": avatar.evolution_label,
        "exp_to_next": avatar.exp_to_next,
        "current_expression": avatar.current_expression,
        "accessory": avatar.accessory,
        "aura": avatar.aura,
        "theme": avatar.theme
    }
