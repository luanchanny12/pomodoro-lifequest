import React, { useState, useEffect, useRef, useMemo, useCallback, startTransition, lazy, Suspense } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Plus,
  Target,
  Clock,
  CheckCircle,
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
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'

import {
  focusService,
  StudyGoal,
  StudySessionLog,
  FocusStats,
} from '@/services/focusService'
import { soundManager } from '@/utils/soundEffects'
import type { PomodoroSettings } from '@/components/pomodoro/SettingsModal'
import {
  DynamicBackground,
  BackgroundConfig,
  PRESET_THEMES,
} from '@/components/pomodoro/DynamicBackground'
import { DailyQuoteCard } from '@/components/pomodoro/DailyQuoteCard'
import { AIFloatingBuddy } from '@/components/pomodoro/AIFloatingBuddy'
import { PomodoroCockpit } from '@/components/pomodoro/PomodoroCockpit'
import { PomodoroQuestCard } from '@/components/pomodoro/PomodoroQuestCard'
import { raceService, CheerItem } from '@/services/raceService'
import { Footer } from '@/components/common/Footer'
import { pipTimerManager } from '@/utils/pipTimer'
import { CloudStatusBanner } from '@/components/common/CloudStatusBanner'
import { usePWAInstall } from '@/utils/usePWAInstall'
import { authService, UserProfile } from '@/services/authService'
import { notificationManager } from '@/utils/notificationManager'
import { trackVisit } from '@/utils/analytics'

// ── LAZY-LOADED SECONDARY VIEWS & MODALS (Eliminates ~1.4MB bundle from initial load) ──
const PomodoroStatsChart = lazy(() => import('@/components/pomodoro/PomodoroStatsChart'))
const ManualLogModal = lazy(() => import('@/components/pomodoro/ManualLogModal').then(m => ({ default: m.ManualLogModal })))
const GoalModal = lazy(() => import('@/components/pomodoro/GoalModal').then(m => ({ default: m.GoalModal })))
const SettingsModal = lazy(() => import('@/components/pomodoro/SettingsModal').then(m => ({ default: m.SettingsModal })))
const BackgroundPickerModal = lazy(() => import('@/components/pomodoro/BackgroundPickerModal').then(m => ({ default: m.BackgroundPickerModal })))
const RewardShopModal = lazy(() => import('@/components/pomodoro/RewardShopModal').then(m => ({ default: m.RewardShopModal })))
const TopicGalaxyView = lazy(() => import('@/components/pomodoro/TopicGalaxyView').then(m => ({ default: m.TopicGalaxyView })))
const TimeWarpCard = lazy(() => import('@/components/pomodoro/TimeWarpCard').then(m => ({ default: m.TimeWarpCard })))
const TimeCapsuleModal = lazy(() => import('@/components/pomodoro/TimeCapsuleModal').then(m => ({ default: m.TimeCapsuleModal })))
const EisenhowerMatrixView = lazy(() => import('@/components/pomodoro/EisenhowerMatrixView').then(m => ({ default: m.EisenhowerMatrixView })))
const NotificationSettingsModal = lazy(() => import('@/components/pomodoro/NotificationSettingsModal').then(m => ({ default: m.NotificationSettingsModal })))
const AuthModal = lazy(() => import('@/components/auth/AuthModal').then(m => ({ default: m.AuthModal })))
const ChangePasswordModal = lazy(() => import('@/components/auth/ChangePasswordModal').then(m => ({ default: m.ChangePasswordModal })))
const CosmicRaceTrackModal = lazy(() => import('@/components/race/CosmicRaceTrackModal').then(m => ({ default: m.CosmicRaceTrackModal })))
const StudySquadModal = lazy(() => import('@/components/squads/StudySquadModal').then(m => ({ default: m.StudySquadModal })))
const CheerCelebrationModal = lazy(() => import('@/components/race/CheerCelebrationModal').then(m => ({ default: m.CheerCelebrationModal })))
const CheerHistoryModal = lazy(() => import('@/components/race/CheerHistoryModal').then(m => ({ default: m.CheerHistoryModal })))
const DonateModal = lazy(() => import('@/components/common/DonateModal').then(m => ({ default: m.DonateModal })))
const FeedbackModal = lazy(() => import('@/components/common/FeedbackModal').then(m => ({ default: m.FeedbackModal })))
const ZenDeskClockModal = lazy(() => import('@/components/pomodoro/ZenDeskClockModal').then(m => ({ default: m.ZenDeskClockModal })))
const ShareableAchievementModal = lazy(() => import('@/components/pomodoro/ShareableAchievementModal').then(m => ({ default: m.ShareableAchievementModal })))

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

const GoalCardItem = React.memo(function GoalCardItem({
  goal,
  onRecordHours,
  onEditGoal,
}: {
  goal: StudyGoal
  onRecordHours: (id: number) => void
  onEditGoal: (g: StudyGoal) => void
}) {
  return (
    <div className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-2xl p-4 transition hover:border-white/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: goal.color || '#E24A4A' }}
            />
            <h3 className="font-semibold text-base text-white">{goal.title}</h3>
            {goal.is_completed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-400 text-black text-[10px] font-bold rounded-full">
                <Trophy className="w-3 h-3" /> DONE
              </span>
            )}
          </div>
          {goal.notes && <p className="text-xs text-white/70 mt-1">{goal.notes}</p>}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onRecordHours(goal.id)}
            className="p-2 sm:p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-white/80 hover:text-white bg-white/10 active:scale-95 rounded-xl text-xs gap-1 transition"
            title="Thêm giờ cho mục tiêu này"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Ghi giờ</span>
          </button>
          <button
            onClick={() => onEditGoal(goal)}
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
            {goal.current_hours} / {goal.target_hours} giờ
          </span>
          <span className="font-semibold">{goal.progress_percent}%</span>
        </div>
        <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              goal.is_completed
                ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                : 'bg-white'
            }`}
            style={{ width: `${Math.min(100, goal.progress_percent)}%` }}
          />
        </div>
        <div className="mt-1 text-[11px] text-white/60 text-right">
          {goal.is_completed
            ? '🎉 Hoàn thành mục tiêu!'
            : `Còn ${goal.remaining_hours} giờ`}
        </div>
      </div>
    </div>
  )
})

const SessionLogRowItem = React.memo(function SessionLogRowItem({
  session,
  onDeleteSession,
}: {
  session: StudySessionLog
  onDeleteSession: (id: number) => void
}) {
  return (
    <div className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-2xl p-3.5 flex items-start justify-between gap-3 text-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              session.source === 'pomodoro'
                ? 'bg-red-500/30 text-red-200'
                : 'bg-emerald-500/30 text-emerald-200'
            }`}
          >
            {session.source === 'pomodoro' ? '🍅 Pomodoro' : '✍️ Thủ công'}
          </span>
          <span className="font-bold text-white text-sm">
            +{session.duration_minutes} phút ({session.duration_hours}h)
          </span>
          <span className="text-white/60">
            {format(new Date(session.session_date), 'dd/MM/yyyy')}
          </span>
        </div>

        {session.goal_title && (
          <div className="text-white/90 font-medium">
            🎯 Mục tiêu: {session.goal_title}
          </div>
        )}

        {session.topic_note && (
          <p className="text-white/80 italic text-[11px] bg-black/40 px-2.5 py-1 rounded-lg">
            "{session.topic_note}"
          </p>
        )}
      </div>

      <button
        onClick={() => onDeleteSession(session.id)}
        className="p-1.5 text-white/40 hover:text-red-300 rounded-lg hover:bg-red-500/20 transition"
        title="Xóa buổi học này"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
})

export default function PomodoroApp() {
  const navigate = useNavigate()
  // ── Settings ──
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('pomodoro_settings')
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      }
      return DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })
  const settingsRef = useRef<PomodoroSettings>(settings)
  settingsRef.current = settings

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
  const isRunningRef = useRef<boolean>(isRunning)
  useEffect(() => {
    isRunningRef.current = isRunning
  }, [isRunning])
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
  const [isCheerHistoryModalOpen, setIsCheerHistoryModalOpen] = useState<boolean>(false)
  const [isSquadsModalOpen, setIsSquadsModalOpen] = useState<boolean>(false)
  const [isTimerToggling, setIsTimerToggling] = useState<boolean>(false)
  const [isSavingEarly, setIsSavingEarly] = useState<boolean>(false)
  const isSavingEarlyRef = useRef<boolean>(false)

  // Data with SWR instant cache snapshot (<10ms load)
  const [goals, setGoals] = useState<StudyGoal[]>(() => focusService.getCachedGoals())
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(() => {
    const cached = focusService.getCachedGoals()
    return cached.length > 0 ? cached[0].id : null
  })
  const [sessionNote, setSessionNote] = useState<string>('')
  const [sessions, setSessions] = useState<StudySessionLog[]>(() => focusService.getCachedSessions())
  const [stats, setStats] = useState<FocusStats | null>(() => focusService.getCachedStats())
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

      // Kích hoạt ngầm kiểm tra rollover tự động và nạp sẵn cache ma trận cho hôm nay
      focusService.getMatrixTasks().catch(() => {})

      if (goalsData.length > 0) {
        setSelectedGoalId((prev) => {
          if (prev !== null && goalsData.some((g) => g.id === prev)) {
            return prev
          }
          return goalsData[0].id
        })
      } else {
        setSelectedGoalId(null)
      }

      // Tự động làm mới profile người dùng nếu các trường (streak, level, exp, coins) thật sự thay đổi
      authService.getMe().then((u) => {
        setCurrentUser((prev) => {
          if (!prev || prev.id !== u.id || prev.streak !== u.streak || prev.level !== u.level || prev.exp !== u.exp || prev.coins !== u.coins) {
            return u
          }
          return prev
        })
      }).catch(() => {})
    } catch (err) {
      console.error('Error loading focus data:', err)
    }
  }

  useEffect(() => {
    loadData()
    focusService.syncPendingSessions().catch(() => {})
  }, [currentUser?.id])

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
      if (document.hidden) return
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
      if (isExplicitLogoutRef.current) return
      setCurrentUser(null)
      toast.error('Phiên đăng nhập đã hết hạn hoặc không còn tồn tại. Vui lòng đăng nhập lại!')
    }

    window.addEventListener('pomodoro_auth_expired', handleAuthExpired)
    return () => window.removeEventListener('pomodoro_auth_expired', handleAuthExpired)
  }, [])

  // Check unread cheers from admin/friends & periodic poll
  useEffect(() => {
    if (!currentUser) {
      setUnreadCheers([])
      return
    }

    const fetchUnread = () => {
      raceService
        .getUnreadCheers()
        .then((res) => {
          if (res && Array.isArray(res.cheers)) {
            setUnreadCheers(res.cheers)
          }
        })
        .catch(() => {})
    }

    fetchUnread()
    const interval = setInterval(() => {
      if (!document.hidden) fetchUnread()
    }, 45 * 1000)
    const handleActive = () => fetchUnread()
    window.addEventListener('focus', handleActive)
    document.addEventListener('visibilitychange', handleActive)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleActive)
      document.removeEventListener('visibilitychange', handleActive)
    }
  }, [currentUser?.id])

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

  const isExplicitLogoutRef = useRef(false)
  const handleLogout = () => {
    isExplicitLogoutRef.current = true
    authService.logout()
    setCurrentUser(null)
    toast.info('Đã đăng xuất tài khoản')
    loadData()
    setTimeout(() => {
      isExplicitLogoutRef.current = false
    }, 1500)
  }

  // Save settings
  const handleSaveSettings = (newSettings: PomodoroSettings, showToast = false) => {
    setSettings(newSettings)
    settingsRef.current = newSettings
    localStorage.setItem('pomodoro_settings', JSON.stringify(newSettings))

    // Update current time if timer is idle
    if (!isRunning) {
      if (mode === 'pomodoro') setTimeLeft(newSettings.focusMinutes * 60)
      if (mode === 'shortBreak') setTimeLeft(newSettings.shortBreakMinutes * 60)
      if (mode === 'longBreak') setTimeLeft(newSettings.longBreakMinutes * 60)
    }
    if (showToast) {
      toast.success('Đã lưu cài đặt')
    }
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
  }

  // ── Timer Logic ──
  const switchMode = (newMode: TimerMode, autoStart = false) => {
    const currentSettings = settingsRef.current
    setMode(newMode)
    let minutes = currentSettings.focusMinutes
    if (newMode === 'shortBreak') minutes = currentSettings.shortBreakMinutes
    if (newMode === 'longBreak') minutes = currentSettings.longBreakMinutes

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

  const handleFinishEarly = async () => {
    if (isSavingEarlyRef.current) return
    const elapsedMinutes = Math.floor((settings.focusMinutes * 60 - timeLeft) / 60)
    if (elapsedMinutes < 1) {
      toast.info('Bạn cần tập trung ít nhất 1 phút để ghi nhận phiên học.')
      return
    }
    isSavingEarlyRef.current = true
    setIsSavingEarly(true)
    soundManager.playClick()
    setIsRunning(false)
    endTimeRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)

    try {
      await onTimerComplete(true, elapsedMinutes)
    } finally {
      isSavingEarlyRef.current = false
      setIsSavingEarly(false)
    }
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

  // Stable memoized callbacks to prevent re-rendering memoized children
  const handleOpenDonate = useCallback(() => setIsDonateModalOpen(true), [])
  const handleOpenFeedback = useCallback(() => setIsFeedbackModalOpen(true), [])
  const handleOpenRace = useCallback(() => setIsRaceModalOpen(true), [])

  const handleStartMatrixPomodoro = useCallback((goalId?: number, taskTitle?: string) => {
    if (goalId) {
      setSelectedGoalId(goalId)
      const g = goals.find((item) => item.id === goalId)
      if (g) setSessionNote(taskTitle || g.title)
    } else if (taskTitle) {
      setSessionNote(taskTitle)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (!isRunningRef.current) {
      handleStartPause()
    }
    toast.success(`Đang cày Pomodoro: "${taskTitle || 'Mục tiêu'}" 🚀`)
  }, [goals])

  const handleAIBuddyAction = useCallback((actionType: string, target?: string, goalId?: number) => {
    if (actionType === 'start_pomodoro') {
      if (goalId) {
        setSelectedGoalId(goalId)
        const g = goals.find((item) => item.id === goalId)
        if (g) setSessionNote(g.title)
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
      if (!isRunningRef.current) {
        handleStartPause()
      }
    } else if (actionType === 'open_matrix' || actionType === 'plan_tomorrow') {
      setActiveTab('matrix')
      window.scrollTo({ top: 400, behavior: 'smooth' })
    } else if (actionType === 'navigate_tab' && target) {
      setActiveTab(target as any)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [goals])

  const onTimerCompleteRef = useRef<((recordSession?: boolean, customMinutes?: number) => void) | null>(null)

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        if (!endTimeRef.current) return
        const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
        setTimeLeft((prev) => (prev !== remaining ? remaining : prev))

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          setIsRunning(false)
          endTimeRef.current = null
          if (onTimerCompleteRef.current) {
            onTimerCompleteRef.current(true)
          }
        }
      }, 500)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, mode])

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
  const onTimerComplete = async (recordSession = true, customMinutes?: number) => {
    const currentSettings = settingsRef.current
    // Play alarm sound
    if (currentSettings.alarmSound === 'bell') {
      soundManager.playBell(currentSettings.alarmVolume ?? 0.6)
    } else {
      soundManager.playDing(currentSettings.alarmVolume ?? 0.6)
    }

    if (mode === 'pomodoro') {
      // Xác định mục tiêu chính xác: ưu tiên selectedGoalId, sau đó activeGoal, cuối cùng goals[0]
      const effectiveGoalId = selectedGoalId || activeGoal?.id || (goals.length > 0 ? goals[0].id : null)
      const targetGoal = goals.find((g) => g.id === effectiveGoalId) || activeGoal

      notificationManager.notifyPomodoroEnd(targetGoal?.title)
      notificationManager.recordActivity()

      if (!currentUser) {
        soundManager.playPearlDrop()
        toast.success('🎉 Tuyệt vời! Bạn vừa hoàn thành 1 phiên tập trung! Hãy tạo tài khoản để lưu kỷ lục vào Đường Đua bạn bè!')
      } else if (recordSession) {
        try {
          const durationMins = customMinutes || currentSettings.focusMinutes
          const res = await focusService.createSession({
            goal_id: effectiveGoalId,
            duration_minutes: durationMins,
            session_date: format(new Date(), 'yyyy-MM-dd'),
            topic_note: sessionNote.trim() || 'Phiên học Pomodoro',
            source: 'pomodoro',
          })

          const newCurrentHours = (targetGoal?.current_hours || 0) + res.duration_hours
          const targetHours = targetGoal?.target_hours || 0

          // Dopamine chime & pearl drop
          soundManager.playPearlDrop()
          const earnedPearls = Number((durationMins / 60).toFixed(1))
          toast.success(`🎉 +${earnedPearls} 💎 Ngọc Pha Lê được cộng vào lọ!`)

          if (targetHours > 0 && newCurrentHours >= targetHours && targetGoal) {
            setShowCelebration({
              title: targetGoal.title,
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
      const isLongBreak = sessionCount % currentSettings.longBreakInterval === 0
      const nextMode = isLongBreak ? 'longBreak' : 'shortBreak'
      if (recordSession) {
        setSessionCount((prev) => prev + 1)
      }
      switchMode(nextMode, currentSettings.autoStartBreaks)
    } else {
      // Finished a break -> back to pomodoro
      notificationManager.notifyBreakEnd()
      toast.info('Hết giờ nghỉ! Hãy sẵn sàng cho phiên tập trung mới nhé.')
      switchMode('pomodoro', currentSettings.autoStartPomodoro)
    }
  }
  onTimerCompleteRef.current = onTimerComplete

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

  const handleRecordHours = useCallback((id: number) => {
    setSelectedGoalId(id)
    setIsManualModalOpen(true)
  }, [])

  const handleEditGoal = useCallback((g: StudyGoal) => {
    setGoalToEdit(g)
    setIsGoalModalOpen(true)
  }, [])

  // Delete session
  const handleDeleteSession = useCallback(async (sessionId: number) => {
    if (!confirm('Bạn có chắc muốn xóa bản ghi này? Số giờ tương ứng sẽ được trừ lại.')) return
    try {
      await focusService.deleteSession(sessionId)
      toast.success('Đã xóa bản ghi')
      await loadData()
    } catch (err: any) {
      toast.error('Lỗi xóa: ' + err.message)
    }
  }, [])

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
      <header className="max-w-6xl mx-auto px-4 pt-3 pb-1 relative z-30">
        <div className="bg-black/75 backdrop-blur-md border border-white/15 rounded-3xl px-4 sm:px-6 py-2.5 shadow-2xl flex items-center justify-between gap-3">
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
                  <span>🔥 {currentUser.streak ?? 0}d streak</span>
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
                type="button"
                onClick={() => {
                  if (unreadCheers.length > 0) {
                    setIsCheerModalOpen(true)
                  } else {
                    setIsCheerHistoryModalOpen(true)
                  }
                }}
                className="relative p-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 transition active:scale-95 flex items-center justify-center min-w-[36px] min-h-[36px]"
                title={
                  unreadCheers.length > 0
                    ? `Bạn có ${unreadCheers.length} lời cổ vũ mới! Bấm để nhận năng lượng!`
                    : 'Hộp thư cổ vũ & Tiếp lửa từ bạn bè'
                }
              >
                <Flame className={`w-4 h-4 fill-amber-400 text-amber-400 ${unreadCheers.length > 0 ? 'animate-pulse' : ''}`} />
                {unreadCheers.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black text-[10px] flex items-center justify-center animate-bounce shadow-md ring-2 ring-[#0B0D14]">
                    {unreadCheers.length}
                  </span>
                )}
              </button>
            )}

            {/* Study Squads Button */}
            <button
              type="button"
              onClick={() => setIsSquadsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 text-cyan-300 rounded-xl border border-cyan-400/30 transition active:scale-95 shadow-sm"
              title="Hội Nhóm Học Cùng & Đường Đua F1 Thu Nhỏ"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Nhóm Học F1</span>
            </button>

            {/* Cosmic Race Track Button (Main CTA) */}
            <button
              onClick={() => setIsRaceModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/25 border border-cyan-400/40 transition active:scale-95"
              title="Đường Đua Bạn Bè & Bảng Vàng Pomodoro"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
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
      <main className="max-w-6xl mx-auto px-4 pt-6 pb-16 relative z-10">
        {/* ── POMODORO TIMER CARD (CYBER FOCUS COCKPIT) ── */}
        <PomodoroCockpit
          mode={mode}
          timeLeft={timeLeft}
          isRunning={isRunning}
          sessionCount={sessionCount}
          isPipActive={isPipActive}
          currentMinutesSetting={currentMinutesSetting}
          currentPresets={currentPresets}
          activeGoalTitle={activeGoal?.title}
          isSavingEarly={isSavingEarly}
          focusMinutesSetting={settings.focusMinutes}
          defaultMinutesForMode={
            mode === 'pomodoro'
              ? settings.focusMinutes
              : mode === 'shortBreak'
              ? settings.shortBreakMinutes
              : settings.longBreakMinutes
          }
          ambientSound={ambientSound}
          ambientVolume={settings.ambientVolume ?? 0.6}
          onTogglePip={handleTogglePip}
          onOpenZenClock={() => setIsZenClockOpen(true)}
          onSwitchMode={switchMode}
          onSetStudyTime={handleSetStudyTime}
          onStartPause={handleStartPause}
          onSkip={handleSkip}
          onReset={handleReset}
          onFinishEarly={handleFinishEarly}
          onToggleAmbientSound={toggleAmbientSound}
          onAmbientVolumeChange={handleAmbientVolumeChange}
          onStopAmbient={() => {
            soundManager.stopAmbient()
            setAmbientSound('none')
          }}
        />

        {/* ── DAILY MOTIVATIONAL QUOTE CARD ("BUFF ĐỘNG LỰC") ── */}
        <div className="mt-5">
          <DailyQuoteCard />
        </div>

        {/* ── UNIFIED EPIC QUEST & CRYSTAL DOPAMINE CARD (REACT.MEMO EXTRACTED) ── */}
        <PomodoroQuestCard
          goals={goals}
          selectedGoalId={selectedGoalId}
          activeGoal={activeGoal}
          currentUser={currentUser}
          sessionNote={sessionNote}
          availablePearls={availablePearls}
          onSelectGoal={(id) => setSelectedGoalId(id)}
          onOpenManualModal={() => setIsManualModalOpen(true)}
          onOpenGoalModal={() => setIsGoalModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenRewardShop={() => {
            if (!currentUser) {
              toast.info('Vui lòng đăng nhập để mở Cửa Hàng Đổi Thưởng!')
              setIsAuthModalOpen(true)
              return
            }
            setIsRewardShopOpen(true)
          }}
          onChangeSessionNote={(note) => setSessionNote(note)}
        />

        {/* ── SECONDARY NAVIGATION TABS (MACOS DOCK STYLE) ── */}
        <div className="mt-8 max-w-3xl mx-auto p-1.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 flex items-center gap-1.5 overflow-x-auto no-scrollbar justify-start sm:justify-center shadow-xl">
          <button
            onClick={() => startTransition(() => setActiveTab('goals'))}
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
            onClick={() => startTransition(() => setActiveTab('matrix'))}
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
            onClick={() => startTransition(() => setActiveTab('galaxy'))}
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
            onClick={() => startTransition(() => setActiveTab('timewarp'))}
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
            onClick={() => startTransition(() => setActiveTab('logs'))}
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
            onClick={() => startTransition(() => setActiveTab('stats'))}
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
            <Suspense fallback={<div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" /></div>}>
              <EisenhowerMatrixView
                onStartPomodoroWithGoal={handleStartMatrixPomodoro}
              />
            </Suspense>
          </div>
        )}

        {/* ── TAB: TOPIC GALAXY ── */}
        {activeTab === 'galaxy' && (
          <div className="mt-6 space-y-4 animate-in fade-in duration-200">
            <Suspense fallback={<div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" /></div>}>
              <TopicGalaxyView onBackToGoals={() => setActiveTab('goals')} />
            </Suspense>
          </div>
        )}

        {/* ── TAB: TIME WARP ORACLE & CAPSULES ── */}
        {activeTab === 'timewarp' && (
          <div className="mt-6 space-y-5 animate-in fade-in duration-200">
            <Suspense fallback={<div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" /></div>}>
              <TimeWarpCard />
            </Suspense>

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
                <GoalCardItem
                  key={g.id}
                  goal={g}
                  onRecordHours={handleRecordHours}
                  onEditGoal={handleEditGoal}
                />
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
                <SessionLogRowItem
                  key={s.id}
                  session={s}
                  onDeleteSession={handleDeleteSession}
                />
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

            {/* Recharts 7-Day Chart (Lazy-Loaded) */}
            <Suspense fallback={<div className="h-44 w-full bg-white/5 rounded-2xl animate-pulse" />}>
              <PomodoroStatsChart stats={stats} />
            </Suspense>
          </div>
        )}
          </>
        )}
      </main>

      {/* ── FOOTER (DONATE & FEEDBACK & BRAND) ── */}
      <Footer
        onOpenDonate={handleOpenDonate}
        onOpenFeedback={handleOpenFeedback}
        onOpenRace={handleOpenRace}
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

      {/* ── MODALS (LAZY-LOADED ON DEMAND) ── */}
      <Suspense fallback={null}>
        {isManualModalOpen && (
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
        )}

        {isGoalModalOpen && (
          <GoalModal
            isOpen={isGoalModalOpen}
            onClose={() => {
              setIsGoalModalOpen(false)
              setGoalToEdit(null)
            }}
            goalToEdit={goalToEdit}
            onSuccess={loadData}
          />
        )}

        {isSettingsModalOpen && (
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            settings={settings}
            onSave={(newSettings) => handleSaveSettings(newSettings, false)}
          />
        )}

        {isBgPickerOpen && (
          <BackgroundPickerModal
            isOpen={isBgPickerOpen}
            onClose={() => setIsBgPickerOpen(false)}
            currentConfig={bgConfig}
            onSelect={handleSelectBackground}
          />
        )}

        {isRewardShopOpen && (
          <RewardShopModal
            isOpen={isRewardShopOpen}
            onClose={() => setIsRewardShopOpen(false)}
            onRewardRedeemed={loadData}
          />
        )}

        {isTimeCapsuleOpen && (
          <TimeCapsuleModal
            isOpen={isTimeCapsuleOpen}
            onClose={() => setIsTimeCapsuleOpen(false)}
            currentHours={stats?.total_hours || 0}
          />
        )}

        {isNotificationModalOpen && (
          <NotificationSettingsModal
            isOpen={isNotificationModalOpen}
            onClose={() => setIsNotificationModalOpen(false)}
          />
        )}

        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={(u) => {
              setCurrentUser(u)
              loadData()
            }}
          />
        )}

        {isRaceModalOpen && (
          <CosmicRaceTrackModal
            isOpen={isRaceModalOpen}
            onClose={() => setIsRaceModalOpen(false)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            currentUser={currentUser}
          />
        )}

        {isDonateModalOpen && (
          <DonateModal
            isOpen={isDonateModalOpen}
            onClose={() => setIsDonateModalOpen(false)}
          />
        )}

        {isFeedbackModalOpen && (
          <FeedbackModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
            currentUser={currentUser}
          />
        )}

        {isChangePasswordOpen && (
          <ChangePasswordModal
            isOpen={isChangePasswordOpen}
            onClose={() => setIsChangePasswordOpen(false)}
          />
        )}

        {/* ── ZEN DESK CLOCK FULLSCREEN MODAL ── */}
        {isZenClockOpen && (
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
        )}

        {/* ── SHAREABLE ACHIEVEMENT INFOGRAPHIC MODAL ── */}
        {isShareModalOpen && (
          <ShareableAchievementModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            currentUser={currentUser}
            stats={stats}
          />
        )}

        {/* ── CHEER CELEBRATION MODAL ── */}
        {isCheerModalOpen && (
          <CheerCelebrationModal
            isOpen={isCheerModalOpen}
            cheers={unreadCheers}
            onClose={() => setIsCheerModalOpen(false)}
            onAcknowledgeAll={handleAcknowledgeAllCheers}
            onOpenHistory={() => {
              setIsCheerModalOpen(false)
              setIsCheerHistoryModalOpen(true)
            }}
          />
        )}

        {/* ── CHEER HISTORY MODAL ── */}
        {isCheerHistoryModalOpen && (
          <CheerHistoryModal
            isOpen={isCheerHistoryModalOpen}
            onClose={() => setIsCheerHistoryModalOpen(false)}
            currentUser={currentUser}
            onOpenRaceTrack={() => setIsRaceModalOpen(true)}
          />
        )}

        {/* ── STUDY SQUADS MODAL ── */}
        {isSquadsModalOpen && (
          <StudySquadModal
            isOpen={isSquadsModalOpen}
            onClose={() => setIsSquadsModalOpen(false)}
            userGoals={goals}
            currentUser={currentUser}
          />
        )}
      </Suspense>

      {/* ── AI FLOATING BUDDY COMPANION ── */}
      <AIFloatingBuddy
        isTimerRunning={isRunning}
        onAction={handleAIBuddyAction}
      />
    </div>
  )
}
