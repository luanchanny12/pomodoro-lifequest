import React from 'react'
import {
  MessageSquarePlus,
  Star,
  Filter,
  Trash2,
  Check,
} from 'lucide-react'
import {
  AdminOverview,
  AdminFeedbackItem,
} from '@/services/adminService'

export interface AdminFeedbackTabProps {
  overview: AdminOverview | null
  feedbacks: AdminFeedbackItem[]
  feedbacksLoading: boolean
  feedbackCategory: string
  setFeedbackCategory: (v: string) => void
  feedbackStatus: string
  setFeedbackStatus: (v: string) => void
  feedbackRating: number | null
  setFeedbackRating: (v: number | null) => void
  adminNotes: Record<number, string>
  setAdminNotes: React.Dispatch<React.SetStateAction<Record<number, string>>>
  handleUpdateFeedbackStatus: (id: number, status: 'new' | 'reviewed' | 'resolved') => void
  handleDeleteFeedback: (id: number) => void
}

export const AdminFeedbackTab: React.FC<AdminFeedbackTabProps> = ({
  overview,
  feedbacks,
  feedbacksLoading,
  feedbackCategory,
  setFeedbackCategory,
  feedbackStatus,
  setFeedbackStatus,
  feedbackRating,
  setFeedbackRating,
  adminNotes,
  setAdminNotes,
  handleUpdateFeedbackStatus,
  handleDeleteFeedback,
}) => {
  return (
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
  )
}

export default AdminFeedbackTab
