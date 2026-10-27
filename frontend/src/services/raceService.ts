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

  getMyRecentCheers: async (): Promise<any[]> => {
    const res = await api.get('/race/cheers/my')
    return res.data
  },
}
