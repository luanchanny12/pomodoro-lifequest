import api from './api'

export interface TrafficTrendDay {
  date: string
  guest: number
  member: number
  total: number
}

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
  // Traffic Analytics
  total_visits: number
  guest_visits: number
  member_visits: number
  unique_guests: number
  unique_members: number
  today_visits: number
  today_guest_visits: number
  today_member_visits: number
  mobile_visits: number
  desktop_visits: number
  // Feedback
  total_feedbacks: number
  new_feedbacks: number
  feedback_avg_rating: number
  traffic_trend_7days: TrafficTrendDay[]
}

export interface AdminFeedbackItem {
  id: number
  user_id: number | null
  sender_name: string
  sender_contact: string | null
  is_member: boolean
  member_username: string | null
  racer_avatar: string | null
  rating: number
  category: string
  content: string
  status: 'new' | 'reviewed' | 'resolved'
  admin_note: string | null
  created_at: string | null
}

export interface AdminFeedbacksResponse {
  total: number
  new_count: number
  average_rating: number
  items: AdminFeedbackItem[]
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

  getFeedbacks: async (params?: {
    category?: string
    status?: string
    rating?: number
    skip?: number
    limit?: number
  }): Promise<AdminFeedbacksResponse> => {
    const res = await api.get<AdminFeedbacksResponse>('/admin/feedbacks', { params })
    return res.data
  },

  updateFeedbackStatus: async (
    id: number,
    status: 'new' | 'reviewed' | 'resolved',
    adminNote?: string
  ): Promise<{ message: string }> => {
    const res = await api.put<{ message: string }>(`/admin/feedbacks/${id}/status`, {
      status,
      admin_note: adminNote,
    })
    return res.data
  },

  deleteFeedback: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/admin/feedbacks/${id}`)
    return res.data
  },
}
