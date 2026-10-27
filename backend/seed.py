from app.database import SessionLocal, engine, Base
from app.models import (
    Player, Level, Goal, RoadmapItem, Achievement, Task,
    RoadmapLesson, CurrentPosition, BrainMemory, SmartNotification, UserStatistic
)
from datetime import date, timedelta, datetime

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    if not db.query(Level).first():
        levels = [
            Level(level=1, exp_required=0, title="Tân Thủ"),
            Level(level=2, exp_required=100, title="Người Học"),
            Level(level=3, exp_required=300, title="Học Viên"),
            Level(level=4, exp_required=600, title="Người Cố Gắng"),
            Level(level=5, exp_required=1000, title="Người Kiên Trì"),
            Level(level=6, exp_required=1500, title="Chiến Binh"),
            Level(level=7, exp_required=2100, title="Hiệp Sĩ"),
            Level(level=8, exp_required=2800, title="Nhà Vô Địch"),
            Level(level=9, exp_required=3600, title="Bậc Thầy"),
            Level(level=10, exp_required=4500, title="Huyền Thoại"),
        ]
        db.add_all(levels)
        print("Đã tạo cấp độ")

    if not db.query(Player).first():
        db.add(Player(level=1, exp=0, coins=0, streak=0))
        print("Đã tạo người chơi")

    if not db.query(Goal).first():
        goals = [
            Goal(name="Đạt GPA 3.0", type="gpa", target_value=3.0, current_value=2.5, deadline=date(2026, 12, 31), priority="cao"),
            Goal(name="IELTS 6.5", type="ielts", target_value=6.5, current_value=4.5, deadline=date(2026, 9, 30), priority="cao"),
            Goal(name="DevOps 100%", type="devops", target_value=100, current_value=25, deadline=date(2026, 12, 31), priority="trung bình"),
        ]
        db.add_all(goals)
        print("Đã tạo mục tiêu mẫu")

    if not db.query(RoadmapItem).first():
        items = [
            RoadmapItem(goal_type="gpa", title="Ôn tập kiến thức cơ bản", description="Xem lại các môn đại cương", order_index=1, icon="📖"),
            RoadmapItem(goal_type="gpa", title="Luyện đề thi", description="Làm đề thi các môn chuyên ngành", order_index=2, icon="📝"),
            RoadmapItem(goal_type="gpa", title="Tham gia nhóm học tập", description="Học nhóm cùng bạn bè", order_index=3, icon="👥"),
            RoadmapItem(goal_type="ielts", title="Học từ vựng", description="Học 20 từ mới mỗi ngày", order_index=1, icon="📚"),
            RoadmapItem(goal_type="ielts", title="Luyện nghe", description="Nghe podcast tiếng Anh 30 phút/ngày", order_index=2, icon="🎧"),
            RoadmapItem(goal_type="ielts", title="Luyện nói", description="Nói chuyện với bạn bè bằng tiếng Anh", order_index=3, icon="🗣️"),
            RoadmapItem(goal_type="ielts", title="Luyện viết", description="Viết essay mỗi tuần", order_index=4, icon="✍️"),
            RoadmapItem(goal_type="devops", title="Học Linux", description="Làm quen với command line", order_index=1, icon="🐧"),
            RoadmapItem(goal_type="devops", title="Học Docker", description="Containerization cơ bản", order_index=2, icon="🐳"),
            RoadmapItem(goal_type="devops", title="Học CI/CD", description="Jenkins/GitHub Actions", order_index=3, icon="🔄"),
        ]
        db.add_all(items)
        print("Đã tạo lộ trình mẫu")

    if not db.query(Achievement).first():
        player = db.query(Player).first()
        if player:
            achievements = [
                Achievement(player_id=player.id, code="FIRST_TASK", name="Người Bắt Đầu", description="Hoàn thành nhiệm vụ đầu tiên", icon="🎯"),
                Achievement(player_id=player.id, code="STREAK_7", name="Kiên Trì", description="Duy trì chuỗi 7 ngày", icon="🔥"),
                Achievement(player_id=player.id, code="LEVEL_5", name="Học Viên", description="Đạt cấp độ 5", icon="⭐"),
                Achievement(player_id=player.id, code="LEVEL_10", name="Cao Thủ", description="Đạt cấp độ 10", icon="👑"),
                Achievement(player_id=player.id, code="STUDY_50", name="Miệt Mài", description="Học 50 giờ", icon="📚"),
                Achievement(player_id=player.id, code="SPRINT_MASTER", name="Chạy Nước Rút", description="Hoàn thành 1 sprint", icon="💨"),
                Achievement(player_id=player.id, code="DAILY_30", name="Kỷ Luật", description="Ghi nhật ký 30 ngày", icon="📅"),
            ]
            db.add_all(achievements)
            print("Đã tạo thành tựu mẫu")

    if not db.query(Task).first():
        today = date.today()
        tasks = [
            Task(title="Học từ vựng IELTS", description="Học 20 từ mới", goal_type="ielts", date=today, start_time="08:00", end_time="09:00", status="chưa làm", priority="cao", exp_reward=30),
            Task(title="Luyện nghe tiếng Anh", description="Nghe 1 bài TED Talk", goal_type="ielts", date=today, start_time="09:30", end_time="10:30", status="chưa làm", priority="cao", exp_reward=25),
            Task(title="Ôn tập môn Toán", description="Chương 1 - Giải tích", goal_type="gpa", date=today, start_time="14:00", end_time="16:00", status="chưa làm", priority="trung bình", exp_reward=20),
            Task(title="Học Docker cơ bản", description="Làm tutorial Docker", goal_type="devops", date=today, start_time="20:00", end_time="21:30", status="chưa làm", priority="thấp", exp_reward=15),
        ]
        db.add_all(tasks)
        print("Đã tạo nhiệm vụ mẫu")

    if not db.query(RoadmapLesson).first():
        ielts_lessons = [
            RoadmapLesson(goal_type="ielts", module_name="IPA", lesson_name="/i:/ /ɪ/ /e/ /æ/", order_index=1, description="Nguyên âm ngắn và dài", difficulty=2, energy_cost=10, exp_reward=10, estimated_minutes=30),
            RoadmapLesson(goal_type="ielts", module_name="IPA", lesson_name="/ʌ/ /ɑː/ /ɒ/ /ɔː/", order_index=2, description="Nguyên âm trung tâm và sau", difficulty=2, energy_cost=10, exp_reward=10, estimated_minutes=30),
            RoadmapLesson(goal_type="ielts", module_name="IPA", lesson_name="/p/ /b/ /t/ /d/", order_index=3, description="Phụ âm bật hơi", difficulty=3, energy_cost=10, exp_reward=15, estimated_minutes=30),
            RoadmapLesson(goal_type="ielts", module_name="Vocabulary", lesson_name="Từ 1-25", order_index=4, description="Kinh tế - xã hội", difficulty=3, energy_cost=15, exp_reward=15, estimated_minutes=45),
            RoadmapLesson(goal_type="ielts", module_name="Vocabulary", lesson_name="Từ 26-50", order_index=5, description="Giáo dục", difficulty=3, energy_cost=15, exp_reward=15, estimated_minutes=45),
            RoadmapLesson(goal_type="ielts", module_name="Listening", lesson_name="Test 1 Section 1", order_index=6, description="Conversation hàng ngày", difficulty=3, energy_cost=30, exp_reward=25, estimated_minutes=30),
            RoadmapLesson(goal_type="ielts", module_name="Listening", lesson_name="Test 1 Section 2", order_index=7, description="Hướng dẫn và giới thiệu", difficulty=4, energy_cost=30, exp_reward=30, estimated_minutes=30),
            RoadmapLesson(goal_type="ielts", module_name="Listening", lesson_name="Test 1 Section 3", order_index=8, description="Thảo luận học thuật", difficulty=4, energy_cost=30, exp_reward=30, estimated_minutes=30),
            RoadmapLesson(goal_type="ielts", module_name="Reading", lesson_name="Skimming & Scanning", order_index=9, description="Đọc lướt và đọc quét", difficulty=4, energy_cost=60, exp_reward=40, estimated_minutes=60),
            RoadmapLesson(goal_type="ielts", module_name="Writing", lesson_name="Task 1 - Biểu đồ", order_index=10, description="Mô tả biểu đồ đường và cột", difficulty=5, energy_cost=70, exp_reward=50, estimated_minutes=60),
        ]
        db.add_all(ielts_lessons)

        devops_lessons = [
            RoadmapLesson(goal_type="devops", module_name="Linux", lesson_name="File system & permissions", order_index=1, description="ls, cd, chmod, chown", difficulty=2, energy_cost=40, exp_reward=20, estimated_minutes=60),
            RoadmapLesson(goal_type="devops", module_name="Linux", lesson_name="User & process management", order_index=2, description="useradd, ps, kill, systemctl", difficulty=3, energy_cost=40, exp_reward=25, estimated_minutes=60),
            RoadmapLesson(goal_type="devops", module_name="Linux", lesson_name="Shell scripting", order_index=3, description="Bash scripting cơ bản", difficulty=4, energy_cost=50, exp_reward=30, estimated_minutes=90),
            RoadmapLesson(goal_type="devops", module_name="Docker", lesson_name="Images & Containers", order_index=4, description="docker run, build, push", difficulty=3, energy_cost=60, exp_reward=30, estimated_minutes=60),
            RoadmapLesson(goal_type="devops", module_name="Docker", lesson_name="Docker Compose", order_index=5, description="Multi-container apps", difficulty=4, energy_cost=60, exp_reward=35, estimated_minutes=60),
            RoadmapLesson(goal_type="devops", module_name="AWS", lesson_name="EC2 & S3", order_index=6, description="Cloud computing cơ bản", difficulty=4, energy_cost=90, exp_reward=40, estimated_minutes=90),
            RoadmapLesson(goal_type="devops", module_name="AWS", lesson_name="VPC & Networking", order_index=7, description="Virtual Private Cloud", difficulty=5, energy_cost=90, exp_reward=45, estimated_minutes=90),
            RoadmapLesson(goal_type="devops", module_name="Kubernetes", lesson_name="Pods & Deployments", order_index=8, description="K8s cơ bản", difficulty=5, energy_cost=120, exp_reward=50, estimated_minutes=120),
            RoadmapLesson(goal_type="devops", module_name="CI/CD", lesson_name="Jenkins Pipeline", order_index=9, description="Pipeline as Code", difficulty=4, energy_cost=70, exp_reward=40, estimated_minutes=90),
            RoadmapLesson(goal_type="devops", module_name="Monitoring", lesson_name="Prometheus & Grafana", order_index=10, description="Giám sát hệ thống", difficulty=5, energy_cost=100, exp_reward=50, estimated_minutes=90),
        ]
        db.add_all(devops_lessons)

        gpa_lessons = [
            RoadmapLesson(goal_type="gpa", module_name="Toán", lesson_name="Giải tích 1", order_index=1, description="Giới hạn, đạo hàm, tích phân", difficulty=3, energy_cost=50, exp_reward=20, estimated_minutes=90),
            RoadmapLesson(goal_type="gpa", module_name="Toán", lesson_name="Giải tích 2", order_index=2, description="Chuỗi, phương trình vi phân", difficulty=4, energy_cost=50, exp_reward=25, estimated_minutes=90),
            RoadmapLesson(goal_type="gpa", module_name="Toán", lesson_name="Đại số tuyến tính", order_index=3, description="Ma trận, không gian vector", difficulty=4, energy_cost=50, exp_reward=25, estimated_minutes=90),
            RoadmapLesson(goal_type="gpa", module_name="Lập trình", lesson_name="Cấu trúc dữ liệu", order_index=4, description="Mảng, danh sách, cây, đồ thị", difficulty=4, energy_cost=60, exp_reward=30, estimated_minutes=90),
            RoadmapLesson(goal_type="gpa", module_name="Lập trình", lesson_name="Giải thuật", order_index=5, description="Sort, search, dynamic programming", difficulty=5, energy_cost=70, exp_reward=35, estimated_minutes=120),
            RoadmapLesson(goal_type="gpa", module_name="Cơ sở dữ liệu", lesson_name="SQL cơ bản", order_index=6, description="SELECT, JOIN, GROUP BY", difficulty=3, energy_cost=40, exp_reward=20, estimated_minutes=60),
            RoadmapLesson(goal_type="gpa", module_name="Cơ sở dữ liệu", lesson_name="Normalization & Index", order_index=7, description="Thiết kế CSDL chuẩn hóa", difficulty=4, energy_cost=50, exp_reward=25, estimated_minutes=60),
            RoadmapLesson(goal_type="gpa", module_name="Mạng máy tính", lesson_name="OSI & TCP/IP", order_index=8, description="Các tầng mạng", difficulty=3, energy_cost=45, exp_reward=20, estimated_minutes=60),
            RoadmapLesson(goal_type="gpa", module_name="Mạng máy tính", lesson_name="Routing & Switching", order_index=9, description="Giao thức định tuyến", difficulty=4, energy_cost=55, exp_reward=30, estimated_minutes=90),
            RoadmapLesson(goal_type="gpa", module_name="Ôn thi", lesson_name="Đề tổng hợp 1", order_index=10, description="Ôn tập toàn bộ kiến thức", difficulty=5, energy_cost=80, exp_reward=50, estimated_minutes=120),
        ]
        db.add_all(gpa_lessons)
        print("Đã tạo RoadmapLesson")

    if not db.query(CurrentPosition).first():
        positions = [
            CurrentPosition(goal_type="ielts", current_module="IPA", current_lesson="/i:/ /ɪ/ /e/ /æ/", progress_percent=15, difficulty_level=2, mastery_score=30),
            CurrentPosition(goal_type="devops", current_module="Linux", current_lesson="File system & permissions", progress_percent=20, difficulty_level=2, mastery_score=25),
            CurrentPosition(goal_type="gpa", current_module="Toán", current_lesson="Giải tích 1", progress_percent=10, difficulty_level=3, mastery_score=20),
        ]
        db.add_all(positions)
        print("Đã tạo CurrentPosition")

    if not db.query(BrainMemory).first():
        memories = [
            BrainMemory(goal_type="ielts", module="IPA", lesson="/i:/ /ɪ/ /e/ /æ/", progress_percent=60, mastery_level=45, last_studied=datetime.utcnow()),
            BrainMemory(goal_type="ielts", module="Vocabulary", lesson="Từ 1-25", progress_percent=30, mastery_level=25, last_studied=datetime.utcnow()),
            BrainMemory(goal_type="devops", module="Linux", lesson="File system & permissions", progress_percent=50, mastery_level=40, last_studied=datetime.utcnow()),
            BrainMemory(goal_type="devops", module="Linux", lesson="User & process management", progress_percent=10, mastery_level=15, last_studied=datetime.utcnow()),
            BrainMemory(goal_type="gpa", module="Toán", lesson="Giải tích 1", progress_percent=35, mastery_level=30, last_studied=datetime.utcnow()),
        ]
        db.add_all(memories)
        print("Đã tạo BrainMemory")

    if not db.query(SmartNotification).first():
        notifs = [
            SmartNotification(title="Chào mừng đến với LIFE QUEST", message="Bắt đầu hành trình chinh phục mục tiêu của bạn!", notification_type="welcome", is_read=False),
            SmartNotification(title="Nhắc nhở học tập", message="Đã đến giờ học IELTS - IPA. Hãy dành 30 phút cho âm /i:/ và /ɪ/.", notification_type="study_reminder", is_read=False),
            SmartNotification(title="Thành tựu mới", message="Bạn đã duy trì chuỗi học tập 3 ngày! Tiếp tục phát huy nhé!", notification_type="achievement", is_read=False),
        ]
        db.add_all(notifs)
        print("Đã tạo SmartNotification")

    if not db.query(UserStatistic).first():
        today = date.today()
        stats = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            stats.append(UserStatistic(
                date=d, total_hours=round(2.5 + (i * 0.3) % 3, 1),
                tasks_completed=2 + (i % 3), exp_earned=30 + i * 10,
                life_score=round(40 + i * 3, 1), streak=min(7, i + 1)
            ))
        db.add_all(stats)
        print("Đã tạo UserStatistic")

    db.commit()
    print("Seed dữ liệu hoàn tất!")
finally:
    db.close()
