import React from 'react'
import { X, Settings, Volume2, Bell } from 'lucide-react'
import { soundManager } from '@/utils/soundEffects'

export interface PomodoroSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakInterval: number
  autoStartBreaks: boolean
  autoStartPomodoro: boolean
  alarmSound: 'bell' | 'ding'
  alarmVolume: number
  ambientVolume: number
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: PomodoroSettings
  onSave: (newSettings: PomodoroSettings) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = React.useState<PomodoroSettings>(settings)

  React.useEffect(() => {
    setLocalSettings(settings)
  }, [settings, isOpen])

  if (!isOpen) return null

  const handleTestAlarm = () => {
    if (localSettings.alarmSound === 'bell') {
      soundManager.playBell(localSettings.alarmVolume)
    } else {
      soundManager.playDing(localSettings.alarmVolume)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(localSettings)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#1F232B] border border-white/10 rounded-2xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Cài đặt Pomodoro</h2>
              <p className="text-xs text-white/60">Tùy chỉnh thời gian & chuông báo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Time settings */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
              Thời gian (Phút)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-white/70 mb-1">Pomodoro</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={localSettings.focusMinutes}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      focusMinutes: Math.max(1, parseInt(e.target.value) || 25),
                    })
                  }
                  className="w-full px-3 py-2 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60 text-center font-medium"
                />
              </div>

              <div>
                <label className="block text-xs text-white/70 mb-1">Nghỉ ngắn</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={localSettings.shortBreakMinutes}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      shortBreakMinutes: Math.max(1, parseInt(e.target.value) || 5),
                    })
                  }
                  className="w-full px-3 py-2 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60 text-center font-medium"
                />
              </div>

              <div>
                <label className="block text-xs text-white/70 mb-1">Nghỉ dài</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={localSettings.longBreakMinutes}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      longBreakMinutes: Math.max(1, parseInt(e.target.value) || 15),
                    })
                  }
                  className="w-full px-3 py-2 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60 text-center font-medium"
                />
              </div>
            </div>
          </div>

          {/* Long break interval */}
          <div>
            <label className="block text-xs text-white/70 mb-1">
              Chu kỳ nghỉ dài (Số phiên Pomodoro trước khi nghỉ dài)
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={localSettings.longBreakInterval}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  longBreakInterval: Math.max(1, parseInt(e.target.value) || 4),
                })
              }
              className="w-full px-3.5 py-2 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60"
            />
          </div>

          {/* Automation toggles */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
              Tự động chuyển phiên
            </h3>
            <label className="flex items-center justify-between p-2.5 bg-[#14171E] rounded-xl cursor-pointer">
              <span className="text-xs text-white/80">Tự động bắt đầu giờ nghỉ</span>
              <input
                type="checkbox"
                checked={localSettings.autoStartBreaks}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, autoStartBreaks: e.target.checked })
                }
                className="w-4 h-4 accent-red-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between p-2.5 bg-[#14171E] rounded-xl cursor-pointer">
              <span className="text-xs text-white/80">Tự động bắt đầu Pomodoro tiếp theo</span>
              <input
                type="checkbox"
                checked={localSettings.autoStartPomodoro}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, autoStartPomodoro: e.target.checked })
                }
                className="w-4 h-4 accent-red-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Sound settings */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Âm thanh chuông báo
              </h3>
              <button
                type="button"
                onClick={handleTestAlarm}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Bell className="w-3.5 h-3.5" />
                Nghe thử chuông
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, alarmSound: 'bell' })}
                className={`p-2.5 text-xs rounded-xl border font-medium transition ${
                  localSettings.alarmSound === 'bell'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-[#14171E] border-white/10 text-white/70'
                }`}
              >
                Chuông ngân (Chimes)
              </button>
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, alarmSound: 'ding' })}
                className={`p-2.5 text-xs rounded-xl border font-medium transition ${
                  localSettings.alarmSound === 'ding'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-[#14171E] border-white/10 text-white/70'
                }`}
              >
                Kính Koong (Ding)
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Âm lượng chuông</span>
                <span>{Math.round(localSettings.alarmVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.alarmVolume}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, alarmVolume: parseFloat(e.target.value) })
                }
                className="w-full accent-red-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-xl shadow-lg shadow-red-500/25 transition"
            >
              Lưu cài đặt
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
