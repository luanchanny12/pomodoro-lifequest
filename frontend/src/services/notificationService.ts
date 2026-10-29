import api from './api'

export interface BackendNotificationSettings {
  id: number
  web_notifications_enabled: boolean
  pomodoro_end_enabled: boolean
  break_end_enabled: boolean
  inactivity_reminder_minutes: number
  morning_reminder_time: string
  evening_reminder_time: string
  telegram_bot_token?: string | null
  telegram_chat_id?: string | null
  telegram_enabled: boolean
  app_public_url?: string | null
  updated_at: string
}

export const notificationService = {
  getSettings: async (): Promise<BackendNotificationSettings> => {
    const res = await api.get('/notifications/settings')
    return res.data
  },

  updateSettings: async (
    data: Partial<BackendNotificationSettings>
  ): Promise<BackendNotificationSettings> => {
    const res = await api.put('/notifications/settings', data)
    return res.data
  },

  testWindowsNotification: async (): Promise<{ message: string; success: boolean }> => {
    const res = await api.post('/notifications/test-windows')
    return res.data
  },

  sendWindowsNotification: async (title: string, message: string): Promise<{ success: boolean }> => {
    try {
      const res = await api.post('/notifications/send-windows', { title, message })
      return res.data
    } catch {
      return { success: false }
    }
  },

  testTelegramNotification: async (
    botToken: string,
    chatId: string,
    message?: string
  ): Promise<{ message: string; ok: boolean }> => {
    const res = await api.post('/notifications/test-telegram', {
      bot_token: botToken,
      chat_id: chatId,
      message,
    })
    return res.data
  },

  triggerCloudTelegramCheck: async (
    force: boolean = false
  ): Promise<{ status: string; sent_any: boolean; details: string[] }> => {
    const res = await api.post(`/notifications/telegram-trigger-check?force=${force}`)
    return res.data
  },
}
