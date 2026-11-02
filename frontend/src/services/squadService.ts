import api from './api'

export interface SquadMemberProgress {
  user_id: number
  display_name: string
  role: string
  vehicle_icon: string
  goal_id?: number | null
  goal_title?: string | null
  current_hours: number
  target_hours: number
  progress_percent: number
  streak: number
  is_current_user: boolean
  is_studying: boolean
  joined_at: string
}

export interface SquadDetailResponse {
  id: number
  name: string
  target_title: string
  target_hours: number
  category: string
  icon: string
  color: string
  description?: string | null
  invite_code: string
  creator_id: number
  created_at: string
  members_count: number
  is_member: boolean
  user_role?: string | null
  members: SquadMemberProgress[]
}

export interface SquadSummary {
  id: number
  name: string
  target_title: string
  target_hours: number
  category: string
  icon: string
  color: string
  invite_code: string
  members_count: number
  my_progress_percent: number
  my_current_hours: number
  user_role: string
}

export interface SquadMessageItem {
  id: number
  squad_id: number
  user_id?: number | null
  sender_name: string
  message_type: 'text' | 'system_speedup' | 'system_join'
  content: string
  emoji?: string | null
  created_at: string
}

export interface CreateSquadPayload {
  name: string
  target_title: string
  target_hours: number
  category?: string
  icon?: string
  color?: string
  description?: string
  goal_id?: number | null
  vehicle_icon?: string
}

export interface JoinSquadPayload {
  invite_code?: string
  squad_id?: number
  goal_id?: number | null
  vehicle_icon?: string
}

export const squadService = {
  createSquad: async (payload: CreateSquadPayload): Promise<SquadDetailResponse> => {
    const res = await api.post<SquadDetailResponse>('/squads', payload)
    return res.data
  },

  getMySquads: async (): Promise<SquadSummary[]> => {
    const res = await api.get<SquadSummary[]>('/squads/my')
    return res.data
  },

  getPublicSquads: async (): Promise<SquadSummary[]> => {
    const res = await api.get<SquadSummary[]>('/squads/public')
    return res.data
  },

  getSquadDetail: async (squadId: number): Promise<SquadDetailResponse> => {
    const res = await api.get<SquadDetailResponse>(`/squads/${squadId}`)
    return res.data
  },

  joinSquad: async (payload: JoinSquadPayload): Promise<SquadDetailResponse> => {
    const res = await api.post<SquadDetailResponse>('/squads/join', payload)
    return res.data
  },

  leaveSquad: async (squadId: number): Promise<{ success: boolean; message: string }> => {
    const res = await api.post<{ success: boolean; message: string }>(`/squads/${squadId}/leave`)
    return res.data
  },

  getSquadMessages: async (squadId: number, limit = 50): Promise<SquadMessageItem[]> => {
    const res = await api.get<SquadMessageItem[]>(`/squads/${squadId}/messages?limit=${limit}`)
    return res.data
  },

  sendSquadMessage: async (squadId: number, content: string, emoji?: string): Promise<SquadMessageItem> => {
    const res = await api.post<SquadMessageItem>(`/squads/${squadId}/messages`, {
      content,
      emoji,
    })
    return res.data
  },
}
