import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Plus,
  Target,
  Clock,
  BookOpen,
  Settings as SettingsIcon,
  BarChart3,
  Volume2,
  VolumeX,
  Trophy,
  Trash2,
  Edit2,
  CloudRain,
  Waves,
  Timer as TimerIcon,
  Sparkles,
  Image as ImageIcon,
  Check,
  Gift,
  Mail,
  Orbit,
  Compass,
  LayoutGrid,
  Bell,
  User as UserIcon,
  LogOut,
  Shield,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { toast } from 'sonner'

import {
  focusService,
  StudyGoal,
  StudySessionLog,
  FocusStats,
} from '@/services/focusService'
import { soundManager } from '@/utils/soundEffects'
import { ManualLogModal } from '@/components/pomodoro/ManualLogModal'
import { GoalModal } from '@/components/pomodoro/GoalModal'
import {
  SettingsModal,
  PomodoroSettings,
} from '@/components/pomodoro/SettingsModal'
import {
  DynamicBackground,
  BackgroundConfig,
  PRESET_THEMES,
} from '@/components/pomodoro/DynamicBackground'
import { BackgroundPickerModal } from '@/components/pomodoro/BackgroundPickerModal'
import { DailyQuoteCard } from '@/components/pomodoro/DailyQuoteCard'
import { RewardShopModal } from '@/components/pomodoro/RewardShopModal'
import { TopicGalaxyView } from '@/components/pomodoro/TopicGalaxyView'
import { TimeWarpCard } from '@/components/pomodoro/TimeWarpCard'
import { TimeCapsuleModal } from '@/components/pomodoro/TimeCapsuleModal'
import { EisenhowerMatrixView } from '@/components/pomodoro/EisenhowerMatrixView'
import { AIFloatingBuddy } from '@/components/pomodoro/AIFloatingBuddy'
import { NotificationSettingsModal } from '@/components/pomodoro/NotificationSettingsModal'
import { AuthModal } from '@/components/auth/AuthModal'
import { CosmicRaceTrackModal } from '@/components/race/CosmicRaceTrackModal'
import { authService, UserProfile } from '@/services/authService'
import { notificationManager } from '@/utils/notificationManager'

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak'

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoro: false,
  alarmSound: 'bell',
  alarmVolume: 0.6,
  ambientVolume: 0.6,
}

const THEME_COLORS: Record<TimerMode, { bg: string; buttonText: string }> = {
  pomodoro: { bg: '#BA4949', buttonText: 'text-[#BA4949]' },
  shortBreak: { bg: '#38858A', buttonText: 'text-[#38858A]' },
  longBreak: { bg: '#397097', buttonText: 'text-[#397097]' },
}

const POMO_PRESETS = [15, 25, 30, 45, 60, 90]
const SHORT_BREAK_PRESETS = [3, 5, 10, 15]
const LONG_BREAK_PRESETS = [10, 15, 20, 30]

export default function PomodoroApp() {
  const navigate = useNavigate()
  // ── Settings ──
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('pomodoro_settings')
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  // ── Background Configuration (Synchronized with Mood & Ambient) ──
  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(() => {
    try {
      const saved = localStorage.getItem('pomodoro_bg_theme')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.id) return parsed
      }
      return PRESET_THEMES[0] // 🌧️ Mưa rơi bên khung cửa
    } catch {
      return PRESET_THEMES[0]
    }
  })

  // ── State ──
  const [mode, setMode] = useState<TimerMode>('pomodoro')
  const [timeLeft, setTimeLeft] = useState<number>(settings.focusMinutes * 60)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [sessionCount, setSessionCount] = useState<number>(1)
  const [activeTab, setActiveTab] = useState<'goals' | 'matrix' | 'galaxy' | 'timewarp' | 'logs' | 'stats'>('goals')

  // Ambient sound
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'waves' | 'ticking' | 'fire'>('none')

  // Custom Time Input Popover
  const [showCustomTimeInput, setShowCustomTimeInput] = useState<boolean>(false)
  const [customTimeMinutes, setCustomTimeMinutes] = useState<number>(settings.focusMinutes)

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false)
  const [isBgPickerOpen, setIsBgPickerOpen] = useState<boolean>(false)
  const [isRewardShopOpen, setIsRewardShopOpen] = useState<boolean>(false)
  const [isTimeCapsuleOpen, setIsTimeCapsuleOpen] = useState<boolean>(false)
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false)
  const [isRaceModalOpen, setIsRaceModalOpen] = useState<boolean>(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser())
  const [goalToEdit, setGoalToEdit] = useState<StudyGoal | null>(null)

  // Data
  const [goals, setGoals] = useState<StudyGoal[]>([])
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null)
  const [sessionNote, setSessionNote] = useState<string>('')
  const [sessions, setSessions] = useState<StudySessionLog[]>([])
  const [stats, setStats] = useState<FocusStats | null>(null)
  const [availablePearls, setAvailablePearls] = useState<number>(0)
  const [goalFilter, setGoalFilter] = useState<'all' | 'active' | 'completed'>('all')

  // Celebration state
  const [showCelebration, setShowCelebration] = useState<{ title: string; hours: number } | null>(null)

  // Timer Ref
  const timerRef = useRef<number | null>(null)
  const endTimeRef = useRef<number | null>(null)

  // ── Load Data ──
  const loadData = async () => {
    try {
      const [goalsData, sessionsData, statsData, rewardsData] = await Promise.all([
        focusService.getGoals(),
        focusService.getSessions({ limit: 50 }),
        focusService.getStats(),
        focusService.getRewards(),
      ])
      setGoals(goalsData)
      setSessions(sessionsData)
      setStats(statsData)
      setAvailablePearls(rewardsData.balance.available_pearls)

      if (goalsData.length > 0 && selectedGoalId === null) {
        setSelectedGoalId(goalsData[0].id)
      }
    } catch (err) {
      console.error('Error loading focus data:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Scheduled background notifications check (Golden hours & inactivity)
  useEffect(() => {
    const reminderInterval = setInterval(() => {
      notificationManager.checkScheduledReminders()
    }, 30 * 1000)
    return () => clearInterval(reminderInterval)
  }, [])

  // Check auth session
  useEffect(() => {
    if (authService.getToken()) {
      authService.getMe().then(setCurrentUser).catch(() => {})
    }
  }, [])

  const handleLogout = () => {
    authService.logout()
    setCurrentUser(null)
    toast.info('Đã đăng xuất tài khoản')
    loadData()
  }

  // Save settings
  const handleSaveSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings)
    localStorage.setItem('pomodoro_settings', JSON.stringify(newSettings))

    // Update current time if timer is idle
    if (!isRunning) {
      if (mode === 'pomodoro') setTimeLeft(newSettings.focusMinutes * 60)
      if (mode === 'shortBreak') setTimeLeft(newSettings.shortBreakMinutes * 60)
      if (mode === 'longBreak') setTimeLeft(newSettings.longBreakMinutes * 60)
    }
    toast.success('Đã lưu cài đặt')
  }

  // Save background theme and synchronize ambient sound
  const handleSelectBackground = (theme: BackgroundConfig) => {
    setBgConfig(theme)
    localStorage.setItem('pomodoro_bg_theme', JSON.stringify(theme))
    toast.success(`Đã đổi không gian: ${theme.name}`)

    // Sync ambient sound to match theme
    if (theme.id === 'rain' || theme.id === 'waves' || theme.id === 'fire' || theme.id === 'ticking') {
      soundManager.startAmbient(theme.id, settings.ambientVolume || 0.6)
      setAmbientSound(theme.id)
    }
  }

  // ── Quick Study Time Setting ──
  const handleSetStudyTime = (minutes: number) => {
    if (isRunning) {
      if (!confirm(`Đồng hồ đang chạy. Bạn có muốn đổi thời gian sang ${minutes} phút và bắt đầu lại?`)) {
        return
      }
      setIsRunning(false)
      endTimeRef.current = null
      if (timerRef.current) clearInterval(timerRef.current)
    }

    if (mode === 'pomodoro') {
      const updated = { ...settings, focusMinutes: minutes }
      setSettings(updated)
      localStorage.setItem('pomodoro_settings', JSON.stringify(updated))
      setTimeLeft(minutes * 60)
      toast.success(`Đã đặt thời gian học: ${minutes} phút`)
    } else if (mode === 'shortBreak') {
      const updated = { ...settings, shortBreakMinutes: minutes }
      setSettings(updated)
      localStorage.setItem('pomodoro_settings', JSON.stringify(updated))
      setTimeLeft(minutes * 60)
      toast.success(`Đã đặt nghỉ ngắn: ${minutes} phút`)
    } else {
      const updated = { ...settings, longBreakMinutes: minutes }
      setSettings(updated)
      localStorage.setItem('pomodoro_settings', JSON.stringify(updated))
      setTimeLeft(minutes * 60)
      toast.success(`Đã đặt nghỉ dài: ${minutes} phút`)
    }
    setShowCustomTimeInput(false)
  }

  // ── Timer Logic ──
  const switchMode = (newMode: TimerMode, autoStart = false) => {
    setMode(newMode)
    let minutes = settings.focusMinutes
    if (newMode === 'shortBreak') minutes = settings.shortBreakMinutes
    if (newMode === 'longBreak') minutes = settings.longBreakMinutes

    const seconds = minutes * 60
    setTimeLeft(seconds)
    setIsRunning(autoStart)

    if (autoStart) {
      endTimeRef.current = Date.now() + seconds * 1000
    } else {
      endTimeRef.current = null
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const handleStartPause = () => {
    soundManager.playClick()
    if (isRunning) {
      // Pause
      setIsRunning(false)
      endTimeRef.current = null
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      // Start
      setIsRunning(true)
      endTimeRef.current = Date.now() + timeLeft * 1000
    }
  }

  const handleSkip = () => {
    soundManager.playClick()
    if (!confirm('Bạn có muốn chuyển sang phiên tiếp theo?')) return
    onTimerComplete(false)
  }

  const handleReset = () => {
    soundManager.playClick()
    setIsRunning(false)
    endTimeRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)

    let minutes = settings.focusMinutes
    if (mode === 'shortBreak') minutes = settings.shortBreakMinutes
    if (mode === 'longBreak') minutes = settings.longBreakMinutes
    setTimeLeft(minutes * 60)
  }

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        if (!endTimeRef.current) return
        const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
        setTimeLeft(remaining)

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          setIsRunning(false)
          endTimeRef.current = null
          onTimerComplete(true)
        }
      }, 250)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, mode, settings, selectedGoalId, sessionCount, sessionNote])

  // Update browser document title
  useEffect(() => {
    const mins = Math.floor(timeLeft / 60)
    const secs = timeLeft % 60
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

    const activeGoal = goals.find((g) => g.id === selectedGoalId)
    const goalTitle = activeGoal ? activeGoal.title : 'Học tập'
    const modeLabel = mode === 'pomodoro' ? 'Pomodoro' : 'Nghỉ ngơi'

    document.title = `${timeStr} - ${goalTitle} (${modeLabel})`
  }, [timeLeft, mode, goals, selectedGoalId])

  // Timer complete handler
  const onTimerComplete = async (recordSession = true) => {
    // Play alarm sound
    if (settings.alarmSound === 'bell') {
      soundManager.playBell(settings.alarmVolume)
    } else {
      soundManager.playDing(settings.alarmVolume)
    }

    if (mode === 'pomodoro') {
      // Completed a focus session!
      const activeGoal = goals.find((g) => g.id === selectedGoalId)
      notificationManager.notifyPomodoroEnd(activeGoal?.title)
      notificationManager.recordActivity()

      if (recordSession) {
        try {
          const durationMins = settings.focusMinutes
          const res = await focusService.createSession({
            goal_id: selectedGoalId,
            duration_minutes: durationMins,
            session_date: format(new Date(), 'yyyy-MM-dd'),
            topic_note: sessionNote.trim() || 'Phiên học Pomodoro',
            source: 'pomodoro',
          })

          const activeGoal = goals.find((g) => g.id === selectedGoalId)
          const newCurrentHours = (activeGoal?.current_hours || 0) + res.duration_hours
          const targetHours = activeGoal?.target_hours || 0

          // Dopamine chime & pearl drop
          soundManager.playPearlDrop()
          const earnedPearls = Number((durationMins / 60).toFixed(1))
          toast.success(`🎉 +${earnedPearls} 💎 Ngọc Pha Lê được cộng vào lọ!`)

          if (targetHours > 0 && newCurrentHours >= targetHours && activeGoal) {
            setShowCelebration({
              title: activeGoal.title,
              hours: targetHours,
            })
            const checkRes = await focusService.checkConstellations()
            if (checkRes.newly_unlocked) {
              soundManager.playConstellationVictory()
              toast.success(`⭐ Khai mở Chòm Sao ${checkRes.newly_unlocked.title}!`)
            }
          }
          await loadData()
        } catch (err: any) {
          toast.error('Lỗi lưu phiên học: ' + err.message)
        }
      }

      // Next mode: short break or long break
      const isLongBreak = sessionCount % settings.longBreakInterval === 0
      const nextMode = isLongBreak ? 'longBreak' : 'shortBreak'
      setSessionCount((prev) => prev + 1)
      switchMode(nextMode, settings.autoStartBreaks)
    } else {
      // Finished a break -> back to pomodoro
      notificationManager.notifyBreakEnd()
      toast.info('Hết giờ nghỉ! Hãy sẵn sàng cho phiên tập trung mới nhé.')
      switchMode('pomodoro', settings.autoStartPomodoro)
    }
  }

  // ── Ambient sounds handler with automatic background synchronization ──
  const toggleAmbientSound = async (type: 'rain' | 'waves' | 'ticking' | 'fire') => {
    if (ambientSound === type) {
      soundManager.stopAmbient()
      setAmbientSound('none')
      toast.info('Đã tắt âm nền')
    } else {
      await soundManager.startAmbient(type, settings.ambientVolume || 0.6)
      setAmbientSound(type)

      // Automatically change to the corresponding beautiful wallpaper!
      const matching = PRESET_THEMES.find((t) => t.id === type)
      if (matching) {
        setBgConfig(matching)
        localStorage.setItem('pomodoro_bg_theme', JSON.stringify(matching))
      }

      const labels: Record<string, string> = {
        rain: 'Tiếng mưa rơi 🌧️ (Đã chuyển không gian Mưa)',
        waves: 'Tiếng sóng biển 🌊 (Đã chuyển không gian Biển)',
        ticking: 'Tiếng tích tắc ⏰ (Đã chuyển không gian Bàn học)',
        fire: 'Tiếng lò sưởi 🔥 (Đã chuyển không gian Lò sưởi)',
      }
      toast.success(labels[type] || `Đang phát: ${type}`)
    }
  }

  const handleAmbientVolumeChange = (vol: number) => {
    const updated = { ...settings, ambientVolume: vol }
    setSettings(updated)
    localStorage.setItem('pomodoro_settings', JSON.stringify(updated))
    soundManager.setAmbientVolume(vol)
  }

  // Cleanup ambient on unmount
  useEffect(() => {
    return () => {
      soundManager.stopAmbient()
    }
  }, [])

  // Format time
  const formatTimeDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Active Goal
  const activeGoal = useMemo(() => {
    return goals.find((g) => g.id === selectedGoalId) || goals[0] || null
  }, [goals, selectedGoalId])

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    if (goalFilter === 'active') return goals.filter((g) => !g.is_completed)
    if (goalFilter === 'completed') return goals.filter((g) => g.is_completed)
    return goals
  }, [goals, goalFilter])

  // Delete session
  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Bạn có chắc muốn xóa bản ghi này? Số giờ tương ứng sẽ được trừ lại.')) return
    try {
      await focusService.deleteSession(sessionId)
      toast.success('Đã xóa bản ghi')
      await loadData()
    } catch (err: any) {
      toast.error('Lỗi xóa: ' + err.message)
    }
  }

  const currentTheme = THEME_COLORS[mode]
  const currentPresets =
    mode === 'pomodoro'
      ? POMO_PRESETS
      : mode === 'shortBreak'
      ? SHORT_BREAK_PRESETS
      : LONG_BREAK_PRESETS
  const currentMinutesSetting =
    mode === 'pomodoro'
      ? settings.focusMinutes
      : mode === 'shortBreak'
      ? settings.shortBreakMinutes
      : settings.longBreakMinutes

  return (
    <div className="min-h-screen text-white relative selection:bg-white/30">
      {/* ── DYNAMIC BACKGROUND (ANIMATED / WALLPAPER / CANVAS) ── */}
      <DynamicBackground config={bgConfig} fallbackColor={currentTheme.bg} />

      {/* ── TOP NAVIGATION ── */}
      <header className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between border-b border-white/15 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl drop-shadow-md">🍅</span>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 drop-shadow-md">
            Pomodoro Goal
            <span className="text-[10px] font-normal uppercase px-2 py-0.5 bg-white/20 rounded-full tracking-wider backdrop-blur-sm">
              Local
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Crystal Pearls Reward Shop button */}
          <button
            onClick={() => setIsRewardShopOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-amber-500/80 to-amber-600/90 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl backdrop-blur-md transition active:scale-95 shadow-md shadow-amber-500/20 border border-amber-400/40"
            title="Mở Lọ Ngọc & Cửa Hàng Đổi Thưởng Thực Tế"
          >
            <span className="text-sm">💎</span>
            <span>{availablePearls.toFixed(1)}</span>
            <span className="hidden sm:inline">Ngọc</span>
          </button>

          {/* Time Capsule button */}
          <button
            onClick={() => setIsTimeCapsuleOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-md transition active:scale-95 shadow-sm"
            title="Hòm Thư Gửi Tương Lai (Milestone Capsules)"
          >
            <Mail className="w-4 h-4 text-pink-300" />
            <span className="hidden sm:inline">Hòm thư</span>
          </button>

          {/* Background picker button */}
          <button
            onClick={() => setIsBgPickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-md transition active:scale-95 shadow-sm"
            title="Đổi hình nền động / video / ảnh"
          >
            <ImageIcon className="w-4 h-4 text-purple-300" />
            <span className="hidden sm:inline">Hình nền</span>
          </button>

          {/* Quick manual log button */}
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-xl backdrop-blur-md transition active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ghi nhận giờ học</span>
            <span className="sm:hidden">+ Giờ</span>
          </button>

          {/* Cosmic Race Track Button */}
          <button
            onClick={() => setIsRaceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl backdrop-blur-md transition active:scale-95 shadow-md border border-cyan-400/40"
            title="Đường Đua Bạn Bè & Bảng Vàng Pomodoro"
          >
            <Trophy className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="hidden md:inline">Đường Đua</span>
          </button>

          {/* Admin Portal Button */}
          {currentUser?.is_admin && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black rounded-xl transition active:scale-95 shadow-md shadow-amber-500/20 border border-amber-300/40"
              title="Cổng Quản Trị Hệ Thống (Admin Portal)"
            >
              <Shield className="w-3.5 h-3.5 text-black" />
              <span className="hidden sm:inline">Quản Trị</span>
            </button>
          )}

          {/* User Profile / Auth Pill */}
          {currentUser ? (
            <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-xl px-2 py-1 backdrop-blur-md">
              <button
                onClick={() => setIsRaceModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-white hover:text-cyan-300 font-bold transition"
                title={`Đang đăng nhập: ${currentUser.display_name} (@${currentUser.username})`}
              >
                <span className="text-sm">
                  {currentUser.racer_avatar === 'cyber_car' ? '🏎️' :
                   currentUser.racer_avatar === 'quantum_saucer' ? '🛸' :
                   currentUser.racer_avatar === 'lightning' ? '⚡' :
                   currentUser.racer_avatar === 'lightcycle' ? '🏍️' : '🚀'}
                </span>
                <span className="max-w-[75px] truncate hidden sm:inline">{currentUser.display_name}</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-1 text-white/50 hover:text-rose-400 transition ml-0.5"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black rounded-xl transition active:scale-95 shadow-md"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Notification settings button */}
          <button
            onClick={() => setIsNotificationModalOpen(true)}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition backdrop-blur-md relative"
            title="Cài đặt thông báo & Nhắc nhở"
          >
            <Bell className="w-4 h-4 text-amber-300" />
            <span
              className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                notificationManager.getPermission() === 'granted'
                  ? 'bg-emerald-400'
                  : 'bg-amber-400'
              }`}
            />
          </button>

          {/* Settings button */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition backdrop-blur-md"
            title="Cài đặt Pomodoro"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-xl mx-auto px-4 pt-6 pb-16 relative z-10">
        {/* ── POMODORO TIMER CARD ── */}
        <div className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
          {/* Tabs: Pomodoro | Short Break | Long Break */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4">
            <button
              onClick={() => switchMode('pomodoro')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition ${
                mode === 'pomodoro'
                  ? 'bg-white text-black shadow-lg font-bold'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Pomodoro
            </button>
            <button
              onClick={() => switchMode('shortBreak')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition ${
                mode === 'shortBreak'
                  ? 'bg-white text-black shadow-lg font-bold'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Nghỉ ngắn
            </button>
            <button
              onClick={() => switchMode('longBreak')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition ${
                mode === 'longBreak'
                  ? 'bg-white text-black shadow-lg font-bold'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Nghỉ dài
            </button>
          </div>

          {/* ── QUICK STUDY TIME SELECTOR ROW ── */}
          <div className="flex items-center justify-center gap-1.5 mb-5 flex-wrap">
            <span className="text-[11px] text-white/50 mr-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Thời gian:
            </span>
            {currentPresets.map((m) => {
              const isActive = currentMinutesSetting === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSetStudyTime(m)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition border ${
                    isActive
                      ? 'bg-white/30 border-white text-white shadow-sm'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  {m}p
                </button>
              )
            })}

            {/* Custom Time Button */}
            <button
              type="button"
              onClick={() => {
                setCustomTimeMinutes(currentMinutesSetting)
                setShowCustomTimeInput(!showCustomTimeInput)
              }}
              className="px-2 py-1 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 transition"
              title="Nhập số phút tùy chỉnh"
            >
              Tùy chỉnh ✏️
            </button>
          </div>

          {/* Custom Time Input Popup */}
          {showCustomTimeInput && (
            <div className="mb-4 p-3 bg-black/60 border border-white/20 rounded-2xl max-w-xs mx-auto animate-in fade-in duration-150">
              <div className="text-xs text-white/80 mb-2">Nhập số phút muốn học:</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customTimeMinutes}
                  onChange={(e) => setCustomTimeMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 bg-black/40 border border-white/20 rounded-xl text-center text-sm font-bold text-white focus:outline-none focus:border-white"
                />
                <button
                  onClick={() => handleSetStudyTime(customTimeMinutes)}
                  className="px-3 py-1.5 bg-white text-black font-bold text-xs rounded-xl shadow hover:bg-white/90"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          )}

          {/* Big Digital Countdown */}
          <div className="my-5">
            <h2 className="text-7xl sm:text-8xl font-black tracking-tight font-mono drop-shadow-2xl select-none text-white">
              {formatTimeDisplay(timeLeft)}
            </h2>
          </div>

          {/* Main Controls: START / PAUSE + SKIP + RESET */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleStartPause}
              className="w-40 sm:w-48 py-3.5 sm:py-4 bg-white hover:bg-white/95 active:translate-y-1 text-black text-lg sm:text-xl font-black uppercase rounded-2xl shadow-2xl transition-all duration-150 flex items-center justify-center gap-2"
            >
              {isRunning ? (
                <>
                  <Pause className="w-6 h-6 fill-current" />
                  <span>TẠM DỪNG</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current" />
                  <span>BẮT ĐẦU</span>
                </>
              )}
            </button>

            {isRunning && (
              <button
                onClick={handleSkip}
                className="p-3.5 sm:p-4 bg-white/20 hover:bg-white/30 text-white rounded-2xl transition active:scale-95 backdrop-blur-sm"
                title="Bỏ qua phiên này"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            )}

            {!isRunning &&
              timeLeft !==
                (mode === 'pomodoro'
                  ? settings.focusMinutes * 60
                  : mode === 'shortBreak'
                  ? settings.shortBreakMinutes * 60
                  : settings.longBreakMinutes * 60) && (
                <button
                  onClick={handleReset}
                  className="p-3.5 sm:p-4 bg-white/20 hover:bg-white/30 text-white rounded-2xl transition active:scale-95 backdrop-blur-sm"
                  title="Đặt lại thời gian"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
          </div>

          {/* Session count info */}
          <div className="mt-4 text-xs text-white/70 font-medium">
            {mode === 'pomodoro'
              ? `#${sessionCount} - Phiên tập trung hiện tại (${settings.focusMinutes} phút)`
              : 'Thời gian nghỉ ngơi, hãy thư giãn mắt và uống nước!'}
          </div>

          {/* Ambient sound quick toggles */}
          <div className="mt-4 pt-3.5 border-t border-white/15 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-white/70 text-[11px] mr-1 flex items-center gap-1 font-medium">
              <Volume2 className="w-3.5 h-3.5 text-amber-300" /> Âm nền:
            </span>
            <button
              onClick={() => toggleAmbientSound('rain')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                ambientSound === 'rain'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-white/70 hover:bg-white/15'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" /> Mưa
            </button>
            <button
              onClick={() => toggleAmbientSound('waves')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                ambientSound === 'waves'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-white/70 hover:bg-white/15'
              }`}
            >
              <Waves className="w-3.5 h-3.5" /> Sóng
            </button>
            <button
              onClick={() => toggleAmbientSound('ticking')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                ambientSound === 'ticking'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-white/70 hover:bg-white/15'
              }`}
            >
              <TimerIcon className="w-3.5 h-3.5" /> Tích tắc
            </button>
            <button
              onClick={() => toggleAmbientSound('fire')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                ambientSound === 'fire'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-white/70 hover:bg-white/15'
              }`}
            >
              🔥 Lò sưởi
            </button>

            {ambientSound !== 'none' && (
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/20">
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={settings.ambientVolume}
                  onChange={(e) => handleAmbientVolumeChange(parseFloat(e.target.value))}
                  className="w-16 accent-amber-400 h-1 cursor-pointer"
                  title="Âm lượng âm nền"
                />
                <button
                  onClick={() => {
                    soundManager.stopAmbient()
                    setAmbientSound('none')
                  }}
                  className="p-1 text-white/50 hover:text-white"
                  title="Tắt âm nền"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── DAILY MOTIVATIONAL QUOTE CARD ("BUFF ĐỘNG LỰC") ── */}
        <div className="mt-5">
          <DailyQuoteCard />
        </div>

        {/* ── ACTIVE GOAL & TOPIC TRACKER ── */}
        <div className="mt-5 bg-black/35 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-white/80" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                Mục tiêu đang chọn
              </span>
            </div>

            {/* Quick dropdown for selecting active goal */}
            <select
              value={selectedGoalId || ''}
              onChange={(e) => setSelectedGoalId(e.target.value ? Number(e.target.value) : null)}
              className="bg-black/50 border border-white/25 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              {goals.length === 0 && <option value="">Chưa có mục tiêu</option>}
              {goals.map((g) => (
                <option key={g.id} value={g.id} className="bg-[#1F232B] text-white">
                  {g.title} ({g.current_hours}/{g.target_hours}h)
                </option>
              ))}
            </select>
          </div>

          {activeGoal ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold flex items-center gap-2">
                  {activeGoal.title}
                  {activeGoal.is_completed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-400 text-black text-[10px] font-bold rounded-full">
                      <Trophy className="w-3 h-3" /> DONE
                    </span>
                  )}
                </span>
                <span className="text-xs font-medium text-white/80">
                  {activeGoal.current_hours} / {activeGoal.target_hours} giờ ({activeGoal.progress_percent}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/15 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    activeGoal.is_completed
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                      : 'bg-white'
                  }`}
                  style={{ width: `${Math.min(100, activeGoal.progress_percent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/70">
                <span>
                  {activeGoal.is_completed
                    ? '🎉 Đã đạt mục tiêu đề ra!'
                    : `Còn ${activeGoal.remaining_hours} giờ nữa để về đích`}
                </span>
                <button
                  onClick={() => setIsManualModalOpen(true)}
                  className="text-white hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" /> Ghi thêm giờ offline
                </button>
              </div>

              {/* Focus Topic Note */}
              <div className="pt-2">
                <input
                  type="text"
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  placeholder="Ghi chú phiên này: ví dụ Nói tiếng Anh chủ đề Du lịch..."
                  className="w-full px-3 py-2 text-xs bg-black/30 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/60"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-white/80">
              Chưa có mục tiêu nào.{' '}
              <button
                onClick={() => setIsGoalModalOpen(true)}
                className="underline font-semibold text-white"
              >
                Tạo mục tiêu ngay (ví dụ 1000 giờ)
              </button>
            </div>
          )}
        </div>

        {/* ── DOPAMINE REWARD JAR MINI BANNER ── */}
        <div className="mt-4 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500/20 via-purple-500/15 to-indigo-500/20 border border-amber-400/30 rounded-2xl backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 text-base shadow-sm">
              💎
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200 flex items-center gap-2">
                <span>Lọ Ngọc Tích Lũy:</span>
                <span className="text-white text-sm font-extrabold">{availablePearls.toFixed(1)} viên</span>
              </div>
              <div className="text-[10px] text-white/60">
                1 giờ học = 1 ngọc • Đổi giờ xem phim, chơi game không lo tội lỗi!
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsRewardShopOpen(true)}
            className="text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black rounded-xl transition shadow-md flex items-center gap-1.5 flex-shrink-0 active:scale-95"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Đổi thưởng</span>
          </button>
        </div>

        {/* ── SECONDARY NAVIGATION TABS ── */}
        <div className="mt-8 flex items-center justify-center gap-1.5 sm:gap-2 border-b border-white/20 pb-2 flex-wrap">
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'goals'
                ? 'bg-white/25 text-white shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Mục tiêu lớn ({goals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'matrix'
                ? 'bg-gradient-to-r from-amber-500/30 to-rose-500/30 text-amber-200 border border-amber-400/40 shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-amber-300" />
            <span>Ma trận 4 Ô (Việc ngày)</span>
          </button>

          <button
            onClick={() => setActiveTab('galaxy')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'galaxy'
                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Orbit className="w-4 h-4 text-cyan-400" />
            <span>Thiên hà tri thức</span>
          </button>

          <button
            onClick={() => setActiveTab('timewarp')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'timewarp'
                ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40 shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Compass className="w-4 h-4 text-purple-400" />
            <span>Cỗ máy tương lai</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'logs'
                ? 'bg-white/25 text-white shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Nhật ký ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'stats'
                ? 'bg-white/25 text-white shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Thống kê</span>
          </button>
        </div>

        {/* ── TAB: DAILY 4-QUADRANT MATRIX ── */}
        {activeTab === 'matrix' && (
          <div className="mt-6 space-y-4 animate-in fade-in duration-200">
            <EisenhowerMatrixView
              onStartPomodoroWithGoal={(goalId) => {
                if (goalId) {
                  setSelectedGoalId(goalId)
                  const g = goals.find((item) => item.id === goalId)
                  if (g) setSessionNote(g.title)
                }
                window.scrollTo({ top: 0, behavior: 'smooth' })
                toast.info('Đã chuẩn bị phiên Pomodoro cho mục tiêu này! 🚀')
              }}
            />
          </div>
        )}

        {/* ── TAB: TOPIC GALAXY ── */}
        {activeTab === 'galaxy' && (
          <div className="mt-6 space-y-4 animate-in fade-in duration-200">
            <TopicGalaxyView />
          </div>
        )}

        {/* ── TAB: TIME WARP ORACLE & CAPSULES ── */}
        {activeTab === 'timewarp' && (
          <div className="mt-6 space-y-5 animate-in fade-in duration-200">
            <TimeWarpCard />

            <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-indigo-500/15 border border-amber-500/30 rounded-3xl p-5 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-200">
                    Hòm Thư Gửi Tương Lai (Milestone Capsules)
                  </h4>
                  <p className="text-xs text-white/70 mt-0.5">
                    Gửi tâm thư đến chính bạn khi cán mốc 10h, 50h, 100h, 500h, 1000h!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTimeCapsuleOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 flex-shrink-0 transition active:scale-95"
              >
                <Mail className="w-4 h-4" />
                <span>Mở Hòm Thư</span>
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 1: GOALS ── */}
        {activeTab === 'goals' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              {/* Filter pills */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setGoalFilter('all')}
                  className={`px-2.5 py-1 rounded-lg ${
                    goalFilter === 'all' ? 'bg-white/25 text-white font-medium' : 'text-white/70'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setGoalFilter('active')}
                  className={`px-2.5 py-1 rounded-lg ${
                    goalFilter === 'active' ? 'bg-white/25 text-white font-medium' : 'text-white/70'
                  }`}
                >
                  Đang học
                </button>
                <button
                  onClick={() => setGoalFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg ${
                    goalFilter === 'completed'
                      ? 'bg-white/25 text-white font-medium'
                      : 'text-white/70'
                  }`}
                >
                  Đã xong ({goals.filter((g) => g.is_completed).length})
                </button>
              </div>

              <button
                onClick={() => {
                  setGoalToEdit(null)
                  setIsGoalModalOpen(true)
                }}
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl font-medium flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm mục tiêu
              </button>
            </div>

            {filteredGoals.length === 0 ? (
              <div className="text-center py-8 bg-black/30 rounded-2xl border border-white/10 text-white/70 text-sm">
                Không có mục tiêu nào trong bộ lọc này.
              </div>
            ) : (
              filteredGoals.map((g) => (
                <div
                  key={g.id}
                  className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-2xl p-4 transition hover:border-white/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: g.color || '#E24A4A' }}
                        />
                        <h3 className="font-semibold text-base text-white">{g.title}</h3>
                        {g.is_completed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-400 text-black text-[10px] font-bold rounded-full">
                            <Trophy className="w-3 h-3" /> DONE
                          </span>
                        )}
                      </div>
                      {g.notes && <p className="text-xs text-white/70 mt-1">{g.notes}</p>}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedGoalId(g.id)
                          setIsManualModalOpen(true)
                        }}
                        className="p-1.5 text-white/80 hover:text-white bg-white/10 rounded-lg text-xs flex items-center gap-1"
                        title="Thêm giờ cho mục tiêu này"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ghi giờ</span>
                      </button>
                      <button
                        onClick={() => {
                          setGoalToEdit(g)
                          setIsGoalModalOpen(true)
                        }}
                        className="p-1.5 text-white/60 hover:text-white rounded-lg"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-white/80 mb-1">
                      <span>
                        {g.current_hours} / {g.target_hours} giờ
                      </span>
                      <span className="font-semibold">{g.progress_percent}%</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          g.is_completed
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                            : 'bg-white'
                        }`}
                        style={{ width: `${Math.min(100, g.progress_percent)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-white/60 text-right">
                      {g.is_completed
                        ? '🎉 Hoàn thành mục tiêu!'
                        : `Còn ${g.remaining_hours} giờ`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB 2: STUDY SESSIONS LOG ── */}
        {activeTab === 'logs' && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-white/80">
              <span>Lịch sử các buổi học (gần nhất)</span>
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="text-white hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm buổi học offline
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-8 bg-black/30 rounded-2xl border border-white/10 text-white/70 text-sm">
                Chưa có buổi học nào được ghi lại.
              </div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-2xl p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          s.source === 'pomodoro'
                            ? 'bg-red-500/30 text-red-200'
                            : 'bg-emerald-500/30 text-emerald-200'
                        }`}
                      >
                        {s.source === 'pomodoro' ? '🍅 Pomodoro' : '✍️ Thủ công'}
                      </span>
                      <span className="font-bold text-white text-sm">
                        +{s.duration_minutes} phút ({s.duration_hours}h)
                      </span>
                      <span className="text-white/60">
                        {format(new Date(s.session_date), 'dd/MM/yyyy')}
                      </span>
                    </div>

                    {s.goal_title && (
                      <div className="text-white/90 font-medium">
                        🎯 Mục tiêu: {s.goal_title}
                      </div>
                    )}

                    {s.topic_note && (
                      <p className="text-white/80 italic text-[11px] bg-black/40 px-2.5 py-1 rounded-lg">
                        "{s.topic_note}"
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="p-1.5 text-white/40 hover:text-red-300 rounded-lg hover:bg-red-500/20 transition"
                    title="Xóa buổi học này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB 3: STATS ── */}
        {activeTab === 'stats' && (
          <div className="mt-6 space-y-5">
            {/* 4 Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-center">
                <span className="text-[11px] text-white/70">Hôm nay</span>
                <p className="text-xl font-bold text-white mt-1">
                  {stats?.today_hours || 0} <span className="text-xs font-normal">giờ</span>
                </p>
              </div>
              <div className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-center">
                <span className="text-[11px] text-white/70">Tuần này</span>
                <p className="text-xl font-bold text-white mt-1">
                  {stats?.week_hours || 0} <span className="text-xs font-normal">giờ</span>
                </p>
              </div>
              <div className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-center">
                <span className="text-[11px] text-white/70">Tổng giờ</span>
                <p className="text-xl font-bold text-white mt-1">
                  {stats?.total_hours || 0} <span className="text-xs font-normal">giờ</span>
                </p>
              </div>
              <div className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-2xl p-3 text-center">
                <span className="text-[11px] text-white/70">Phiên Pomodoro</span>
                <p className="text-xl font-bold text-white mt-1">
                  {stats?.pomodoro_sessions || 0}
                </p>
              </div>
            </div>

            {/* Recharts 7-Day Chart */}
            <div className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-4">
                Giờ học 7 ngày qua
              </h4>
              <div className="h-44 w-full">
                {stats && stats.last_7_days.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.last_7_days}>
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.6)"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.6)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        unit="h"
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#1F232B',
                          borderColor: 'rgba(255,255,255,0.2)',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`${val} giờ`, 'Thời gian']}
                      />
                      <Bar dataKey="hours" fill="#ffffff" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-white/50">
                    Chưa có đủ dữ liệu
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── CELEBRATION MODAL (WHEN GOAL REACHED) ── */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#1F232B] border border-yellow-500/40 rounded-3xl p-8 max-w-sm w-full text-center text-white shadow-2xl relative overflow-hidden">
            <div className="text-5xl mb-3 animate-bounce">🎉</div>
            <h2 className="text-2xl font-black text-yellow-400 mb-1">XUẤT SẮC!</h2>
            <p className="text-sm text-white/80 mb-4">
              Bạn đã chính thức chinh phục đủ <strong>{showCelebration.hours} giờ</strong> của mục tiêu:
            </p>
            <div className="p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-2xl mb-6">
              <span className="font-bold text-yellow-300 text-base">
                🎯 {showCelebration.title}
              </span>
            </div>
            <button
              onClick={() => setShowCelebration(null)}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-2xl shadow-lg transition"
            >
              Tiếp tục phát huy!
            </button>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      <ManualLogModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        goals={goals}
        selectedGoalId={selectedGoalId}
        onSuccess={async (newHours, isCompleted, goalTitle) => {
          soundManager.playPearlDrop()
          toast.success('💎 Đã ghi nhận giờ học & cộng ngọc pha lê vào lọ!')
          if (isCompleted) {
            setShowCelebration({
              title: goalTitle,
              hours: newHours,
            })
            const checkRes = await focusService.checkConstellations()
            if (checkRes.newly_unlocked) {
              soundManager.playConstellationVictory()
              toast.success(`⭐ Khai mở Chòm Sao ${checkRes.newly_unlocked.title}!`)
            }
          }
          await loadData()
        }}
      />

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false)
          setGoalToEdit(null)
        }}
        goalToEdit={goalToEdit}
        onSuccess={loadData}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <BackgroundPickerModal
        isOpen={isBgPickerOpen}
        onClose={() => setIsBgPickerOpen(false)}
        currentConfig={bgConfig}
        onSelect={handleSelectBackground}
      />

      <RewardShopModal
        isOpen={isRewardShopOpen}
        onClose={() => setIsRewardShopOpen(false)}
        onRewardRedeemed={loadData}
      />

      <TimeCapsuleModal
        isOpen={isTimeCapsuleOpen}
        onClose={() => setIsTimeCapsuleOpen(false)}
        currentHours={stats?.total_hours || 0}
      />

      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(u) => {
          setCurrentUser(u)
          loadData()
        }}
      />

      <CosmicRaceTrackModal
        isOpen={isRaceModalOpen}
        onClose={() => setIsRaceModalOpen(false)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
      />

      {/* ── AI FLOATING BUDDY COMPANION ── */}
      <AIFloatingBuddy
        isTimerRunning={isRunning}
        onAction={(actionType, target, goalId) => {
          if (actionType === 'start_pomodoro') {
            if (goalId) {
              setSelectedGoalId(goalId)
              const g = goals.find((item) => item.id === goalId)
              if (g) setSessionNote(g.title)
            }
            window.scrollTo({ top: 0, behavior: 'smooth' })
            if (!isRunning) {
              handleStartPause()
            }
          } else if (actionType === 'open_matrix' || actionType === 'plan_tomorrow') {
            setActiveTab('matrix')
            window.scrollTo({ top: 400, behavior: 'smooth' })
          }
        }}
      />
    </div>
  )
}
