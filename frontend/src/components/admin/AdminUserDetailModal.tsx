import React from 'react'
import {
  Flame,
  Target,
  Clock,
  Layers,
  Smartphone,
  MessageSquare,
  RefreshCw,
  Send,
  SendHorizontal,
  Monitor,
} from 'lucide-react'
import { UserActivityDetail } from '@/services/adminService'
import { formatSafeDateTime } from '@/utils/dateUtils'

export interface AdminUserDetailModalProps {
  selectedUserId: number | null
  onClose: () => void
  userDetail: UserActivityDetail | null
  detailLoading: boolean
  detailTab: 'goals' | 'sessions' | 'matrix' | 'visits' | 'cheer'
  setDetailTab: (t: 'goals' | 'sessions' | 'matrix' | 'visits' | 'cheer') => void
  selectedEmoji: string
  setSelectedEmoji: (em: string) => void
  cheerMsg: string
  setCheerMsg: (msg: string) => void
  telegramMsg: string
  setTelegramMsg: (msg: string) => void
  sendingMsg: boolean
  handleSendCheer: () => void
  handleSendTelegram: () => void
  formatRelativeTime: (isoString: string | null) => string
  getVehicleIcon: (avatar: string) => string
}

export const AdminUserDetailModal: React.FC<AdminUserDetailModalProps> = ({
  selectedUserId,
  onClose,
  userDetail,
  detailLoading,
  detailTab,
  setDetailTab,
  selectedEmoji,
  setSelectedEmoji,
  cheerMsg,
  setCheerMsg,
  telegramMsg,
  setTelegramMsg,
  sendingMsg,
  handleSendCheer,
  handleSendTelegram,
  formatRelativeTime,
  getVehicleIcon,
}) => {
  if (!selectedUserId) return null

  return (
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
            onClick={onClose}
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
                                  {formatSafeDateTime(v.created_at)}
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
  )
}

export default AdminUserDetailModal
