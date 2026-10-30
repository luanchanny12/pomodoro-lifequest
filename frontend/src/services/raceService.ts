import api from './api'

export interface RacerCard {
  user_id: number
  username: string
  display_name: string
  racer_avatar: 'rocket' | 'cyber_car' | 'quantum_saucer' | 'lightning' | 'lightcycle'
  level: number
  exp: number
  streak: number
  today_hours: number
  weekly_hours: number
  current_goal_title: string
  cheer_count: number
  rank: number
  track_progress_percent: number
  is_racing_now: boolean
  is_current_user: boolean
}

export interface RaceTrackResponse {
  track_name: string
  racers: RacerCard[]
  total_racers: number
  community_hours_today: number
  my_rank?: number | null
}

export interface CheerItem {
  id: number
  sender_id?: number | null
  sender_name: string
  target_user_id: number
  emoji: string
  message?: string | null
  is_read?: boolean
  created_at: string
}

export interface UnreadCheersResponse {
  unread_count: number
  cheers: CheerItem[]
}

export const raceService = {
  getTrackStatus: async (): Promise<RaceTrackResponse> => {
    const res = await api.get<RaceTrackResponse>('/race/track')
    return res.data
  },

  cheer: async (
    targetUserId: number,
    emoji: string = '🔥',
    message?: string
  ): Promise<{ success: boolean; message: string; new_cheer_count: number }> => {
    const res = await api.post('/race/cheer', {
      target_user_id: targetUserId,
      emoji,
      message,
    })
    return res.data
  },

  getMyRecentCheers: async (): Promise<CheerItem[]> => {
    const res = await api.get<CheerItem[]>('/race/cheers/my')
    return res.data
  },

  getUnreadCheers: async (): Promise<UnreadCheersResponse> => {
    const res = await api.get<UnreadCheersResponse>('/race/cheers/unread')
    return res.data
  },

  markCheerAsRead: async (cheerId: number): Promise<any> => {
    const res = await api.post(`/race/cheers/${cheerId}/read`)
    return res.data
  },

  markAllCheersAsRead: async (): Promise<any> => {
    const res = await api.post('/race/cheers/read-all')
    return res.data
  },
}
