import api from './api'

export interface StudyGoal {
  id: number
  title: string
  target_hours: number
  current_hours: number
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
  target_hours: number
  current_hours: number
  remaining_hours: number
  average_daily_hours: number
  projected_finish_date?: string | null
  days_remaining?: number | null
  hours_warped_recent: number
}

// Time Capsule
export interface TimeCapsule {
  id: number
  goal_id?: number | null
  milestone_hours: number
  title: string
  message_content: string
  is_unlocked: boolean
  unlocked_at?: string | null
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

export const focusService = {
  // Goals
  getGoals: async (isCompleted?: boolean): Promise<StudyGoal[]> => {
    const params = isCompleted !== undefined ? { is_completed: isCompleted } : {}
    const res = await api.get('/focus/goals', { params })
    return res.data
  },

  createGoal: async (data: {
    title: string
    target_hours: number
    current_hours?: number
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
    return res.data
  },

  createSession: async (data: {
    goal_id?: number | null
    duration_minutes: number
    session_date?: string
    topic_note?: string
    source?: 'pomodoro' | 'manual'
  }): Promise<StudySessionLog> => {
    const res = await api.post('/focus/sessions', data)
    return res.data
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
  getOracle: async (): Promise<TimeWarpOracle> => {
    const res = await api.get('/focus/oracle')
    return res.data
  },

  // ── Time Capsules ──
  getTimeCapsules: async (): Promise<TimeCapsule[]> => {
    const res = await api.get('/focus/time-capsules')
    return res.data
  },

  createTimeCapsule: async (data: {
    goal_id?: number | null
    milestone_hours: number
    title?: string
    message_content: string
  }): Promise<TimeCapsule> => {
    const res = await api.post('/focus/time-capsules', data)
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
    const params = date ? { date } : {}
    const res = await api.get('/focus/matrix', { params })
    return res.data
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
}
