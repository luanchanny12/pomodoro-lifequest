"""
AI Planner - Tự động lên kế hoạch học tập mỗi ngày
"""
from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
from app.models import Task, DailyLog, Goal, Player, RoadmapLesson, CurrentPosition, StudyHour
from app.ai.ai_brain import get_next_lesson, get_current_position
from app.ai.energy_manager import get_remaining_energy, get_energy_for_task, get_max_energy


def generate_daily_plan(db: Session, user_id: int = 1, query_date: date = None,
                        energy_level: int = 5, sleep_hours: float = 7, mood: int = 5) -> dict:
    """Tạo kế hoạch học tập trong ngày"""
    if query_date is None:
        query_date = date.today()

    # Check if user has any goals
    goals_exist = db.query(Goal).count()
    if not goals_exist:
        return {
            "summary": "Bạn chưa có mục tiêu học tập nào. Hãy trò chuyện với AI để thiết lập kế hoạch 14 ngày!",
            "reason": "Vào mục Chat với AI hoặc nhắn: 'Tôi muốn học X trong Y ngày' để bắt đầu",
            "priority": [],
            "blocks": [],
            "energy": 0,
            "predicted_completion": ""
        }

    # Get user's actual goal types from DB
    goal_types = [g.type for g in db.query(Goal.type).distinct().all()]
    if not goal_types:
        return {
            "summary": "Chưa có mục tiêu hợp lệ. Hãy thiết lập mục tiêu học tập trước!",
            "reason": "Chat với AI để tạo lộ trình học phù hợp với bạn",
            "priority": [],
            "blocks": [],
            "energy": 0,
            "predicted_completion": ""
        }

    priority = get_priority_order(db, goal_types)
    max_energy = get_max_energy(sleep_hours)
    remaining_energy = max_energy

    blocks = []
    start_hour = 9
    weekday = query_date.weekday()

    for goal_type in priority:
        if remaining_energy <= 0:
            break

        next_info = get_next_lesson(db, goal_type)
        has_roadmap_lesson = bool(next_info.get("lesson_name")) and "Chưa có" not in next_info.get("message", "")

        if not has_roadmap_lesson:
            # Generate dynamic suggestion based on goal & deadline
            goal = db.query(Goal).filter(Goal.type == goal_type).first()
            if goal and goal.deadline:
                days_left = (goal.deadline - query_date).days
                if days_left < 7:
                    lesson_name = f"Ôn gấp: {goal_type.upper()} - sắp đến hạn!"
                    description = f"Còn {days_left} ngày đến hạn, tập trung ôn luyện để đạt mục tiêu"
                elif days_left < 30:
                    lesson_name = f"{goal_type.upper()} - Tăng tốc ôn luyện"
                    description = f"Luyện tập {goal_type.upper()} theo lộ trình, còn {days_left} ngày"
                else:
                    lesson_name = f"Luyện tập {goal_type.upper()}"
                    description = f"Học và thực hành {goal_type.upper()} theo kế hoạch"
            else:
                lesson_name = f"Luyện tập {goal_type.upper()}"
                description = f"Dành thời gian học {goal_type.upper()} hôm nay"

            cost = get_energy_for_task(goal_type)
            difficulty = 3
        else:
            lesson_name = next_info.get("lesson_name", goal_type)
            cost = next_info.get("energy_cost", get_energy_for_task(goal_type))
            difficulty = next_info.get("difficulty", 3)
            description = next_info.get("description", "")
            if not description:
                description = f"Luyện tập {goal_type.upper()}"

        exp_reward = max(10, 30 - difficulty * 3)
        if cost > remaining_energy:
            cost = max(10, remaining_energy)

        end_hour = start_hour + 1
        blocks.append({
            "start_time": f"{start_hour:02d}:00",
            "end_time": f"{end_hour:02d}:00",
            "goal_type": goal_type,
            "title": lesson_name,
            "description": description,
            "difficulty": difficulty,
            "energy_cost": cost,
            "exp_reward": exp_reward
        })
        remaining_energy -= cost
        start_hour += 2

    pred = _predict_completion(db, goal_types[0]) if goal_types else {"predicted_date": ""}

    total_blocks = len(blocks)
    if total_blocks == 0:
        return {
            "summary": "Hôm nay không có việc cần làm. Hãy thư giãn hoặc cập nhật mục tiêu mới!",
            "reason": "",
            "priority": goal_types,
            "blocks": [],
            "energy": remaining_energy,
            "predicted_completion": ""
        }

    summary_parts = [f"Hôm nay có {total_blocks} việc cần làm."]
    if remaining_energy < max_energy * 0.3:
        summary_parts.append("Năng lượng thấp, hãy ưu tiên việc quan trọng nhất")
    elif sleep_hours < 6:
        summary_parts.append("Ngủ ít, nên chọn bài nhẹ để giữ sức")

    reasons = []
    for g in priority:
        goal = db.query(Goal).filter(Goal.type == g).first()
        if goal and goal.deadline:
            days_left = (goal.deadline - query_date).days
            if days_left > 0:
                if days_left < 7:
                    reasons.append(f"{g.upper()} cực kỳ gấp! Còn {days_left} ngày đến hạn")
                elif days_left < 30:
                    reasons.append(f"{g.upper()} còn {days_left} ngày đến hạn, cần duy trì đều")
                else:
                    reasons.append(f"{g.upper()} còn {days_left} ngày, có thể học theo lộ trình")

    if energy_level < 4:
        reasons.append("Bạn có vẻ thấp năng lượng hôm nay, hãy nghỉ ngơi hợp lý")

    return {
        "summary": " ".join(summary_parts),
        "reason": ". ".join(reasons) if reasons else "Kế hoạch dựa trên mục tiêu hiện tại",
        "priority": goal_types,
        "blocks": blocks,
        "energy": remaining_energy,
        "predicted_completion": pred.get("predicted_date", "")
    }


def adjust_plan_for_energy(db: Session, plan: dict, energy_level: int, sleep_hours: float) -> dict:
    """Điều chỉnh kế hoạch dựa trên năng lượng"""
    max_energy = get_max_energy(sleep_hours)
    adjusted_energy = int(max_energy * (energy_level / 10))

    if adjusted_energy < 30:
        plan["blocks"] = plan["blocks"][:1]
        plan["summary"] = "Hôm nay năng lượng thấp, chỉ làm việc quan trọng nhất"
    elif adjusted_energy < 60:
        plan["blocks"] = plan["blocks"][:2]
        plan["summary"] = "Năng lượng trung bình, tập trung 2 việc chính"

    plan["energy"] = adjusted_energy
    return plan


def get_priority_order(db: Session, goal_types: list) -> list:
    """Sắp xếp ưu tiên dựa trên deadline và tiến độ"""
    scored = []
    for g in goal_types:
        score = 0
        goal = db.query(Goal).filter(Goal.type == g).first()
        if goal:
            if goal.deadline:
                days_left = (goal.deadline - date.today()).days
                if days_left < 30:
                    score += 100
                elif days_left < 60:
                    score += 50
                else:
                    score += 20
            score += (100 - goal.progress_percent)
        scored.append((score, g))
    scored.sort(reverse=True)
    return [g for _, g in scored]


def _predict_completion(db: Session, goal_type: str) -> dict:
    """Dự đoán hoàn thành mục tiêu"""
    goal = db.query(Goal).filter(Goal.type == goal_type).first()
    if not goal or goal.target_value == 0:
        return {"predicted_date": "Không xác định"}

    recent_hours = db.query(StudyHour).filter(
        StudyHour.goal_type == goal_type,
        StudyHour.date >= date.today() - timedelta(days=7)
    ).all()
    if not recent_hours:
        return {"predicted_date": "Chưa có dữ liệu"}

    avg_hours = sum(h.hours for h in recent_hours) / len(recent_hours)
    if avg_hours <= 0:
        return {"predicted_date": "Chưa có dữ liệu"}

    remaining = goal.target_value - goal.current_value
    days_needed = int(remaining / avg_hours) if remaining > 0 else 0
    predicted = date.today() + timedelta(days=days_needed)
    return {"predicted_date": predicted.isoformat()}
