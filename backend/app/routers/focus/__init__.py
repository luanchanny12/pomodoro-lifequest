from fastapi import APIRouter

from app.routers.focus.common import (
    _get_real_user,
    _verify_resource_ownership,
    VN_TZ,
    vn_now,
    vn_today,
    _propagate_goal_hours,
    _reconcile_parent_goals,
    _update_user_streak,
    _format_goal_response,
    _format_session_response,
    DEFAULT_CELESTIALS,
)
from app.routers.focus.goals import (
    router as goals_router,
    get_goals,
    create_goal,
    update_goal,
    update_planet_build,
    delete_goal,
)
from app.routers.focus.sessions import (
    router as sessions_router,
    get_sessions,
    create_session,
    update_session,
    delete_session,
    get_focus_stats,
)
from app.routers.focus.rewards import (
    router as rewards_router,
    _calculate_pearls,
    _seed_default_rewards,
    get_rewards,
    create_reward,
    redeem_reward,
    get_redemption_history,
)
from app.routers.focus.galaxy import (
    router as galaxy_router,
    _extract_topic,
    get_topic_galaxy,
    DEFAULT_CONSTELLATIONS,
    _seed_constellations_if_empty,
    get_constellation_achievements,
    check_constellation_unlock,
)
from app.routers.focus.time_capsules import (
    router as time_capsules_router,
    get_time_warp_oracle,
    get_time_capsules,
    create_time_capsule,
    get_capsule_mood_balance,
    unlock_capsule_emergency,
    random_rescue_capsule,
    claim_breath_grant,
)
from app.routers.focus.matrix import (
    router as matrix_router,
    _auto_rollover_tasks,
    get_matrix_tasks,
    create_matrix_task,
    update_matrix_task,
    toggle_matrix_task,
    update_matrix_task_reflection,
    delete_matrix_task,
    rollover_matrix_tasks,
    get_monthly_matrix_summary,
)
from app.routers.focus.ai_buddy import (
    router as ai_buddy_router,
    get_ai_buddy_prompt,
)

# Backwards compatibility aliases
get_stats = get_focus_stats
get_galaxy = get_topic_galaxy
get_constellations = get_constellation_achievements
check_constellations = check_constellation_unlock
get_mood_balance = get_capsule_mood_balance
unlock_emergency_capsule = unlock_capsule_emergency
get_random_rescue_capsule = random_rescue_capsule
update_matrix_reflection = update_matrix_task_reflection
rollover_uncompleted_matrix_tasks = rollover_matrix_tasks

router = APIRouter(prefix="/api/focus", tags=["Pomodoro Focus & Goals"])
router.include_router(goals_router)
router.include_router(sessions_router)
router.include_router(rewards_router)
router.include_router(galaxy_router)
router.include_router(time_capsules_router)
router.include_router(matrix_router)
router.include_router(ai_buddy_router)

__all__ = [
    "router",
    "_get_real_user",
    "_verify_resource_ownership",
    "VN_TZ",
    "vn_now",
    "vn_today",
    "_propagate_goal_hours",
    "_reconcile_parent_goals",
    "_update_user_streak",
    "_format_goal_response",
    "_format_session_response",
    "DEFAULT_CELESTIALS",
    "get_goals",
    "create_goal",
    "update_goal",
    "update_planet_build",
    "delete_goal",
    "get_sessions",
    "create_session",
    "update_session",
    "delete_session",
    "get_focus_stats",
    "get_stats",
    "get_rewards",
    "create_reward",
    "redeem_reward",
    "get_redemption_history",
    "_calculate_pearls",
    "_seed_default_rewards",
    "get_topic_galaxy",
    "get_galaxy",
    "_extract_topic",
    "DEFAULT_CONSTELLATIONS",
    "_seed_constellations_if_empty",
    "get_constellation_achievements",
    "get_constellations",
    "check_constellation_unlock",
    "check_constellations",
    "get_time_warp_oracle",
    "get_time_capsules",
    "create_time_capsule",
    "get_capsule_mood_balance",
    "get_mood_balance",
    "unlock_capsule_emergency",
    "unlock_emergency_capsule",
    "random_rescue_capsule",
    "get_random_rescue_capsule",
    "claim_breath_grant",
    "_auto_rollover_tasks",
    "get_matrix_tasks",
    "create_matrix_task",
    "update_matrix_task",
    "toggle_matrix_task",
    "update_matrix_task_reflection",
    "update_matrix_reflection",
    "delete_matrix_task",
    "rollover_matrix_tasks",
    "rollover_uncompleted_matrix_tasks",
    "get_monthly_matrix_summary",
    "get_ai_buddy_prompt",
]
