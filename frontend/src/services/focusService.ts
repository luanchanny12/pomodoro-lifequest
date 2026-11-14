import api from './api'
import {
  buildDeadlinesPayload,
  type DeadlineItem,
  type DeadlineSummary,
  type DeadlinesResponse,
} from '@/utils/deadlineUtils'

export type { DeadlineItem, DeadlineSummary, DeadlinesResponse }

export interface StudyGoal {
  id: number
  title: string
  celestial_name?: string | null
  goal_type?: 'hours' | 'deadline'
  target_hours: number
  current_hours: number
  target_date?: string | null
  parent_id?: number | null
  parent_title?: string | null
  planet_type?: string
  planet_data?: string | null
  sub_goals_count?: number
  days_left?: number | null
  hours_per_day_needed?: number | null
  color: string
  category: string
  is_completed: boolean
  completed_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  progress_percent: number
  remaining_hours: number
}

export interface StudySessionLog {
  id: number
  goal_id?: number | null
  goal_title?: string | null
  goal_color?: string | null
  duration_minutes: number
  duration_hours: number
  session_date: string
  topic_note?: string | null
  source: 'pomodoro' | 'manual'
  created_at: string
}

export interface DailyFocusStat {
  date: string
  hours: number
  minutes: number
}

export interface FocusStats {
  total_hours: number
  today_hours: number
  week_hours: number
  total_sessions: number
  pomodoro_sessions: number
  completed_goals: number
  active_goals: number
  last_7_days: DailyFocusStat[]
}

// Dopamine & Real-life Rewards
export interface RewardItem {
  id: number
  title: string
  pearl_cost: number
  icon: string
  category: string
  description?: string | null
  is_custom: boolean
  created_at: string
}

export interface RewardRedemption {
  id: number
  reward_id?: number | null
  reward_title: string
  reward_icon: string
  pearls_spent: number
  note?: string | null
  redeemed_at: string
}

export interface PearlsBalance {
  total_earned_pearls: number
  spent_pearls: number
  available_pearls: number
}

// Goal-Centric Planet
export interface TopicPlanet {
  goal_id: number
  name: string                 // Tên chiêm tinh (Polaris, Sirius, Vega...)
  real_title: string           // Tên mục tiêu thực tế ("1000h Tiếng Anh")
  is_completed: boolean        // Trạng thái hoàn thành (DONE)
  current_hours: number
  target_hours: number
  progress_percent: number
  session_count: number
  level: number                // 1 to 5
  color: string
  category?: string
  notes?: string | null
  last_studied?: string | null
  is_recent?: boolean
  goal_type?: 'hours' | 'deadline'
  target_date?: string | null
  parent_id?: number | null
  planet_type?: string
  planet_data?: string | null
  sub_goals_count?: number
}

export interface SunStats {
  name?: string
  total_hours?: number
  total_sessions?: number
  solar_power?: string
}

export interface ConstellationAchievement {
  id: number
  code: string
  title: string
  archetype: string
  icon: string
  required_completed_goals: number
  shape_pattern: string
  ai_interpretation: string
  narration_script: string
  associated_goal_titles?: string | null
  is_unlocked: boolean
  unlocked_at?: string | null
  progress_percent: number
}

export interface ConstellationCheckResult {
  newly_unlocked?: ConstellationAchievement | null
  total_unlocked: number
  total_constellations: number
}

export interface AIBreakdownTaskItem {
  title: string
  date: string
  quadrant?: number
  duration_minutes?: number
  notes?: string
}

export interface AIBreakdownProposal {
  title: string
  target_date: string
  explanation: string
  days_count: number
  tasks: AIBreakdownTaskItem[]
}

export interface AIBreakdownLogItem {
  id: number
  batch_id: string
  title: string
  target_date?: string | null
  explanation?: string | null
  task_count: number
  is_reverted: boolean
  created_at?: string | null
  reverted_at?: string | null
}

export interface TopicGalaxy {
  planets: TopicPlanet[]
  total_goals: number
  completed_goals: number
  sun_stats?: SunStats
  constellation_links?: [string, string][]
  active_archetype?: string | null
}

// Time Warp Oracle
export interface TimeWarpOracle {
  goal_id?: number | null
  goal_title?: string | null
  goal_type?: string
  target_hours: number
  current_hours: number
  remaining_hours: number
  average_daily_hours: number
  projected_finish_date?: string | null
  days_remaining?: number | null
  target_date?: string | null
  days_until_deadline?: number | null
  hours_per_day_needed?: number | null
  total_user_sessions: number
  hours_warped_recent: number
  scenarios?: {
    relaxed: { label: string; hours_per_day: number; days_needed: number; finish_date: string }
    current: { label: string; hours_per_day: number; days_needed: number; finish_date: string }
    speedup: { label: string; hours_per_day: number; days_needed: number; finish_date: string; saved_days: number }
  }
}

// Time Capsule
export interface TimeCapsule {
  id: number
  goal_id?: number | null
  milestone_hours: number
  unlock_date?: string | null
  unlock_days?: number | null
  unlock_type?: string
  mood_tag?: string | null
  title: string
  message_content: string
  is_unlocked: boolean
  unlocked_at?: string | null
  unlocked_by_key?: boolean
  created_at: string
}

// Daily Matrix (Eisenhower)
export interface DailyMatrixTask {
  id: number
  title: string
  description?: string | null
  date: string
  quadrant: 1 | 2 | 3 | 4
  goal_id?: number | null
  goal_title?: string | null
  goal_color?: string | null
  is_completed: boolean
  completed_at?: string | null
  reflection_note?: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export interface DailyMatrixTaskCreateInput {
  title: string
  description?: string
  date?: string
  quadrant?: number
  goal_id?: number | null
  reflection_note?: string
}

export interface ReflectionLogItem {
  task_id: number
  task_title: string
  date: string
  quadrant: number
  is_completed: boolean
  goal_title?: string | null
  reflection_note: string
}

export interface MonthlyMatrixSummary {
  year: number
  month: number
  total_tasks: number
  completed_tasks: number
  completion_rate: number
  q1_count: number
  q1_completed: number
  q2_count: number
  q2_completed: number
  q3_count: number
  q3_completed: number
  q4_count: number
  q4_completed: number
  q1_percent: number
  q2_percent: number
  q3_percent: number
  q4_percent: number
  total_big_goals_active: number
  total_big_goals_completed: number
  reflection_logs: ReflectionLogItem[]
}

export interface AIBuddyPrompt {
  message: string
  action_type: 'start_pomodoro' | 'open_matrix' | 'plan_tomorrow' | 'celebrate'
  action_label: string
  action_target?: string | null
  suggested_goal_id?: number | null
  mood: 'friendly' | 'urgent' | 'celebrating' | 'cozy'
}

const OFFLINE_SESSIONS_KEY = 'pending_pomodoro_sessions'
const GOALS_CACHE_KEY = 'lifequest_cached_goals'
const STATS_CACHE_KEY = 'lifequest_cached_stats'
const SESSIONS_CACHE_KEY = 'lifequest_cached_sessions'

export const getOfflinePendingSessions = (): Array<{
  goal_id?: number | null
  duration_minutes: number
  session_date?: string
  topic_note?: string
  source?: 'pomodoro' | 'manual'
  timestamp: number
}> => {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(OFFLINE_SESSIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const queueOfflineSession = (data: {
  goal_id?: number | null
  duration_minutes: number
  session_date?: string
  topic_note?: string
  source?: 'pomodoro' | 'manual'
}) => {
  try {
    if (typeof localStorage === 'undefined') return
    const current = getOfflinePendingSessions()
    current.push({ ...data, timestamp: Date.now() })
    localStorage.setItem(OFFLINE_SESSIONS_KEY, JSON.stringify(current))
  } catch (e) {
    console.error('Failed to store offline session', e)
  }
}

let isSyncingOfflineSessions = false

export const syncOfflinePendingSessions = async () => {
  if (isSyncingOfflineSessions) return
  isSyncingOfflineSessions = true
  try {
    const pending = getOfflinePendingSessions()
    if (!pending.length) return
    const remaining = []
    for (const s of pending) {
      try {
        await api.post('/focus/sessions', {
          goal_id: s.goal_id,
          duration_minutes: s.duration_minutes,
          session_date: s.session_date,
          topic_note: s.topic_note,
          source: s.source || 'pomodoro',
        })
      } catch (err: any) {
        const isGenuineOffline =
          (typeof navigator !== 'undefined' && !navigator.onLine) ||
          err.code === 'ERR_NETWORK' ||
          (!err.response && !err.status && String(err.message || '').includes('Network'))
        if (isGenuineOffline) {
          remaining.push(s)
        }
      }
    }
    if (typeof localStorage !== 'undefined') {
      if (remaining.length) {
        localStorage.setItem(OFFLINE_SESSIONS_KEY, JSON.stringify(remaining))
      } else {
        localStorage.removeItem(OFFLINE_SESSIONS_KEY)
      }
    }
  } finally {
    isSyncingOfflineSessions = false
  }
}

export const clearFocusCache = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(GOALS_CACHE_KEY)
      localStorage.removeItem(STATS_CACHE_KEY)
      localStorage.removeItem(SESSIONS_CACHE_KEY)
      localStorage.removeItem(OFFLINE_SESSIONS_KEY)
    }
  } catch (e) {
    console.error('Failed to clear focus cache', e)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflinePendingSessions().catch(() => {})
  })
}

export const focusService = {
  // SWR Instant Local Caches (<10ms instant populate)
  getCachedGoals: (): StudyGoal[] => {
    try {
      if (typeof localStorage === 'undefined') return []
      const raw = localStorage.getItem(GOALS_CACHE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  getCachedStats: (): FocusStats | null => {
    try {
      if (typeof localStorage === 'undefined') return null
      const raw = localStorage.getItem(STATS_CACHE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  getCachedSessions: (): StudySessionLog[] => {
    try {
      if (typeof localStorage === 'undefined') return []
      const raw = localStorage.getItem(SESSIONS_CACHE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  // Goals
  getGoals: async (isCompleted?: boolean): Promise<StudyGoal[]> => {
    const params = isCompleted !== undefined ? { is_completed: isCompleted } : {}
    const res = await api.get('/focus/goals', { params })
    const data = Array.isArray(res.data) ? res.data : []
    if (isCompleted === undefined && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(GOALS_CACHE_KEY, JSON.stringify(data))
      } catch (_) {}
    }
    return data
  },

  createGoal: async (data: {
    title: string
    target_hours: number
    current_hours?: number
    goal_type?: 'hours' | 'deadline'
    target_date?: string | null
    parent_id?: number | null
    planet_type?: string
    celestial_name?: string | null
    color?: string
    category?: string
    notes?: string
  }): Promise<StudyGoal> => {
    const res = await api.post('/focus/goals', data)
    return res.data
  },

  updateGoal: async (id: number, data: Partial<StudyGoal>): Promise<StudyGoal> => {
    const res = await api.put(`/focus/goals/${id}`, data)
    return res.data
  },

  deleteGoal: async (id: number): Promise<void> => {
    await api.delete(`/focus/goals/${id}`)
  },

  // Sessions
  getSessions: async (params?: {
    goal_id?: number
    date_from?: string
    date_to?: string
    limit?: number
  }): Promise<StudySessionLog[]> => {
    const res = await api.get('/focus/sessions', { params })
    const data = Array.isArray(res.data) ? res.data : []
    if (!params?.goal_id && !params?.date_from && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(data))
      } catch (_) {}
    }
    return data
  },

  createSession: async (data: {
    goal_id?: number | null
    duration_minutes: number
    session_date?: string
    topic_note?: string
    source?: 'pomodoro' | 'manual'
  }): Promise<StudySessionLog> => {
    try {
      const res = await api.post('/focus/sessions', data)
      syncOfflinePendingSessions().catch(() => {})
      return res.data
    } catch (err: any) {
      const isGenuineOffline =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err.code === 'ERR_NETWORK' ||
        (!err.response && !err.status && String(err.message || '').includes('Network'))

      if (isGenuineOffline) {
        console.warn('[FocusService] Network error or offline; queued Pomodoro session locally.')
        queueOfflineSession(data)
        return {
          id: Date.now(),
          goal_id: data.goal_id ?? null,
          goal_title: undefined,
          goal_color: undefined,
          duration_minutes: data.duration_minutes,
          duration_hours: Number((data.duration_minutes / 60).toFixed(2)),
          session_date: data.session_date || new Date().toISOString().split('T')[0],
          topic_note: data.topic_note,
          source: data.source || 'pomodoro',
          created_at: new Date().toISOString(),
        }
      }
      // Lỗi từ server thực sự (400, 403, 500) -> ném lỗi để hiển thị đúng cho người dùng, không báo thành công ảo
      throw err
    }
  },

  updateSession: async (id: number, data: Partial<StudySessionLog>): Promise<StudySessionLog> => {
    const res = await api.put(`/focus/sessions/${id}`, data)
    return res.data
  },

  deleteSession: async (id: number): Promise<void> => {
    await api.delete(`/focus/sessions/${id}`)
  },

  // Stats
  getStats: async (): Promise<FocusStats> => {
    const res = await api.get('/focus/stats')
    return res.data
  },

  // ── Dopamine & Real-life Rewards ──
  getRewards: async (): Promise<{ items: RewardItem[]; balance: PearlsBalance }> => {
    const res = await api.get('/focus/rewards')
    return res.data
  },

  createReward: async (data: {
    title: string
    pearl_cost: number
    icon?: string
    category?: string
    description?: string
  }): Promise<RewardItem> => {
    const res = await api.post('/focus/rewards', data)
    return res.data
  },

  redeemReward: async (rewardId: number, note?: string): Promise<RewardRedemption> => {
    const res = await api.post('/focus/rewards/redeem', { reward_id: rewardId, note })
    return res.data
  },

  getRedemptionHistory: async (): Promise<RewardRedemption[]> => {
    const res = await api.get('/focus/rewards/history')
    return res.data
  },

  // ── Topic Galaxy ──
  getGalaxy: async (): Promise<TopicGalaxy> => {
    const res = await api.get('/focus/galaxy')
    return res.data
  },

  // ── Time Warp Oracle ──
  getOracle: async (goalId?: number): Promise<TimeWarpOracle> => {
    const params = goalId ? { goal_id: goalId } : {}
    const res = await api.get('/focus/oracle', { params })
    return res.data
  },

  updatePlanetBuild: async (goalId: number, planetData: string): Promise<StudyGoal> => {
    const res = await api.put(`/focus/goals/${goalId}/planet-build`, { planet_data: planetData })
    return res.data
  },

  // ── Time Capsules ──
  getTimeCapsules: async (): Promise<TimeCapsule[]> => {
    const res = await api.get('/focus/time-capsules')
    return res.data
  },

  createTimeCapsule: async (data: {
    goal_id?: number | null
    milestone_hours?: number
    unlock_days?: number | null
    unlock_type?: string
    mood_tag?: string | null
    title?: string
    message_content: string
  }): Promise<TimeCapsule> => {
    const res = await api.post('/focus/time-capsules', data)
    return res.data
  },

  getMoodKeysBalance: async (): Promise<{
    mood_keys: number
    total_capsules: number
    unlocked_capsules: number
  }> => {
    const res = await api.get('/focus/time-capsules/mood-balance')
    return res.data
  },

  unlockEmergencyTimeCapsule: async (capsuleId: number): Promise<TimeCapsule> => {
    const res = await api.post(`/focus/time-capsules/${capsuleId}/unlock-emergency`)
    return res.data
  },

  randomRescueCapsule: async (): Promise<TimeCapsule> => {
    const res = await api.post('/focus/time-capsules/random-rescue')
    return res.data
  },

  claimBreathGrant: async (): Promise<{
    success: boolean
    mood_keys: number
    message: string
  }> => {
    const res = await api.post('/focus/time-capsules/claim-breath-grant')
    return res.data
  },

  // ── Constellation Achievements ──
  getConstellations: async (): Promise<ConstellationAchievement[]> => {
    const res = await api.get('/focus/constellations')
    return res.data
  },

  checkConstellations: async (): Promise<ConstellationCheckResult> => {
    const res = await api.post('/focus/constellations/check')
    return res.data
  },

  // ── Daily 4-Quadrant Matrix (Eisenhower) ──
  getMatrixTasks: async (date?: string): Promise<DailyMatrixTask[]> => {
    const cacheKey = `matrix_tasks_cache_${date || 'today'}`
    const params = date ? { date } : {}
    try {
      const res = await api.get('/focus/matrix', { params })
      if (Array.isArray(res.data) && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(res.data))
        } catch (_) {}
      }
      return res.data
    } catch (err) {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          try {
            console.warn('[FocusService] Network error loading matrix tasks. Serving cached tasks.')
            return JSON.parse(cached)
          } catch (_) {}
        }
      }
      throw err
    }
  },

  createMatrixTask: async (data: DailyMatrixTaskCreateInput): Promise<DailyMatrixTask> => {
    const res = await api.post('/focus/matrix', data)
    return res.data
  },

  updateMatrixTask: async (
    taskId: number,
    data: Partial<DailyMatrixTaskCreateInput & { is_completed?: boolean; order_index?: number }>
  ): Promise<DailyMatrixTask> => {
    const res = await api.put(`/focus/matrix/${taskId}`, data)
    return res.data
  },

  toggleMatrixTask: async (taskId: number): Promise<DailyMatrixTask> => {
    const res = await api.patch(`/focus/matrix/${taskId}/toggle`)
    return res.data
  },

  getDeadlines: async (): Promise<DeadlinesResponse> => {
    try {
      const res = await api.get('/focus/deadlines')
      if (res?.data && Array.isArray(res.data.items) && res.data.summary) {
        return res.data
      }
    } catch (err) {
      console.warn('[FocusService] /focus/deadlines unavailable, falling back to client-side calculation:', err)
    }

    const [goalsResult, tasksResult] = await Promise.allSettled([
      focusService.getGoals(),
      focusService.getMatrixTasks(),
    ])
    const goals = goalsResult.status === 'fulfilled' ? goalsResult.value : focusService.getCachedGoals()
    const tasks = tasksResult.status === 'fulfilled' ? tasksResult.value : []
    return buildDeadlinesPayload(goals, tasks)
  },

  updateMatrixReflection: async (taskId: number, reflection_note: string): Promise<DailyMatrixTask> => {
    const res = await api.patch(`/focus/matrix/${taskId}/reflection`, { reflection_note })
    return res.data
  },

  deleteMatrixTask: async (taskId: number): Promise<{ message: string; id: number }> => {
    const res = await api.delete(`/focus/matrix/${taskId}`)
    return res.data
  },

  rolloverMatrixTasks: async (fromDate: string, toDate: string): Promise<{ message: string; count: number }> => {
    const res = await api.post('/focus/matrix/rollover', null, {
      params: { from_date: fromDate, to_date: toDate },
    })
    return res.data
  },

  getMonthlyMatrixSummary: async (year: number, month: number): Promise<MonthlyMatrixSummary> => {
    const res = await api.get('/focus/matrix/monthly-summary', {
      params: { year, month },
    })
    return res.data
  },

  getAIBuddyPrompt: async (): Promise<AIBuddyPrompt> => {
    const res = await api.get('/focus/ai-buddy/prompt')
    return res.data
  },

  previewAIBreakdown: async (data: {
    title: string
    target_date: string
    total_hours?: number
    notes_or_syllabus?: string
    daily_hours?: number
    quadrant?: number
  }): Promise<AIBreakdownProposal> => {
    const res = await api.post('/focus/ai/breakdown-preview', data)
    return res.data
  },

  applyAIBreakdown: async (data: {
    title: string
    target_date: string
    explanation?: string
    tasks: AIBreakdownTaskItem[]
    create_parent_goal?: boolean
  }): Promise<{ ok: boolean; batch_id: string; count: number; message: string }> => {
    const res = await api.post('/focus/ai/apply-breakdown', data)
    return res.data
  },

  rollbackAIBreakdown: async (
    batch_id: string
  ): Promise<{ ok: boolean; message: string; deleted_count: number }> => {
    const res = await api.post('/focus/ai/rollback-breakdown', { batch_id })
    return res.data
  },

  getAIBreakdownHistory: async (): Promise<AIBreakdownLogItem[]> => {
    const res = await api.get('/focus/ai/breakdown-history')
    return res.data
  },

  parseScheduleTextWithAI: async (
    text: string,
    target_date?: string
  ): Promise<{ summary: string; tasks: AIBreakdownTaskItem[] }> => {
    const res = await api.post('/focus/ai/parse-text-schedule', { text, target_date })
    return res.data
  },

  importTasksBulk: async (data: {
    title?: string
    tasks: AIBreakdownTaskItem[]
  }): Promise<{ ok: boolean; batch_id: string; count: number; message: string }> => {
    const res = await api.post('/focus/import/tasks', data)
    return res.data
  },

  syncPendingSessions: syncOfflinePendingSessions,
  clearCache: clearFocusCache,
}
