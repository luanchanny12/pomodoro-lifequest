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
} from 'lucide-react'
import { toast } from 'sonner'
import { adminService, AdminOverview, AdminUserItem, UserActivityDetail } from '@/services/adminService'
import { authService, UserProfile } from '@/services/authService'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser())
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Detail Modal State
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [userDetail, setUserDetail] = useState<UserActivityDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [detailTab, setDetailTab] = useState<'goals' | 'sessions' | 'matrix' | 'cheer'>('goals')

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<AdminUserItem | null>(null)
  const [newPassword, setNewPassword] = useState<string>('')
  const [resetting, setResetting] = useState<boolean>(false)

  // Cheer / Telegram Message State
  const [cheerMsg, setCheerMsg] = useState<string>('')
  const [selectedEmoji, setSelectedEmoji] = useState<string>('🔥')
  const [telegramMsg, setTelegramMsg] = useState<string>('')
  const [sendingMsg, setSendingMsg] = useState<boolean>(false)

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

  const handleToggleRole = async (u: AdminUserItem) => {
    const newRole = !u.is_admin
    const confirmMsg = newRole
      ? `Bạn có chắc muốn thăng cấp @${u.username} lên Quản trị viên (Admin)?`
      : `Bạn có chắc muốn hạ quyền Admin của @${u.username}?`
    if (!window.confirm(confirmMsg)) return

    try {
      const res = await adminService.updateRole(u.id, newRole)
      toast.success(res.message)
      setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, is_admin: newRole } : item)))
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thay đổi vai trò!')
    }
  }

  const handleToggleStatus = async (u: AdminUserItem) => {
    const newStatus = !u.is_active
    const confirmMsg = newStatus
      ? `Mở khóa tài khoản @${u.username}?`
      : `Bạn có chắc muốn KHÓA tài khoản @${u.username}? (Người này sẽ không thể đăng nhập)`
    if (!window.confirm(confirmMsg)) return

    try {
      const res = await adminService.updateStatus(u.id, newStatus)
      toast.success(res.message)
      setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, is_active: newStatus } : item)))
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thay đổi trạng thái!')
    }
  }

  const handleDeleteUser = async (u: AdminUserItem) => {
    if (!window.confirm(`⚠️ CẢNH BÁO: Bạn có chắc muốn XÓA HOÀN TOÀN tài khoản @${u.username} và toàn bộ dữ liệu học tập của bạn này? Hành động này không thể hoàn tác!`)) {
      return
    }
    try {
      const res = await adminService.deleteUser(u.id)
      toast.success(res.message)
      setUsers((prev) => prev.filter((item) => item.id !== u.id))
      if (selectedUserId === u.id) setSelectedUserId(null)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa tài khoản!')
    }
  }

  const handleSendCheer = async () => {
    if (!selectedUserId) return
    try {
      setSendingMsg(true)
      const res = await adminService.sendCheer(selectedUserId, selectedEmoji, cheerMsg.trim() || undefined)
      toast.success(res.message)
      setCheerMsg('')
      // refresh user detail
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

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return u.username.toLowerCase().includes(term) || u.display_name.toLowerCase().includes(term)
  })

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
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0c101a]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-lg shadow-black/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Focus Hub</span>
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-black font-bold shadow-md shadow-amber-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-rose-300 to-cyan-300 bg-clip-text text-transparent">
                CỔNG QUẢN TRỊ VIÊN (ADMIN PORTAL)
              </h1>
              <p className="text-[10px] text-slate-400">Giám sát mục tiêu, bạn bè học tập & quản lý tài khoản</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-400 hover:text-cyan-200 transition active:scale-95 disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {currentUser && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-cyan-500/10 border border-amber-500/30 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-amber-400 font-bold">👑 Admin:</span>
              <span className="font-semibold text-white">{currentUser.display_name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Metric Overview Cards */}
        {overview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1 */}
            <div className="bg-[#0e1422] border border-cyan-500/20 rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-cyan-300/80 uppercase tracking-wider">Người Dùng / Bạn Bè</span>
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{overview.total_users}</div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-emerald-400 font-bold">{overview.active_today_count} bạn</span> đang học hôm nay
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#0e1422] border border-amber-500/20 rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider">Tổng Giờ Học Pomodoro</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{overview.total_study_hours}h</div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-amber-400 font-bold">+{overview.today_study_hours}h</span> tích luỹ hôm nay
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#0e1422] border border-purple-500/20 rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-purple-500/40 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-purple-300/80 uppercase tracking-wider">Mục Tiêu Chòm Sao</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{overview.total_goals}</div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-purple-400 font-bold">{overview.completed_goals}</span> mục tiêu đã chinh phục
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-[#0e1422] border border-rose-500/20 rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-rose-500/40 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-rose-300/80 uppercase tracking-wider">Phiên Tập Trung</span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{overview.total_sessions}</div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-rose-400 font-bold">{overview.today_sessions}</span> phiên cày xong hôm nay
              </div>
            </div>
          </div>
        )}

        {/* User Management Section */}
        <div className="bg-[#0e1422] border border-cyan-500/20 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>Danh Sách Bạn Bè & Quản Trị Tài Khoản</span>
                <span className="text-xs font-normal text-slate-400">({filteredUsers.length} tài khoản)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bấm vào <strong>"Soi Hoạt Động"</strong> để xem bạn bè đang học mục tiêu gì và làm những việc gì hôm nay
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm bạn theo tên hoặc username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#161c2e] border border-white/10 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Tay Đua / Người Dùng</th>
                  <th className="py-3 px-3 text-center">Vai Trò</th>
                  <th className="py-3 px-3 text-center">Cấp Độ & Chuỗi</th>
                  <th className="py-3 px-3 text-center">Giờ Đã Học</th>
                  <th className="py-3 px-3 text-center">Hôm Nay</th>
                  <th className="py-3 px-3 text-center">Mục Tiêu</th>
                  <th className="py-3 px-3 text-center">Trạng Thái</th>
                  <th className="py-3 px-3 text-right">Thao Tác Quản Trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                      Không tìm thấy người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition group">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl" title={u.racer_avatar}>
                            {getVehicleIcon(u.racer_avatar)}
                          </span>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.display_name}</span>
                              {u.has_telegram && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                                  TG
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleRole(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                            u.is_admin
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-slate-800/60 text-slate-400 border-white/10 hover:border-amber-500/30 hover:text-amber-300'
                          }`}
                          title="Bấm để cấp/hạ quyền Admin"
                        >
                          {u.is_admin ? '👑 Admin' : 'Tay Đua'}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-semibold text-slate-300">
                          <span className="text-cyan-400">Lv.{u.level}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-amber-400 flex items-center gap-0.5">
                            <Flame className="w-3.5 h-3.5" />
                            {u.streak}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-white">
                        {u.total_hours}h
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={u.today_hours > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {u.today_hours > 0 ? `+${u.today_hours}h` : '0h'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                          {u.goal_count} goals
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                            u.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-rose-500/20 hover:text-rose-300'
                              : 'bg-rose-500/20 text-rose-300 hover:bg-emerald-500/20 hover:text-emerald-300'
                          }`}
                          title="Bấm để Khóa / Mở khóa tài khoản"
                        >
                          {u.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{u.is_active ? 'Hoạt động' : 'Đã khóa'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Soi Hoạt Động */}
                          <button
                            onClick={() => handleOpenDetail(u.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition active:scale-95 shadow-sm"
                            title="Xem chi tiết mục tiêu, phiên học và ma trận công việc của bạn bè"
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
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition active:scale-95"
                            title="Đặt lại mật khẩu cho bạn bè khi họ quên"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          {currentUser?.id !== u.id && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition active:scale-95"
                              title="Xóa tài khoản này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      </main>

      {/* FRIEND INSPECTOR MODAL (SOI HOẠT ĐỘNG CHI TIẾT BẠN BÈ) */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c101a] border border-cyan-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/60 via-indigo-950/40 to-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl shadow-md">
                  {userDetail ? getVehicleIcon(userDetail.user.racer_avatar) : '🚀'}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>{userDetail ? userDetail.user.display_name : 'Đang tải...'}</span>
                    <span className="text-xs font-normal text-slate-400">
                      (@{userDetail ? userDetail.user.username : ''})
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Bảng theo dõi mục tiêu, nhật ký cày Pomodoro và ma trận 4 ô của bạn bè
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserId(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 flex items-center justify-center transition"
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
                <div className="px-6 py-3 bg-[#131929] border-b border-white/5 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-cyan-400 font-bold">Cấp {userDetail.user.level}</span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold flex items-center gap-0.5">
                      <Flame className="w-3.5 h-3.5" /> Chuỗi {userDetail.user.streak} ngày
                    </span>
                    <span>•</span>
                    <span className="text-purple-400 font-bold">{userDetail.goals.length} mục tiêu</span>
                    <span>•</span>
                    <span className="text-rose-400 font-bold">{userDetail.user.cheer_count} lượt cổ vũ</span>
                  </div>
                </div>

                {/* Tab Selector */}
                <div className="flex border-b border-white/10 px-6 bg-[#0c101a] gap-2 pt-2">
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
                        <div className="text-center py-10 text-slate-500 italic">
                          Bạn này chưa tạo mục tiêu Pomodoro nào.
                        </div>
                      ) : (
                        userDetail.goals.map((g) => (
                          <div
                            key={g.id}
                            className="bg-[#121828] border border-white/10 rounded-2xl p-4 space-y-2 hover:border-cyan-500/40 transition"
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
                            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500 transition-all duration-300"
                                style={{ width: `${Math.min(100, g.progress_percent)}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400">
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
                        <div className="text-center py-10 text-slate-500 italic">
                          Chưa có phiên học Pomodoro nào được ghi nhận.
                        </div>
                      ) : (
                        userDetail.recent_sessions.map((s) => (
                          <div
                            key={s.id}
                            className="bg-[#121828] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                                {s.duration_minutes}m
                              </div>
                              <div>
                                <div className="font-semibold text-white">
                                  {s.topic_note || 'Phiên tập trung tự do'}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                  <span className="text-cyan-400">{s.goal_title}</span>
                                  <span>•</span>
                                  <span>{s.session_date}</span>
                                  <span>•</span>
                                  <span className="uppercase text-[9px] px-1 rounded bg-white/10">{s.source}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right text-slate-400 font-mono text-[11px]">
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
                        <div className="text-center py-10 text-slate-500 italic">
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
                              className="bg-[#121828] border border-white/5 rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
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
                                  <p className="text-[11px] text-amber-300/80 italic pl-1">
                                    ✍️ Phản tư: {t.reflection_note}
                                  </p>
                                )}
                                <div className="text-[10px] text-slate-500 pl-1">Ngày: {t.date}</div>
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

                  {/* TAB 4: CHEER & TELEGRAM */}
                  {detailTab === 'cheer' && (
                    <div className="space-y-6">
                      {/* Section 1: In-App Cheer */}
                      <div className="bg-[#121828] border border-rose-500/20 rounded-2xl p-4 space-y-3">
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
                                  : 'bg-white/5 hover:bg-white/10'
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
                          className="w-full bg-[#181f33] border border-white/10 focus:border-rose-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                        />

                        <button
                          onClick={handleSendCheer}
                          disabled={sendingMsg}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-black font-bold text-xs hover:opacity-90 transition active:scale-95 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{sendingMsg ? 'Đang gửi...' : `Gửi Cổ Vũ ${selectedEmoji}`}</span>
                        </button>
                      </div>

                      {/* Section 2: Direct Telegram Message */}
                      <div className="bg-[#121828] border border-sky-500/20 rounded-2xl p-4 space-y-3">
                        <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                          <SendHorizontal className="w-4 h-4 text-sky-400" />
                          <span>Gửi Tin Nhắn Trực Tiếp Đến Telegram Của Bạn Bè</span>
                        </h4>

                        {userDetail.user.has_telegram ? (
                          <>
                            <p className="text-[11px] text-slate-400">
                              Người bạn này đã kết nối Telegram Bot. Tin nhắn của bạn sẽ được gửi thẳng vào Telegram của bạn đó!
                            </p>
                            <textarea
                              rows={3}
                              placeholder="Nội dung tin nhắn muốn gửi đến bot Telegram của bạn bè..."
                              value={telegramMsg}
                              onChange={(e) => setTelegramMsg(e.target.value)}
                              className="w-full bg-[#181f33] border border-white/10 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition resize-none"
                            />
                            <button
                              onClick={handleSendTelegram}
                              disabled={sendingMsg || !telegramMsg.trim()}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs transition active:scale-95 disabled:opacity-50"
                            >
                              <SendHorizontal className="w-3.5 h-3.5" />
                              <span>{sendingMsg ? 'Đang gửi qua Telegram...' : 'Bắn Tin Nhắn Telegram'}</span>
                            </button>
                          </>
                        ) : (
                          <div className="text-xs text-slate-500 italic py-2">
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

      {/* RESET PASSWORD MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0c101a] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Đặt Lại Mật Khẩu</h3>
                  <p className="text-[11px] text-slate-400">Tài khoản: @{resetModalUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 flex items-center justify-center text-xs"
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
              className="w-full bg-[#161c2e] border border-white/10 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResetModalUser(null)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition"
              >
                Hủy
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting || !newPassword.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition active:scale-95 disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{resetting ? 'Đang lưu...' : 'Lưu Mật Khẩu Mới'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
