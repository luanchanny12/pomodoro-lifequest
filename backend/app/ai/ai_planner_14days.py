import json
from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.models import Goal, Task
from app.models_schedule import StudySubject, StudySlot, WeeklyAvailability
from app.ai.gemini_bridge import call_gemini


PLAN_PROMPT = """Bạn là AI Coach LIFE QUEST. Người dùng muốn lên kế hoạch học 14 ngày.

Thông tin người dùng:
- Mục tiêu: {goal}
- Lịch rảnh 14 ngày tới: {availability}

Yêu cầu:
1. Dùng lịch rảnh bên trên để phân bổ nội dung học vào các ngày có thời gian rảnh
2. Mỗi ngày tổng duration_minutes phải <= available_hours * 60 của ngày đó
3. start_time phải >= preferred_start của ngày đó
4. Chỉ tạo tasks vào những ngày có available_hours > 0

Trả về JSON đúng cấu trúc, KHÔNG thêm text ngoài JSON:
{{
  "summary": "Tóm tắt kế hoạch 14 ngày",
  "goal_type": "loại mục tiêu (gpa/ielts/devops/...)",
  "goal_name": "Tên mục tiêu đầy đủ",
  "goal_target": "SỐ (VD: 7.0 hoặc 0 nếu không có, KHÔNG viết chữ)",
  "hours_per_day": số_giờ_trung_bình_mỗi_ngày,
  "daily_schedule": [
    {{
      "day": 1,
      "date": "dd/mm",
      "title": "Chủ đề ngày 1",
      "tasks": [
        {{
          "title": "Nhiệm vụ cụ thể",
          "description": "Mô tả chi tiết",
          "duration_minutes": 45,
          "start_time": "19:00",
          "end_time": "19:45"
        }}
      ]
    }}
  ]
}}"""


def generate_14day_plan_with_availability(
    db: Session,
    goal: str,
) -> dict:
    """Generate a 14-day plan using saved weekly_availability data."""
    today = date.today()
    end = today + timedelta(days=14)
    avail_rows = db.query(WeeklyAvailability).filter(
        WeeklyAvailability.date >= today,
        WeeklyAvailability.date < end,
        WeeklyAvailability.available_hours > 0
    ).order_by(WeeklyAvailability.date).all()

    if not avail_rows:
        # Fallback: try the old way
        return {"success": False, "error": "Chưa có lịch rảnh 14 ngày. Vui lòng điền lịch rảnh trước."}

    # Build availability text
    day_names = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
    avail_lines = []
    total_hours = 0
    for r in avail_rows:
        total_hours += r.available_hours
        label = day_names[r.date.weekday()] if r.date.weekday() < 7 else f"Ngày {r.date.day}/{r.date.month}"
        avail_lines.append(f"  - {label} ({r.date.strftime('%d/%m')}): {r.available_hours}h, bắt đầu lúc {r.preferred_start}")
    avail_text = "\n".join(avail_lines)

    prompt = PLAN_PROMPT.format(
        goal=goal,
        availability=avail_text,
    )
    schema = {
        "summary": "str",
        "goal_type": "str",
        "goal_name": "str",
        "goal_target": "str",
        "hours_per_day": "float",
        "daily_schedule": [
            {
                "day": "int",
                "date": "str",
                "title": "str",
                "tasks": [
                    {
                        "title": "str",
                        "description": "str",
                        "duration_minutes": "int",
                        "start_time": "str",
                        "end_time": "str",
                    }
                ],
            }
        ],
    }
    try:
        result = call_gemini(prompt, schema)
    except Exception as e:
        return {"success": False, "error": f"Gemini call failed: {str(e)}"}
    if result.get("error"):
        return {"success": False, "error": result.get("message", "Lỗi AI")}

    try:
        goal_type = result.get("goal_type", "chung")
        goal_name = result.get("goal_name", goal)
        goal_target = result.get("goal_target", "")

        existing = db.query(Goal).filter(Goal.type == goal_type).first()
        if not existing:
            try:
                target_val = float(goal_target) if goal_target else 0
            except (ValueError, TypeError):
                target_val = 0
            g = Goal(
                name=goal_name,
                type=goal_type,
                target_value=target_val,
                current_value=0,
                deadline=today + timedelta(days=14),
                priority="cao",
            )
            db.add(g)
            db.commit()

        tasks_created = 0
        slots_created = 0
        subject = None

        for day_data in result.get("daily_schedule", []):
            day_offset = day_data.get("day", 1) - 1
            task_date = today + timedelta(days=day_offset)
            for task_data in day_data.get("tasks", []):
                t = Task(
                    title=task_data.get("title", "Học tập"),
                    description=task_data.get("description", ""),
                    goal_type=goal_type,
                    date=task_date,
                    start_time=task_data.get("start_time", ""),
                    end_time=task_data.get("end_time", ""),
                    status="chưa làm",
                    exp_reward=max(5, task_data.get("duration_minutes", 30) // 5),
                )
                db.add(t)
                tasks_created += 1

                if subject is None:
                    existing_subject = db.query(StudySubject).filter(
                        StudySubject.name == goal_name
                    ).first()
                    if existing_subject:
                        subject = existing_subject
                    else:
                        subject = StudySubject(
                            name=goal_name,
                            total_weeks=2,
                            hours_per_week=total_hours / 2 if total_hours > 0 else 7,
                            color="#00E5FF",
                            is_active=True,
                        )
                        db.add(subject)
                        db.flush()

                dur = task_data.get("duration_minutes", 45)
                slot_start = task_data.get("start_time", "08:00")
                slot = StudySlot(
                    subject_id=subject.id,
                    date=task_date,
                    start_time=slot_start,
                    duration_min=dur,
                    is_done=False,
                )
                db.add(slot)
                slots_created += 1

        db.commit()
        return {
            "success": True,
            "summary": result.get("summary", ""),
            "goal_type": goal_type,
            "goal_name": goal_name,
            "tasks_created": tasks_created,
            "slots_created": slots_created,
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "error": f"Lỗi tạo kế hoạch: {str(e)}"}
