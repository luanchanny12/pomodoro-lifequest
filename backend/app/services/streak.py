import datetime
from typing import Optional, Tuple, Set
from sqlalchemy.orm import Session

from app.models import (
    DailyMatrixTask,
    StudySessionLog,
    DailyLog,
    Task,
    Player,
    Achievement,
)

# Timezone chuẩn Việt Nam (UTC+7 / GMT+7)
VN_TZ = datetime.timezone(datetime.timedelta(hours=7))


def vn_now() -> datetime.datetime:
    return datetime.datetime.now(VN_TZ)


def vn_today() -> datetime.date:
    return vn_now().date()


def calculate_real_user_streak(
    db: Session,
    user_id: int,
    target_date: Optional[datetime.date] = None,
) -> Tuple[int, Optional[datetime.date]]:
    """
    Tính toán chuỗi học tập (streak) thực tế dựa trên toàn bộ lịch sử hoạt động
    theo múi giờ Việt Nam (GMT+7).
    
    Các nguồn hoạt động được ghi nhận:
    1. Nhiệm vụ ma trận 4 ô (DailyMatrixTask) đã hoàn thành.
    2. Phiên học tập trung Pomodoro (StudySessionLog).
    3. Hoạt động lập kế hoạch / tạo nhiệm vụ mới trên web (DailyMatrixTask.created_at).
    4. Nhật ký hằng ngày (DailyLog) hoặc nhiệm vụ hoàn thành từ hệ thống cũ (Task).
    
    Cơ chế bảo vệ thông minh (Smart Grace / Late Night Buffer):
    - Cho phép tối đa 2 ngày phục hồi/khiên streak tự động (grace buffer) khi người dùng
      có khoảng cách 1 ngày đơn lẻ (ví dụ: học đêm muộn sau 00:00 hoặc chuyển giao rạng sáng).
    - Giúp người học không bị phạt oan uổng khi đã kiên trì nhiều ngày.
    """
    if target_date is None:
        target_date = vn_today()

    active_dates: Set[datetime.date] = set()

    # 1. DailyMatrixTask đã hoàn thành
    tasks = (
        db.query(DailyMatrixTask)
        .filter(
            DailyMatrixTask.user_id == user_id,
            DailyMatrixTask.is_completed == True,
        )
        .all()
    )
    for t in tasks:
        if t.date:
            active_dates.add(t.date)
        elif t.completed_at:
            active_dates.add(
                t.completed_at.replace(tzinfo=datetime.timezone.utc)
                .astimezone(VN_TZ)
                .date()
            )

    # 2. StudySessionLog (Pomodoro)
    sessions = (
        db.query(StudySessionLog)
        .filter(StudySessionLog.user_id == user_id)
        .all()
    )
    for s in sessions:
        if s.session_date:
            active_dates.add(s.session_date)
        elif s.created_at:
            active_dates.add(
                s.created_at.replace(tzinfo=datetime.timezone.utc)
                .astimezone(VN_TZ)
                .date()
            )

    # 3. Nhiệm vụ được tạo trên ma trận (người dùng mở web lên lập kế hoạch, soạn việc)
    all_created_tasks = (
        db.query(DailyMatrixTask)
        .filter(DailyMatrixTask.user_id == user_id)
        .all()
    )
    for t in all_created_tasks:
        if t.created_at:
            active_dates.add(
                t.created_at.replace(tzinfo=datetime.timezone.utc)
                .astimezone(VN_TZ)
                .date()
            )

    # 4. DailyLog & Legacy Task (hệ thống nhật ký)
    try:
        daily_logs = db.query(DailyLog).all()
        for dl in daily_logs:
            if dl.date:
                active_dates.add(dl.date)
    except Exception:
        pass

    try:
        legacy_tasks = db.query(Task).filter(Task.status == "hoàn thành").all()
        for lt in legacy_tasks:
            if lt.date:
                active_dates.add(lt.date)
    except Exception:
        pass

    if not active_dates:
        return 0, None

    # Tính chuỗi streak liên tục lùi từ target_date
    curr = target_date

    # Nếu hôm nay chưa có hoạt động, kiểm tra xem hôm qua có hoạt động không
    if curr not in active_dates:
        yesterday = curr - datetime.timedelta(days=1)
        if yesterday in active_dates:
            curr = yesterday
        else:
            # Nếu cách > 1 ngày: kiểm tra xem có thể dùng grace shield không
            day_before = curr - datetime.timedelta(days=2)
            if day_before in active_dates:
                curr = day_before
            else:
                return 0, max(active_dates)

    last_active = curr
    streak = 0
    grace_used = 0
    max_grace = 2  # Cho phép tối đa 2 lần cứu streak (smart grace buffer)

    while True:
        if curr in active_dates:
            streak += 1
            curr -= datetime.timedelta(days=1)
        else:
            # Kiểm tra xem có thể dùng 1 ngày grace không (nếu ngày trước đó nữa có hoạt động)
            prev_day = curr - datetime.timedelta(days=1)
            if prev_day in active_dates and grace_used < max_grace:
                grace_used += 1
                streak += 1  # Kéo dài bảo toàn chuỗi
                curr = prev_day
            else:
                break

    return streak, last_active


def update_user_streak(
    db: Session,
    user_id: int,
    activity_date: Optional[datetime.date] = None,
) -> Optional[Player]:
    """
    Cập nhật và bảo vệ chuỗi ngày học liên tục (Streak) của người dùng:
    - Đồng bộ theo múi giờ Việt Nam (GMT+7).
    - Tính toán streak thực tế và áp dụng khiên bảo vệ (Smart Grace) nếu người dùng học muộn qua đêm.
    - Không làm mất chuỗi oan uổng nếu người dùng từng có chuỗi dài và có hoạt động chuyển giao.
    - Thưởng +50 EXP mỗi ngày và +300 EXP kèm huy hiệu STREAK_7 khi đạt các mốc 7 ngày.
    """
    today = activity_date or vn_today()
    current_vn_date = vn_today()
    if today > current_vn_date:
        today = current_vn_date

    player = db.query(Player).filter(Player.user_id == user_id).first()
    if not player:
        player = Player(user_id=user_id, level=1, exp=0, coins=0, streak=0)
        db.add(player)
        db.flush()

    # Tính toán streak thực tế dựa trên toàn bộ lịch sử hoạt động và khiên bảo vệ
    real_streak, _ = calculate_real_user_streak(db, user_id, today)

    if player.last_streak_date:
        if player.last_streak_date == today:
            # Đảm bảo nếu streak trong DB bị lệch thấp hơn thực tế (do bug trước đó) thì tự động hồi phục
            if real_streak > (player.streak or 0):
                player.streak = real_streak
            return player
        elif player.last_streak_date > today:
            return player
        elif player.last_streak_date == today - datetime.timedelta(days=1):
            player.streak = max((player.streak or 0) + 1, real_streak)
        else:
            # Nếu cách hơn 1 ngày: kiểm tra xem có cứu được bằng grace/real_streak không
            if real_streak > 1:
                player.streak = max(player.streak or 0, real_streak)
            else:
                player.streak = max(1, real_streak)
    else:
        player.streak = max(1, real_streak)

    player.last_streak_date = today

    # EXP Rewards: +50 EXP cho ngày học kiên trì
    player.exp = (player.exp or 0) + 50
    player.level = max(1, (player.exp // 200) + 1)

    # Mốc thưởng 7 ngày liên tục
    if player.streak > 0 and player.streak % 7 == 0:
        player.exp += 300
        player.level = max(1, (player.exp // 200) + 1)
        ach = (
            db.query(Achievement)
            .filter(Achievement.player_id == player.id, Achievement.code == "STREAK_7")
            .first()
        )
        if not ach:
            new_ach = Achievement(
                player_id=player.id,
                code="STREAK_7",
                name="Kiên Trì",
                description="Duy trì chuỗi học tập 7 ngày liên tiếp",
                icon="🔥",
            )
            db.add(new_ach)

    db.flush()
    return player
