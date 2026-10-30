/**
 * Web Notification Manager
 * Handles browser desktop notifications, sound playback, and smart scheduled reminders.
 */

import { soundManager } from './soundEffects'
import { notificationService } from '@/services/notificationService'

export interface NotificationConfig {
  webEnabled: boolean
  pomodoroEnd: boolean
  breakEnd: boolean
  inactivityMinutes: number // 0 = off, 30, 60, 120
  morningTime: string // "08:00"
  eveningTime: string // "21:30"
}

const DEFAULT_CONFIG: NotificationConfig = {
  webEnabled: true,
  pomodoroEnd: true,
  breakEnd: true,
  inactivityMinutes: 60,
  morningTime: '08:00',
  eveningTime: '21:30',
}

class NotificationManager {
  private config: NotificationConfig = DEFAULT_CONFIG
  private lastStudyTime: number = Date.now()
  private morningTriggeredDate: string = ''
  private eveningTriggeredDate: string = ''

  constructor() {
    this.loadConfig()
  }

  loadConfig(): NotificationConfig {
    try {
      const saved = localStorage.getItem('pomodoro_notification_config')
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) }
      }
    } catch {
      this.config = DEFAULT_CONFIG
    }
    return this.config
  }

  saveConfig(newConfig: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...newConfig }
    localStorage.setItem('pomodoro_notification_config', JSON.stringify(this.config))
  }

  getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied'
    }
    const perm = await Notification.requestPermission()
    return perm
  }

  sendNotification(title: string, options?: NotificationOptions) {
    if (!this.config.webEnabled) return null

    // 1. Luôn kích hoạt Windows Toast Native (góc dưới màn hình Windows)
    const bodyText = options?.body || ''
    notificationService.sendWindowsNotification(title, bodyText).catch(() => {})

    // 2. Kích hoạt Web Browser Notification nếu người dùng đã bật quyền
    let notif: Notification | null = null
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        notif = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          silent: false,
          ...options,
        })

        notif.onclick = () => {
          window.focus()
          notif?.close()
        }
      } catch (e) {
        console.warn('Could not display web notification:', e)
      }
    }

    // Phát chuông báo âm thanh
    soundManager.playCosmicChime()
    return notif
  }

  notifyPomodoroEnd(goalTitle?: string) {
    if (!this.config.pomodoroEnd) return
    this.sendNotification('🍅 Hoàn thành phiên Pomodoro!', {
      body: goalTitle
        ? `Tuyệt vời! Bạn vừa hoàn thành một phiên tập trung cho "${goalTitle}". Hãy nghỉ ngơi 5 phút nhé!`
        : 'Tuyệt vời! Bạn vừa hoàn thành một phiên tập trung 25 phút. Hãy thư giãn mắt và uống nước nhé!',
    })
  }

  notifyBreakEnd() {
    if (!this.config.breakEnd) return
    this.sendNotification('☕ Hết giờ nghỉ ngơi rồi!', {
      body: 'Đã hết giờ giải lao! Sẵn sàng cho một phiên tập trung bứt phá tiếp theo chưa nào?',
    })
  }

  recordActivity() {
    this.lastStudyTime = Date.now()
  }

  checkScheduledReminders() {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`

    // 1. Inactivity Reminder
    if (this.config.inactivityMinutes > 0) {
      const diffMinutes = (Date.now() - this.lastStudyTime) / (1000 * 60)
      if (diffMinutes >= this.config.inactivityMinutes) {
        this.sendNotification('💡 Lên tinh thần cùng Pomodoro!', {
          body: `Đã ${Math.round(
            diffMinutes
          )} phút trôi qua kể từ phiên học gần nhất. Khởi động một hiệp 25 phút nhẹ nhàng nhé! ✨`,
        })
        // Reset timer so it doesn't spam every minute
        this.lastStudyTime = Date.now()
      }
    }

    // 2. Morning Reminder (kích hoạt linh hoạt trong vòng 60 phút, tránh bị lỡ khi tab nền bị trình duyệt throttle)
    const [mH, mM] = (this.config.morningTime || '08:00').split(':').map(Number)
    const morningMinutes = mH * 60 + mM
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    if (currentMinutes >= morningMinutes && currentMinutes < morningMinutes + 60 && this.morningTriggeredDate !== todayStr) {
      this.morningTriggeredDate = todayStr
      this.sendNotification('🌅 Chào buổi sáng năng lượng!', {
        body: 'Mở Ma Trận 4 Ô xem các việc khẩn cấp (Ô 1) và mục tiêu lớn (Ô 2) hôm nay nào!',
      })
    }

    // 3. Evening Reminder (kích hoạt linh hoạt trong vòng 60 phút)
    const [eH, eM] = (this.config.eveningTime || '21:30').split(':').map(Number)
    const eveningMinutes = eH * 60 + eM
    if (currentMinutes >= eveningMinutes && currentMinutes < eveningMinutes + 60 && this.eveningTriggeredDate !== todayStr) {
      this.eveningTriggeredDate = todayStr
      this.sendNotification('🌙 Kế hoạch tối hôm trước!', {
        body: 'Dành 3 phút lên trước Ma Trận 4 Ô cho ngày mai để sáng dậy có lộ trình rõ ràng nha!',
      })
    }
  }
}

export const notificationManager = new NotificationManager()
