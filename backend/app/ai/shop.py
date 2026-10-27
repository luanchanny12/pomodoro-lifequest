from sqlalchemy.orm import Session
from app.models import Player
from app.models_v2 import ShopItem, Purchase


def seed_shop(db: Session):
    if db.query(ShopItem).first():
        return

    items = [
        ShopItem(name="Theme: Thiên Hà", description="Giao diện tối với hiệu ứng sao",
                 item_type="theme", price=200, rarity="rare", icon="stars"),
        ShopItem(name="Theme: Rừng Xanh", description="Giao diện xanh lá cây",
                 item_type="theme", price=100, rarity="common", icon="leaf"),
        ShopItem(name="Avatar: Hiệp Sĩ", description="Mở khóa skin Hiệp Sĩ cho avatar",
                 item_type="avatar", price=500, rarity="epic", icon="shield"),
        ShopItem(name="Avatar: Phù Thủy", description="Mở khóa skin Phù Thủy",
                 item_type="avatar", price=500, rarity="epic", icon="wand"),
        ShopItem(name="Achievement: Chiến Binh", description="Huy hiệu Chiến Binh đặc biệt",
                 item_type="achievement", price=300, rarity="rare", icon="zap"),
        ShopItem(name="Animation: Super Saiyan", description="Hiệu ứng vàng khi lên level",
                 item_type="animation", price=1000, rarity="legendary", icon="flame"),
        ShopItem(name="Animation: Băng Giá", description="Hiệu ứng băng khi đạt streak",
                 item_type="animation", price=800, rarity="epic", icon="snowflake"),
        ShopItem(name="Aura: Lửa", description="Hào quang lửa cho avatar",
                 item_type="aura", price=600, rarity="epic", icon="fire"),
        ShopItem(name="Aura: Băng", description="Hào quang băng cho avatar",
                 item_type="aura", price=600, rarity="epic", icon="ice"),
        ShopItem(name="Điểm EXP x2 (1 ngày)", description="Nhân đôi EXP trong 24h",
                 item_type="boost", price=200, rarity="rare", icon="bolt",
                 effect_json='{"type":"exp_boost","multiplier":2,"duration_hours":24}'),
    ]
    db.add_all(items)
    db.commit()


def get_shop_items(db: Session, item_type: str = None) -> list:
    query = db.query(ShopItem).filter(ShopItem.is_active == True)
    if item_type:
        query = query.filter(ShopItem.item_type == item_type)
    items = query.all()
    return [{
        "id": i.id, "name": i.name, "description": i.description,
        "item_type": i.item_type, "price": i.price, "rarity": i.rarity,
        "icon": i.icon, "is_limited": i.is_limited
    } for i in items]


def purchase_item(db: Session, player_id: int, item_id: int) -> dict:
    player = db.query(Player).filter(Player.id == player_id).first()
    item = db.query(ShopItem).filter(ShopItem.id == item_id, ShopItem.is_active == True).first()

    if not player:
        return {"success": False, "error": "Người chơi không tồn tại"}
    if not item:
        return {"success": False, "error": "Vật phẩm không tồn tại"}

    already = db.query(Purchase).filter(
        Purchase.player_id == player_id,
        Purchase.item_id == item_id
    ).first()
    if already:
        return {"success": False, "error": "Đã sở hữu vật phẩm này"}

    if player.coins < item.price:
        return {"success": False, "error": f"Không đủ coins (cần {item.price}, có {player.coins})"}

    player.coins -= item.price
    purchase = Purchase(player_id=player_id, item_id=item_id, price_paid=item.price)
    db.add(purchase)
    db.commit()

    return {
        "success": True,
        "item_name": item.name,
        "coins_spent": item.price,
        "coins_remaining": player.coins
    }


def get_inventory(db: Session, player_id: int) -> list:
    purchases = db.query(Purchase).filter(Purchase.player_id == player_id).all()
    result = []
    for p in purchases:
        item = db.query(ShopItem).filter(ShopItem.id == p.item_id).first()
        if item:
            result.append({
                "purchase_id": p.id,
                "item_id": item.id,
                "name": item.name,
                "item_type": item.item_type,
                "icon": item.icon,
                "is_equipped": p.is_equipped,
                "rarity": item.rarity
            })
    return result


def equip_item(db: Session, player_id: int, purchase_id: int) -> dict:
    purchase = db.query(Purchase).filter(
        Purchase.id == purchase_id, Purchase.player_id == player_id
    ).first()
    if not purchase:
        return {"success": False, "error": "Không tìm thấy vật phẩm"}
    purchase.is_equipped = not purchase.is_equipped
    db.commit()
    return {"success": True, "is_equipped": purchase.is_equipped}
