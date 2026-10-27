import { describe, it, expect, vi, beforeEach } from 'vitest'
import { notificationManager } from '../utils/notificationManager'

describe('notificationManager', () => {
  beforeEach(() => {
    localStorage.clear()
    // Mock Notification
    const mockNotification = vi.fn().mockImplementation((title, options) => ({
      title,
      options,
      onclick: null,
      close: vi.fn(),
    }))
    ;(mockNotification as any).permission = 'granted'
    ;(mockNotification as any).requestPermission = vi.fn().mockResolvedValue('granted')

    // @ts-ignore
    window.Notification = mockNotification
  })

  it('manages notification configuration correctly', () => {
    const config = notificationManager.loadConfig()
    expect(config.webEnabled).toBe(true)
    expect(config.pomodoroEnd).toBe(true)

    notificationManager.saveConfig({ inactivityMinutes: 30 })
    const updated = notificationManager.loadConfig()
    expect(updated.inactivityMinutes).toBe(30)
  })

  it('sends notification when permission is granted', () => {
    const notif = notificationManager.sendNotification('Test Title', { body: 'Test Body' })
    expect(window.Notification).toHaveBeenCalled()
    expect(notif).not.toBeNull()
  })

  it('handles pomodoro end and break end notifications', () => {
    expect(() => notificationManager.notifyPomodoroEnd('1000h Tiếng Anh')).not.toThrow()
    expect(() => notificationManager.notifyBreakEnd()).not.toThrow()
  })
})
