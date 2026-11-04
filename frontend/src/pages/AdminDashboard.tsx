import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  Users,
  Clock,
  Target,
  Sparkles,
  Search,
  Eye,
  Key,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Flame,
  CheckCircle2,
  XCircle,
  Award,
  Send,
  MessageSquare,
  Lock,
  Unlock,
  Edit3,
  Calendar,
  Layers,
  BookOpen,
  SendHorizontal,
  Globe,
  Smartphone,
  Monitor,
  Star,
  MessageSquarePlus,
  Filter,
  Check,
  TrendingUp,
  UserCheck,
  UserX,
  X,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  adminService,
  AdminOverview,
  AdminUserItem,
  UserActivityDetail,
  AdminFeedbackItem,
  AggregatedVisitorItem,
  LiveVisitLogItem,
} from '@/services/adminService'
import { authService, UserProfile } from '@/services/authService'
import { useDebounce } from '@/hooks/useDebounce'
import { formatSafeRelativeTime } from '@/utils/dateUtils'
import { AdminUserRow } from '@/components/admin/AdminUserRow'
import { AdminTrafficTab } from '@/components/admin/AdminTrafficTab'
import { AdminFeedbackTab } from '@/components/admin/AdminFeedbackTab'
import { AdminUserDetailModal } from '@/components/admin/AdminUserDetailModal'
import { AdminUserModals } from '@/components/admin/AdminUserModals'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser())
  const [overview, setOverview] = useState<AdminOverview | null>(() => {
    try {
      const cached = sessionStorage.getItem('admin_overview_cache')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [users, setUsers] = useState<AdminUserItem[]>(() => {
    try {
      const cached = sessionStorage.getItem('admin_users_cache')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState<boolean>(() => {
    return !sessionStorage.getItem('admin_overview_cache')
  })
  const [searchTerm, setSearchTerm] = useState<string>('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member' | 'active' | 'locked'>('all')

  // Detail Modal State (Soi Hoạt Động)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [userDetail, setUserDetail] = useState<UserActivityDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [detailTab, setDetailTab] = useState<'goals' | 'sessions' | 'matrix' | 'visits' | 'cheer'>('goals')

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<AdminUserItem | null>(null)
  const [newPassword, setNewPassword] = useState<string>('')
  const [resetting, setResetting] = useState<boolean>(false)

  // Role Assignment Modal State (Gán Quyền)
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null)
  const [roleModalIsAdmin, setRoleModalIsAdmin] = useState<boolean>(false)
  const [roleModalLoading, setRoleModalLoading] = useState<boolean>(false)

  // Timeframe Filter (Ngày, Tuần, Tháng, Toàn bộ)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month' | 'all'>('all')

  // Status Modal State (Khóa / Mở khóa)
  const [statusModalUser, setStatusModalUser] = useState<AdminUserItem | null>(null)
  const [statusModalLoading, setStatusModalLoading] = useState<boolean>(false)

  // Delete Modal State (Xóa vĩnh viễn)
  const [deleteModalUser, setDeleteModalUser] = useState<AdminUserItem | null>(null)
  const [deleteModalLoading, setDeleteModalLoading] = useState<boolean>(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('')

  // Cheer / Telegram Message State
  const [cheerMsg, setCheerMsg] = useState<string>('')
  const [selectedEmoji, setSelectedEmoji] = useState<string>('🔥')
  const [telegramMsg, setTelegramMsg] = useState<string>('')
  const [sendingMsg, setSendingMsg] = useState<boolean>(false)

  // Navigation Tab State
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'traffic' | 'feedbacks'>('users')

  // Feedback State
  const [feedbacks, setFeedbacks] = useState<AdminFeedbackItem[]>([])
  const [feedbacksLoading, setFeedbacksLoading] = useState<boolean>(false)
  const [feedbackCategory, setFeedbackCategory] = useState<string>('all')
  const [feedbackStatus, setFeedbackStatus] = useState<string>('all')
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({})

  // Traffic Visitors State
  const [aggregatedVisitors, setAggregatedVisitors] = useState<AggregatedVisitorItem[]>([])
  const [liveVisitLogs, setLiveVisitLogs] = useState<LiveVisitLogItem[]>([])
  const [visitorsLoading, setVisitorsLoading] = useState<boolean>(false)
  const [visitorFilterType, setVisitorFilterType] = useState<'all' | 'members' | 'guests'>('all')
  const [visitorSearchTerm, setVisitorSearchTerm] = useState<string>('')
  const debouncedVisitorSearch = useDebounce(visitorSearchTerm, 350)
  const [visitorViewMode, setVisitorViewMode] = useState<'aggregated' | 'live'>('aggregated')
  const [visitorFilterDate, setVisitorFilterDate] = useState<string>('')
  const [visitorPage, setVisitorPage] = useState<number>(1)
  const [visitorPageSize, setVisitorPageSize] = useState<number>(15)
  const [visitorTotalPages, setVisitorTotalPages] = useState<number>(1)
  const [visitorTotalUnique, setVisitorTotalUnique] = useState<number>(0)
  const [visitorTotalLive, setVisitorTotalLive] = useState<number>(0)
  const [visitorTotalLivePages, setVisitorTotalLivePages] = useState<number>(1)
  const [availableDates, setAvailableDates] = useState<string[]>([])

  useEffect(() => {
    const token = authService.getToken()
    if (!token) {
      toast.error('Vui lòng đăng nhập bằng tài khoản Quản trị viên để truy cập!')
      navigate('/')
      return
    }

    const cachedUser = authService.getCurrentUser()
    if (cachedUser) {
      setCurrentUser(cachedUser)
      if (!cachedUser.is_admin) {
        toast.error('Tài khoản của bạn không có quyền Quản trị viên!')
        navigate('/')
        return
      }
    }

    // Tải dữ liệu ngay lập tức song song, không chờ đợi round-trip getMe()
    fetchData()

    authService.getMe().then((me) => {
      setCurrentUser(me)
      if (!me.is_admin) {
        toast.error('Tài khoản của bạn không có quyền Quản trị viên!')
        navigate('/')
      }
    }).catch(() => {
      toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!')
      navigate('/')
    })
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [overviewData, usersData] = await Promise.all([
        adminService.getOverview(),
        adminService.getUsers(),
      ])
      setOverview(overviewData)
      setUsers(usersData.items)
      try {
        sessionStorage.setItem('admin_overview_cache', JSON.stringify(overviewData))
        sessionStorage.setItem('admin_users_cache', JSON.stringify(usersData.items))
      } catch {}
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải dữ liệu quản trị!')
    } finally {
      setLoading(false)
    }
  }

  const fetchFeedbacks = async () => {
    try {
      setFeedbacksLoading(true)
      const res = await adminService.getFeedbacks({
        category: feedbackCategory !== 'all' ? feedbackCategory : undefined,
        status: feedbackStatus !== 'all' ? feedbackStatus : undefined,
        rating: feedbackRating || undefined,
      })
      setFeedbacks(res.items)
      const notesMap: Record<number, string> = {}
      res.items.forEach((f) => {
        if (f.admin_note) notesMap[f.id] = f.admin_note
      })
      setAdminNotes(notesMap)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải danh sách nhận xét!')
    } finally {
      setFeedbacksLoading(false)
    }
  }

  useEffect(() => {
    if (activeAdminTab === 'feedbacks') {
      fetchFeedbacks()
    }
  }, [activeAdminTab, feedbackCategory, feedbackStatus, feedbackRating])

  const fetchVisitors = async (pageOverride?: number, searchOverride?: string) => {
    try {
      setVisitorsLoading(true)
      const p = pageOverride !== undefined ? pageOverride : visitorPage
      const s = searchOverride !== undefined ? searchOverride : visitorSearchTerm
      const res = await adminService.getVisitors({
        filter_type: visitorFilterType !== 'all' ? visitorFilterType : undefined,
        search: s.trim() || undefined,
        timeframe: visitorFilterDate ? undefined : (selectedTimeframe !== 'all' ? selectedTimeframe : undefined),
        date_str: visitorFilterDate || undefined,
        page: p,
        page_size: visitorPageSize,
      })
      setAggregatedVisitors(res.aggregated_visitors || [])
      setLiveVisitLogs(res.live_recent_logs || [])
      setVisitorTotalPages(res.total_pages || 1)
      setVisitorTotalUnique(res.total_unique_visitors || 0)
      setVisitorTotalLive(res.total_live_count || 0)
      setVisitorTotalLivePages(res.total_live_pages || 1)
      if (res.available_dates) {
        setAvailableDates(res.available_dates)
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải danh sách người truy cập!')
    } finally {
      setVisitorsLoading(false)
    }
  }

  useEffect(() => {
    if (activeAdminTab === 'traffic') {
      fetchVisitors(1, debouncedVisitorSearch)
      setVisitorPage(1)
    }
  }, [activeAdminTab, visitorFilterType, selectedTimeframe, visitorFilterDate, visitorPageSize, debouncedVisitorSearch])

  const formatRelativeTime = (isoString: string | null): string => {
    return formatSafeRelativeTime(isoString)
  }

  const handleUpdateFeedbackStatus = async (
    id: number,
    newStatus: 'new' | 'reviewed' | 'resolved'
  ) => {
    try {
      const note = adminNotes[id]
      const res = await adminService.updateFeedbackStatus(id, newStatus, note)
      toast.success(res.message)
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: newStatus, admin_note: note || f.admin_note } : f
        )
      )
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái!')
    }
  }

  const handleDeleteFeedback = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhận xét này?')) return
    try {
      const res = await adminService.deleteFeedback(id)
      toast.success(res.message)
      setFeedbacks((prev) => prev.filter((f) => f.id !== id))
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa nhận xét!')
    }
  }

  const handleOpenDetail = async (userId: number) => {
    setSelectedUserId(userId)
    setDetailLoading(true)
    setDetailTab('goals')
    try {
      const data = await adminService.getUserDetail(userId)
      setUserDetail(data)
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải chi tiết hoạt động của người dùng!')
      setSelectedUserId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetModalUser || !newPassword.trim()) {
      toast.error('Vui lòng nhập mật khẩu mới (ít nhất 4 ký tự)!')
      return
    }
    if (newPassword.trim().length < 4) {
      toast.error('Mật khẩu mới phải có ít nhất 4 ký tự!')
      return
    }
    try {
      setResetting(true)
      const res = await adminService.resetPassword(resetModalUser.id, newPassword.trim())
      toast.success(res.message)
      setResetModalUser(null)
      setNewPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Lỗi đặt lại mật khẩu!')
    } finally {
      setResetting(false)
    }
  }

  // Mở modal Gán Quyền
  const handleOpenRoleModal = (u: AdminUserItem) => {
    setRoleModalUser(u)
    setRoleModalIsAdmin(u.is_admin)
  }

  // Lưu Gán Quyền
  const handleSaveRole = async () => {
    if (!roleModalUser) return
    if (roleModalUser.id === currentUser?.id && !roleModalIsAdmin) {
      const adminCount = users.filter((x) => x.is_admin).length
      if (adminCount <= 1) {
        toast.error('Bạn không thể tự hạ quyền Admin của chính mình khi bạn là Admin duy nhất!')
        return
      }
    }

    try {
      setRoleModalLoading(true)
      const res = await adminService.updateRole(roleModalUser.id, roleModalIsAdmin)
      toast.success(res.message || 'Cập nhật phân quyền thành công!')
      setUsers((prev) =>
        prev.map((item) =>
          item.id === roleModalUser.id ? { ...item, is_admin: roleModalIsAdmin } : item
        )
      )
      setRoleModalUser(null)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật phân quyền!')
    } finally {
      setRoleModalLoading(false)
    }
  }

  const handleToggleStatus = (u: AdminUserItem) => {
    setStatusModalUser(u)
  }

  const handleConfirmToggleStatus = async () => {
    if (!statusModalUser) return
    const newStatus = !statusModalUser.is_active
    try {
      setStatusModalLoading(true)
      const res = await adminService.updateStatus(statusModalUser.id, newStatus)
      toast.success(res.message)
      setUsers((prev) =>
        prev.map((item) => (item.id === statusModalUser.id ? { ...item, is_active: newStatus } : item))
      )
      if (userDetail?.user?.id === statusModalUser.id) {
        setUserDetail({
          ...userDetail,
          user: { ...userDetail.user, is_active: newStatus },
        })
      }
      setStatusModalUser(null)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thay đổi trạng thái!')
    } finally {
      setStatusModalLoading(false)
    }
  }

  const handleDeleteUser = (u: AdminUserItem) => {
    setDeleteModalUser(u)
    setDeleteConfirmText('')
  }

  const handleConfirmDeleteUser = async () => {
    if (!deleteModalUser) return
    try {
      setDeleteModalLoading(true)
      const res = await adminService.deleteUser(deleteModalUser.id)
      toast.success(res.message)
      setUsers((prev) => prev.filter((item) => item.id !== deleteModalUser.id))
      if (selectedUserId === deleteModalUser.id) {
        setSelectedUserId(null)
        setUserDetail(null)
      }
      setDeleteModalUser(null)
      setDeleteConfirmText('')
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa tài khoản!')
    } finally {
      setDeleteModalLoading(false)
    }
  }

  const handleSendCheer = async () => {
    if (!selectedUserId) return
    try {
      setSendingMsg(true)
      const res = await adminService.sendCheer(selectedUserId, selectedEmoji, cheerMsg.trim() || undefined)
      toast.success(res.message)
      setCheerMsg('')
      const updated = await adminService.getUserDetail(selectedUserId)
      setUserDetail(updated)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi lời cổ vũ!')
    } finally {
      setSendingMsg(false)
    }
  }

  const handleSendTelegram = async () => {
    if (!selectedUserId || !telegramMsg.trim()) {
      toast.error('Vui lòng nhập nội dung tin nhắn Telegram!')
      return
    }
    try {
      setSendingMsg(true)
      const res = await adminService.notifyTelegram(selectedUserId, telegramMsg.trim())
      toast.success(res.message)
      setTelegramMsg('')
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi tin nhắn Telegram!')
    } finally {
      setSendingMsg(false)
    }
  }

  // Filter Users
  const filteredUsers = useMemo(() => users.filter((u) => {
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase()
      const match = u.username.toLowerCase().includes(term) || u.display_name.toLowerCase().includes(term)
      if (!match) return false
    }
    if (roleFilter === 'admin') return u.is_admin
    if (roleFilter === 'member') return !u.is_admin
    if (roleFilter === 'active') return u.is_active
    if (roleFilter === 'locked') return !u.is_active
    return true
  }), [users, debouncedSearch, roleFilter])

  const adminCount = useMemo(() => users.filter((u) => u.is_admin).length, [users])
  const memberCount = useMemo(() => users.filter((u) => !u.is_admin).length, [users])
  const activeCount = useMemo(() => users.filter((u) => u.is_active).length, [users])
  const lockedCount = useMemo(() => users.filter((u) => !u.is_active).length, [users])

  const getVehicleIcon = (avatar: string) => {
    switch (avatar) {
      case 'cyber_car':
        return '🏎️'
      case 'quantum_saucer':
        return '🛸'
      case 'lightning':
        return '⚡'
      case 'lightcycle':
        return '🏍️'
      default:
        return '🚀'
    }
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ── TOP HEADER BAR ── */}
      <header className="sticky top-0 z-40 bg-[#0e1424]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            onMouseEnter={() => import('@/pages/PomodoroApp')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Focus Hub</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Shield className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>CỔNG QUẢN TRỊ VIÊN (ADMIN PORTAL)</span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  v3.0 Pro
                </span>
              </h1>
              <p className="text-xs text-slate-400">Giám sát mục tiêu, bạn bè học tập & quản lý phân quyền</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-cyan-400 hover:text-cyan-200 transition active:scale-95 disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {currentUser && (
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs shadow-sm">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <span>👑</span> Admin:
              </span>
              <span className="font-semibold text-white">{currentUser.display_name}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ── TIMEFRAME SELECTOR PILL (Rendered statically to eliminate 0.217 CLS) ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0f1523] border border-slate-800 rounded-2xl p-3 px-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-md shadow-cyan-400/50" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Khung Thời Gian Thống Kê:
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/30">
              {selectedTimeframe === 'day'
                ? 'Hôm nay'
                : selectedTimeframe === 'week'
                ? '7 ngày (Tuần)'
                : selectedTimeframe === 'month'
                ? '30 ngày (Tháng)'
                : 'Toàn thời gian'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#141c2e] p-1 rounded-xl border border-slate-700/60 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setSelectedTimeframe('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                selectedTimeframe === 'day'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>📅 Hôm Nay</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTimeframe('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                selectedTimeframe === 'week'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>📊 7 Ngày (Tuần)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTimeframe('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                selectedTimeframe === 'month'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>📈 30 Ngày (Tháng)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTimeframe('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                selectedTimeframe === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>🌐 Toàn Thời Gian</span>
            </button>
          </div>
        </div>

        {/* ── METRIC OVERVIEW CARDS ── */}
        {loading && !overview ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { label: 'Người Dùng', color: 'text-cyan-400' },
              { label: 'Tổng Giờ Học', color: 'text-amber-400' },
              { label: 'Mục Tiêu', color: 'text-purple-400' },
              { label: 'Phiên Focus', color: 'text-rose-400' },
              { label: 'Lưu Lượng', color: 'text-blue-400' },
              { label: 'Góp Ý', color: 'text-emerald-400' },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md min-h-[104px] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {item.label}
                  </span>
                </div>
                <div className="text-xl font-black text-white">---</div>
                <span className={`text-[11px] font-semibold ${item.color} animate-pulse`}>
                  Đang tải...
                </span>
              </div>
            ))}
          </div>
        ) : overview ? (() => {
          const tf = overview.timeframes?.[selectedTimeframe]
          const cardHours = selectedTimeframe === 'all' ? overview.total_study_hours : (tf?.study_hours ?? overview.today_study_hours)
          const cardSessions = selectedTimeframe === 'all' ? overview.total_sessions : (tf?.study_sessions ?? overview.today_sessions)
          const cardVisits = selectedTimeframe === 'all' ? overview.total_visits : (tf?.visits ?? overview.today_visits)
          const cardGuestVisits = selectedTimeframe === 'all' ? overview.guest_visits : (tf?.guest_visits ?? overview.today_guest_visits)
          const cardMemberVisits = selectedTimeframe === 'all' ? overview.member_visits : (tf?.member_visits ?? overview.today_member_visits)
          const cardFeedbacks = selectedTimeframe === 'all' ? overview.total_feedbacks : (tf?.feedbacks ?? overview.total_feedbacks)

          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {/* Card 1: Users */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md group hover:border-cyan-500/50 transition flex flex-col justify-between min-h-[104px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {selectedTimeframe === 'all' ? 'Người Dùng' : 'Đăng Ký Mới'}
                  </span>
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">
                  {selectedTimeframe === 'all' ? overview.total_users : `+${tf?.new_users ?? 0}`}
                </div>
                <div className="text-xs text-slate-400 mt-1 truncate">
                  <span className="text-emerald-400 font-bold">
                    {selectedTimeframe === 'all'
                      ? overview.active_today_count
                      : tf?.active_users ?? overview.active_today_count} bạn
                  </span>{' '}
                  hoạt động
                </div>
              </div>

              {/* Card 2: Hours */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md group hover:border-amber-500/50 transition flex flex-col justify-between min-h-[104px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {selectedTimeframe === 'all' ? 'Tổng Giờ Học' : 'Giờ Học'}
                  </span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{cardHours}h</div>
                <div className="text-xs text-slate-400 mt-1 truncate">
                  {selectedTimeframe === 'all' ? (
                    <>
                      <span className="text-amber-400 font-bold">+{overview.today_study_hours}h</span> hôm nay
                    </>
                  ) : (
                    <span className="text-amber-400 font-bold">{tf?.label || 'Kỳ này'}</span>
                  )}
                </div>
              </div>

              {/* Card 3: Goals */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md group hover:border-purple-500/50 transition flex flex-col justify-between min-h-[104px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mục Tiêu</span>
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <Target className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{overview.total_goals}</div>
                <div className="text-xs text-slate-400 mt-1 truncate">
                  <span className="text-purple-400 font-bold">{overview.completed_goals}</span> đã hoàn thành
                </div>
              </div>

              {/* Card 4: Sessions */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md group hover:border-rose-500/50 transition flex flex-col justify-between min-h-[104px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phiên Focus</span>
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{cardSessions}</div>
                <div className="text-xs text-slate-400 mt-1 truncate">
                  <span className="text-rose-400 font-bold">
                    {selectedTimeframe === 'all' ? `${overview.today_sessions} hôm nay` : `${cardSessions} phiên`}
                  </span>
                </div>
              </div>

              {/* Card 5: Traffic */}
              <div
                onClick={() => setActiveAdminTab('traffic')}
                className={`bg-[#111827] border rounded-2xl p-4 shadow-md cursor-pointer transition flex flex-col justify-between min-h-[104px] ${
                  activeAdminTab === 'traffic'
                    ? 'border-blue-500/80 ring-1 ring-blue-500/50'
                    : 'border-slate-800 hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lượt Truy Cập</span>
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white">{cardVisits}</div>
                <div className="text-xs text-slate-400 mt-1 truncate">
                  <span className="text-cyan-400 font-bold">{cardGuestVisits} khách</span> • <span className="text-amber-300 font-bold">{cardMemberVisits} TV</span>
                </div>
              </div>

              {/* Card 6: Feedbacks */}
              <div
                onClick={() => setActiveAdminTab('feedbacks')}
                className={`bg-[#111827] border rounded-2xl p-4 shadow-md cursor-pointer transition flex flex-col justify-between min-h-[104px] ${
                  activeAdminTab === 'feedbacks'
                    ? 'border-emerald-500/80 ring-1 ring-emerald-500/50'
                    : 'border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Góp Ý Web</span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <MessageSquarePlus className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white flex items-center gap-1.5">
                  <span>{overview.feedback_avg_rating}</span>
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div className="text-xs text-slate-400 mt-1 truncate">
                  <span className="text-emerald-400 font-bold">{cardFeedbacks} nhận xét</span>
                  {overview.new_feedbacks > 0 && (
                    <span className="text-rose-400 font-bold ml-1.5">({overview.new_feedbacks} mới)</span>
                  )}
                </div>
              </div>
            </div>
          )
        })() : null}

        {/* ── 3 NAVIGATION TABS ── */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveAdminTab('users')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition flex-shrink-0 ${
              activeAdminTab === 'users'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Người Dùng & Phân Quyền ({loading && users.length === 0 ? '...' : users.length})</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('traffic')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition flex-shrink-0 ${
              activeAdminTab === 'traffic'
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Lưu Lượng & Khách Vãng Lai</span>
            {overview && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                {overview.total_visits}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveAdminTab('feedbacks')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition flex-shrink-0 ${
              activeAdminTab === 'feedbacks'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4 text-emerald-400" />
            <span>Hòm Thư Góp Ý Web</span>
            {overview?.new_feedbacks ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold animate-pulse">
                +{overview.new_feedbacks} mới
              </span>
            ) : null}
          </button>
        </div>

        {/* ── TAB 1: USERS & ROLE MANAGEMENT ── */}
        {activeAdminTab === 'users' && (
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 animate-in fade-in duration-200">
            {/* Top Bar with Title, Subtitle, Search and Filter Pills */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>Danh Sách Người Dùng & Gán Quyền Quản Trị</span>
                  <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {loading && users.length === 0 ? 'Đang tải...' : `${filteredUsers.length} tài khoản`}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Bấm nút <strong>"⚡ Gán Quyền"</strong> để nâng thành Admin hoặc hạ về Thành viên; bấm <strong>"👁️ Soi hoạt động"</strong> để xem mục tiêu & phiên học của bạn bè.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hiển thị hoặc @username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#162032] border border-slate-700 focus:border-cyan-400 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-slate-400 outline-none transition shadow-inner"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Pill Buttons */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 text-xs font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Phân loại:
              </span>

              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  roleFilter === 'all'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>Tất cả</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">{users.length}</span>
              </button>

              <button
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  roleFilter === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                }`}
              >
                <span>👑 Quản Trị Viên (Admin)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  {adminCount}
                </span>
              </button>

              <button
                onClick={() => setRoleFilter('member')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  roleFilter === 'member'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
                }`}
              >
                <span>👤 Thành Viên</span>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px]">
                  {memberCount}
                </span>
              </button>

              <button
                onClick={() => setRoleFilter('active')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  roleFilter === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
                }`}
              >
                <span>🟢 Đang hoạt động</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                  {activeCount}
                </span>
              </button>

              <button
                onClick={() => setRoleFilter('locked')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  roleFilter === 'locked'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-rose-300 hover:bg-slate-800'
                }`}
              >
                <span>🔴 Đã khóa</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px]">
                  {lockedCount}
                </span>
              </button>
            </div>

            {/* Mobile Cards (Mobile Responsive) */}
            <div className="block md:hidden space-y-3.5">
              {loading && users.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-[#141d2f] border border-slate-700/80 space-y-3 shadow-md animate-pulse"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800" />
                        <div className="space-y-2 flex-1">
                          <div className="w-28 h-3.5 bg-slate-800 rounded" />
                          <div className="w-20 h-2.5 bg-slate-800 rounded" />
                        </div>
                      </div>
                      <div className="h-8 bg-slate-800/80 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic">
                  Không tìm thấy người dùng nào phù hợp.
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-[#141d2f] border border-slate-700/80 space-y-3 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                          {getVehicleIcon(u.racer_avatar)}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                            <span>{u.display_name}</span>
                            {u.has_telegram && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                                TG
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">@{u.username}</div>
                        </div>
                      </div>

                      {/* Role Badge */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenRoleModal(u)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1 ${
                            u.is_admin
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <span>{u.is_admin ? '👑 Admin' : '👤 Thành Viên'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 py-2 px-3 bg-black/30 rounded-xl text-center text-xs">
                      <div>
                        <div className="text-[11px] text-slate-400">Cấp độ</div>
                        <div className="font-bold text-cyan-300 mt-0.5">Lv.{u.level}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Streak</div>
                        <div className="font-bold text-amber-400 mt-0.5">🔥{u.streak}d</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Tổng giờ</div>
                        <div className="font-bold text-white mt-0.5">{u.total_hours}h</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Mục tiêu</div>
                        <div className="font-bold text-purple-300 mt-0.5">{u.goal_count}</div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleOpenDetail(u.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-bold active:scale-95 transition"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Soi hoạt động</span>
                      </button>

                      <button
                        onClick={() => handleOpenRoleModal(u)}
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold active:scale-95 transition"
                        title="Gán quyền cho người này"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Gán quyền</span>
                      </button>

                      <button
                        onClick={() => {
                          setResetModalUser(u)
                          setNewPassword('')
                        }}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 active:scale-95 transition"
                        title="Đổi mật khẩu"
                      >
                        <Key className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`p-2 rounded-xl border active:scale-95 transition ${
                          u.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                        title={u.is_active ? 'Khóa tài khoản' : 'Mở khóa'}
                      >
                        {u.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop User Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-[#0c1220]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400 font-bold">
                    <th className="py-3.5 px-4">Tài Khoản / Người Dùng</th>
                    <th className="py-3.5 px-4 text-center">Vai Trò & Quyền Hạn</th>
                    <th className="py-3.5 px-4 text-center">Cấp Độ & Streak</th>
                    <th className="py-3.5 px-4 text-center">Tổng Giờ Học</th>
                    <th className="py-3.5 px-4 text-center">Mục Tiêu</th>
                    <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                    <th className="py-3.5 px-4 text-right">Thao Tác Quản Trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {loading && users.length === 0 ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800" />
                            <div className="space-y-1.5">
                              <div className="w-28 h-3.5 bg-slate-800 rounded" />
                              <div className="w-20 h-2.5 bg-slate-800 rounded" />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4"><div className="w-16 h-3 bg-slate-800 rounded mx-auto" /></td>
                        <td className="py-3.5 px-4"><div className="w-12 h-3 bg-slate-800 rounded mx-auto" /></td>
                        <td className="py-3.5 px-4"><div className="w-14 h-3 bg-slate-800 rounded mx-auto" /></td>
                        <td className="py-3.5 px-4"><div className="w-12 h-3 bg-slate-800 rounded mx-auto" /></td>
                        <td className="py-3.5 px-4"><div className="w-16 h-5 bg-slate-800 rounded-full mx-auto" /></td>
                        <td className="py-3.5 px-4"><div className="w-24 h-7 bg-slate-800 rounded-xl ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                        Không tìm thấy người dùng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <AdminUserRow
                        key={u.id}
                        user={u}
                        isCurrentUser={currentUser?.id === u.id}
                        getVehicleIcon={getVehicleIcon}
                        onInspect={handleOpenDetail}
                        onOpenRoleModal={(target) => handleOpenRoleModal(target)}
                        onToggleStatus={handleToggleStatus}
                        onOpenResetModal={(target) => {
                          setResetModalUser(target)
                          setNewPassword('')
                        }}
                        onDeleteUser={handleDeleteUser}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: TRAFFIC & GUEST ANALYTICS ── */}
        {activeAdminTab === 'traffic' && overview && (
          <AdminTrafficTab
            overview={overview}
            aggregatedVisitors={aggregatedVisitors}
            liveVisitLogs={liveVisitLogs}
            visitorsLoading={visitorsLoading}
            visitorFilterType={visitorFilterType}
            setVisitorFilterType={setVisitorFilterType}
            visitorSearchTerm={visitorSearchTerm}
            setVisitorSearchTerm={setVisitorSearchTerm}
            visitorViewMode={visitorViewMode}
            setVisitorViewMode={setVisitorViewMode}
            selectedTimeframe={selectedTimeframe}
            setSelectedTimeframe={setSelectedTimeframe}
            visitorFilterDate={visitorFilterDate}
            setVisitorFilterDate={setVisitorFilterDate}
            visitorPage={visitorPage}
            setVisitorPage={setVisitorPage}
            visitorPageSize={visitorPageSize}
            setVisitorPageSize={setVisitorPageSize}
            visitorTotalPages={visitorTotalPages}
            visitorTotalUnique={visitorTotalUnique}
            visitorTotalLive={visitorTotalLive}
            visitorTotalLivePages={visitorTotalLivePages}
            fetchVisitors={fetchVisitors}
            formatRelativeTime={formatRelativeTime}
            getVehicleIcon={getVehicleIcon}
          />
        )}

        {/* ── TAB 3: FEEDBACKS INBOX ── */}
        {activeAdminTab === 'feedbacks' && (
          <AdminFeedbackTab
            overview={overview}
            feedbacks={feedbacks}
            feedbacksLoading={feedbacksLoading}
            feedbackCategory={feedbackCategory}
            setFeedbackCategory={setFeedbackCategory}
            feedbackStatus={feedbackStatus}
            setFeedbackStatus={setFeedbackStatus}
            feedbackRating={feedbackRating}
            setFeedbackRating={setFeedbackRating}
            adminNotes={adminNotes}
            setAdminNotes={setAdminNotes}
            handleUpdateFeedbackStatus={handleUpdateFeedbackStatus}
            handleDeleteFeedback={handleDeleteFeedback}
          />
        )}
      </main>

      {/* ── MODAL CHI TIẾT BẠN BÈ ── */}
      <AdminUserDetailModal
        selectedUserId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        userDetail={userDetail}
        detailLoading={detailLoading}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
        selectedEmoji={selectedEmoji}
        setSelectedEmoji={setSelectedEmoji}
        cheerMsg={cheerMsg}
        setCheerMsg={setCheerMsg}
        telegramMsg={telegramMsg}
        setTelegramMsg={setTelegramMsg}
        sendingMsg={sendingMsg}
        handleSendCheer={handleSendCheer}
        handleSendTelegram={handleSendTelegram}
        formatRelativeTime={formatRelativeTime}
        getVehicleIcon={getVehicleIcon}
      />

      {/* ── MODALS QUẢN TRỊ NGƯỜI DÙNG: GÁN QUYỀN, RESET PASS, KHÓA, XÓA ── */}
      <AdminUserModals
        currentUser={currentUser}
        users={users}
        roleModalUser={roleModalUser}
        roleModalIsAdmin={roleModalIsAdmin}
        setRoleModalIsAdmin={setRoleModalIsAdmin}
        roleModalLoading={roleModalLoading}
        onCloseRoleModal={() => setRoleModalUser(null)}
        onSaveRole={handleSaveRole}
        resetModalUser={resetModalUser}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        resetting={resetting}
        onCloseResetModal={() => setResetModalUser(null)}
        onResetPassword={handleResetPassword}
        statusModalUser={statusModalUser}
        statusModalLoading={statusModalLoading}
        onCloseStatusModal={() => setStatusModalUser(null)}
        onConfirmToggleStatus={handleConfirmToggleStatus}
        deleteModalUser={deleteModalUser}
        deleteConfirmText={deleteConfirmText}
        setDeleteConfirmText={setDeleteConfirmText}
        deleteModalLoading={deleteModalLoading}
        onCloseDeleteModal={() => setDeleteModalUser(null)}
        onConfirmDeleteUser={handleConfirmDeleteUser}
      />
    </div>
  )
}
