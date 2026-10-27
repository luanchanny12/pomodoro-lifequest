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
  AlertCircle
} from 'lucide-react'
import { TimeCapsule, focusService } from '../../services/focusService'
import { soundManager } from '../../utils/soundEffects'

interface TimeCapsuleModalProps {
  isOpen: boolean
  onClose: () => void
  currentHours: number
}

const PRESET_MILESTONES = [
  { hours: 10, label: '10 Giờ', tag: '🌱 Khởi đầu' },
  { hours: 50, label: '50 Giờ', tag: '🔥 Kiên trì' },
  { hours: 100, label: '100 Giờ', tag: '⚡ Thói quen thép' },
  { hours: 250, label: '250 Giờ', tag: '🚀 Bứt phá' },
  { hours: 500, label: '500 Giờ', tag: '💎 Bậc thầy' },
  { hours: 1000, label: '1,000 Giờ', tag: '👑 Tinh hoa (Mastery)' },
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

  // Form states
  const [showCompose, setShowCompose] = useState(false)
  const [targetMilestone, setTargetMilestone] = useState<number>(50)
  const [customMilestone, setCustomMilestone] = useState<string>('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Selected capsule for reading
  const [readingCapsule, setReadingCapsule] = useState<TimeCapsule | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCapsules()
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen])

  const loadCapsules = async () => {
    setLoading(true)
    try {
      const data = await focusService.getTimeCapsules()
      setCapsules(data)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách hòm thư thời gian')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCapsule = async (e: React.FormEvent) => {
    e.preventDefault()
    const milestone = customMilestone ? parseFloat(customMilestone) : targetMilestone
    if (isNaN(milestone) || milestone <= 0) {
      setError('Mốc giờ mở khóa không hợp lệ!')
      return
    }
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung bức thư nhắn gửi tương lai!')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const newCap = await focusService.createTimeCapsule({
        milestone_hours: milestone,
        title: title.trim() || `Thư gửi bản thân ở mốc ${milestone}h`,
        message_content: content.trim(),
      })

      soundManager.playWarpSpeed()
      setSuccessMsg(`Đã niêm phong bức thư thành công cho cột mốc ${milestone} giờ! 💌`)
      setShowCompose(false)
      setTitle('')
      setContent('')
      setCustomMilestone('')
      await loadCapsules()
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Lỗi khi niêm phong hòm thư')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenLetter = (cap: TimeCapsule) => {
    soundManager.playCapsuleUnlock()
    setReadingCapsule(cap)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Hòm Thư Gửi Tương Lai
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Milestone Capsules
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gửi tâm thư đến chính bạn khi cán mốc. Chỉ mở khóa khi tích lũy đủ giờ học!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Đã học: <strong>{currentHours.toFixed(1)}h</strong></span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Compose toggle & preview button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-500/20">
            <div>
              <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Viết một lá thư cho tương lai của bạn
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhắc nhở lý do bạn bắt đầu, cảm xúc hiện tại, hoặc lời chúc mừng khi bạn vượt qua mốc khó.
              </p>
            </div>
            <button
              onClick={() => {
                setShowCompose(!showCompose)
                setError(null)
                setSuccessMsg(null)
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 flex-shrink-0 ${
                showCompose
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/20 hover:opacity-90'
              }`}
            >
              {showCompose ? 'Đóng khung soạn' : '✉️ Soạn thư mới'}
            </button>
          </div>

          {/* Compose Form */}
          {showCompose && (
            <form onSubmit={handleCreateCapsule} className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Chọn cột mốc niêm phong
                </span>
                <span className="text-xs text-slate-400">
                  Mở khóa khi đạt đủ giờ học
                </span>
              </div>

              {/* Milestone Presets */}
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
                        <div className="text-[9px] text-emerald-400 mt-1 flex items-center justify-center gap-0.5">
                          ✓ Đã vượt mốc
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Custom Milestone Input */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-slate-400">Hoặc tự nhập mốc giờ:</span>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="Vd: 30, 75, 300..."
                  value={customMilestone}
                  onChange={(e) => setCustomMilestone(e.target.value)}
                  className="w-32 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-500">giờ</span>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tiêu đề bức thư
                </label>
                <input
                  type="text"
                  placeholder={`Vd: Gửi tôi ở mốc ${customMilestone || targetMilestone}h - Bạn đã làm được rồi!`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Message content textarea */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nội dung tâm thư (chỉ mở ra khi đạt số giờ này)
                </label>
                <textarea
                  rows={4}
                  placeholder="Viết cảm xúc hiện tại của bạn: Hôm nay bạn đã vất vả thế nào, mục tiêu của bạn ra sao, và bạn hy vọng khi đọc lại thư này bản thân đã tiến bộ đến đâu..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white font-semibold text-xs tracking-wide shadow-lg shadow-amber-500/20 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  {submitting ? 'Đang niêm phong...' : '🔒 Niêm Phong Hòm Thư Này'}
                </button>
              </div>
            </form>
          )}

          {/* Capsules List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Các hòm thư thời gian của bạn ({capsules.length})
              </h3>
              <span className="text-xs text-slate-400">
                Đã mở: {capsules.filter((c) => c.is_unlocked).length} / {capsules.length}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-10 text-slate-500 text-sm animate-pulse">
                Đang kiểm tra niêm phong các hòm thư...
              </div>
            ) : capsules.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
                <Mail className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-300">Chưa có hòm thư thời gian nào</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Hãy bấm "Soạn thư mới" bên trên để gửi tâm sự cho chính bạn ở mốc 10h, 50h, 100h hoặc 1000h!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {capsules.map((cap) => {
                  const progressPct = Math.min(100, Math.round((currentHours / cap.milestone_hours) * 100))
                  const hoursLeft = Math.max(0, cap.milestone_hours - currentHours)

                  return (
                    <div
                      key={cap.id}
                      className={`relative rounded-2xl border p-4.5 transition-all flex flex-col justify-between ${
                        cap.is_unlocked
                          ? 'bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/5'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Top Badge & Milestone */}
                        <div className="flex items-center justify-between mb-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              cap.is_unlocked
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {cap.is_unlocked ? (
                              <>
                                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                                Mốc {cap.milestone_hours}h • ĐÃ MỞ KHÓA
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                Niêm phong đến: {cap.milestone_hours}h
                              </>
                            )}
                          </span>

                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(cap.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-white mb-1.5 line-clamp-1">
                          {cap.title}
                        </h4>

                        {/* Teaser or excerpt */}
                        {cap.is_unlocked ? (
                          <p className="text-xs text-slate-300 line-clamp-2 italic bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl mb-3">
                            "{cap.message_content}"
                          </p>
                        ) : (
                          <div className="text-xs text-slate-500 mb-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="font-mono text-slate-400">🔒 [Nội dung đã được mã hóa niêm phong]</span>
                            <div className="mt-1 text-[11px] text-slate-400">
                              Cần thêm <strong className="text-amber-400">{hoursLeft.toFixed(1)}h</strong> học tập nữa để mở lá thư này!
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom action / progress */}
                      <div className="pt-2 border-t border-slate-800/80">
                        {cap.is_unlocked ? (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Mở khóa ngày{' '}
                              {cap.unlocked_at
                                ? new Date(cap.unlocked_at).toLocaleDateString('vi-VN')
                                : 'Hôm nay'}
                            </span>
                            <button
                              onClick={() => handleOpenLetter(cap)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors flex items-center gap-1.5"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Đọc toàn bộ thư
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                              <span>Tiến độ mở khóa</span>
                              <span>{progressPct}% ({currentHours.toFixed(1)}/{cap.milestone_hours}h)</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
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

        {/* Modal footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>💡 Mỗi mốc giờ vượt qua là một minh chứng cho sự kiên định của bạn.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Đóng
          </button>
        </div>

        {/* Reading Letter Popup */}
        {readingCapsule && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fadeIn">
            <div className="relative w-full max-w-lg bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl text-slate-100">
              <button
                onClick={() => setReadingCapsule(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                Thư Gửi Từ Quá Khứ • Cột Mốc {readingCapsule.milestone_hours} Giờ
              </div>

              <h3 className="text-xl font-bold text-amber-100 mb-1">
                {readingCapsule.title}
              </h3>

              <div className="text-xs text-slate-400 mb-4 pb-3 border-b border-amber-500/20 flex items-center gap-3">
                <span>Niêm phong ngày: {new Date(readingCapsule.created_at).toLocaleDateString('vi-VN')}</span>
                <span>•</span>
                <span className="text-emerald-400">
                  Mở khóa thành công: {readingCapsule.unlocked_at ? new Date(readingCapsule.unlocked_at).toLocaleDateString('vi-VN') : 'Hôm nay'}
                </span>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4.5 mb-5 max-h-64 overflow-y-auto">
                <p className="text-sm text-amber-100/90 whitespace-pre-wrap leading-relaxed font-serif italic">
                  "{readingCapsule.message_content}"
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setReadingCapsule(null)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
                >
                  Đã đọc & Cảm ơn quá khứ ✨
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
