from sqlalchemy.orm import Session
from app.models_v2 import KnowledgeGraph


def add_prerequisite(db: Session, goal_type: str, module: str, lesson: str,
                     prereq_goal_type: str = None, prereq_module: str = None,
                     prereq_lesson: str = None, mandatory: bool = True):
    edge = KnowledgeGraph(
        goal_type=goal_type, module=module, lesson=lesson,
        prerequisite_goal_type=prereq_goal_type or goal_type,
        prerequisite_module=prereq_module,
        prerequisite_lesson=prereq_lesson,
        is_mandatory=mandatory
    )
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return edge


def get_prerequisites(db: Session, goal_type: str, module: str, lesson: str) -> list:
    return db.query(KnowledgeGraph).filter(
        KnowledgeGraph.goal_type == goal_type,
        KnowledgeGraph.module == module,
        KnowledgeGraph.lesson == lesson
    ).all()


def get_dependents(db: Session, goal_type: str, module: str, lesson: str) -> list:
    return db.query(KnowledgeGraph).filter(
        KnowledgeGraph.prerequisite_goal_type == goal_type,
        KnowledgeGraph.prerequisite_module == module,
        KnowledgeGraph.prerequisite_lesson == lesson
    ).all()


def can_unlock(db: Session, goal_type: str, module: str, lesson: str) -> dict:
    preqs = get_prerequisites(db, goal_type, module, lesson)
    if not preqs:
        return {"can_unlock": True, "missing": []}

    from sqlalchemy import text
    missing = []
    for p in preqs:
        if not p.prerequisite_lesson:
            continue
        result = db.execute(text("""
            SELECT is_completed FROM roadmap_lessons
            WHERE goal_type = :gt AND module_name = :mod AND lesson_name = :lsn
        """), {
            "gt": p.prerequisite_goal_type,
            "mod": p.prerequisite_module,
            "lsn": p.prerequisite_lesson
        }).fetchone()
        if not result or not result[0]:
            missing.append(f"{p.prerequisite_module} - {p.prerequisite_lesson}")

    return {"can_unlock": len(missing) == 0, "missing": missing}


def seed_knowledge_graph(db: Session):
    existing = db.query(KnowledgeGraph).first()
    if existing:
        return

    prereqs = [
        ("devops", "Linux", "Permissions", "devops", "Linux", "Basic Commands"),
        ("devops", "Linux", "Networking", "devops", "Linux", "Permissions"),
        ("devops", "Docker", "Images", "devops", "Linux", "Basic Commands"),
        ("devops", "Docker", "Containers", "devops", "Docker", "Images"),
        ("devops", "Docker Compose", "Services", "devops", "Docker", "Containers"),
        ("devops", "CI/CD", "Pipeline", "devops", "Docker", "Containers"),
        ("devops", "AWS", "EC2", "devops", "Linux", "Basic Commands"),
        ("devops", "Kubernetes", "Pods", "devops", "Docker", "Containers"),
        ("devops", "Kubernetes", "Pods", "devops", "Docker Compose", "Services"),
        ("devops", "Terraform", "Resources", "devops", "AWS", "EC2"),
        ("devops", "Monitoring", "Metrics", "devops", "Kubernetes", "Pods"),
        ("ielts", "Speaking Part 2", "Cue Card", "ielts", "Speaking Part 1", "Introduction"),
        ("ielts", "Speaking Part 3", "Discussion", "ielts", "Speaking Part 2", "Cue Card"),
        ("ielts", "Writing Task 2", "Essay", "ielts", "Writing Task 1", "Report"),
        ("gpa", "Giải tích", "Đạo hàm", "gpa", "Đại số", "Hàm số"),
        ("gpa", "Xác suất", "Biến cố", "gpa", "Giải tích", "Tích phân"),
    ]
    for args in prereqs:
        db.add(KnowledgeGraph(
            goal_type=args[0], module=args[1], lesson=args[2],
            prerequisite_goal_type=args[3], prerequisite_module=args[4],
            prerequisite_lesson=args[5], is_mandatory=True
        ))
    db.commit()
