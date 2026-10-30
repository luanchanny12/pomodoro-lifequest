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
  Lock,
  Rocket,
  Tv,
  Maximize2,
  Smartphone,
  Brain,
  Radio,
  ChevronDown,
  Flame,
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
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal'
import { CosmicRaceTrackModal } from '@/components/race/CosmicRaceTrackModal'
import { CheerCelebrationModal } from '@/components/race/CheerCelebrationModal'
import { raceService, CheerItem } from '@/services/raceService'
import { DonateModal } from '@/components/common/DonateModal'
import { FeedbackModal } from '@/components/common/FeedbackModal'
import { Footer } from '@/components/common/Footer'
import { pipTimerManager } from '@/utils/pipTimer'
import { ZenDeskClockModal } from '@/components/pomodoro/ZenDeskClockModal'
import { CloudStatusBanner } from '@/components/common/CloudStatusBanner'
import { usePWAInstall } from '@/utils/usePWAInstall'
import { ShareableAchievementModal } from '@/components/pomodoro/ShareableAchievementModal'
import { authService, UserProfile } from '@/services/authService'
import { notificationManager } from '@/utils/notificationManager'
import { trackVisit } from '@/utils/analytics'

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

function GuestFeatureLockCard({
  tab,
  onOpenAuth,
}: {
  tab: 'goals' | 'matrix' | 'galaxy' | 'timewarp' | 'logs' | 'stats'
  onOpenAuth: () => void
}) {
  const tabInfo: Record<
    string,
    { title: string; desc: string; icon: React.ReactNode; color: string }
  > = {
    goals: {
      title: 'Mở Khóa Quản Lý Mục Tiêu 1000 Giờ',
      desc: 'Tạo các môn học, kỹ năng cần chinh phục, đo lường từng giờ học tập trung và thắp sáng chòm sao thiên hà của riêng bạn.',
      icon: <Target className="w-7 h-7 text-cyan-400" />,
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30',
    },
    matrix: {
      title: 'Mở Khóa Ma Trận 4 Ô Eisenhower',
      desc: 'Lên kế hoạch việc ngày thông minh theo mức độ Khẩn Cấp & Quan Trọng, tích hợp ghi chú phản tư cá nhân.',
      icon: <LayoutGrid className="w-7 h-7 text-amber-400" />,
      color: 'from-amber-500/20 to-rose-500/10 border-amber-500/30',
    },
    galaxy: {
      title: 'Mở Khóa Thiên Hà Tri Thức & Chòm Sao',
      desc: 'Xây dựng hệ mặt trời kiến thức của riêng bạn, biến mỗi giờ học thành một tinh cầu phát sáng rực rỡ.',
      icon: <Orbit className="w-7 h-7 text-purple-400" />,
      color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30',
    },
    timewarp: {
      title: 'Mở Khóa Hòm Thư Gửi Tương Lai',
      desc: 'Gửi những lá thư động viên đến chính bạn khi đạt các cột mốc 10h, 50h, 100h, 500h và 1000h tập trung.',
      icon: <Mail className="w-7 h-7 text-rose-400" />,
      color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30',
    },
    logs: {
      title: 'Mở Khóa Lịch Sử Phiên Học Pomodoro',
      desc: 'Lưu vết tự động từng buổi học, thời gian, chủ đề và nhật ký tiến bộ xuyên suốt hành trình.',
      icon: <BookOpen className="w-7 h-7 text-emerald-400" />,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
    },
    stats: {
      title: 'Mở Khóa Biểu Đồ & Báo Cáo Thống Kê',
      desc: 'Theo dõi tổng số giờ học tuần, tháng, tỷ lệ tập trung cao điểm và chuỗi ngày rèn luyện liên tục.',
      icon: <BarChart3 className="w-7 h-7 text-yellow-400" />,
      color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30',
    },
  }

  const current = tabInfo[tab] || tabInfo.goals

  return (
    <div className={`mt-6 bg-gradient-to-b ${current.color} bg-[#0c101a] border rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in duration-300`}>
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-black/50 border border-white/20 flex items-center justify-center shadow-lg">
          {current.icon}
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 inline-block mb-2">
            🔒 Tính Năng Dành Cho Thành Viên
          </span>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {current.title}
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {current.desc}
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-7 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-xs sm:text-sm transition active:scale-95 shadow-xl shadow-amber-400/20 flex items-center justify-center gap-2 mx-auto"
          >
            <Rocket className="w-4 h-4 text-black" />
            <span>Tạo Tài Khoản / Đăng Nhập Miễn Phí</span>
          </button>
          <p className="text-[10px] text-white/50 mt-2">
            ⚡ Chỉ mất 10 giây để nhận Siêu Xe Đua riêng và bắt đầu so tài cùng bạn bè!
          </p>
        </div>
      </div>
    </div>
  )
}

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
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'waves' | 'ticking' | 'fire' | 'binaural' | 'lofi'>('none')

  // PWA Install hook
  const { canInstall, installPWA } = usePWAInstall()

  // Zen Desk Clock & Floating PiP state
  const [isZenClockOpen, setIsZenClockOpen] = useState<boolean>(false)
  const [isPipActive, setIsPipActive] = useState<boolean>(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

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
  const [isDonateModalOpen, setIsDonateModalOpen] = useState<boolean>(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser())
  const [goalToEdit, setGoalToEdit] = useState<StudyGoal | null>(null)

  // Cheer Delivery & Anti-Double-Click state
  const [unreadCheers, setUnreadCheers] = useState<CheerItem[]>([])
  const [isCheerModalOpen, setIsCheerModalOpen] = useState<boolean>(false)
  const [isTimerToggling, setIsTimerToggling] = useState<boolean>(false)

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
    if (!currentUser) {
      setGoals([])
      setSessions([])
      setStats(null)
      setAvailablePearls(0)
      return
    }
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
    focusService.syncPendingSessions().catch(() => {})
  }, [currentUser])

  // Track visit for analytics
  useEffect(() => {
    trackVisit()
  }, [])

  // Close profile menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scheduled background notifications check (Golden hours & inactivity)
  useEffect(() => {
    const reminderInterval = setInterval(() => {
      notificationManager.checkScheduledReminders()
    }, 30 * 1000)
    return () => clearInterval(reminderInterval)
  }, [])

  // Check auth session & listen for session expiration
  useEffect(() => {
    if (authService.getToken()) {
      authService
        .getMe()
        .then(setCurrentUser)
        .catch(() => {
          authService.logout()
          setCurrentUser(null)
        })
    }

    const handleAuthExpired = () => {
      setCurrentUser(null)
      toast.error('Phiên đăng nhập đã hết hạn hoặc không còn tồn tại. Vui lòng đăng nhập lại!')
    }

    window.addEventListener('pomodoro_auth_expired', handleAuthExpired)
    return () => window.removeEventListener('pomodoro_auth_expired', handleAuthExpired)
  }, [])

  // Check unread cheers from admin/friends
  useEffect(() => {
    if (currentUser) {
      raceService
        .getUnreadCheers()
        .then((res) => {
          if (res && res.unread_count > 0) {
            setUnreadCheers(res.cheers)
            setIsCheerModalOpen(true)
          }
        })
        .catch(() => {})
    } else {
      setUnreadCheers([])
    }
  }, [currentUser])

  const handleAcknowledgeAllCheers = async () => {
    try {
      await raceService.markAllCheersAsRead()
      setUnreadCheers([])
      setIsCheerModalOpen(false)
      toast.success('Đã tiếp nhận toàn bộ năng lượng cổ vũ! Chúc bạn học tốt! 🔥')
    } catch {
      setIsCheerModalOpen(false)
    }
  }

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

  const lastTimerToggleRef = useRef<number>(0)
  const handleStartPause = () => {
    const now = Date.now()
    if (now - lastTimerToggleRef.current < 350) return // Chống nhấp đúp
    lastTimerToggleRef.current = now

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

  // Sync Picture-in-Picture Floating Window
  useEffect(() => {
    if (pipTimerManager.isActive()) {
      const mins = Math.floor(timeLeft / 60)
      const secs = timeLeft % 60
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      const activeGoal = goals.find((g) => g.id === selectedGoalId)
      const goalTitle = activeGoal ? activeGoal.title : 'Học tập'
      const totalSecs = (mode === 'pomodoro' ? settings.focusMinutes : mode === 'shortBreak' ? settings.shortBreakMinutes : settings.longBreakMinutes) * 60
      const progressPercent = totalSecs > 0 ? ((totalSecs - timeLeft) / totalSecs) * 100 : 0

      pipTimerManager.update({
        timeStr,
        progressPercent,
        modeLabel: mode === 'pomodoro' ? 'Pomodoro' : mode === 'shortBreak' ? 'Nghỉ ngắn' : 'Nghỉ dài',
        topicNote: sessionNote || goalTitle || 'Tập trung học tập',
        isRunning,
      })
    }
  }, [timeLeft, mode, isRunning, goals, selectedGoalId, sessionNote, settings])

  // Cleanup PiP on unmount
  useEffect(() => {
    return () => {
      pipTimerManager.stop()
    }
  }, [])

  // Toggle PiP Floating Window
  const handleTogglePip = async () => {
    // Tự động phát hiện điện thoại / mobile: PiP từ canvas stream không được hỗ trợ trên mobile và ném AbortError
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    if (isMobile) {
      setIsZenClockOpen(true)
      toast.info('📱 Chế độ PiP cửa sổ nổi chỉ hỗ trợ trên Máy tính. Đã tự động bật Đồng hồ để bàn Zen Clock toàn màn hình cho điện thoại của bạn!', { duration: 4500 })
      return
    }

    try {
      const mins = Math.floor(timeLeft / 60)
      const secs = timeLeft % 60
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      const activeGoal = goals.find((g) => g.id === selectedGoalId)
      const goalTitle = activeGoal ? activeGoal.title : 'Học tập'
      const totalSecs = (mode === 'pomodoro' ? settings.focusMinutes : mode === 'shortBreak' ? settings.shortBreakMinutes : settings.longBreakMinutes) * 60
      const progressPercent = totalSecs > 0 ? ((totalSecs - timeLeft) / totalSecs) * 100 : 0

      const active = await pipTimerManager.togglePip(
        {
          timeStr,
          progressPercent,
          modeLabel: mode === 'pomodoro' ? 'Pomodoro' : mode === 'shortBreak' ? 'Nghỉ ngắn' : 'Nghỉ dài',
          topicNote: sessionNote || goalTitle || 'Tập trung học tập',
          isRunning,
        },
        () => {
          handleStartPause()
        },
        () => {
          setIsPipActive(false)
        }
      )
      setIsPipActive(active)
      if (active) {
        toast.success('Đã mở cửa sổ nổi ghim trên màn hình! 🖥️')
      } else {
        toast.info('Đã thu hồi cửa sổ nổi')
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('aborted') || isMobile) {
        setIsZenClockOpen(true)
        toast.info('📱 Trình duyệt điện thoại đã tự động chuyển sang chế độ Đồng hồ Zen Desk Clock toàn màn hình!', { duration: 4500 })
        return
      }
      toast.error(err.message || 'Không thể mở cửa sổ nổi')
    }
  }

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

      if (!currentUser) {
        soundManager.playPearlDrop()
        toast.success('🎉 Tuyệt vời! Bạn vừa hoàn thành 1 phiên tập trung! Hãy tạo tài khoản để lưu kỷ lục vào Đường Đua bạn bè!')
      } else if (recordSession) {
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
  const toggleAmbientSound = async (type: 'rain' | 'waves' | 'ticking' | 'fire' | 'binaural' | 'lofi') => {
    if (ambientSound === type) {
      soundManager.stopAmbient()
      setAmbientSound('none')
      toast.info('Đã tắt âm nền')
    } else {
      await soundManager.startAmbient(type, settings.ambientVolume || 0.6)
      setAmbientSound(type)

      // Automatically change to the corresponding beautiful wallpaper!
      let matching = PRESET_THEMES.find((t) => t.id === type)
      if (!matching && type === 'binaural') {
        matching = PRESET_THEMES.find((t) => t.id === 'cyberpunk')
      } else if (!matching && type === 'lofi') {
        matching = PRESET_THEMES.find((t) => t.id === 'lofi')
      }

      if (matching) {
        setBgConfig(matching)
        localStorage.setItem('pomodoro_bg_theme', JSON.stringify(matching))
      }

      const labels: Record<string, string> = {
        rain: 'Tiếng mưa rơi 🌧️ (Đã chuyển không gian Mưa)',
        waves: 'Tiếng sóng biển 🌊 (Đã chuyển không gian Biển)',
        ticking: 'Tiếng tích tắc ⏰ (Đã chuyển không gian Bàn học)',
        fire: 'Tiếng lò sưởi 🔥 (Đã chuyển không gian Lò sưởi)',
        binaural: 'Sóng não Gamma 40Hz 🧠 (Kích hoạt tập trung sâu & trí nhớ)',
        lofi: 'Lo-Fi Chill Cozy 🎵 (Hợp âm thư giãn êm ái & tiếng đĩa than)',
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

      {/* ── FLOATING GLASS ISLAND TOP NAVIGATION ── */}
      <header className="max-w-5xl mx-auto px-4 pt-3 pb-1 relative z-30">
        <div className="bg-black/45 backdrop-blur-2xl border border-white/15 rounded-3xl px-4 sm:px-6 py-2.5 shadow-2xl flex items-center justify-between gap-3">
          {/* Brand logo & Streak */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-lg shadow-lg shadow-cyan-500/20 font-black text-black flex-shrink-0">
              ⌛
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-tight leading-none flex items-center gap-1.5">
                <span className="bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                  LifeQuest
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 font-mono font-bold border border-cyan-400/30">
                  3.0
                </span>
              </div>
              {currentUser ? (
                <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5 mt-0.5">
                  <span>🔥 {currentUser.streak || 1}d streak</span>
                  <span className="text-white/30">•</span>
                  <span className="text-cyan-300 font-mono text-[10px]">Lv.{currentUser.level || 1}</span>
                </div>
              ) : (
                <div className="text-[10px] text-white/50 mt-0.5">Khách tập trung tự do</div>
              )}
            </div>
          </div>

          {/* Quick Actions & Profile Dropdown */}
          <div className="flex items-center gap-2">
            {/* Quick manual log button (Desktop) */}
            <button
              onClick={() => {
                if (!currentUser) {
                  toast.info('Vui lòng đăng nhập để ghi nhận giờ học vào mục tiêu cá nhân!')
                  setIsAuthModalOpen(true)
                  return
                }
                setIsManualModalOpen(true)
              }}
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition active:scale-95"
              title="Ghi nhận giờ học offline"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ghi giờ</span>
            </button>

            {/* Shareable Achievement Button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-xs font-bold transition active:scale-95 shadow-sm"
              title="Khoe Bảng Vàng Chiến Tích"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Khoe Bảng Vàng</span>
            </button>

            {/* Cheer Messages Bell/Flame */}
            {currentUser && (
              <button
                onClick={() => {
                  if (unreadCheers.length > 0) {
                    setIsCheerModalOpen(true)
                  } else {
                    raceService.getMyRecentCheers().then((logs) => {
                      if (logs && logs.length > 0) {
                        setUnreadCheers(logs)
                        setIsCheerModalOpen(true)
                      } else {
                        toast.info(`Bạn đã nhận ${currentUser.cheer_count || 0} lượt cổ vũ! 🔥 Tiếp tục giữ vững phong độ nhé!`)
                      }
                    })
                  }
                }}
                className="relative p-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 transition active:scale-95 flex items-center justify-center min-w-[36px] min-h-[36px]"
                title="Lời cổ vũ & Tiếp lửa từ Admin / Bạn bè"
              >
                <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
                {unreadCheers.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center animate-bounce shadow">
                    {unreadCheers.length}
                  </span>
                )}
              </button>
            )}

            {/* Cosmic Race Track Button (Main CTA) */}
            <button
              onClick={() => setIsRaceModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/25 border border-cyan-400/40 transition active:scale-95"
              title="Đường Đua Bạn Bè & Bảng Vàng Pomodoro"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="hidden sm:inline">Đường Đua F1</span>
              <span className="sm:hidden">Đua F1</span>
            </button>

            {/* User Profile Avatar Capsule or Login Button */}
            {currentUser ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 transition active:scale-95 text-xs shadow-sm"
                  title="Menu tài khoản & Cài đặt"
                >
                  <span className="text-base leading-none">
                    {currentUser.racer_avatar === 'cyber_car' ? '🏎️' :
                     currentUser.racer_avatar === 'quantum_saucer' ? '🛸' :
                     currentUser.racer_avatar === 'lightning' ? '⚡' :
                     currentUser.racer_avatar === 'lightcycle' ? '🏍️' : '🚀'}
                  </span>
                  <span className="font-bold text-white max-w-[80px] truncate hidden md:inline">
                    {currentUser.display_name}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0f1422]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                    {/* User Profile Mini Header */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 mb-1.5">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white truncate">{currentUser.display_name}</div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                          Lv.{currentUser.level || 1}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/50 font-mono">@{currentUser.username}</div>
                    </div>

                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setIsManualModalOpen(true)
                          setIsProfileMenuOpen(false)
                        }}
                        className="w-full px-2.5 py-2 rounded-xl text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 transition"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ghi nhận giờ học offline</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsBgPickerOpen(true)
                          setIsProfileMenuOpen(false)
                        }}
                        className="w-full px-2.5 py-2 rounded-xl text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 transition"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                        <span>Đổi không gian & hình nền</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsTimeCapsuleOpen(true)
                          setIsProfileMenuOpen(false)
                        }}
                        className="w-full px-2.5 py-2 rounded-xl text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 transition"
                      >
                        <Mail className="w-3.5 h-3.5 text-pink-400" />
                        <span>Hòm thư gửi tương lai</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsNotificationModalOpen(true)
                          setIsProfileMenuOpen(false)
                        }}
                        className="w-full px-2.5 py-2 rounded-xl text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 transition"
                      >
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                        <span>Cài đặt thông báo & Telegram</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsSettingsModalOpen(true)
                          setIsProfileMenuOpen(false)
                        }}
                        className="w-full px-2.5 py-2 rounded-xl text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 transition"
                      >
                        <SettingsIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Cài đặt Pomodoro & Chuông</span>
                      </button>

                      {canInstall && (
                        <button
                          onClick={() => {
                            installPWA()
                            setIsProfileMenuOpen(false)
                          }}
                          className="w-full px-2.5 py-2 rounded-xl text-left text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-2 transition"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Cài đặt App ra màn hình chính</span>
                        </button>
                      )}

                      {currentUser.is_admin && (
                        <button
                          onClick={() => {
                            navigate('/admin')
                            setIsProfileMenuOpen(false)
                          }}
                          className="w-full px-2.5 py-2 rounded-xl text-left text-amber-300 font-bold hover:bg-amber-500/20 flex items-center gap-2 transition"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Cổng Quản Trị Viên (Admin)</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsChangePasswordOpen(true)
                          setIsProfileMenuOpen(false)
                        }}
                        className="w-full px-2.5 py-2 rounded-xl text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 transition"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-300" />
                        <span>Đổi mật khẩu</span>
                      </button>

                      <div className="my-1 border-t border-white/10" />

                      <button
                        onClick={() => {
                          handleLogout()
                          setIsProfileMenuOpen(false)
                        }}
                        className="w-full px-2.5 py-2 rounded-xl text-left text-rose-400 hover:bg-rose-500/20 flex items-center gap-2 transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black rounded-xl transition active:scale-95 shadow-md"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-xl mx-auto px-4 pt-6 pb-16 relative z-10">
        {/* ── POMODORO TIMER CARD (CYBER FOCUS COCKPIT) ── */}
        <div className="bg-[#0b0f19]/80 backdrop-blur-2xl border border-white/20 hover:border-cyan-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden transition-all duration-300">
          {/* Top Bar inside Card: Session Info on Left, PiP & Zen on Right */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>#{sessionCount} {mode === 'pomodoro' ? 'Phiên tập trung' : 'Phiên nghỉ ngơi'}</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleTogglePip}
                className={`p-2 rounded-xl transition backdrop-blur-md border flex items-center gap-1 text-xs active:scale-95 ${
                  isPipActive
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400'
                    : 'bg-white/10 hover:bg-white/20 border-white/10 text-white/80 hover:text-white'
                }`}
                title="Cửa sổ nổi ghim trên mọi ứng dụng khi lướt web / code (Picture-in-Picture)"
              >
                <Tv className="w-3.5 h-3.5 text-cyan-300" />
                <span className="hidden sm:inline text-[11px] font-bold">Nổi</span>
              </button>
              <button
                onClick={() => setIsZenClockOpen(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition backdrop-blur-md border border-white/10 flex items-center gap-1 text-xs active:scale-95"
                title="Chế độ toàn màn hình đồng hồ để bàn (Zen Desk Clock - giữ màn hình luôn sáng)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline text-[11px] font-bold">Zen</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher: Segmented Sliding Pill */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-black/50 border border-white/15 mb-4 shadow-inner">
            <button
              onClick={() => switchMode('pomodoro')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-200 ${
                mode === 'pomodoro'
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/25'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Pomodoro
            </button>
            <button
              onClick={() => switchMode('shortBreak')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
                mode === 'shortBreak'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Nghỉ ngắn
            </button>
            <button
              onClick={() => switchMode('longBreak')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
                mode === 'longBreak'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Nghỉ dài
            </button>
          </div>

          {/* ── QUICK STUDY TIME SELECTOR ROW ── */}
          <div className="flex items-center justify-center gap-1.5 mb-5 flex-wrap">
            <span className="text-[11px] text-white/50 mr-1 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-cyan-400" /> Thời gian:
            </span>
            {currentPresets.map((m) => {
              const isActive = currentMinutesSetting === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSetStudyTime(m)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl transition border ${
                    isActive
                      ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20'
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
              className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 transition"
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
          <div className="my-4 sm:my-5 relative select-none">
            <h2 className="text-7xl sm:text-8xl font-black tracking-tighter font-mono drop-shadow-[0_0_35px_rgba(255,255,255,0.4)] text-white">
              {formatTimeDisplay(timeLeft)}
            </h2>
            {selectedGoalId && (
              <div className="text-xs text-cyan-300 font-semibold mt-1 flex items-center justify-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span className="text-white/90 truncate max-w-xs">{goals.find((g) => g.id === selectedGoalId)?.title}</span>
              </div>
            )}
          </div>

          {/* Main Controls: START / PAUSE + SKIP + RESET */}
          <div className="flex items-center justify-center gap-3 my-2">
            <button
              onClick={handleStartPause}
              className="w-44 sm:w-52 py-3.5 sm:py-4 bg-gradient-to-r from-white via-slate-100 to-slate-200 hover:from-white hover:to-white text-black text-lg sm:text-xl font-black uppercase rounded-2xl shadow-2xl hover:shadow-cyan-500/25 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
            >
              {isRunning ? (
                <>
                  <Pause className="w-6 h-6 fill-current text-rose-600" />
                  <span>TẠM DỪNG</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current text-cyan-600" />
                  <span>BẮT ĐẦU</span>
                </>
              )}
            </button>

            {isRunning && (
              <button
                onClick={handleSkip}
                className="p-3.5 sm:p-4 bg-white/15 hover:bg-white/25 text-white rounded-2xl transition active:scale-95 border border-white/15 shadow-sm"
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
                  className="p-3.5 sm:p-4 bg-white/15 hover:bg-white/25 text-white rounded-2xl transition active:scale-95 border border-white/15 shadow-sm"
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
              className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
                ambientSound === 'rain'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-white/70 hover:bg-white/15'
              }`}
            >
              <CloudRain className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Mưa
            </button>
            <button
              onClick={() => toggleAmbientSound('waves')}
              className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
                ambientSound === 'waves'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-white/70 hover:bg-white/15'
              }`}
            >
              <Waves className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Sóng
            </button>
            <button
              onClick={() => toggleAmbientSound('ticking')}
              className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
                ambientSound === 'ticking'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-white/70 hover:bg-white/15'
              }`}
            >
              <TimerIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Tích tắc
            </button>
            <button
              onClick={() => toggleAmbientSound('fire')}
              className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
                ambientSound === 'fire'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-white/70 hover:bg-white/15'
              }`}
            >
              🔥 Lò sưởi
            </button>
            <button
              onClick={() => toggleAmbientSound('binaural')}
              className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
                ambientSound === 'binaural'
                  ? 'bg-cyan-400 text-black font-bold shadow'
                  : 'text-white/70 hover:bg-white/15'
              }`}
              title="Sóng não Gamma 40Hz kích hoạt tập trung sâu & trí nhớ"
            >
              <Brain className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-cyan-300" /> Sóng 40Hz
            </button>
            <button
              onClick={() => toggleAmbientSound('lofi')}
              className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
                ambientSound === 'lofi'
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-white/70 hover:bg-white/15'
              }`}
              title="Lo-Fi Chill Cozy thư giãn với tiếng đĩa than"
            >
              <Radio className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-300" /> Lo-Fi Chill
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

        {/* ── UNIFIED EPIC QUEST & CRYSTAL DOPAMINE CARD ── */}
        <div className="mt-5 bg-[#0b0f19]/80 backdrop-blur-2xl border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-all">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            {/* Left 2 cols: Goal & Progress */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-amber-400/20 text-amber-300 text-sm shadow-sm">
                    <Target className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-200">
                    Nhiệm Vụ Mục Tiêu
                  </span>
                </div>

                <select
                  value={selectedGoalId || ''}
                  onChange={(e) => setSelectedGoalId(e.target.value ? Number(e.target.value) : null)}
                  className="bg-black/60 border border-white/20 rounded-xl px-3 py-1 text-xs text-white focus:outline-none max-w-[200px] truncate"
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
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span>{activeGoal.title}</span>
                      {activeGoal.is_completed && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          DONE 🏆
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-cyan-300 font-extrabold">
                      {activeGoal.current_hours} / {activeGoal.target_hours}h ({activeGoal.progress_percent}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-800/80 rounded-full h-3 p-0.5 border border-white/15 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, activeGoal.progress_percent)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/60">
                    <span>
                      {activeGoal.is_completed
                        ? '🎉 Đã đạt mục tiêu đề ra!'
                        : `Còn ${activeGoal.remaining_hours} giờ nữa để về đích`}
                    </span>
                    <button
                      onClick={() => setIsManualModalOpen(true)}
                      className="text-cyan-300 hover:underline flex items-center gap-1.5 font-medium py-1.5 px-2 rounded-lg hover:bg-white/5 active:scale-95 transition"
                    >
                      <Plus className="w-4 h-4" /> Ghi thêm giờ offline
                    </button>
                  </div>
                </div>
              ) : !currentUser ? (
                <div className="text-center py-4 text-xs text-white/80 bg-white/5 rounded-2xl border border-white/10">
                  🔒 Đang ở chế độ Khách tập trung tự do.{' '}
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="underline font-bold text-amber-300 hover:text-amber-200"
                  >
                    Đăng nhập để lưu tiến độ 1000h
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-white/80 bg-white/5 rounded-2xl border border-white/10">
                  Chưa có mục tiêu nào.{' '}
                  <button
                    onClick={() => setIsGoalModalOpen(true)}
                    className="underline font-semibold text-white"
                  >
                    Tạo mục tiêu ngay
                  </button>
                </div>
              )}

              {/* Focus Topic Note */}
              <div>
                <input
                  type="text"
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  placeholder="Ghi chú phiên này: ví dụ Nói tiếng Anh chủ đề Du lịch..."
                  className="w-full px-3.5 py-2 text-xs bg-black/40 border border-white/15 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>
            </div>

            {/* Right col: 3D Crystal Pearl Jar */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 via-purple-500/15 to-indigo-500/15 border border-amber-400/30 text-center relative overflow-hidden flex flex-col items-center justify-center">
              <div className="text-3xl animate-bounce">💎</div>
              <div className="text-xs font-black text-amber-200 mt-1">Lọ Ngọc Dopamine</div>
              <div className="text-xl font-black font-mono text-white mt-0.5">
                {currentUser ? availablePearls.toFixed(1) : 0} <span className="text-xs font-normal text-amber-300">viên</span>
              </div>
              <p className="text-[10px] text-white/60 mt-1 leading-tight">
                1 giờ học = 1 ngọc • Đổi giờ xem phim, chơi game không lo tội lỗi!
              </p>
              <button
                onClick={() => {
                  if (!currentUser) {
                    toast.info('Vui lòng đăng nhập để mở Cửa Hàng Đổi Thưởng!')
                    setIsAuthModalOpen(true)
                    return
                  }
                  setIsRewardShopOpen(true)
                }}
                className="mt-3 px-3 py-1.5 w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Đổi Thưởng {!currentUser && '🔒'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── SECONDARY NAVIGATION TABS (MACOS DOCK STYLE) ── */}
        <div className="mt-8 p-1.5 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/15 flex items-center gap-1.5 overflow-x-auto no-scrollbar justify-start sm:justify-center shadow-xl">
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0 ${
              activeTab === 'goals'
                ? 'bg-white text-black shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Target className="w-4 h-4 text-rose-500" />
            <span>Mục tiêu lớn {!currentUser ? '🔒' : `(${goals.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0 ${
              activeTab === 'matrix'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/25'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-amber-300" />
            <span>Ma trận 4 Ô {!currentUser ? '🔒' : '(Việc ngày)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('galaxy')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0 ${
              activeTab === 'galaxy'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Orbit className="w-4 h-4 text-cyan-300" />
            <span>Thiên hà tri thức {!currentUser && '🔒'}</span>
          </button>

          <button
            onClick={() => setActiveTab('timewarp')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0 ${
              activeTab === 'timewarp'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Compass className="w-4 h-4 text-purple-300" />
            <span>Cỗ máy tương lai {!currentUser && '🔒'}</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0 ${
              activeTab === 'logs'
                ? 'bg-white text-black shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>Nhật ký {!currentUser ? '🔒' : `(${sessions.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0 ${
              activeTab === 'stats'
                ? 'bg-white text-black shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Thống kê {!currentUser && '🔒'}</span>
          </button>
        </div>

        {/* ── TAB PANELS (GUEST FEATURE GATED) ── */}
        {!currentUser ? (
          <GuestFeatureLockCard
            tab={activeTab}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        ) : (
          <>
            {/* ── TAB: DAILY 4-QUADRANT MATRIX ── */}
        {activeTab === 'matrix' && (
          <div className="mt-6 space-y-4 animate-in fade-in duration-200">
            <EisenhowerMatrixView
              onStartPomodoroWithGoal={(goalId, taskTitle) => {
                if (goalId) {
                  setSelectedGoalId(goalId)
                  const g = goals.find((item) => item.id === goalId)
                  if (g) setSessionNote(taskTitle || g.title)
                } else if (taskTitle) {
                  setSessionNote(taskTitle)
                }
                window.scrollTo({ top: 0, behavior: 'smooth' })
                if (!isRunning) {
                  handleStartPause()
                }
                toast.success(`Đang cày Pomodoro: "${taskTitle || 'Mục tiêu'}" 🚀`)
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
                className="text-xs sm:text-sm bg-white/20 hover:bg-white/30 text-white px-3.5 py-2.5 sm:py-1.5 min-h-[42px] sm:min-h-0 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm"
              >
                <Plus className="w-4 h-4 text-emerald-400" /> Thêm mục tiêu
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

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedGoalId(g.id)
                          setIsManualModalOpen(true)
                        }}
                        className="p-2 sm:p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-white/80 hover:text-white bg-white/10 active:scale-95 rounded-xl text-xs gap-1 transition"
                        title="Thêm giờ cho mục tiêu này"
                      >
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span className="hidden sm:inline">Ghi giờ</span>
                      </button>
                      <button
                        onClick={() => {
                          setGoalToEdit(g)
                          setIsGoalModalOpen(true)
                        }}
                        className="p-2 sm:p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-white/60 hover:text-white active:scale-95 rounded-xl transition"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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
          </>
        )}
      </main>

      {/* ── FOOTER (DONATE & FEEDBACK & BRAND) ── */}
      <Footer
        onOpenDonate={() => setIsDonateModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onOpenRace={() => setIsRaceModalOpen(true)}
        isAdmin={currentUser?.is_admin}
      />

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

      <DonateModal
        isOpen={isDonateModalOpen}
        onClose={() => setIsDonateModalOpen(false)}
      />

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        currentUser={currentUser}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* ── ZEN DESK CLOCK FULLSCREEN MODAL ── */}
      <ZenDeskClockModal
        isOpen={isZenClockOpen}
        onClose={() => setIsZenClockOpen(false)}
        timeLeft={timeLeft}
        isRunning={isRunning}
        mode={mode}
        onStartPause={handleStartPause}
        onReset={handleReset}
        onSkip={handleSkip}
        onSwitchMode={switchMode}
        totalDurationSeconds={
          (mode === 'pomodoro'
            ? settings.focusMinutes
            : mode === 'shortBreak'
            ? settings.shortBreakMinutes
            : settings.longBreakMinutes) * 60
        }
        topicNote={sessionNote}
        goalTitle={goals.find((g) => g.id === selectedGoalId)?.title}
      />

      {/* ── SHAREABLE ACHIEVEMENT INFOGRAPHIC MODAL ── */}
      <ShareableAchievementModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentUser={currentUser}
        stats={stats}
      />

      {/* ── CLOUD COLD-START INDICATOR ── */}
      <CloudStatusBanner />

      {/* ── CHEER CELEBRATION MODAL ── */}
      <CheerCelebrationModal
        isOpen={isCheerModalOpen}
        cheers={unreadCheers}
        onClose={() => setIsCheerModalOpen(false)}
        onAcknowledgeAll={handleAcknowledgeAllCheers}
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
