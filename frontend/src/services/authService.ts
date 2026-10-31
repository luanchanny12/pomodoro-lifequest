import api from './api'

export interface UserProfile {
  id: number
  username: string
  display_name: string
  racer_avatar: 'rocket' | 'cyber_car' | 'quantum_saucer' | 'lightning' | 'lightcycle'
  cheer_count: number
  is_admin?: boolean
  level: number
  exp: number
  coins: number
  streak: number
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserProfile
}

const TOKEN_KEY = 'pomodoro_access_token'
const USER_KEY = 'pomodoro_user_profile'

export const authService = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY)
  },

  getCurrentUser: (): UserProfile | null => {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },

  register: async (
    username: string,
    display_name: string,
    password: string,
    racer_avatar: string = 'rocket',
    admin_secret?: string
  ): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register', {
      username,
      display_name,
      password,
      racer_avatar,
      admin_secret: admin_secret || undefined,
    })
    localStorage.setItem(TOKEN_KEY, res.data.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
    return res.data
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', {
      username,
      password,
    })
    localStorage.setItem(TOKEN_KEY, res.data.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
    return res.data
  },

  getMe: async (): Promise<UserProfile> => {
    const res = await api.get<UserProfile>('/auth/me')
    localStorage.setItem(USER_KEY, JSON.stringify(res.data))
    return res.data
  },

  updateProfile: async (
    display_name?: string,
    racer_avatar?: string
  ): Promise<UserProfile> => {
    const res = await api.put<UserProfile>('/auth/profile', {
      display_name,
      racer_avatar,
    })
    localStorage.setItem(USER_KEY, JSON.stringify(res.data))
    return res.data
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string; success: boolean }> => {
    const res = await api.post<{ message: string; success: boolean }>(
      '/auth/change-password',
      {
        current_password: currentPassword,
        new_password: newPassword,
      }
    )
    return res.data
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem('lifequest_cached_goals')
    localStorage.removeItem('lifequest_cached_stats')
    localStorage.removeItem('lifequest_cached_sessions')
  },
}
