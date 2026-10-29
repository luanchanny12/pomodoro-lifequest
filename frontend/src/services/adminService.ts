import api from './api'

export interface AdminOverview {
  total_users: number
  active_users_count: number
  active_today_count: number
  total_study_hours: number
  total_sessions: number
  today_sessions: number
  today_study_hours: number
  total_goals: number
  completed_goals: number
  top_racers: Array<{
    id: number
    username: string
    display_name: string
    racer_avatar: string
    total_hours: number
    level: number
    streak: number
  }>
}

export interface AdminUserItem {
  id: number
  username: string
  display_name: string
  racer_avatar: string
  cheer_count: number
  is_admin: boolean
  is_active: boolean
  created_at: string | null
  level: number
  exp: number
  streak: number
  total_hours: number
  today_hours: number
  goal_count: number
  has_telegram: boolean
}

export interface UserActivityDetail {
  user: {
    id: number
    username: string
    display_name: string
    racer_avatar: string
    cheer_count: number
    is_admin: boolean
    is_active: boolean
    created_at: string | null
    level: number
    exp: number
    coins: number
    streak: number
    has_telegram: boolean
  }
  goals: Array<{
    id: number
    title: string
    celestial_name: string
    target_hours: number
    current_hours: number
    progress_percent: number
    color: string
    category: string
    is_completed: boolean
    notes: string | null
    session_count: number
    created_at: string | null
  }>
  recent_sessions: Array<{
    id: number
    goal_id: number | null
    goal_title: string
    duration_minutes: number
    duration_hours: number
    session_date: string
    topic_note: string | null
    source: string
    created_at: string | null
  }>
  matrix_tasks: Array<{
    id: number
    title: string
    description: string | null
    date: string
    quadrant: number
    is_completed: boolean
    reflection_note: string | null
    completed_at: string | null
  }>
}

export const adminService = {
  getOverview: async (): Promise<AdminOverview> => {
    const res = await api.get<AdminOverview>('/admin/overview')
    return res.data
  },

  getUsers: async (search?: string, skip = 0, limit = 100): Promise<{ total: number; items: AdminUserItem[] }> => {
    const params: Record<string, any> = { skip, limit }
    if (search) params.search = search
    const res = await api.get<{ total: number; items: AdminUserItem[] }>('/admin/users', { params })
    return res.data
  },

  getUserDetail: async (userId: number): Promise<UserActivityDetail> => {
    const res = await api.get<UserActivityDetail>(`/admin/users/${userId}/detail`)
    return res.data
  },

  resetPassword: async (userId: number, newPassword: string): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>(`/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
    })
    return res.data
  },

  updateRole: async (userId: number, isAdmin: boolean): Promise<{ message: string }> => {
    const res = await api.put<{ message: string }>(`/admin/users/${userId}/role`, {
      is_admin: isAdmin,
    })
    return res.data
  },

  updateStatus: async (userId: number, isActive: boolean): Promise<{ message: string }> => {
    const res = await api.put<{ message: string }>(`/admin/users/${userId}/status`, {
      is_active: isActive,
    })
    return res.data
  },

  deleteUser: async (userId: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/admin/users/${userId}`)
    return res.data
  },

  updateGoal: async (
    goalId: number,
    data: { title?: string; target_hours?: number; current_hours?: number; notes?: string; is_completed?: boolean }
  ): Promise<{ message: string }> => {
    const res = await api.put<{ message: string }>(`/admin/goals/${goalId}`, data)
    return res.data
  },

  deleteGoal: async (goalId: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/admin/goals/${goalId}`)
    return res.data
  },

  sendCheer: async (userId: number, emoji: string, message?: string): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>(`/admin/users/${userId}/cheer`, {
      emoji,
      message,
    })
    return res.data
  },

  notifyTelegram: async (userId: number, message: string): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>(`/admin/users/${userId}/notify-telegram`, {
      message,
    })
    return res.data
  },
}
