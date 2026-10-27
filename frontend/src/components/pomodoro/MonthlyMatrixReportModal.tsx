import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Brain,
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  BookOpen,
} from 'lucide-react'
import {
  focusService,
  MonthlyMatrixSummary,
  ReflectionLogItem,
} from '@/services/focusService'

interface MonthlyMatrixReportModalProps {
  isOpen: boolean
  onClose: () => void
}

export const MonthlyMatrixReportModal: React.FC<MonthlyMatrixReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const currentDate = new Date()
  const [year, setYear] = useState<number>(currentDate.getFullYear())
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1)
  const [summary, setSummary] = useState<MonthlyMatrixSummary | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const loadSummary = async (y: number, m: number) => {
    setIsLoading(true)
    try {
      const data = await focusService.getMonthlyMatrixSummary(y, m)
      setSummary(data)
    } catch (err) {
      console.error('Error loading monthly summary:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSummary(year, month)
    }
  }, [isOpen, year, month])

  if (!isOpen) return null

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#14171F] border border-white/20 rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Báo Cáo Tổng Kết Tháng & Đúc Kết Bản Thân
              </h3>
              <p className="text-xs text-white/60">
                Phân tích Ma Trận 4 Ô • Đánh giá việc lớn việc nhỏ • Rút kinh nghiệm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Month selector */}
            <div className="flex items-center gap-1 bg-black/40 border border-white/15 rounded-xl px-2 py-1 text-xs font-semibold">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-white/15 rounded-lg transition"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">
                Tháng {month}/{year}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-white/15 rounded-lg transition"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-16 text-white/50 text-sm">
              Đang phân tích dữ liệu tháng {month}/{year}...
            </div>
          ) : !summary ? (
            <div className="text-center py-16 text-white/50 text-sm">
              Chưa có dữ liệu cho tháng này.
            </div>
          ) : (
            <>
              {/* Top Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/60 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Tổng nhiệm vụ
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    {summary.total_tasks}
                  </div>
                  <div className="text-[11px] text-cyan-300 mt-0.5">
                    Đã xong {summary.completed_tasks} việc
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/60 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tỷ lệ hoàn thành
                  </div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {summary.completion_rate}%
                  </div>
                  <div className="text-[11px] text-white/50 mt-0.5">
                    Hiệu suất tháng này
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/60 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" /> Mục tiêu lớn tích lũy
                  </div>
                  <div className="text-2xl font-black text-amber-300 mt-1">
                    {summary.total_big_goals_active}
                  </div>
                  <div className="text-[11px] text-amber-200/70 mt-0.5">
                    Đang rèn luyện kiên trì
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-xs text-white/60 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Ghi chú tự đánh giá
                  </div>
                  <div className="text-2xl font-black text-purple-300 mt-1">
                    {summary.reflection_logs.length}
                  </div>
                  <div className="text-[11px] text-purple-200/70 mt-0.5">
                    Đúc kết rút kinh nghiệm
                  </div>
                </div>
              </div>

              {/* Eisenhower Matrix 4-Quadrant Visual Breakdown */}
              <div className="bg-black/30 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Phân Bổ Năng Lượng Theo 4 Ô Ma Trận</span>
                  </h4>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    💡 Quy tắc vàng: Ô 2 &gt; 50% thời gian = Tương lai bứt phá
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Ô 1 */}
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-300">
                        Ô 1: Quan trọng + Khẩn cấp (Làm ngay)
                      </span>
                      <span className="text-xs font-extrabold text-rose-400">
                        {summary.q1_percent}% ({summary.q1_count} việc)
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${summary.q1_percent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-white/60 mt-2">
                      Đã hoàn thành: {summary.q1_completed}/{summary.q1_count} việc khẩn cấp.
                    </p>
                  </div>

                  {/* Ô 2 */}
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300">
                        Ô 2: Quan trọng + Chưa khẩn cấp (Lên lịch) ⭐
                      </span>
                      <span className="text-xs font-extrabold text-emerald-400">
                        {summary.q2_percent}% ({summary.q2_count} việc)
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${summary.q2_percent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-white/60 mt-2">
                      Đã hoàn thành: {summary.q2_completed}/{summary.q2_count} việc phát triển bản thân dài hạn.
                    </p>
                  </div>

                  {/* Ô 3 */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">
                        Ô 3: Không quan trọng + Khẩn cấp (Ủy quyền/Nhanh)
                      </span>
                      <span className="text-xs font-extrabold text-amber-400">
                        {summary.q3_percent}% ({summary.q3_count} việc)
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${summary.q3_percent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-white/60 mt-2">
                      Đã hoàn thành: {summary.q3_completed}/{summary.q3_count} việc phát sinh.
                    </p>
                  </div>

                  {/* Ô 4 */}
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/25">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300">
                        Ô 4: Không quan trọng + Chưa khẩn cấp (Hạn chế)
                      </span>
                      <span className="text-xs font-extrabold text-purple-400">
                        {summary.q4_percent}% ({summary.q4_count} việc)
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${summary.q4_percent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-white/60 mt-2">
                      Đã kiểm soát: {summary.q4_completed}/{summary.q4_count} thói quen xao nhãng.
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Reflection Log Timeline */}
              <div className="bg-black/30 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span>Nhật Ký Tự Đánh Giá & Rút Kinh Nghiệm (Reflection Feed)</span>
                  </h4>
                  <span className="text-xs text-white/50">
                    {summary.reflection_logs.length} ghi chép
                  </span>
                </div>

                {summary.reflection_logs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-white/50">
                    Chưa có ghi chú tự đánh giá nào trong tháng {month}/{year}. Khi làm việc trong ngày, hãy bấm nút 📝 trên từng công việc để ghi lại lý do chưa xong hoặc điểm cần cải thiện nhé!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {summary.reflection_logs.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">
                              {log.task_title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.quadrant === 1
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : log.quadrant === 2
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : log.quadrant === 3
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}
                            >
                              Ô {log.quadrant}
                            </span>
                            {log.goal_title && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                🎯 {log.goal_title}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                log.is_completed
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {log.is_completed ? '✓ Hoàn thành' : '⏳ Chưa xong'}
                            </span>
                          </div>

                          <div className="text-white/80 bg-black/40 rounded-lg p-2.5 mt-1 border border-white/10 italic">
                            &ldquo;{log.reflection_note}&rdquo;
                          </div>
                        </div>

                        <div className="text-[11px] text-white/50 flex-shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{log.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
