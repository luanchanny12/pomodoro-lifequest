import React, { useState, useEffect } from 'react'
import {
  X,
  Lock,
  Unlock,
  Mail,
  Send,
  Sparkles,
  Calendar,
  Clock,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Printer,
  Dices,
  KeyRound,
  Wind,
  Flame,
  Shield,
  Heart,
  Plus,
  Smile,
  Copy,
  Download,
  RotateCcw,
  FileText,
} from 'lucide-react'
import { TimeCapsule, focusService } from '../../services/focusService'
import { soundManager } from '../../utils/soundEffects'
import { toast } from 'sonner'
import { formatSafeDate } from '../../utils/dateUtils'

interface TimeCapsuleModalProps {
  isOpen: boolean
  onClose: () => void
  currentHours: number
}

const PRESET_DAYS = [
  { days: 7, label: '7 Ngày', tag: '🌱 1 Tuần tới' },
  { days: 30, label: '30 Ngày', tag: '🌙 1 Tháng tới' },
  { days: 100, label: '100 Ngày', tag: '⚡ 100 Ngày chuyển mình' },
  { days: 365, label: '365 Ngày', tag: '👑 1 Năm bứt phá' },
]

const PRESET_MILESTONES = [
  { hours: 10, label: '10 Giờ', tag: '🌱 Khởi đầu' },
  { hours: 50, label: '50 Giờ', tag: '🔥 Kiên trì' },
  { hours: 100, label: '100 Giờ', tag: '⚡ Thói quen thép' },
  { hours: 250, label: '250 Giờ', tag: '🚀 Bứt phá' },
  { hours: 500, label: '500 Giờ', tag: '💎 Bậc thầy' },
  { hours: 1000, label: '1,000 Giờ', tag: '👑 Tinh hoa' },
]

const MOOD_TAGS = [
  { code: 'khi_met_moi', label: 'Khi kiệt sức / tụt mood', icon: '🌧️', desc: 'Lời động viên dịu dàng xoa dịu tâm hồn' },
  { code: 'tiep_lua', label: 'Tiếp lửa niềm tin & ý chí', icon: '🔥', desc: 'Thổi bùng ngọn lửa kỷ luật và quyết tâm' },
  { code: 'ly_do_bat_dau', label: 'Nhắc nhở vì sao bắt đầu', icon: '🛡️', desc: 'Đưa tâm trí về mục đích nguyên bản' },
  { code: 'chuc_mung', label: 'Chúc mừng chiến thắng', icon: '🌟', desc: 'Khen ngợi bản thân khi vượt qua thử thách' },
  { code: 'tam_su', label: 'Tâm sự nhẹ nhàng', icon: '💌', desc: 'Lưu giữ suy nghĩ chân thật ngày hôm nay' },
]

export const TimeCapsuleModal: React.FC<TimeCapsuleModalProps> = ({
  isOpen,
  onClose,
  currentHours,
}) => {
  const [capsules, setCapsules] = useState<TimeCapsule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [moodKeys, setMoodKeys] = useState<number>(3)

  // Form states
  const [showCompose, setShowCompose] = useState(false)
  const [lockMode, setLockMode] = useState<'days' | 'hours'>('days')
  const [targetDays, setTargetDays] = useState<number>(30)
  const [customDays, setCustomDays] = useState<string>('')
  const [targetMilestone, setTargetMilestone] = useState<number>(50)
  const [customMilestone, setCustomMilestone] = useState<string>('')
  const [selectedMoodTag, setSelectedMoodTag] = useState<string>('khi_met_moi')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Rescue & Emergency states
  const [isDrawingRescue, setIsDrawingRescue] = useState(false)
  const [readingCapsule, setReadingCapsule] = useState<TimeCapsule | null>(null)
  const [unlockingId, setUnlockingId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'locked' | 'unlocked'>('all')
  const [isResealingId, setIsResealingId] = useState<number | null>(null)

  // 30s Mindful Breathing modal
  const [showBreathing, setShowBreathing] = useState(false)
  const [breathSeconds, setBreathSeconds] = useState(30)
  const [breathPhase, setBreathPhase] = useState<'Hít vào sâu...' | 'Giữ hơi thở...' | 'Thở ra chậm rãi...'>('Hít vào sâu...')
  const [isClaimingBreath, setIsClaimingBreath] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen])

  // Breathing timer
  useEffect(() => {
    let timer: any
    if (showBreathing && breathSeconds > 0) {
      timer = setInterval(() => {
        setBreathSeconds((prev) => {
          const next = prev - 1
          // 4s inhale, 4s hold, 4s exhale cycle (12s total cycle)
          const cycleSec = (30 - next) % 12
          if (cycleSec < 4) setBreathPhase('Hít vào sâu...')
          else if (cycleSec < 8) setBreathPhase('Giữ hơi thở...')
          else setBreathPhase('Thở ra chậm rãi...')
          return next
        })
      }, 1000)
    } else if (showBreathing && breathSeconds === 0 && !isClaimingBreath) {
      handleCompleteBreathing()
    }
    return () => clearInterval(timer)
  }, [showBreathing, breathSeconds, isClaimingBreath])

  const loadData = async () => {
    setLoading(true)
    try {
      const [capsulesData, balanceData] = await Promise.all([
        focusService.getTimeCapsules(),
        focusService.getMoodKeysBalance().catch(() => ({ mood_keys: 3, total_capsules: 0, unlocked_capsules: 0 })),
      ])
      setCapsules(capsulesData)
      setMoodKeys(balanceData.mood_keys ?? 3)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách hòm thư thời gian')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCapsule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung bức thư nhắn gửi tương lai!')
      return
    }

    let finalDays: number | null = null
    let finalHours: number = 0

    if (lockMode === 'days') {
      finalDays = customDays ? parseInt(customDays, 10) : targetDays
      if (!finalDays || isNaN(finalDays) || finalDays <= 0) {
        setError('Số ngày mở khóa không hợp lệ!')
        return
      }
    } else {
      finalHours = customMilestone ? parseFloat(customMilestone) : targetMilestone
      if (isNaN(finalHours) || finalHours <= 0) {
        setError('Mốc giờ mở khóa không hợp lệ!')
        return
      }
    }

    setSubmitting(true)
    setError(null)
    try {
      await focusService.createTimeCapsule({
        milestone_hours: finalHours,
        unlock_days: finalDays,
        unlock_type: lockMode,
        mood_tag: selectedMoodTag,
        title:
          title.trim() ||
          (lockMode === 'days'
            ? `Thư gửi bản thân sau ${finalDays} ngày`
            : `Thư gửi bản thân ở mốc ${finalHours}h`),
        message_content: content.trim(),
      })

      soundManager.playWarpSpeed()
      toast.success('Đã niêm phong hòm thư thành công! Bạn được tặng +1 Hạc Giấy Hy Vọng 🕊️')
      setSuccessMsg('Đã niêm phong bức thư thành công! Bạn nhận được +1 Hạc Giấy Hy Vọng 🕊️')
      setShowCompose(false)
      setTitle('')
      setContent('')
      setCustomDays('')
      setCustomMilestone('')
      await loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Lỗi khi niêm phong hòm thư')
    } finally {
      setSubmitting(false)
    }
  }

  // Rút thư cứu mood ngẫu nhiên
  const handleRandomRescue = async () => {
    if (capsules.length === 0) {
      toast.info('Bạn chưa có hòm thư nào! Hãy bấm "Soạn thư mới" để gửi gắm niềm tin vào tương lai nhé.')
      return
    }

    setIsDrawingRescue(true)
    setError(null)
    try {
      soundManager.playCosmicChime()
      const cap = await focusService.randomRescueCapsule()
      soundManager.playCapsuleUnlock()
      setReadingCapsule(cap)
      toast.success('Đã rút được một phong thư từ quá khứ để chữa lành tâm trạng! ✨')
      await loadData()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Không thể rút thư cứu mood'
      if (msg.includes('hết Hạc Giấy')) {
        toast.error('Bạn đã hết Hạc Giấy Hy Vọng! Hãy hít thở 30s để nhận thêm nhé 🧘')
        setShowBreathing(true)
        setBreathSeconds(30)
      } else {
        toast.error(msg)
      }
    } finally {
      setIsDrawingRescue(false)
    }
  }

  // Bẻ khóa sớm thư cụ thể bằng 1 Hạc Giấy
  const handleUnlockEmergency = async (cap: TimeCapsule) => {
    if (cap.is_unlocked) {
      soundManager.playCapsuleUnlock()
      setReadingCapsule(cap)
      return
    }

    if (moodKeys < 1) {
      toast.error('Bạn đã hết Hạc Giấy Hy Vọng! Hãy làm bài tập thở 30s để nhận thêm nhé 🧘')
      setShowBreathing(true)
      setBreathSeconds(30)
      return
    }

    setUnlockingId(cap.id)
    try {
      soundManager.playCapsuleUnlock()
      const updated = await focusService.unlockEmergencyTimeCapsule(cap.id)
      setReadingCapsule(updated)
      toast.success('Đã bẻ khóa bức thư bằng 1 Hạc Giấy Hy Vọng! 🕊️')
      await loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Không thể bẻ khóa hòm thư')
    } finally {
      setUnlockingId(null)
    }
  }

  // Hoàn thành bài tập thở 30s
  const handleCompleteBreathing = async () => {
    setIsClaimingBreath(true)
    try {
      const res = await focusService.claimBreathGrant()
      soundManager.playConstellationVictory()
      toast.success(res.message || 'Bạn đã nhận được 1 Hạc Giấy Hy Vọng! 🕊️')
      setShowBreathing(false)
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi nhận hạc giấy')
      setShowBreathing(false)
    } finally {
      setIsClaimingBreath(false)
    }
  }

  // In thư ra giấy / lưu PDF
  const handlePrintLetter = () => {
    soundManager.playDing()
    window.print()
  }

  // Sao chép nội dung thư
  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Đã sao chép nội dung bức thư vào bộ nhớ tạm! 📋')
  }

  // Tải bản sao bức thư (.txt) về máy tính để lưu trữ tuyệt đối
  const handleDownloadTxt = (cap: TimeCapsule) => {
    const file = new Blob([
      `HÒM THƯ GỬI TƯƠNG LAI - LIFEQUEST\n` +
      `Tiêu đề: ${cap.title}\n` +
      `Niêm phong ngày: ${formatSafeDate(cap.created_at)}\n` +
      `Mở khóa ngày: ${cap.unlocked_at ? formatSafeDate(cap.unlocked_at) : 'Đã mở khóa'}\n` +
      `----------------------------------------\n\n` +
      `${cap.message_content}\n\n` +
      `----------------------------------------\n` +
      `Bảo chứng và lưu trữ vĩnh viễn bởi LifeQuest Pomodoro.`
    ], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = `${cap.title.replace(/[/\\?%*:|"<>]/g, '_')}_thu_ky_niem.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Đã tải bản sao lá thư về máy tính của bạn! 💾')
  }

  // Niêm phong lại lá thư (nếu muốn khóa lại cho tương lai)
  const handleReseal = async (cap: TimeCapsule, days: number = 30) => {
    if (!window.confirm(`Bạn có muốn niêm phong lại lá thư "${cap.title}" trong ${days} ngày tới không? Lá thư vẫn được lưu an toàn tuyệt đối.`)) {
      return
    }
    setIsResealingId(cap.id)
    try {
      await focusService.resealTimeCapsule(cap.id, days)
      toast.success(`Đã niêm phong lại lá thư thành công trong ${days} ngày tới! 🔒`)
      if (readingCapsule?.id === cap.id) {
        setReadingCapsule(null)
      }
      await loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || 'Không thể niêm phong lại thư')
    } finally {
      setIsResealingId(null)
    }
  }

  const getMoodTagInfo = (code?: string | null) => {
    return MOOD_TAGS.find((m) => m.code === code) || {
      code: 'tam_su',
      label: 'Tâm sự',
      icon: '💌',
      desc: '',
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-time-capsule, #printable-time-capsule * {
            visibility: visible !important;
          }
          #printable-time-capsule {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: #ffffff !important;
            color: #1a1a1a !important;
            padding: 40px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Main Modal Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn print:hidden">
        <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl text-slate-100 overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                    Hòm Thư Gửi Tương Lai
                  </h2>
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Chữa Lành & Cảm Xúc
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Gửi tâm sự cho tương lai • Rút thư chữa lành khi tụt mood
                </p>
              </div>
            </div>

            {/* Balances & Close */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mood Keys Balance */}
              <div
                title="Hạc Giấy Hy Vọng: Dùng để bẻ khóa thư sớm hoặc rút thư cứu mood khi buồn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-bold shadow-sm"
              >
                <span className="text-base">🕊️</span>
                <span>x{moodKeys} Hạc Giấy</span>
                <button
                  onClick={() => {
                    setShowBreathing(true)
                    setBreathSeconds(30)
                  }}
                  className="ml-1 p-0.5 hover:bg-purple-500/30 rounded text-purple-300 transition"
                  title="Thực hành thở 30s để nhận thêm Hạc Giấy"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Đã học: <strong>{currentHours.toFixed(1)}h</strong></span>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ── SOS RESCUE BANNER: RÚT THƯ QUÁ KHỨ CỨU MOOD ── */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-indigo-950/50 to-slate-900 border border-purple-500/30 shadow-lg">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span>Góc Cứu Mood • Rút Thư Quá Khứ Tiếp Lửa</span>
                  </div>
                  <p className="text-xs text-white/70 max-w-lg leading-relaxed">
                    Khi kiệt sức, mất phương hướng hoặc buồn bã, hãy rút một lá thư quá khứ để lắng nghe chính mình. Cần <b>1 Hạc Giấy Hy Vọng 🕊️</b> cho thư niêm phong (hoặc đọc lại thư đã mở miễn phí).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto flex-shrink-0">
                  <button
                    onClick={() => {
                      setShowBreathing(true)
                      setBreathSeconds(30)
                    }}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition flex items-center gap-1.5"
                    title="Hít thở 30s để tĩnh tâm và nhận 1 Hạc Giấy"
                  >
                    <Wind className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Thở 30s (Nhận 🕊️)</span>
                  </button>

                  <button
                    onClick={handleRandomRescue}
                    disabled={isDrawingRescue || capsules.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 hover:from-purple-400 hover:to-amber-400 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-purple-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    <Dices className={`w-4 h-4 ${isDrawingRescue ? 'animate-spin' : ''}`} />
                    <span>{isDrawingRescue ? 'Đang mở phong bì...' : '🎲 Rút Thư Cứu Mood'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Compose Toggle Button */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-amber-400" />
                  Gửi một lá thư cho bản thân ở tương lai
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Khóa trong 30 ngày, 100 ngày hoặc mốc giờ học. Viết xong nhận ngay +1 Hạc Giấy Hy Vọng 🕊️!
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCompose(!showCompose)
                  setError(null)
                  setSuccessMsg(null)
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                  showCompose
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/20 hover:opacity-90'
                }`}
              >
                {showCompose ? 'Đóng khung soạn' : '✉️ Soạn thư mới'}
              </button>
            </div>

            {/* ── COMPOSE FORM ── */}
            {showCompose && (
              <form onSubmit={handleCreateCapsule} className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-4 animate-fadeIn shadow-xl">
                {/* Lock Mode Selector Tabs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      1. Chọn hình thức niêm phong hòm thư:
                    </span>
                    <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => setLockMode('days')}
                        className={`px-3 py-1 rounded-lg font-bold transition ${
                          lockMode === 'days'
                            ? 'bg-amber-500 text-black shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        📅 Theo Số Ngày (30 ngày, 100 ngày...)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLockMode('hours')}
                        className={`px-3 py-1 rounded-lg font-bold transition ${
                          lockMode === 'hours'
                            ? 'bg-amber-500 text-black shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ⏱️ Theo Mốc Giờ Học (10h, 50h...)
                      </button>
                    </div>
                  </div>

                  {/* Mode: By Days */}
                  {lockMode === 'days' && (
                    <div className="space-y-2 pt-1 animate-fadeIn">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PRESET_DAYS.map((preset) => {
                          const isSelected = !customDays && targetDays === preset.days
                          return (
                            <button
                              type="button"
                              key={preset.days}
                              onClick={() => {
                                setTargetDays(preset.days)
                                setCustomDays('')
                              }}
                              className={`p-2.5 rounded-xl border text-center transition-all ${
                                isSelected
                                  ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-md shadow-amber-500/10'
                                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              <div className="text-sm font-bold">{preset.label}</div>
                              <div className="text-[10px] mt-0.5 opacity-80">{preset.tag}</div>
                            </button>
                          )
                        })}
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-xs text-slate-400">Hoặc tự nhập số ngày:</span>
                        <input
                          type="number"
                          min="1"
                          placeholder="Vd: 14, 60, 180..."
                          value={customDays}
                          onChange={(e) => setCustomDays(e.target.value)}
                          className="w-28 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                        />
                        <span className="text-xs text-amber-300 font-medium">
                          → Mở vào:{' '}
                          {formatSafeDate(
                            Date.now() + (customDays ? parseInt(customDays, 10) || 0 : targetDays) * 86400000
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Mode: By Hours */}
                  {lockMode === 'hours' && (
                    <div className="space-y-2 pt-1 animate-fadeIn">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {PRESET_MILESTONES.map((preset) => {
                          const isSelected = !customMilestone && targetMilestone === preset.hours
                          const isPassed = currentHours >= preset.hours
                          return (
                            <button
                              type="button"
                              key={preset.hours}
                              onClick={() => {
                                setTargetMilestone(preset.hours)
                                setCustomMilestone('')
                              }}
                              className={`p-2.5 rounded-xl border text-center transition-all ${
                                isSelected
                                  ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-md shadow-amber-500/10'
                                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              <div className="text-sm font-bold">{preset.label}</div>
                              <div className="text-[10px] mt-0.5 opacity-80">{preset.tag}</div>
                              {isPassed && (
                                <div className="text-[9px] text-emerald-400 mt-1">✓ Đã vượt</div>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-xs text-slate-400">Hoặc tự nhập mốc giờ:</span>
                        <input
                          type="number"
                          min="1"
                          step="0.5"
                          placeholder="Vd: 30, 75, 300..."
                          value={customMilestone}
                          onChange={(e) => setCustomMilestone(e.target.value)}
                          className="w-28 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                        />
                        <span className="text-xs text-slate-500">giờ</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mood Tag Selector */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                    2. Chọn tâm trạng / thể loại bức thư:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {MOOD_TAGS.map((tag) => {
                      const isSelected = selectedMoodTag === tag.code
                      return (
                        <button
                          type="button"
                          key={tag.code}
                          onClick={() => setSelectedMoodTag(tag.code)}
                          className={`p-2 rounded-xl border text-left flex items-start gap-2 transition ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200 shadow'
                              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-lg">{tag.icon}</span>
                          <div className="text-[11px] leading-tight">
                            <div className="font-bold text-white">{tag.label}</div>
                            <div className="text-[10px] opacity-70 mt-0.5">{tag.desc}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Title input */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tiêu đề bức thư
                  </label>
                  <input
                    type="text"
                    placeholder="Vd: Gửi tôi lúc mệt mỏi - Hãy dừng lại thở một chút và nhớ lý do bắt đầu..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Content textarea */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nội dung tâm thư nhắn gửi
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Viết những lời chân thật nhất gửi đến chính mình: Bạn hôm nay đang vất vả thế nào, bạn có điều gì muốn nhắn nhủ bản thân khi đọc lại bức thư này..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Submit button & Reward tag */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
                  <div className="text-[11px] text-amber-300/80 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Sau khi niêm phong, bạn nhận ngay <b>+1 Hạc Giấy Hy Vọng 🕊️</b></span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !content.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white font-bold text-xs tracking-wide shadow-lg shadow-amber-500/20 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 transition"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{submitting ? 'Đang niêm phong...' : '🔒 Niêm Phong Hòm Thư Này'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* ── CAPSULES LIST ── */}
            <div className="space-y-3">
              {/* Permanent Preservation Assurance Banner */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs shadow-sm">
                <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Bảo vệ lưu trữ vĩnh viễn:</span> Khi bạn mở khóa hay bẻ khóa lá thư, <strong>lá thư sẽ KHÔNG BAO GIỜ bị mất hoặc xóa đi</strong>! Tất cả được lưu trữ trọn đời trong <strong>Kho Thư Kỷ Niệm</strong> để bạn có thể mở ra đọc lại bất cứ lúc nào.
                </div>
              </div>

              {/* Tabs & Stats Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'all'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Tất cả</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">{capsules.length}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('locked')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'locked'
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>Đang niêm phong</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                      {capsules.filter((c) => !c.is_unlocked).length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('unlocked')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'unlocked'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Kho Thư Đã Mở</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                      {capsules.filter((c) => c.is_unlocked).length}
                    </span>
                  </button>
                </div>

                <span className="text-xs text-slate-400">
                  Đã mở khóa: <strong className="text-emerald-400">{capsules.filter((c) => c.is_unlocked).length}</strong> / {capsules.length} lá thư
                </span>
              </div>

              {loading ? (
                <div className="text-center py-12 text-slate-500 text-xs sm:text-sm animate-pulse">
                  Đang kiểm tra niêm phong các hòm thư...
                </div>
              ) : capsules.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 space-y-2">
                  <Mail className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-semibold text-slate-300">Chưa có hòm thư thời gian nào</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Hãy bấm "Soạn thư mới" ở trên để gửi lời chúc hoặc tâm sự đến chính bạn trong 30 ngày, 100 ngày tới nhé!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {capsules
                    .filter((c) => {
                      if (activeTab === 'locked') return !c.is_unlocked
                      if (activeTab === 'unlocked') return c.is_unlocked
                      return true
                    })
                    .map((cap) => {
                    const tagInfo = getMoodTagInfo(cap.mood_tag)
                    const isLocked = !cap.is_unlocked
                    const isUnlockDays = cap.unlock_days && cap.unlock_days > 0
                    const unlockDateStr = cap.unlock_date
                      ? formatSafeDate(cap.unlock_date)
                      : null

                    return (
                      <div
                        key={cap.id}
                        className={`relative rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                          cap.is_unlocked
                            ? 'bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-900 border-amber-500/40 shadow-md'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          {/* Top Badge & Tag */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                                  cap.is_unlocked
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {cap.is_unlocked ? (
                                  <>
                                    <Unlock className="w-3 h-3 text-emerald-400" />
                                    <span>ĐÃ MỞ • LƯU VĨNH VIỄN</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    <span>
                                      {isUnlockDays
                                        ? `Khóa ${cap.unlock_days} ngày`
                                        : `Mốc ${cap.milestone_hours}h`}
                                    </span>
                                  </>
                                )}
                              </span>

                              <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/70 flex items-center gap-1">
                                <span>{tagInfo.icon}</span>
                                <span>{tagInfo.label}</span>
                              </span>
                            </div>

                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatSafeDate(cap.created_at)}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-xs sm:text-sm font-bold text-white mb-1.5 line-clamp-1">
                            {cap.title}
                          </h4>

                          {/* Content or Teaser */}
                          {cap.is_unlocked ? (
                            <div className="space-y-1.5 mb-3">
                              <p className="text-xs text-slate-300 line-clamp-2 italic bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl font-serif">
                                "{cap.message_content}"
                              </p>
                              <div className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                <span>Lưu vĩnh viễn trong kho • Đọc lại bất cứ lúc nào</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 mb-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                              <div className="font-mono text-slate-500 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>[Nội dung đã được niêm phong mật]</span>
                              </div>
                              <div className="text-[11px] text-slate-300">
                                {unlockDateStr ? (
                                  <span>📅 Mở khóa tự động vào ngày: <strong className="text-amber-300">{unlockDateStr}</strong></span>
                                ) : (
                                  <span>⏱️ Cần học đủ <strong className="text-amber-300">{cap.milestone_hours}h</strong> để mở!</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          {cap.is_unlocked ? (
                            <div className="w-full flex items-center justify-between gap-2">
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>{cap.unlocked_by_key ? 'Mở bằng 🕊️ Hạc Giấy' : 'Mở đúng hẹn ✨'}</span>
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleCopyContent(cap.message_content)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                                  title="Sao chép nội dung thư"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDownloadTxt(cap)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                                  title="Tải về máy tính (.txt)"
                                >
                                  <Download className="w-3.5 h-3.5 text-emerald-300" />
                                </button>
                                <button
                                  onClick={() => {
                                    soundManager.playCapsuleUnlock()
                                    setReadingCapsule(cap)
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span>Đọc thư</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full flex items-center justify-between gap-2">
                              <span className="text-[10px] text-slate-400">
                                Đang niêm phong...
                              </span>
                              <button
                                onClick={() => handleUnlockEmergency(cap)}
                                disabled={unlockingId === cap.id}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/40 to-pink-600/40 hover:from-purple-600/60 hover:to-pink-600/60 border border-purple-500/40 text-purple-200 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                title="Bẻ khóa sớm lá thư này bằng 1 Hạc Giấy Hy Vọng khi bạn tụt mood"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-purple-300" />
                                <span>{unlockingId === cap.id ? 'Đang mở...' : 'Mở sớm (1 🕊️)'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
            <span>💡 Lời nhắn gửi hôm nay sẽ là ngọn đuốc thắp sáng bạn trong những ngày khó khăn.</span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* ── READING POPUP MODAL ── */}
      {readingCapsule && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-lg animate-fadeIn print:hidden">
          <div className="relative w-full max-w-xl bg-gradient-to-b from-amber-950/90 via-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setReadingCapsule(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Đóng cửa sổ đọc thư (Lá thư vẫn được lưu an toàn)"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Thư Gửi Từ Quá Khứ • {getMoodTagInfo(readingCapsule.mood_tag).label}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-amber-100 mb-2">
              {readingCapsule.title}
            </h3>

            {/* Permanent Preservation Reassurance Note */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3 shadow-sm">
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Lá thư này được bảo toàn vĩnh viễn trong Kho Kỷ Niệm của bạn và không bao giờ bị mất!</span>
            </div>

            <div className="text-xs text-slate-400 mb-4 pb-3 border-b border-amber-500/20 flex flex-wrap items-center gap-2">
              <span>Niêm phong ngày: {formatSafeDate(readingCapsule.created_at)}</span>
              <span>•</span>
              <span className="text-emerald-400">
                Mở khóa ngày:{' '}
                {readingCapsule.unlocked_at
                  ? formatSafeDate(readingCapsule.unlocked_at)
                  : 'Hôm nay'}
              </span>
            </div>

            {/* Letter body */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 mb-5 max-h-72 overflow-y-auto shadow-inner">
              <p className="text-sm sm:text-base text-amber-100/90 whitespace-pre-wrap leading-relaxed font-serif italic">
                "{readingCapsule.message_content}"
              </p>
            </div>

            {/* Actions: Copy, Download, Print, Reseal, Close */}
            <div className="space-y-3 pt-2 border-t border-amber-500/20">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleCopyContent(readingCapsule.message_content)}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition flex items-center gap-1.5 active:scale-95"
                    title="Sao chép nội dung thư vào bộ nhớ tạm"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-300" />
                    <span>Sao chép</span>
                  </button>

                  <button
                    onClick={() => handleDownloadTxt(readingCapsule)}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition flex items-center gap-1.5 active:scale-95"
                    title="Tải bản sao lá thư (.txt) về máy tính cá nhân"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Tải về (.txt)</span>
                  </button>

                  <button
                    onClick={handlePrintLetter}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition flex items-center gap-1.5 active:scale-95"
                    title="In bức thư ra giấy hoặc lưu thành file PDF làm kỷ niệm"
                  >
                    <Printer className="w-3.5 h-3.5 text-cyan-300" />
                    <span>In / PDF</span>
                  </button>

                  <button
                    onClick={() => handleReseal(readingCapsule, 30)}
                    disabled={isResealingId === readingCapsule.id}
                    className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-medium text-xs transition flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                    title="Khóa lại lá thư thêm 30 ngày để dành cho tương lai"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isResealingId === readingCapsule.id ? 'animate-spin' : ''}`} />
                    <span>{isResealingId === readingCapsule.id ? 'Đang khóa...' : 'Niêm phong lại 30d'}</span>
                  </button>
                </div>

                <button
                  onClick={() => setReadingCapsule(null)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu Trong Kho & Đóng</span>
                </button>
              </div>

              <div className="text-[11px] text-center text-slate-400 italic">
                💡 Bạn có thể đóng cửa sổ này bất cứ lúc nào, bức thư vẫn nằm nguyên vẹn trong Kho Thư Kỷ Niệm.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 30-SECOND MINDFUL BREATHING MODAL (SOS GRANT) ── */}
      {showBreathing && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fadeIn print:hidden">
          <div className="relative w-full max-w-md bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl text-center text-white space-y-6">
            <button
              onClick={() => setShowBreathing(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30">
                <Wind className="w-3.5 h-3.5" />
                <span>Bài Tập Tĩnh Tâm 30 Giây</span>
              </div>
              <h3 className="text-lg font-bold text-white">Lắng Đọng Tâm Trí & Nhận Hạc Giấy 🕊️</h3>
              <p className="text-xs text-white/60">
                Hãy thả lỏng vai, hít thở theo nhịp tròn để xoa dịu cảm xúc mệt mỏi.
              </p>
            </div>

            {/* Breathing Animation Circle */}
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border-2 border-cyan-400/50 transition-all duration-1000 ${
                  breathPhase === 'Hít vào sâu...'
                    ? 'scale-110 opacity-100'
                    : breathPhase === 'Giữ hơi thở...'
                    ? 'scale-105 opacity-90'
                    : 'scale-90 opacity-60'
                }`}
              />
              <div className="relative z-10 space-y-1">
                <div className="text-3xl font-black font-mono text-cyan-300">
                  {breathSeconds}s
                </div>
                <div className="text-xs font-bold text-white/90">
                  {breathPhase}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-white/50 italic">
              "Cơn bão cảm xúc nào rồi cũng sẽ qua đi. Bạn vẫn luôn an toàn và đủ đầy ngay trong giây phút này."
            </p>

            <div className="flex justify-center">
              <button
                onClick={() => setShowBreathing(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white/70 hover:text-white transition"
              >
                Để lúc khác
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DEDICATED PRINTABLE VINTAGE LETTER (ONLY VISIBLE WHEN PRINTING) ── */}
      {readingCapsule && (
        <div id="printable-time-capsule" className="hidden print:block">
          <div
            style={{
              border: '3px double #333333',
              padding: '36px',
              maxWidth: '700px',
              margin: '0 auto',
              background: '#ffffff',
              color: '#1a1a1a',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            {/* Postal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2px dashed #999999',
                paddingBottom: '20px',
                marginBottom: '28px',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', color: '#666666', textTransform: 'uppercase' }}>
                  BƯU CHÍNH THỜI GIAN LIFEQUEST
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>
                  HÒM THƯ GỬI TƯƠNG LAI
                </div>
                <div style={{ fontSize: '11px', color: '#555555', marginTop: '4px' }}>
                  Niêm phong: {formatSafeDate(readingCapsule.created_at)} • Mở khóa: {readingCapsule.unlocked_at ? formatSafeDate(readingCapsule.unlocked_at) : 'Hôm nay'}
                </div>
              </div>

              {/* Vintage Postal Stamp Seal */}
              <div
                style={{
                  border: '2px solid #b45309',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  textAlign: 'center',
                  background: '#fef3c7',
                  color: '#92400e',
                }}
              >
                <div style={{ fontSize: '16px' }}>🕊️</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px' }}>
                  LIFEQUEST POST
                </div>
                <div style={{ fontSize: '9px' }}>OFFICIAL SEAL</div>
              </div>
            </div>

            {/* Letter Title */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#777777', marginBottom: '4px' }}>
                Gửi bản thân thân yêu:
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                {readingCapsule.title}
              </h2>
            </div>

            {/* Letter Content */}
            <div
              style={{
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#27272a',
                fontStyle: 'italic',
                whiteSpace: 'pre-wrap',
                marginBottom: '40px',
                padding: '20px 0',
                borderTop: '1px solid #eeeeee',
                borderBottom: '1px solid #eeeeee',
              }}
            >
              "{readingCapsule.message_content}"
            </div>

            {/* Postal Footer & Signature */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px' }}>
              <div style={{ fontSize: '11px', color: '#71717a', maxWidth: '380px', lineHeight: '1.5' }}>
                Lá thư này được bảo chứng bởi chính sự nỗ lực kiên cường của bạn trong quá khứ. Dù hôm nay thế nào, hãy nhớ rằng bạn đã đi một chặng đường rất dài!
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#71717a' }}>Ký tên từ quá khứ:</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'cursive', color: '#0f172a', marginTop: '4px' }}>
                  Chính Bạn ✨
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
