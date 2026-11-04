import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Users,
  Trophy,
  Flame,
  Send,
  Plus,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  Compass,
  LogOut,
  Flag,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  squadService,
  SquadSummary,
  SquadDetailResponse,
  SquadMessageItem,
} from '@/services/squadService'
import { StudyGoal } from '@/services/focusService'
import { parseSafeDate } from '@/utils/dateUtils'

export interface StudySquadModalProps {
  isOpen: boolean
  onClose: () => void
  userGoals: StudyGoal[]
  currentUser?: {
    id: number
    display_name: string
  } | null
}

const VEHICLE_OPTIONS = ['🏎️', '🚀', '⚡', '🛸', '🏍️', '🚗', '🏃‍♂️', '🎯']

function formatChatTime(dateStr: string): string {
  try {
    const d = parseSafeDate(dateStr)
    if (!d) return ''
    const now = new Date()
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins}p trước`
    const hours = d.getHours().toString().padStart(2, '0')
    const mins = d.getMinutes().toString().padStart(2, '0')
    return `${hours}:${mins}`
  } catch {
    return ''
  }
}

export const StudySquadModal: React.FC<StudySquadModalProps> = ({
  isOpen,
  onClose,
  userGoals,
  currentUser,
}) => {
  const [view, setView] = useState<'list' | 'room'>('list')
  const [listTab, setListTab] = useState<'my' | 'public' | 'create'>('my')

  // Lists
  const [mySquads, setMySquads] = useState<SquadSummary[]>([])
  const [publicSquads, setPublicSquads] = useState<SquadSummary[]>([])
  const [loadingList, setLoadingList] = useState(false)

  // Active Squad Room
  const [activeSquadId, setActiveSquadId] = useState<number | null>(null)
  const [squadDetail, setSquadDetail] = useState<SquadDetailResponse | null>(null)
  const [messages, setMessages] = useState<SquadMessageItem[]>([])
  const [loadingRoom, setLoadingRoom] = useState(false)

  // Chat Input
  const [chatText, setChatText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  // Invite code input
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [isJoiningCode, setIsJoiningCode] = useState(false)
  const [hasCopiedCode, setHasCopiedCode] = useState(false)

  // Create form state
  const [formName, setFormName] = useState('')
  const [formTargetTitle, setFormTargetTitle] = useState('')
  const [formTargetHours, setFormTargetHours] = useState(1000)
  const [formCategory, setFormCategory] = useState('Tiếng Anh')
  const [formSelectedGoalId, setFormSelectedGoalId] = useState<number | null>(null)
  const [formVehicle, setFormVehicle] = useState('🏎️')
  const [isCreating, setIsCreating] = useState(false)

  // Auto-fill target title if user selects one of their personal goals
  const handleSelectPersonalGoal = (goalId: number | null) => {
    setFormSelectedGoalId(goalId)
    if (goalId) {
      const g = userGoals.find((it) => it.id === goalId)
      if (g) {
        if (!formName) setFormName(`Đua ${g.title}`)
        setFormTargetTitle(g.title)
        setFormTargetHours(g.target_hours || 1000)
        if (g.category) setFormCategory(g.category)
      }
    }
  }

  // Load My Squads & Public Squads
  const loadSquadLists = async () => {
    try {
      setLoadingList(true)
      const [mine, pubs] = await Promise.all([
        squadService.getMySquads(),
        squadService.getPublicSquads(),
      ])
      setMySquads(mine)
      setPublicSquads(pubs)
    } catch (err: any) {
      console.error('Error loading squads:', err)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSquadLists()
    }
  }, [isOpen])

  // Load Active Squad Detail & Messages
  const loadSquadDetail = async (id: number) => {
    try {
      const detail = await squadService.getSquadDetail(id)
      setSquadDetail(detail)
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải thông tin nhóm')
    }
  }

  const loadSquadMessages = async (id: number) => {
    try {
      const msgs = await squadService.getSquadMessages(id)
      setMessages((prev) => {
        if (prev.length === msgs.length && prev[prev.length - 1]?.id === msgs[msgs.length - 1]?.id) {
          return prev
        }
        return msgs
      })
    } catch (err) {
      // Ignored if not member
    }
  }

  const enterSquadRoom = async (squadId: number) => {
    setActiveSquadId(squadId)
    setView('room')
    setLoadingRoom(true)
    await Promise.all([loadSquadDetail(squadId), loadSquadMessages(squadId)])
    setLoadingRoom(false)
  }

  // Poll messages every 5s while in squad room (tự động tạm dừng khi ẩn tab)
  useEffect(() => {
    if (!isOpen || view !== 'room' || !activeSquadId) return

    let detailCounter = 0
    const interval = setInterval(() => {
      if (document.hidden) return
      loadSquadMessages(activeSquadId)
      // Refresh bảng xếp hạng / vị trí xe mỗi 20 giây (4 chu kỳ) thay vì gọi dồn dập
      detailCounter++
      if (detailCounter >= 4) {
        detailCounter = 0
        loadSquadDetail(activeSquadId)
      }
    }, 5000)

    const handleVisibility = () => {
      if (!document.hidden && activeSquadId) {
        loadSquadMessages(activeSquadId)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isOpen, view, activeSquadId])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const content = textToSend || chatText.trim()
    if (!content || !activeSquadId || isSending) return

    try {
      setIsSending(true)
      const newMsg = await squadService.sendSquadMessage(activeSquadId, content)
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
      if (!textToSend) setChatText('')
    } catch (err: any) {
      toast.error(err.message || 'Không thể gửi tin nhắn')
    } finally {
      setIsSending(false)
    }
  }

  // Kick member (leader only)
  const handleKickMember = async (memberUserId: number, memberName: string) => {
    if (!activeSquadId) return
    const confirmKick = window.confirm(`Bạn có chắc chắn muốn mời "${memberName}" rời khỏi nhóm học không?`)
    if (!confirmKick) return

    try {
      await squadService.kickMember(activeSquadId, memberUserId)
      toast.success(`Đã mời "${memberName}" ra khỏi nhóm.`)
      await Promise.all([loadSquadDetail(activeSquadId), loadSquadMessages(activeSquadId)])
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'Không thể kick thành viên')
    }
  }

  // Join by code
  const handleJoinByCode = async () => {
    const code = joinCodeInput.trim().toUpperCase()
    if (!code) {
      toast.error('Vui lòng nhập mã mời nhóm')
      return
    }

    try {
      setIsJoiningCode(true)
      const res = await squadService.joinSquad({ invite_code: code })
      toast.success(`Đã gia nhập nhóm "${res.name}" thành công! 🏎️💨`)
      setJoinCodeInput('')
      await loadSquadLists()
      enterSquadRoom(res.id)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'Mã mời không hợp lệ')
    } finally {
      setIsJoiningCode(false)
    }
  }

  // Create squad submit
  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formTargetTitle.trim()) {
      toast.error('Vui lòng nhập đầy đủ tên nhóm và mục tiêu!')
      return
    }

    try {
      setIsCreating(true)
      const newSquad = await squadService.createSquad({
        name: formName.trim(),
        target_title: formTargetTitle.trim(),
        target_hours: Number(formTargetHours) || 1000,
        category: formCategory,
        goal_id: formSelectedGoalId,
        vehicle_icon: formVehicle,
      })
      toast.success(`Đã tạo nhóm "${newSquad.name}" thành công! 🏁`)
      setFormName('')
      setFormTargetTitle('')
      await loadSquadLists()
      enterSquadRoom(newSquad.id)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'Lỗi tạo nhóm học')
    } finally {
      setIsCreating(false)
    }
  }

  // Leave squad
  const handleLeaveSquad = async () => {
    if (!activeSquadId || !squadDetail) return
    if (!confirm(`Bạn có chắc muốn rời khỏi nhóm "${squadDetail.name}"?`)) return

    try {
      await squadService.leaveSquad(activeSquadId)
      toast.info('Đã rời khỏi nhóm học')
      setView('list')
      setActiveSquadId(null)
      loadSquadLists()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi rời nhóm')
    }
  }

  // Copy invite code
  const handleCopyCode = () => {
    if (!squadDetail) return
    navigator.clipboard.writeText(squadDetail.invite_code)
    setHasCopiedCode(true)
    toast.success(`Đã sao chép mã mời: ${squadDetail.invite_code}`)
    setTimeout(() => setHasCopiedCode(false), 2500)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-gradient-to-b from-[#161928] via-[#0d101a] to-[#08090f] border border-cyan-500/30 rounded-3xl text-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Glow ambient circle */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none bg-cyan-500/15" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none bg-amber-500/15" />

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            {view === 'room' && (
              <button
                onClick={() => setView('list')}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                title="Quay lại danh sách nhóm"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-300" />
              </button>
            )}

            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-xl sm:text-2xl">
              {view === 'room' && squadDetail ? squadDetail.icon : '👥'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white line-clamp-1">
                  {view === 'room' && squadDetail
                    ? squadDetail.name
                    : 'Hội Nhóm Học Cùng & Đua F1'}
                </h3>
                {view === 'room' && squadDetail && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                    {squadDetail.category}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/60 line-clamp-1">
                {view === 'room' && squadDetail
                  ? `Mục tiêu chung: ${squadDetail.target_title} (${squadDetail.target_hours}h) • Giờ ai học người nấy tính!`
                  : 'Chung mục tiêu lớn • Lập nhóm đua tiến trình • Chat & Bứt tốc'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {view === 'room' && squadDetail && (
              <>
                <button
                  onClick={handleCopyCode}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition active:scale-95"
                  title="Sao chép mã mời gửi cho bạn bè"
                >
                  {hasCopiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{squadDetail.invite_code}</span>
                </button>

                <button
                  onClick={handleLeaveSquad}
                  className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-300 transition"
                  title="Rời khỏi nhóm"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition active:scale-95"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── BODY: VIEW 1 (LIST & DISCOVERY) ── */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative z-10 custom-scrollbar">
            {/* Quick Join By Invite Code Bar */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-blue-950/60 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Bạn có mã mời từ đồng đội?</h4>
                  <p className="text-[11px] text-white/60">Nhập mã (ví dụ SQUAD-XXXX) để vào đường đua cùng bạn bè</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Mã: SQUAD-7821"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  className="flex-1 sm:w-40 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xl bg-black/60 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 text-center"
                />
                <button
                  onClick={handleJoinByCode}
                  disabled={isJoiningCode || !joinCodeInput.trim()}
                  className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 whitespace-nowrap"
                >
                  {isJoiningCode ? 'Đang vào...' : 'Gia nhập'}
                </button>
              </div>
            </div>

            {/* List Tab Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10">
              <button
                onClick={() => setListTab('my')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  listTab === 'my'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Nhóm Của Tôi ({mySquads.length})</span>
              </button>

              <button
                onClick={() => setListTab('public')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  listTab === 'public'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Khám Phá Nhóm Mở</span>
              </button>

              <button
                onClick={() => setListTab('create')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  listTab === 'create'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black shadow-lg shadow-amber-500/20'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tạo Nhóm Mới</span>
              </button>
            </div>

            {/* Sub-tab 1: My Squads */}
            {listTab === 'my' && (
              <div className="space-y-3">
                {loadingList ? (
                  <div className="py-12 text-center text-white/50 text-xs animate-pulse">
                    Đang tải danh sách nhóm học của bạn...
                  </div>
                ) : mySquads.length === 0 ? (
                  <div className="py-12 px-4 rounded-3xl bg-white/[0.03] border border-white/10 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl">
                      🏎️
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Bạn chưa tham gia nhóm học nào</p>
                      <p className="text-xs text-white/50 mt-1 max-w-sm">
                        Hãy tạo một biệt đội mới cho mục tiêu lớn của bạn, hoặc nhập mã mời để cùng bạn bè so kè tốc độ học tập!
                      </p>
                    </div>
                    <button
                      onClick={() => setListTab('create')}
                      className="mt-1 px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold text-xs rounded-xl shadow-md transition active:scale-95"
                    >
                      + Tạo Nhóm Mới Ngay
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mySquads.map((sq) => (
                      <div
                        key={sq.id}
                        className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl p-1.5 rounded-xl bg-black/40 border border-white/10">
                                {sq.icon}
                              </span>
                              <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition line-clamp-1">
                                  {sq.name}
                                </h4>
                                <span className="text-[10px] text-cyan-300/80 font-medium">
                                  Mục tiêu: {sq.target_title} ({sq.target_hours}h)
                                </span>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {sq.members_count} thành viên
                            </span>
                          </div>

                          {/* My Progress Bar */}
                          <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 mt-2">
                            <div className="flex items-center justify-between text-[10px] text-white/70 mb-1">
                              <span>Tiến trình cá nhân của bạn:</span>
                              <span className="font-bold text-amber-300">
                                {sq.my_current_hours.toFixed(1)} / {sq.target_hours}h ({sq.my_progress_percent}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${sq.my_progress_percent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => enterSquadRoom(sq.id)}
                          className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <Flag className="w-3.5 h-3.5 text-amber-300" />
                          <span>Vào Đường Đua & Chat Nhóm 🏎️💨</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Public Squads */}
            {listTab === 'public' && (
              <div className="space-y-3">
                {publicSquads.length === 0 ? (
                  <div className="py-12 text-center text-white/50 text-xs">
                    Hiện chưa có nhóm mở nào khác. Hãy tạo nhóm đầu tiên của bạn!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {publicSquads.map((sq) => (
                      <div
                        key={sq.id}
                        className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-all flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl p-1.5 rounded-xl bg-black/40 border border-white/10">
                              {sq.icon}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-white">{sq.name}</h4>
                              <span className="text-[10px] text-cyan-300/80">
                                Mục tiêu chung: {sq.target_title} ({sq.target_hours}h)
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-white/50">
                            Thể loại: {sq.category} • {sq.members_count}/15 tay đua
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            squadService.joinSquad({ squad_id: sq.id }).then((res) => {
                              toast.success(`Đã gia nhập nhóm "${res.name}"!`)
                              loadSquadLists()
                              enterSquadRoom(res.id)
                            }).catch((err) => toast.error(err.message))
                          }}
                          className="w-full py-2 bg-white/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold text-xs rounded-xl transition"
                        >
                          Gia nhập nhóm học này 🚀
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Create Squad Form */}
            {listTab === 'create' && (
              <form onSubmit={handleCreateSquad} className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/15 space-y-4 max-w-lg mx-auto">
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">
                    Chọn Mục Tiêu Cá Nhân Của Bạn (Tùy chọn tự điền nhanh)
                  </label>
                  <select
                    value={formSelectedGoalId || ''}
                    onChange={(e) => handleSelectPersonalGoal(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">-- Tự nhập mục tiêu mới --</option>
                    {userGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.current_hours}/{g.target_hours}h)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1">
                      Tên Nhóm Học <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Đua 1000h Tiếng Anh F1"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1">
                      Tên Mục Tiêu Chung <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 1000h Tiếng Anh"
                      value={formTargetTitle}
                      onChange={(e) => setFormTargetTitle(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1">
                      Mục Tiêu Số Giờ (h)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={formTargetHours}
                      onChange={(e) => setFormTargetHours(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1">
                      Thể loại
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Tiếng Anh">Tiếng Anh</option>
                      <option value="Lập trình">Lập trình</option>
                      <option value="Ôn thi">Ôn thi</option>
                      <option value="Kỷ luật">Kỷ luật</option>
                      <option value="Chung">Khác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1.5">
                    Chọn Xe Đua Của Bạn Trên Làn Đua Nhóm
                  </label>
                  <div className="flex items-center gap-2">
                    {VEHICLE_OPTIONS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setFormVehicle(v)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition ${
                          formVehicle === v
                            ? 'bg-cyan-500 text-white ring-2 ring-cyan-300 shadow-md'
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:opacity-95 text-black font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/25 transition active:scale-95 disabled:opacity-50"
                >
                  {isCreating ? 'Đang khởi tạo nhóm...' : 'Khởi Tạo Nhóm & Mở Đường Đua 🏁'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── BODY: VIEW 2 (ACTIVE SQUAD ROOM: MINI-F1 TRACK & GROUP CHAT) ── */}
        {view === 'room' && squadDetail && (
          <div className="flex-1 overflow-hidden flex flex-col p-3 sm:p-5 gap-3.5 relative z-10">
            {/* ── 1. MINI-F1 RACE CIRCUIT (LÀN ĐUA RIÊNG TỪNG NGƯỜI) ── */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/70 border border-cyan-500/30 shadow-inner relative overflow-hidden flex-shrink-0">
              <div className="flex items-center justify-between text-[11px] text-white/50 border-b border-white/10 pb-2 mb-3 font-mono">
                <div className="flex items-center gap-1 text-cyan-300 font-bold">
                  <Flag className="w-3.5 h-3.5" />
                  <span>Đường Đua Mini F1 ({squadDetail.members.length} tay đua)</span>
                </div>
                <div className="flex items-center gap-4 text-[10px]">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span className="text-amber-300 font-bold">100% 🏁</span>
                </div>
              </div>

              {/* Lanes for each member */}
              <div className="space-y-4 py-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {squadDetail.members.map((member, idx) => {
                  const isLeader = member.role === 'leader'
                  const isCurrent = member.is_current_user

                  return (
                    <div key={member.user_id} className="relative group/lane">
                      {/* Lane Track Background */}
                      <div className="relative h-2.5 w-full bg-slate-900/90 rounded-full border border-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            isCurrent
                              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-md shadow-amber-400/30'
                              : 'bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-300'
                          }`}
                          style={{ width: `${Math.max(3, member.progress_percent)}%` }}
                        />
                      </div>

                      {/* Moving Vehicle */}
                      <div
                        className="absolute -top-3.5 transition-all duration-1000 ease-out flex items-center cursor-pointer"
                        style={{
                          left: `calc(${Math.min(96, Math.max(0, member.progress_percent))}% - 14px)`,
                        }}
                        title={`${member.display_name}: ${member.current_hours.toFixed(1)}/${member.target_hours}h (${member.progress_percent}%)`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm shadow-md transition-transform group-hover/lane:scale-125 ${
                            isCurrent
                              ? 'bg-amber-400 border-2 border-white ring-2 ring-amber-400/50'
                              : idx === 0
                              ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 border border-amber-300'
                              : 'bg-black/90 border border-white/20'
                          }`}
                        >
                          <span>{member.vehicle_icon || '🏎️'}</span>
                        </div>
                      </div>

                      {/* Info Row Below/Beside */}
                      <div className="flex items-center justify-between text-[10px] mt-1 px-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold ${idx === 0 ? 'text-amber-300' : 'text-white/50'}`}>
                            #{idx + 1}
                          </span>
                          <span className={`font-bold ${isCurrent ? 'text-amber-300' : 'text-white/90'}`}>
                            {member.display_name} {isCurrent && '(Bạn)'}
                          </span>
                          {isLeader && (
                            <span className="text-[8px] px-1 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Trưởng nhóm
                            </span>
                          )}
                          {member.is_studying && (
                            <span className="inline-flex items-center gap-1 text-[8px] text-emerald-400 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Đang học live
                            </span>
                          )}
                        </div>

                        <div className="font-mono text-white/70 flex items-center gap-2">
                          <div>
                            <b className={isCurrent ? 'text-amber-300 font-bold' : 'text-cyan-300 font-medium'}>
                              {member.current_hours.toFixed(1)}
                            </b>
                            /{member.target_hours}h{' '}
                            <span className="text-white/40">({member.progress_percent}%)</span>
                          </div>
                          {squadDetail.user_role === 'leader' && !isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleKickMember(member.user_id, member.display_name)}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition ml-1"
                              title="Mời thành viên rời nhóm"
                            >
                              Mời ra
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── 2. REALTIME GROUP CHAT & LIVE SPEEDUP FEED ── */}
            <div className="flex-1 rounded-2xl bg-black/60 border border-white/10 flex flex-col overflow-hidden min-h-[220px]">
              {/* Messages Scroll Area */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar text-xs"
              >
                {messages.length === 0 ? (
                  <div className="py-8 text-center text-white/40 text-xs">
                    Chưa có tin nhắn nào. Hãy gửi lời chào mở màn cuộc đua nhé! 👋
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSystem = msg.message_type === 'system_speedup' || msg.message_type === 'system_join'
                    const isMe = msg.user_id === currentUser?.id

                    if (isSystem) {
                      return (
                        <div
                          key={msg.id}
                          className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-transparent border border-amber-500/30 text-[11px] text-amber-200 flex items-center justify-between gap-2 shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span>{msg.emoji || '⚡'}</span>
                            <span className="font-semibold">{msg.content}</span>
                          </div>
                          <span className="text-[9px] text-white/40 font-mono whitespace-nowrap">
                            {formatChatTime(msg.created_at)}
                          </span>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5 px-1">
                          <span className="text-[10px] font-bold text-white/60">
                            {isMe ? 'Bạn' : msg.sender_name}
                          </span>
                          <span className="text-[9px] text-white/30 font-mono">
                            {formatChatTime(msg.created_at)}
                          </span>
                        </div>

                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl break-words leading-relaxed ${
                            isMe
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                              : 'bg-white/10 text-white/90 border border-white/10 rounded-tl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Quick Reactions & Chat Input Bar */}
              <div className="p-2.5 bg-black/80 border-t border-white/10 space-y-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[10px] text-white/40 mr-1 flex items-center gap-0.5">
                    <Zap className="w-3 h-3 text-amber-400" /> Cảm xúc nhanh:
                  </span>
                  {['🔥 Cố lên!', '🚀 Bứt tốc nào!', '☕ Nghỉ chút nhé!', '💪 Đỉnh quá!', '🏎️ Đuổi kịp rồi nha!'].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => handleSendMessage(quick)}
                      className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-medium text-white/80 whitespace-nowrap transition active:scale-95"
                    >
                      {quick}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nhập tin nhắn trò chuyện với nhóm học..."
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={isSending || !chatText.trim()}
                    className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-40 text-white rounded-xl shadow transition active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
