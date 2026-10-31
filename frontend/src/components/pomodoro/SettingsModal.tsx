import React, { useRef, useEffect } from 'react'
import { X, Settings, Bell } from 'lucide-react'
import { toast } from 'sonner'
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
  const volumeDebounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
    }
  }, [settings, isOpen])

  if (!isOpen) return null

  // Helper cập nhật state và tự động lưu ngay lập tức
  const updateAndSave = (patch: Partial<PomodoroSettings>, notifyMsg?: string) => {
    const updated = { ...localSettings, ...patch }
    setLocalSettings(updated)
    onSave(updated)
    if (notifyMsg) {
      toast.success(notifyMsg)
    }
  }

  const handleTestAlarm = () => {
    const vol = localSettings.alarmVolume ?? 0.6
    if (localSettings.alarmSound === 'bell') {
      soundManager.playBell(vol)
    } else {
      soundManager.playDing(vol)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    const updated = { ...localSettings, alarmVolume: vol }
    setLocalSettings(updated)
    onSave(updated)

    // Phát thử âm thanh theo âm lượng mới sau khi ngừng kéo 150ms
    if (volumeDebounceRef.current) {
      window.clearTimeout(volumeDebounceRef.current)
    }
    volumeDebounceRef.current = window.setTimeout(() => {
      if (updated.alarmSound === 'bell') {
        soundManager.playBell(vol)
      } else {
        soundManager.playDing(vol)
      }
    }, 150)
  }

  const handleVolumeRelease = () => {
    const vol = localSettings.alarmVolume ?? 0.6
    if (localSettings.alarmSound === 'bell') {
      soundManager.playBell(vol)
    } else {
      soundManager.playDing(vol)
    }
  }

  const handleClose = () => {
    onSave(localSettings)
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(localSettings)
    toast.success('Đã lưu toàn bộ cài đặt Pomodoro')
    onClose()
  }

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#1F232B] border border-white/10 rounded-2xl shadow-2xl p-6 text-white max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Cài đặt Pomodoro & Chuông</h2>
              <p className="text-xs text-white/60">Tùy chỉnh thời gian, chuông báo & tự động chuyển phiên</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition active:scale-95"
            title="Đóng & Lưu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto custom-scrollbar pr-1 flex-1">
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
                    updateAndSave({
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
                    updateAndSave({
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
                    updateAndSave({
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
                updateAndSave({
                  longBreakInterval: Math.max(1, parseInt(e.target.value) || 4),
                })
              }
              className="w-full px-3.5 py-2 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60"
            />
          </div>

          {/* Automation toggles */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-1">
              Tự động chuyển phiên
            </h3>
            <label className="flex items-center justify-between p-3 bg-[#14171E] hover:bg-[#181C25] rounded-xl cursor-pointer border border-white/5 transition">
              <div>
                <span className="text-xs font-medium text-white/90 block">Tự động bắt đầu giờ nghỉ</span>
                <span className="text-[11px] text-white/50 block">Hết giờ học Pomodoro sẽ tự động đếm ngược giờ nghỉ</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(localSettings.autoStartBreaks)}
                onChange={(e) => {
                  const val = e.target.checked
                  updateAndSave(
                    { autoStartBreaks: val },
                    val ? 'Đã bật: Tự động bắt đầu giờ nghỉ ☕' : 'Đã tắt: Tự động bắt đầu giờ nghỉ'
                  )
                }}
                className="w-4 h-4 accent-red-500 cursor-pointer ml-3"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-[#14171E] hover:bg-[#181C25] rounded-xl cursor-pointer border border-white/5 transition">
              <div>
                <span className="text-xs font-medium text-white/90 block">Tự động bắt đầu Pomodoro tiếp theo</span>
                <span className="text-[11px] text-white/50 block">Hết giờ nghỉ sẽ tự động đếm ngược phiên học mới</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(localSettings.autoStartPomodoro)}
                onChange={(e) => {
                  const val = e.target.checked
                  updateAndSave(
                    { autoStartPomodoro: val },
                    val ? 'Đã bật: Tự động bắt đầu Pomodoro tiếp theo 🚀' : 'Đã tắt: Tự động bắt đầu Pomodoro tiếp theo'
                  )
                }}
                className="w-4 h-4 accent-red-500 cursor-pointer ml-3"
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
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition active:scale-95"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Nghe thử chuông</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const vol = localSettings.alarmVolume ?? 0.6
                  updateAndSave({ alarmSound: 'bell' })
                  soundManager.playBell(vol)
                }}
                className={`p-3 text-xs rounded-xl border font-medium transition flex flex-col items-center gap-1 active:scale-95 ${
                  localSettings.alarmSound === 'bell'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                    : 'bg-[#14171E] border-white/10 text-white/70 hover:bg-[#181C25]'
                }`}
              >
                <span className="text-sm">🔔 Chuông ngân</span>
                <span className="text-[10px] text-white/50">Chimes (Giai điệu du dương)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const vol = localSettings.alarmVolume ?? 0.6
                  updateAndSave({ alarmSound: 'ding' })
                  soundManager.playDing(vol)
                }}
                className={`p-3 text-xs rounded-xl border font-medium transition flex flex-col items-center gap-1 active:scale-95 ${
                  localSettings.alarmSound === 'ding'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                    : 'bg-[#14171E] border-white/10 text-white/70 hover:bg-[#181C25]'
                }`}
              >
                <span className="text-sm">🛎️ Kính Koong</span>
                <span className="text-[10px] text-white/50">Ding-Dong (Âm vang rõ nét)</span>
              </button>
            </div>

            <div className="p-3 bg-[#14171E] rounded-xl border border-white/5">
              <div className="flex justify-between text-xs text-white/80 mb-2 font-medium">
                <span>Âm lượng chuông báo</span>
                <span className="text-cyan-400 font-mono">
                  {Math.round((localSettings.alarmVolume ?? 0.6) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.alarmVolume ?? 0.6}
                onChange={handleVolumeChange}
                onPointerUp={handleVolumeRelease}
                onTouchEnd={handleVolumeRelease}
                onMouseUp={handleVolumeRelease}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-white/40 mt-1 text-center">
                🎵 Kéo thanh trượt hoặc nhấc tay để nghe thử âm lượng trực tiếp
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition active:scale-95"
            >
              Đóng
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
