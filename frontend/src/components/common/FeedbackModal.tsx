import React, { useState } from 'react'
import {
  X,
  MessageSquarePlus,
  Star,
  Send,
  Sparkles,
  Bug,
  Layout,
  Heart,
  MessageCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { feedbackService } from '@/services/feedbackService'
import { UserProfile } from '@/services/authService'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: UserProfile | null
}

const CATEGORIES = [
  { id: 'feature', label: 'Tính Năng Mới', icon: Sparkles, color: 'text-amber-400' },
  { id: 'bug', label: 'Báo Lỗi Kỹ Thuật', icon: Bug, color: 'text-rose-400' },
  { id: 'ui', label: 'Giao Diện & Mobile', icon: Layout, color: 'text-cyan-400' },
  { id: 'praise', label: 'Khen Ngợi & Động Viên', icon: Heart, color: 'text-pink-400' },
  { id: 'other', label: 'Ý Kiến Khác', icon: MessageCircle, color: 'text-purple-400' },
]

const RATING_LABELS = ['Rất tệ 😢', 'Chưa tốt 😐', 'Bình thường 🙂', 'Rất hài lòng! 😊', 'Xuất sắc tuyệt vời! 🌟']

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [category, setCategory] = useState<string>('feature')
  const [content, setContent] = useState<string>('')
  const [senderName, setSenderName] = useState<string>(currentUser?.display_name || '')
  const [senderContact, setSenderContact] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung nhận xét hoặc góp ý của bạn!')
      return
    }

    try {
      setSubmitting(true)
      const res = await feedbackService.submitFeedback({
        rating,
        category,
        content: content.trim(),
        sender_name: senderName.trim() || undefined,
        sender_contact: senderContact.trim() || undefined,
      })
      toast.success(res.message || 'Cảm ơn bạn rất nhiều! Ý kiến đã được gửi đến Admin 🎉')
      setContent('')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi nhận xét. Vui lòng thử lại!')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0f1422] border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/70 via-indigo-950/50 to-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <MessageSquarePlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-white">
                GÓP Ý & NHẬN XÉT WEB
              </h3>
              <p className="text-[11px] text-white/60">
                Ý kiến của bạn là kim chỉ nam giúp ứng dụng ngày càng hoàn thiện!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Star Rating */}
          <div className="bg-[#141b2d] border border-white/10 rounded-2xl p-4 text-center">
            <label className="block text-xs font-bold text-white mb-2">
              Bạn đánh giá trải nghiệm trang web thế nào?
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setRating(star)}
                  className="p-1 transition active:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition ${
                      (hoverRating !== null ? star <= hoverRating : star <= rating)
                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                        : 'text-white/20'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-[11px] text-amber-300 font-bold mt-2">
              {RATING_LABELS[(hoverRating !== null ? hoverRating : rating) - 1]}
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-[11px] font-bold text-white/80 uppercase tracking-wider mb-2">
              Chủ đề đóng góp:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const IconComponent = c.icon
                const isSelected = category === c.id
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition active:scale-95 text-left ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold shadow-md shadow-cyan-500/10'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${c.color}`} />
                    <span className="text-[11px]">{c.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Feedback Content */}
          <div>
            <label className="block text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1.5">
              Nội dung nhận xét & ý tưởng cải tiến: <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ví dụ: Mong tác giả thêm tính năng nhạc lofi không lời, hoặc tối ưu thêm nút bấm trên điện thoại Android..."
              className="w-full bg-[#141b2d] border border-white/15 focus:border-cyan-400 rounded-2xl p-3 text-xs text-white placeholder-white/30 outline-none transition leading-relaxed resize-none"
            />
          </div>

          {/* Sender Info (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] text-white/60 mb-1">
                Tên của bạn (Tùy chọn):
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder={currentUser ? currentUser.display_name : 'Khách ẩn danh'}
                className="w-full bg-[#141b2d] border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/60 mb-1">
                Liên hệ / Telegram / Email (Tùy chọn):
              </label>
              <input
                type="text"
                value={senderContact}
                onChange={(e) => setSenderContact(e.target.value)}
                placeholder="@telegram hoặc email để admin phản hồi"
                className="w-full bg-[#141b2d] border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none transition"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Đang gửi...' : 'Gửi Nhận Xét Trực Tiếp Đến Admin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
