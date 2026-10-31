import React, { useState, useEffect } from 'react'
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
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

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser())
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
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

    authService.getMe().then((me) => {
      setCurrentUser(me)
      if (!me.is_admin) {
        toast.error('Tài khoản của bạn không có quyền Quản trị viên!')
        navigate('/')
        return
      }
      fetchData()
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

  const fetchVisitors = async (pageOverride?: number) => {
    try {
      setVisitorsLoading(true)
      const p = pageOverride !== undefined ? pageOverride : visitorPage
      const res = await adminService.getVisitors({
        filter_type: visitorFilterType !== 'all' ? visitorFilterType : undefined,
        search: visitorSearchTerm.trim() || undefined,
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
      fetchVisitors(1)
      setVisitorPage(1)
    }
  }, [activeAdminTab, visitorFilterType, selectedTimeframe, visitorFilterDate, visitorPageSize])

  const formatRelativeTime = (isoString: string | null): string => {
    if (!isoString) return 'Chưa ghi nhận'
    try {
      const d = new Date(isoString)
      const now = new Date()
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)
      if (diffSec < 45) return 'Vừa xong'
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`
      const diffDays = Math.floor(diffSec / 86400)
      if (diffDays === 1) return 'Hôm qua'
      if (diffDays < 7) return `${diffDays} ngày trước`
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString || ''
    }
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
  const filteredUsers = users.filter((u) => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const match = u.username.toLowerCase().includes(term) || u.display_name.toLowerCase().includes(term)
      if (!match) return false
    }
    if (roleFilter === 'admin') return u.is_admin
    if (roleFilter === 'member') return !u.is_admin
    if (roleFilter === 'active') return u.is_active
    if (roleFilter === 'locked') return !u.is_active
    return true
  })

  const adminCount = users.filter((u) => u.is_admin).length
  const memberCount = users.filter((u) => !u.is_admin).length
  const activeCount = users.filter((u) => u.is_active).length
  const lockedCount = users.filter((u) => !u.is_active).length

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
        {/* ── TIMEFRAME SELECTOR PILL ── */}
        {overview && (
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
        )}

        {/* ── METRIC OVERVIEW CARDS ── */}
        {overview && (() => {
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
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md group hover:border-cyan-500/50 transition">
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
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md group hover:border-amber-500/50 transition">
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
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md group hover:border-purple-500/50 transition">
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
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md group hover:border-rose-500/50 transition">
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
                className={`bg-[#111827] border rounded-2xl p-4 shadow-md cursor-pointer transition ${
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
                className={`bg-[#111827] border rounded-2xl p-4 shadow-md cursor-pointer transition ${
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
        })()}

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
            <span>Người Dùng & Phân Quyền ({users.length})</span>
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
                    {filteredUsers.length} tài khoản
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
              {filteredUsers.length === 0 ? (
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
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                        Không tìm thấy người dùng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition group">
                        {/* Column 1: User */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-xl shadow-sm">
                              {getVehicleIcon(u.racer_avatar)}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm flex items-center gap-1.5">
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
                        </td>

                        {/* Column 2: Role & Role Assignment Button */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            {/* Role Tag */}
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                                u.is_admin
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              <span>{u.is_admin ? '👑 Quản Trị Viên' : '👤 Thành Viên'}</span>
                            </span>

                            {/* Gán Quyền Button */}
                            <button
                              onClick={() => handleOpenRoleModal(u)}
                              className="px-2.5 py-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition active:scale-95 flex items-center gap-1 shadow-sm"
                              title="Bấm để gán quyền Quản Trị Viên hoặc Thành Viên"
                            >
                              <Shield className="w-3.5 h-3.5 text-indigo-300" />
                              <span>Gán quyền</span>
                            </button>
                          </div>
                        </td>

                        {/* Column 3: Level & Streak */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 font-bold">
                            <span className="text-cyan-400">Lv.{u.level}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-amber-400 flex items-center gap-0.5">
                              <Flame className="w-4 h-4" />
                              {u.streak}d
                            </span>
                          </div>
                        </td>

                        {/* Column 4: Total Study Hours */}
                        <td className="py-3.5 px-4 text-center font-bold text-white text-sm">
                          {u.total_hours}h
                          {u.today_hours > 0 && (
                            <span className="block text-[11px] text-emerald-400 font-semibold">
                              (+{u.today_hours}h hôm nay)
                            </span>
                          )}
                        </td>

                        {/* Column 5: Goals */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 text-xs">
                            {u.goal_count} mục tiêu
                          </span>
                        </td>

                        {/* Column 6: Status */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                              u.is_active
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30'
                            }`}
                            title="Bấm để Khóa / Mở khóa tài khoản"
                          >
                            {u.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            <span>{u.is_active ? 'Hoạt động' : 'Đã khóa'}</span>
                          </button>
                        </td>

                        {/* Column 7: Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Soi Hoạt Động */}
                            <button
                              onClick={() => handleOpenDetail(u.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition active:scale-95 shadow-sm"
                              title="Xem chi tiết mục tiêu, phiên học và ma trận công việc"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Soi hoạt động</span>
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setResetModalUser(u)
                                setNewPassword('')
                              }}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition active:scale-95"
                              title="Đặt lại mật khẩu cho tài khoản này"
                            >
                              <Key className="w-4 h-4" />
                            </button>

                            {/* Lock / Unlock User */}
                            {currentUser?.id !== u.id && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`p-1.5 rounded-xl border transition active:scale-95 ${
                                  u.is_active
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                                title={u.is_active ? 'Khóa tài khoản này' : 'Mở khóa tài khoản này'}
                              >
                                {u.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </button>
                            )}

                            {/* Delete User */}
                            {currentUser?.id !== u.id && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition active:scale-95"
                                title="Xóa vĩnh viễn tài khoản này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: TRAFFIC & GUEST ANALYTICS ── */}
        {activeAdminTab === 'traffic' && overview && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 4 Cards Detail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md">
                <div className="flex items-center justify-between text-xs text-blue-300 font-bold mb-2">
                  <span>TỔNG LƯỢT TRUY CẬP</span>
                  <Globe className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white">{overview.total_visits}</div>
                <div className="text-xs text-slate-400 mt-1">
                  Hôm nay: <b className="text-emerald-400">+{overview.today_visits} lượt</b>
                </div>
              </div>

              {/* Card 2: Guests */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md">
                <div className="flex items-center justify-between text-xs text-cyan-300 font-bold mb-2">
                  <span>KHÁCH VÃNG LAI (GUESTS)</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-black text-white">{overview.guest_visits}</div>
                <div className="text-xs text-slate-400 mt-1">
                  <b className="text-cyan-300">{overview.unique_guests} khách duy nhất</b> ({overview.today_guest_visits} lượt hôm nay)
                </div>
              </div>

              {/* Card 3: Members */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md">
                <div className="flex items-center justify-between text-xs text-amber-300 font-bold mb-2">
                  <span>THÀNH VIÊN ĐÃ ĐĂNG NHẬP</span>
                  <Shield className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white">{overview.member_visits}</div>
                <div className="text-xs text-slate-400 mt-1">
                  <b className="text-amber-300">{overview.unique_members} thành viên</b> ({overview.today_member_visits} lượt hôm nay)
                </div>
              </div>

              {/* Card 4: Devices */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md">
                <div className="flex items-center justify-between text-xs text-purple-300 font-bold mb-2">
                  <span>THIẾT BỊ TRUY CẬP</span>
                  <Smartphone className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex items-center gap-3 text-2xl font-black text-white">
                  <span className="flex items-center gap-1 text-purple-300 text-lg">
                    <Smartphone className="w-4 h-4" /> {overview.mobile_visits}
                  </span>
                  <span className="text-slate-600">/</span>
                  <span className="flex items-center gap-1 text-slate-300 text-lg">
                    <Monitor className="w-4 h-4" /> {overview.desktop_visits}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Điện thoại di động & Máy tính bàn
                </div>
              </div>
            </div>

            {/* Trend Chart (7-day or 30-day) */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>
                      {selectedTimeframe === 'month'
                        ? 'Xu Hướng Truy Cập 30 Ngày Gần Nhất (Khách Vãng Lai vs Thành Viên)'
                        : 'Xu Hướng Truy Cập 7 Ngày Gần Nhất (Khách Vãng Lai vs Thành Viên)'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Biểu đồ đo lường mức độ tương tác và bạn bè vào web mỗi ngày
                  </p>
                </div>

                {/* Switcher 7d / 30d */}
                <div className="flex items-center gap-1 bg-[#162032] p-1 rounded-xl border border-slate-700/60 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSelectedTimeframe('week')}
                    className={`px-3 py-1 rounded-lg transition ${
                      selectedTimeframe !== 'month'
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    7 Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTimeframe('month')}
                    className={`px-3 py-1 rounded-lg transition ${
                      selectedTimeframe === 'month'
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    30 Ngày
                  </button>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full">
                {(() => {
                  const chartData =
                    selectedTimeframe === 'month' && overview.traffic_trend_30days && overview.traffic_trend_30days.length > 0
                      ? overview.traffic_trend_30days
                      : overview.traffic_trend_7days

                  return chartData && chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#162032',
                          borderColor: 'rgba(255,255,255,0.15)',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                        formatter={(val) => (val === 'guest' ? 'Khách vãng lai' : val === 'member' ? 'Thành viên' : val)}
                      />
                      <Bar dataKey="guest" name="Khách vãng lai" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="member" name="Thành viên" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Chưa có đủ dữ liệu lưu lượng
                  </div>
                )
              })()}
              </div>
            </div>

            {/* ── BẢNG DANH SÁCH NGƯỜI TRUY CẬP & NHẬT KÝ THIẾT BỊ ── */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Chi Tiết Người Truy Cập & Thiết Bị Vào Web</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                        {visitorViewMode === 'aggregated' ? `${aggregatedVisitors.length} người` : `${liveVisitLogs.length} lượt`}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Định danh theo Tên (Thành viên) và IP (Khách vãng lai), thống kê số lần vào & thiết bị sử dụng
                    </p>
                  </div>
                </div>

                {/* Right controls: Refresh & View Mode */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#162032] p-1 rounded-xl border border-slate-700/60 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setVisitorViewMode('aggregated')}
                      className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                        visitorViewMode === 'aggregated'
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Theo Người</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitorViewMode('live')}
                      className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                        visitorViewMode === 'live'
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Nhật Ký Live</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchVisitors()}
                    disabled={visitorsLoading}
                    className="p-2 rounded-xl bg-[#162032] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition"
                    title="Làm mới dữ liệu"
                  >
                    <RefreshCw className={`w-4 h-4 ${visitorsLoading ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search box */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={visitorSearchTerm}
                    onChange={(e) => setVisitorSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchVisitors()}
                    placeholder="Tìm theo tên hiển thị, @username hoặc địa chỉ IP..."
                    className="w-full pl-9 pr-9 py-2 bg-black/40 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 text-xs transition"
                  />
                  {visitorSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setVisitorSearchTerm('')
                        setTimeout(() => fetchVisitors(), 0)
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-[#162032] p-1 rounded-xl border border-slate-700/60 text-xs font-bold overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setVisitorFilterType('all')}
                    className={`px-3 py-1 rounded-lg transition whitespace-nowrap ${
                      visitorFilterType === 'all'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tất Cả ({aggregatedVisitors.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitorFilterType('members')}
                    className={`px-3 py-1 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
                      visitorFilterType === 'members'
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Thành Viên ({aggregatedVisitors.filter(v => v.is_member).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitorFilterType('guests')}
                    className={`px-3 py-1 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
                      visitorFilterType === 'guests'
                        ? 'bg-cyan-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Khách Vãng Lai ({aggregatedVisitors.filter(v => !v.is_member).length})</span>
                  </button>
                </div>
              </div>

              {/* BỘ CHỌN & LỌC THEO NGÀY CỤ THỂ */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-slate-400 font-bold">
                    <CalendarDays className="w-4 h-4 text-amber-400" />
                    <span>Lọc theo ngày:</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setVisitorFilterDate('')
                      setVisitorPage(1)
                    }}
                    className={`px-2.5 py-1 rounded-lg transition font-medium ${
                      !visitorFilterDate
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-[#162032] text-slate-400 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    Mọi ngày ({selectedTimeframe === 'day' ? 'Hôm nay' : selectedTimeframe === 'week' ? '7 ngày' : selectedTimeframe === 'month' ? '30 ngày' : 'Toàn bộ'})
                  </button>

                  {/* Nút nhanh Hôm nay / Hôm qua */}
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0]
                    const yest = new Date()
                    yest.setDate(yest.getDate() - 1)
                    const yestStr = yest.toISOString().split('T')[0]
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setVisitorFilterDate(todayStr)
                            setVisitorPage(1)
                          }}
                          className={`px-2.5 py-1 rounded-lg transition font-medium ${
                            visitorFilterDate === todayStr
                              ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                              : 'bg-[#162032] text-slate-400 hover:text-white border border-slate-700/60'
                          }`}
                        >
                          Hôm Nay
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVisitorFilterDate(yestStr)
                            setVisitorPage(1)
                          }}
                          className={`px-2.5 py-1 rounded-lg transition font-medium ${
                            visitorFilterDate === yestStr
                              ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                              : 'bg-[#162032] text-slate-400 hover:text-white border border-slate-700/60'
                          }`}
                        >
                          Hôm Qua
                        </button>
                      </>
                    )
                  })()}

                  {/* Date Input */}
                  <div className="flex items-center gap-1.5 bg-black/40 border border-slate-700/80 rounded-xl px-2.5 py-1">
                    <span className="text-[11px] text-slate-400">Chọn ngày:</span>
                    <input
                      type="date"
                      value={visitorFilterDate}
                      onChange={(e) => {
                        setVisitorFilterDate(e.target.value)
                        setVisitorPage(1)
                      }}
                      className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark]"
                    />
                    {visitorFilterDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setVisitorFilterDate('')
                          setVisitorPage(1)
                        }}
                        className="text-slate-400 hover:text-white p-0.5 ml-1"
                        title="Bỏ lọc ngày"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {visitorFilterDate && (
                  <span className="text-[11px] text-amber-300 font-semibold px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20">
                    📅 Đang xem nhật ký ngày: <b>{visitorFilterDate}</b>
                  </span>
                )}
              </div>

              {/* Content Table */}
              {visitorsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs">Đang tải danh sách người truy cập...</span>
                </div>
              ) : visitorViewMode === 'aggregated' ? (
                /* CHẾ ĐỘ 1: BẢNG TỔNG HỢP THEO NGƯỜI */
                aggregatedVisitors.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                    Chưa tìm thấy người truy cập nào phù hợp với bộ lọc.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#162032] text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Người Truy Cập (Tên / IP)</th>
                          <th className="py-3 px-4 text-center">Số Lần Vào Web</th>
                          <th className="py-3 px-4">Thiết Bị & Nền Tảng</th>
                          <th className="py-3 px-4">Trang Xem Gần Nhất</th>
                          <th className="py-3 px-4">Hoạt Động Gần Nhất</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-black/20">
                        {aggregatedVisitors.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-800/40 transition">
                            {/* Cột 1: Tên hoặc IP */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                {v.is_member ? (
                                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-lg shrink-0">
                                    {getVehicleIcon(v.avatar || 'cyber_car')}
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                                    <Globe className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white truncate">
                                      {v.identity}
                                    </span>
                                    {v.is_member ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                                        Thành viên
                                      </span>
                                    ) : (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold shrink-0">
                                        Khách IP
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono truncate">
                                    {v.is_member && v.username ? (
                                      <span>@{v.username} • IP: {v.ip_address}</span>
                                    ) : (
                                      <span>IP: {v.ip_address}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Cột 2: Số lần vào */}
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-xs shadow-sm">
                                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span>{v.visit_count} lần</span>
                              </span>
                            </td>

                            {/* Cột 3: Thiết bị & Nền tảng */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-slate-800/80 text-purple-300 shrink-0">
                                  {v.device_type === 'mobile' ? (
                                    <Smartphone className="w-4 h-4" />
                                  ) : (
                                    <Monitor className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-white font-semibold truncate">
                                    {v.browser}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {v.os} • {v.device_type === 'mobile' ? 'Điện thoại' : 'Máy tính'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Cột 4: Đường dẫn xem gần nhất */}
                            <td className="py-3 px-4">
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700 truncate inline-block max-w-[160px]">
                                {v.last_path || '/'}
                              </span>
                            </td>

                            {/* Cột 5: Hoạt động gần nhất */}
                            <td className="py-3 px-4">
                              <div className="text-slate-200 font-medium">
                                {formatRelativeTime(v.last_visit)}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Lần đầu: {formatRelativeTime(v.first_visit)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* CHẾ ĐỘ 2: NHẬT KÝ LIVE STREAM */
                liveVisitLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                    Chưa có lượt truy cập nào được ghi nhận.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#162032] text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Thời Gian</th>
                          <th className="py-3 px-4">Người Truy Cập</th>
                          <th className="py-3 px-4">Thiết Bị & Trình Duyệt</th>
                          <th className="py-3 px-4">Trang Xem (Path)</th>
                          <th className="py-3 px-4">Địa Chỉ IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-black/20">
                        {liveVisitLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                              <div className="text-white font-medium">
                                {formatRelativeTime(log.created_at)}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {log.created_at ? new Date(log.created_at).toLocaleTimeString('vi-VN') : ''}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {log.is_member ? (
                                  <>
                                    <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-xs shrink-0">
                                      {getVehicleIcon(log.avatar || 'cyber_car')}
                                    </div>
                                    <div>
                                      <div className="font-bold text-white truncate max-w-[150px]">
                                        {log.display_name || log.username || 'Thành viên'}
                                      </div>
                                      {log.username && (
                                        <div className="text-[10px] text-amber-400/80 font-mono">
                                          @{log.username}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                                    <span className="font-mono text-cyan-300">
                                      {log.ip_address || 'Khách vãng lai'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                {log.device_type === 'mobile' ? (
                                  <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                                ) : (
                                  <Monitor className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                <span className="text-slate-200">
                                  {log.browser} • {log.os}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800/90 text-cyan-300 border border-slate-700">
                                {log.path || '/'}
                              </span>
                            </td>

                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                              {log.ip_address || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* BỘ PHÂN TRANG (PAGINATION) - TRÁNH TẢI DỒN GÂY LAG */}
              {!visitorsLoading && (
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                  {/* Trạng thái hiển thị */}
                  <div className="flex items-center gap-2">
                    <span>
                      Hiển thị{' '}
                      <b className="text-white">
                        {Math.min(
                          (visitorPage - 1) * visitorPageSize + 1,
                          visitorViewMode === 'aggregated' ? visitorTotalUnique : visitorTotalLive
                        )}
                        -
                        {Math.min(
                          visitorPage * visitorPageSize,
                          visitorViewMode === 'aggregated' ? visitorTotalUnique : visitorTotalLive
                        )}
                      </b>{' '}
                      / Tổng số{' '}
                      <b className="text-cyan-400">
                        {visitorViewMode === 'aggregated' ? visitorTotalUnique : visitorTotalLive}
                      </b>{' '}
                      {visitorViewMode === 'aggregated' ? 'người' : 'lượt'}
                    </span>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-1.5">
                      <span>Mỗi trang:</span>
                      <select
                        value={visitorPageSize}
                        onChange={(e) => {
                          setVisitorPageSize(Number(e.target.value))
                          setVisitorPage(1)
                        }}
                        className="bg-[#162032] border border-slate-700/80 rounded-lg px-2 py-0.5 text-white font-medium focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  {/* Nút chuyển trang */}
                  {(() => {
                    const currentTotalPages =
                      visitorViewMode === 'aggregated' ? visitorTotalPages : visitorTotalLivePages
                    if (currentTotalPages <= 1) return null

                    const handlePageChange = (newPage: number) => {
                      if (newPage < 1 || newPage > currentTotalPages) return
                      setVisitorPage(newPage)
                      fetchVisitors(newPage)
                    }

                    return (
                      <div className="flex items-center gap-1 bg-[#162032] p-1 rounded-xl border border-slate-700/60 font-bold">
                        <button
                          type="button"
                          onClick={() => handlePageChange(1)}
                          disabled={visitorPage <= 1}
                          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition"
                          title="Trang đầu"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePageChange(visitorPage - 1)}
                          disabled={visitorPage <= 1}
                          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition"
                          title="Trang trước"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1 px-1">
                          {Array.from({ length: currentTotalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === currentTotalPages || Math.abs(p - visitorPage) <= 1)
                            .map((p, idx, arr) => (
                              <React.Fragment key={p}>
                                {idx > 0 && p - arr[idx - 1] > 1 && (
                                  <span className="px-1 text-slate-500">...</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handlePageChange(p)}
                                  className={`w-7 h-7 rounded-lg text-xs transition ${
                                    visitorPage === p
                                      ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                  }`}
                                >
                                  {p}
                                </button>
                              </React.Fragment>
                            ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePageChange(visitorPage + 1)}
                          disabled={visitorPage >= currentTotalPages}
                          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition"
                          title="Trang sau"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentTotalPages)}
                          disabled={visitorPage >= currentTotalPages}
                          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition"
                          title="Trang cuối"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: FEEDBACKS INBOX ── */}
        {activeAdminTab === 'feedbacks' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <MessageSquarePlus className="w-5 h-5 text-emerald-400" />
                    <span>Hòm Thư Đóng Góp Ý Kiến & Nhận Xét Web</span>
                    <span className="text-xs font-normal text-slate-400">({feedbacks.length} nhận xét)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Đọc phản hồi từ bạn bè và khách để liên tục cải tiến và nâng cấp website
                  </p>
                </div>

                {overview && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30">
                    <span className="text-xs text-amber-300 font-bold">Điểm Đánh Giá TB:</span>
                    <span className="text-base font-black text-white">{overview.feedback_avg_rating}</span>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Lọc:
                </span>

                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="bg-[#162032] border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="all">Tất cả danh mục</option>
                  <option value="feature">💡 Tính năng mới</option>
                  <option value="bug">🐛 Báo lỗi</option>
                  <option value="ui">🎨 Giao diện & Mobile</option>
                  <option value="praise">❤️ Khen ngợi</option>
                  <option value="other">💬 Ý kiến khác</option>
                </select>

                <select
                  value={feedbackStatus}
                  onChange={(e) => setFeedbackStatus(e.target.value)}
                  className="bg-[#162032] border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="new">Mới chưa xem</option>
                  <option value="reviewed">Đã xem</option>
                  <option value="resolved">Đã giải quyết / xong</option>
                </select>

                <select
                  value={feedbackRating || ''}
                  onChange={(e) => setFeedbackRating(e.target.value ? Number(e.target.value) : null)}
                  className="bg-[#162032] border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="">Tất cả số sao</option>
                  <option value="5">⭐⭐⭐⭐⭐ 5 sao</option>
                  <option value="4">⭐⭐⭐⭐ 4 sao</option>
                  <option value="3">⭐⭐⭐ 3 sao</option>
                  <option value="2">⭐⭐ 2 sao</option>
                  <option value="1">⭐ 1 sao</option>
                </select>
              </div>

              {/* Feedback List */}
              <div className="space-y-3 pt-2">
                {feedbacksLoading ? (
                  <div className="py-12 text-center text-slate-400 italic">Đang tải nhận xét...</div>
                ) : feedbacks.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic">
                    Chưa có nhận xét nào phù hợp với bộ lọc này.
                  </div>
                ) : (
                  feedbacks.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 sm:p-5 rounded-2xl bg-[#141d2f] border border-slate-750 space-y-3 shadow-md hover:border-slate-600 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= f.rating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-white/20'
                                }`}
                              />
                            ))}
                          </div>

                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider">
                            {f.category === 'feature'
                              ? '💡 Tính năng mới'
                              : f.category === 'bug'
                              ? '🐛 Báo lỗi'
                              : f.category === 'ui'
                              ? '🎨 Giao diện/Mobile'
                              : f.category === 'praise'
                              ? '❤️ Khen ngợi'
                              : '💬 Ý kiến khác'}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              f.status === 'new'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : f.status === 'reviewed'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {f.status === 'new' ? 'MỚI' : f.status === 'reviewed' ? 'ĐÃ XEM' : 'ĐÃ XỬ LÝ'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span className="font-bold text-white">
                            {f.is_member ? `👤 ${f.sender_name} (@${f.member_username})` : `👥 ${f.sender_name}`}
                          </span>
                          {f.sender_contact && (
                            <span className="text-cyan-400">({f.sender_contact})</span>
                          )}
                          <span>•</span>
                          <span>{f.created_at ? new Date(f.created_at).toLocaleDateString('vi-VN') : ''}</span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-slate-800">
                        {f.content}
                      </p>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800 text-xs">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs text-slate-400 flex-shrink-0">Ghi chú Admin:</span>
                          <input
                            type="text"
                            value={adminNotes[f.id] || ''}
                            onChange={(e) => setAdminNotes({ ...adminNotes, [f.id]: e.target.value })}
                            placeholder="Ghi chú phản hồi / tiến độ xử lý..."
                            className="w-full bg-[#162032] border border-slate-700 focus:border-cyan-400 rounded-xl px-2.5 py-1 text-xs text-white placeholder-slate-500 outline-none transition"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 justify-end">
                          {f.status !== 'reviewed' && (
                            <button
                              onClick={() => handleUpdateFeedbackStatus(f.id, 'reviewed')}
                              className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold active:scale-95 transition"
                            >
                              Đã xem
                            </button>
                          )}
                          {f.status !== 'resolved' && (
                            <button
                              onClick={() => handleUpdateFeedbackStatus(f.id, 'resolved')}
                              className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold active:scale-95 transition flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Đã xong
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFeedback(f.id)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition active:scale-95"
                            title="Xóa nhận xét này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL 1: GÁN QUYỀN (ROLE ASSIGNMENT MODAL) ── */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#121929] border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Gán Quyền & Phân Vai Trò</h3>
                  <p className="text-xs text-slate-400">
                    Tài khoản: <strong className="text-slate-200">@{roleModalUser.username}</strong> ({roleModalUser.display_name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Role Options */}
            <div className="space-y-3">
              {/* Option 1: Normal Member */}
              <div
                onClick={() => setRoleModalIsAdmin(false)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3.5 ${
                  !roleModalIsAdmin
                    ? 'bg-cyan-950/40 border-cyan-500/60 ring-1 ring-cyan-500/40'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    !roleModalIsAdmin ? 'border-cyan-400 bg-cyan-500 text-slate-950' : 'border-slate-600'
                  }`}
                >
                  {!roleModalIsAdmin && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">👤 Thành Viên Thông Thường (Member)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                      Mặc định
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Tài khoản người dùng thông thường: cày Pomodoro, quản lý mục tiêu cá nhân, ma trận 4 ô, tham gia trường đua F1. <strong>Không thể</strong> truy cập Cổng Quản Trị Hệ Thống.
                  </p>
                </div>
              </div>

              {/* Option 2: Administrator */}
              <div
                onClick={() => setRoleModalIsAdmin(true)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3.5 ${
                  roleModalIsAdmin
                    ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/40'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    roleModalIsAdmin ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-600'
                  }`}
                >
                  {roleModalIsAdmin && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-amber-300">👑 Quản Trị Viên (Administrator)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      Toàn Quyền
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Có toàn quyền truy cập Cổng Quản Trị, giám sát tiến độ và mục tiêu của bạn bè, đổi mật khẩu, phân quyền cho người khác và xem thống kê website.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setRoleModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleSaveRole}
                disabled={roleModalLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Shield className="w-4 h-4" />
                <span>{roleModalLoading ? 'Đang lưu...' : 'Xác Nhận Phân Quyền'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: SOI HOẠT ĐỘNG CHI TIẾT BẠN BÈ ── */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0e1424]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xl shadow-sm">
                  {userDetail ? getVehicleIcon(userDetail.user.racer_avatar) : '🚀'}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>{userDetail ? userDetail.user.display_name : 'Đang tải...'}</span>
                    <span className="text-xs font-normal text-slate-400">
                      (@{userDetail ? userDetail.user.username : ''})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bảng theo dõi mục tiêu, nhật ký cày Pomodoro và ma trận 4 ô của bạn bè
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserId(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {detailLoading || !userDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-cyan-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs">Đang tải nhật ký và mục tiêu của bạn bè...</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Stats Summary Ribbon */}
                <div className="px-6 py-3 bg-[#0a0f1d] border-b border-slate-800 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-cyan-400 font-bold">Cấp {userDetail.user.level}</span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> Chuỗi {userDetail.user.streak} ngày
                    </span>
                    <span>•</span>
                    <span className="text-purple-400 font-bold">{userDetail.goals.length} mục tiêu</span>
                    <span>•</span>
                    <span className="text-rose-400 font-bold">{userDetail.user.cheer_count} lượt cổ vũ</span>
                  </div>
                </div>

                {/* Tab Selector */}
                <div className="flex border-b border-slate-800 px-6 bg-[#0e1424] gap-2 pt-2">
                  <button
                    onClick={() => setDetailTab('goals')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition ${
                      detailTab === 'goals'
                        ? 'border-cyan-400 text-cyan-300'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Mục Tiêu Pomodoro ({userDetail.goals.length})</span>
                  </button>

                  <button
                    onClick={() => setDetailTab('sessions')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition ${
                      detailTab === 'sessions'
                        ? 'border-amber-400 text-amber-300'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Nhật Ký Phiên Học ({userDetail.recent_sessions.length})</span>
                  </button>

                  <button
                    onClick={() => setDetailTab('matrix')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition ${
                      detailTab === 'matrix'
                        ? 'border-purple-400 text-purple-300'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Ma Trận 4 Ô ({userDetail.matrix_tasks.length})</span>
                  </button>

                  <button
                    onClick={() => setDetailTab('visits')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition ${
                      detailTab === 'visits'
                        ? 'border-purple-400 text-purple-300'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Thiết Bị & Vào Web ({userDetail.visit_history?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setDetailTab('cheer')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition ${
                      detailTab === 'cheer'
                        ? 'border-rose-400 text-rose-300'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Cổ Vũ & Tiếp Lửa</span>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* TAB 1: GOALS */}
                  {detailTab === 'goals' && (
                    <div className="space-y-3">
                      {userDetail.goals.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 italic">
                          Bạn này chưa tạo mục tiêu Pomodoro nào.
                        </div>
                      ) : (
                        userDetail.goals.map((g) => (
                          <div
                            key={g.id}
                            className="bg-[#141d2f] border border-slate-700/80 rounded-2xl p-4 space-y-2 hover:border-cyan-500/40 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: g.color || '#E24A4A' }}
                                />
                                <h4 className="font-bold text-white text-sm">{g.title}</h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  ⭐ {g.celestial_name}
                                </span>
                                {g.is_completed && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                    Đã Hoàn Thành
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-bold text-slate-300">
                                <span className="text-cyan-400">{g.current_hours}h</span> / {g.target_hours}h
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500 transition-all duration-300"
                                style={{ width: `${Math.min(100, g.progress_percent)}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span>Tiến độ: {g.progress_percent}% ({g.session_count} phiên học)</span>
                              {g.notes && <span className="italic truncate max-w-xs">Ghi chú: {g.notes}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 2: SESSIONS */}
                  {detailTab === 'sessions' && (
                    <div className="space-y-2.5">
                      {userDetail.recent_sessions.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 italic">
                          Chưa có phiên học Pomodoro nào được ghi nhận.
                        </div>
                      ) : (
                        userDetail.recent_sessions.map((s) => (
                          <div
                            key={s.id}
                            className="bg-[#141d2f] border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                                {s.duration_minutes}m
                              </div>
                              <div>
                                <div className="font-semibold text-white">
                                  {s.topic_note || 'Phiên tập trung tự do'}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span className="text-cyan-400 font-medium">{s.goal_title}</span>
                                  <span>•</span>
                                  <span>{s.session_date}</span>
                                  <span>•</span>
                                  <span className="uppercase text-[10px] px-1 rounded bg-slate-800 text-slate-300">{s.source}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right text-slate-300 font-mono text-xs font-bold">
                              +{s.duration_hours}h
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: MATRIX */}
                  {detailTab === 'matrix' && (
                    <div className="space-y-2.5">
                      {userDetail.matrix_tasks.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 italic">
                          Bạn này chưa có nhiệm vụ nào trong Ma Trận 4 Ô.
                        </div>
                      ) : (
                        userDetail.matrix_tasks.map((t) => {
                          const qLabels = ['Q1: Khẩn Cấp & Quan Trọng', 'Q2: Kế Hoạch Chiến Lược', 'Q3: Việc Nhanh/Uỷ Quyền', 'Q4: Hạn Chế/Giải Trí']
                          const qColors = ['text-rose-400 border-rose-500/30 bg-rose-500/10', 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10', 'text-amber-400 border-amber-500/30 bg-amber-500/10', 'text-slate-400 border-white/10 bg-white/5']
                          const qIndex = Math.max(0, Math.min(3, t.quadrant - 1))
                          return (
                            <div
                              key={t.id}
                              className="bg-[#141d2f] border border-slate-700/80 rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${qColors[qIndex]}`}>
                                    {qLabels[qIndex]}
                                  </span>
                                  <span className={t.is_completed ? 'line-through text-slate-400 font-medium' : 'text-white font-semibold'}>
                                    {t.title}
                                  </span>
                                </div>
                                {t.reflection_note && (
                                  <p className="text-xs text-amber-300/80 italic pl-1">
                                    ✍️ Phản tư: {t.reflection_note}
                                  </p>
                                )}
                                <div className="text-[11px] text-slate-400 pl-1">Ngày: {t.date}</div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.is_completed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {t.is_completed ? 'Đã xong ✓' : 'Chưa xong'}
                              </span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}

                  {/* TAB 4: VISITS & DEVICES */}
                  {detailTab === 'visits' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-[#141d2f] border border-slate-700/80 rounded-xl p-3">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Lần Mở Web</div>
                          <div className="text-xl font-black text-white mt-0.5">{userDetail.total_visits || userDetail.visit_history?.length || 0} lần</div>
                        </div>
                        <div className="bg-[#141d2f] border border-slate-700/80 rounded-xl p-3">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Phiên Pomodoro</div>
                          <div className="text-xl font-black text-amber-300 mt-0.5">{userDetail.total_sessions_count || userDetail.recent_sessions.length} phiên</div>
                        </div>
                        <div className="bg-[#141d2f] border border-slate-700/80 rounded-xl p-3">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Việc Ma Trận</div>
                          <div className="text-xl font-black text-purple-300 mt-0.5">{userDetail.total_matrix_count || userDetail.matrix_tasks.length} task</div>
                        </div>
                        <div className="bg-[#141d2f] border border-slate-700/80 rounded-xl p-3">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Chòm Sao Thắp Sáng</div>
                          <div className="text-xl font-black text-cyan-300 mt-0.5">{userDetail.unlocked_constellations?.length || 0} chòm</div>
                        </div>
                      </div>

                      {!userDetail.visit_history || userDetail.visit_history.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 italic border border-dashed border-slate-800 rounded-xl">
                          Chưa có nhật ký truy cập thiết bị của bạn này.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-700/80 rounded-xl">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-[#162032] text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3">Thời Gian</th>
                                <th className="py-2.5 px-3">Thiết Bị</th>
                                <th className="py-2.5 px-3">Trình Duyệt & Hệ Điều Hành</th>
                                <th className="py-2.5 px-3">Địa Chỉ IP</th>
                                <th className="py-2.5 px-3">Trang Xem</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 bg-black/20">
                              {userDetail.visit_history.map((v) => (
                                <tr key={v.id} className="hover:bg-slate-800/40 transition">
                                  <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                                    <div className="text-white font-medium">{formatRelativeTime(v.created_at)}</div>
                                    <div className="text-[10px] text-slate-500">
                                      {v.created_at ? new Date(v.created_at).toLocaleString('vi-VN') : ''}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-1.5">
                                      {v.device_type === 'mobile' ? (
                                        <Smartphone className="w-4 h-4 text-purple-400" />
                                      ) : (
                                        <Monitor className="w-4 h-4 text-slate-400" />
                                      )}
                                      <span className="capitalize">{v.device_type === 'mobile' ? 'Điện thoại' : 'Máy tính'}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="text-white font-medium">{v.browser}</div>
                                    <div className="text-[10px] text-slate-400">{v.os}</div>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                                    {v.ip_address}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                                      {v.path}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: CHEER & TELEGRAM */}
                  {detailTab === 'cheer' && (
                    <div className="space-y-6">
                      {/* Section 1: In-App Cheer */}
                      <div className="bg-[#141d2f] border border-slate-700/80 rounded-2xl p-4 space-y-3">
                        <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-rose-400" />
                          <span>Gửi Lời Động Viên & Biểu Cảm Trong App</span>
                        </h4>

                        <div className="flex items-center gap-2">
                          {['🔥', '🚀', '☕', '🌟', '🏆'].map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => setSelectedEmoji(em)}
                              className={`text-xl p-2 rounded-xl transition ${
                                selectedEmoji === em
                                  ? 'bg-rose-500/30 border border-rose-500/50 scale-110 shadow-lg'
                                  : 'bg-slate-800 hover:bg-slate-700'
                              }`}
                            >
                              {em}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          placeholder="Nhập lời khen hoặc động viên (VD: Cố lên bạn ơi, phong độ đỉnh lắm!)..."
                          value={cheerMsg}
                          onChange={(e) => setCheerMsg(e.target.value)}
                          className="w-full bg-[#162032] border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 outline-none transition"
                        />

                        <button
                          onClick={handleSendCheer}
                          disabled={sendingMsg}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-bold text-xs hover:opacity-95 transition active:scale-95 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{sendingMsg ? 'Đang gửi...' : `Gửi Cổ Vũ ${selectedEmoji}`}</span>
                        </button>
                      </div>

                      {/* Section 2: Direct Telegram Message */}
                      <div className="bg-[#141d2f] border border-slate-700/80 rounded-2xl p-4 space-y-3">
                        <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                          <SendHorizontal className="w-4 h-4 text-sky-400" />
                          <span>Gửi Tin Nhắn Trực Tiếp Đến Telegram Của Bạn Bè</span>
                        </h4>

                        {userDetail.user.has_telegram ? (
                          <>
                            <p className="text-xs text-slate-400">
                              Người bạn này đã kết nối Telegram Bot. Tin nhắn của bạn sẽ được gửi thẳng vào Telegram của bạn đó!
                            </p>
                            <textarea
                              rows={3}
                              placeholder="Nội dung tin nhắn muốn gửi đến bot Telegram của bạn bè..."
                              value={telegramMsg}
                              onChange={(e) => setTelegramMsg(e.target.value)}
                              className="w-full bg-[#162032] border border-slate-700 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 outline-none transition resize-none"
                            />
                            <button
                              onClick={handleSendTelegram}
                              disabled={sendingMsg || !telegramMsg.trim()}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition active:scale-95 disabled:opacity-50"
                            >
                              <SendHorizontal className="w-3.5 h-3.5" />
                              <span>{sendingMsg ? 'Đang gửi qua Telegram...' : 'Bắn Tin Nhắn Telegram'}</span>
                            </button>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400 italic py-2">
                            Bạn này chưa cài đặt Telegram Chat ID trong phần Cài Đặt Thông Báo. Hãy nhắc bạn cài đặt để nhận tin nhắn trực tiếp nhé!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 3: ĐẶT LẠI MẬT KHẨU ── */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121929] border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Đặt Lại Mật Khẩu</h3>
                  <p className="text-xs text-slate-400">Tài khoản: @{resetModalUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Nhập mật khẩu mới để cấp lại cho bạn <strong>{resetModalUser.display_name}</strong> (ít nhất 4 ký tự):
            </p>

            <input
              type="text"
              placeholder="Nhập mật khẩu mới..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#162032] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 outline-none transition"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setResetModalUser(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting || !newPassword.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition active:scale-95 disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{resetting ? 'Đang lưu...' : 'Lưu Mật Khẩu Mới'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: KHÓA / MỞ KHÓA TÀI KHOẢN ── */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121929] border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    statusModalUser.is_active
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {statusModalUser.is_active ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {statusModalUser.is_active ? 'Khóa Tài Khoản Người Dùng' : 'Mở Khóa Tài Khoản'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tài khoản: <strong className="text-cyan-300">@{statusModalUser.username}</strong> ({statusModalUser.display_name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStatusModalUser(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 text-xs space-y-2">
              {statusModalUser.is_active ? (
                <>
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Xác nhận khóa tài khoản:</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Khi bị khóa, người bạn này <strong>sẽ không thể đăng nhập</strong> vào hệ thống Pomodoro LifeQuest.
                    Toàn bộ dữ liệu mục tiêu và giờ học vẫn được bảo lưu nguyên vẹn, bạn có thể mở khóa lại bất kỳ lúc nào.
                  </p>
                </>
              ) : (
                <>
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Xác nhận mở khóa tài khoản:</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Sau khi mở khóa, người dùng này có thể đăng nhập bình thường và tiếp tục hành trình đua top, tích lũy ngọc và hoàn thành mục tiêu.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setStatusModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmToggleStatus}
                disabled={statusModalLoading}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow-lg disabled:opacity-50 ${
                  statusModalUser.is_active
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {statusModalUser.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span>
                  {statusModalLoading
                    ? 'Đang xử lý...'
                    : statusModalUser.is_active
                    ? 'Xác Nhận Khóa Tài Khoản'
                    : 'Xác Nhận Mở Khóa'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: XÓA VĨNH VIỄN TÀI KHOẢN (DANGER ZONE) ── */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#14121a] border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md shadow-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-300 text-base">Xóa Vĩnh Viễn Tài Khoản</h3>
                  <p className="text-xs text-slate-400">
                    Người dùng: <strong className="text-white">@{deleteModalUser.username}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalUser(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-2">
              <div className="font-bold text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>HÀNH ĐỘNG NGUY HIỂM & KHÔNG THỂ HOÀN TÁC!</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Tài khoản <strong>@{deleteModalUser.username}</strong> ({deleteModalUser.display_name}) và toàn bộ dữ liệu đi kèm sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] pl-1">
                <li>Tất cả mục tiêu học tập (Goals)</li>
                <li>Tất cả lịch sử các phiên Pomodoro (Sessions)</li>
                <li>Toàn bộ nhiệm vụ trong Ma Trận 4 Ô</li>
                <li>Cấu hình thông báo Telegram & thành tích đua top</li>
              </ul>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-slate-400">
                Để xác nhận, vui lòng gõ chính xác username <code className="text-rose-300 font-bold bg-rose-500/10 px-1 py-0.5 rounded">@{deleteModalUser.username}</code>:
              </label>
              <input
                type="text"
                placeholder={deleteModalUser.username}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-[#1b1725] border border-rose-500/30 focus:border-rose-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                disabled={deleteModalLoading || deleteConfirmText.trim().replace(/^@/, '') !== deleteModalUser.username}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition active:scale-95 shadow-lg shadow-rose-600/30 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleteModalLoading ? 'Đang xóa...' : 'Xác Nhận Xóa Vĩnh Viễn'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
