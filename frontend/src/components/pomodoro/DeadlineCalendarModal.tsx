import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  AlertTriangle,
  Clock,
  Play,
  CheckCircle2,
  Sparkles,
  Target,
  LayoutGrid,
  ChevronRight,
  Flame,
} from 'lucide-react'
import { focusService } from '@/services/focusService'
import { formatSafeDate } from '@/utils/dateUtils'
import { toast } from 'sonner'

export interface DeadlineItem {
  type: 'goal' | 'task'
  id: number
  title: string
  date: string
  days_left: number
  urgency: 'overdue' | 'today' | 'urgent' | 'soon' | 'future'
  current_hours: number
  target_hours: number
  progress_percent: number
  category: string
  color: string
  planet_type: string
}

export interface DeadlineSummary {
  overdue: number
  today: number
  urgent: number
  soon: number
  future: number
  total_active: number
}

interface DeadlineCalendarModalProps {
  isOpen: boolean
  onClose: () => void
  onStartPomodoro?: (goalId: number) => void
}

export const DeadlineCalendarModal: React.FC<DeadlineCalendarModalProps> = ({
  isOpen,
  onClose,
  onStartPomodoro,
}) => {
  const [data, setData] = useState<{ items: DeadlineItem[]; summary: DeadlineSummary } | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'all' | 'urgent' | 'week' | 'future'>('all')

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await focusService.getDeadlines()
      setData(res)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách deadline')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  if (!isOpen) return null

  const items = data?.items || []
  const summary = data?.summary || {
    overdue: 0,
    today: 0,
    urgent: 0,
    soon: 0,
    future: 0,
    total_active: 0,
  }

  const urgentCount = summary.overdue + summary.today + (summary.urgent || 0)
  const weekCount = (summary.soon || 0)

  const filteredItems = items.filter((item) => {
    if (activeTab === 'all') return true
    if (activeTab === 'urgent') return item.days_left <= 3
    if (activeTab === 'week') return item.days_left > 3 && item.days_left <= 7
    if (activeTab === 'future') return item.days_left > 7
    return true
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#12151F] border border-white/20 rounded-3xl shadow-2xl p-5 sm:p-6 text-white max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-rose-500 text-black rounded-2xl shadow-lg shadow-amber-500/25">
              <Calendar className="w-5 h-5 font-black text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Lịch & Sổ Tay Deadline</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                  {summary.total_active} Hạn Chót
                </span>
              </div>
              <p className="text-xs text-white/60">
                Toàn bộ kỳ thi, bài tập và công việc quan trọng xếp theo mức độ khẩn cấp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Pill */}
        <div className="grid grid-cols-3 gap-2 my-3 flex-shrink-0 text-xs">
          <div className="p-2.5 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400 animate-pulse flex-shrink-0" />
            <div>
              <div className="text-[10px] text-red-300 font-semibold uppercase">Hôm nay & Quá hạn</div>
              <div className="text-base font-black text-white">{summary.overdue + summary.today}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-amber-300 font-semibold uppercase">1 - 3 Ngày Tới</div>
              <div className="text-base font-black text-white">{summary.urgent || 0}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-cyan-300 font-semibold uppercase">Tuần này & Xa hơn</div>
              <div className="text-base font-black text-white">{(summary.soon || 0) + (summary.future || 0)}</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 pb-2 border-b border-white/10 flex-shrink-0 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'all'
                ? 'bg-white text-black shadow'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <span>Tất cả</span>
            <span className="text-[10px] opacity-75 font-mono">({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('urgent')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'urgent'
                ? 'bg-rose-500 text-white shadow shadow-rose-500/30'
                : 'text-rose-300 hover:bg-rose-500/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Khẩn cấp (≤3d)</span>
            <span className="text-[10px] opacity-75 font-mono">({urgentCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('week')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'week'
                ? 'bg-amber-400 text-black shadow'
                : 'text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Tuần này (4-7d)</span>
            <span className="text-[10px] opacity-75 font-mono">({weekCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('future')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'future'
                ? 'bg-cyan-500 text-black shadow'
                : 'text-cyan-300 hover:bg-cyan-500/10'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Xa hơn (&gt;7d)</span>
            <span className="text-[10px] opacity-75 font-mono">({summary.future || 0})</span>
          </button>
        </div>

        {/* Timeline List Content */}
        <div className="flex-1 overflow-y-auto space-y-2.5 my-3 pr-1 text-xs">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-white/50">
              <div className="w-6 h-6 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
              <span>Đang tải lịch deadline...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-white/50 bg-white/5 rounded-2xl border border-white/10 p-6">
              <div className="text-3xl mb-2">🎉</div>
              <div className="font-bold text-sm text-white mb-1">Không có deadline nào trong mục này!</div>
              <div className="text-xs text-white/60">
                Bạn đã xử lý gọn gàng các hạn chót hoặc chưa đặt ngày hoàn thành cho mục tiêu nào.
              </div>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isOverdue = item.days_left < 0
              const isToday = item.days_left === 0
              const isUrgent = item.days_left > 0 && item.days_left <= 3

              let badgeBg = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
              let badgeText = `Còn ${item.days_left} ngày`
              let cardBorder = 'border-white/10'

              if (isOverdue) {
                badgeBg = 'bg-rose-500/25 text-rose-300 border-rose-500/40 animate-pulse'
                badgeText = `Quá hạn ${Math.abs(item.days_left)} ngày`
                cardBorder = 'border-rose-500/50 bg-rose-950/20'
              } else if (isToday) {
                badgeBg = 'bg-amber-500/25 text-amber-300 border-amber-500/40 animate-pulse'
                badgeText = 'HÔM NAY HẾT HẠN!'
                cardBorder = 'border-amber-500/50 bg-amber-950/20'
              } else if (isUrgent) {
                badgeBg = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                badgeText = `Còn ${item.days_left} ngày`
                cardBorder = 'border-yellow-500/30'
              }

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`p-3.5 rounded-2xl bg-white/5 border transition hover:border-amber-400/40 flex flex-col gap-2.5 ${cardBorder}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5 border"
                        style={{
                          backgroundColor: `${item.color}25`,
                          borderColor: `${item.color}50`,
                        }}
                      >
                        {item.type === 'goal' ? <Target className="w-4 h-4 text-rose-400" /> : <LayoutGrid className="w-4 h-4 text-amber-400" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white truncate max-w-full">
                            {item.title}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/70">
                            {item.category}
                          </span>
                        </div>

                        <div className="text-[11px] text-white/50 mt-0.5 flex items-center gap-2">
                          <span>Hạn chót: <strong>{formatSafeDate(item.date, 'dd/MM/yyyy')}</strong></span>
                          {item.type === 'goal' && item.target_hours > 0 && (
                            <span>• Đã học: <strong>{item.current_hours}/{item.target_hours}h</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Countdown Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border whitespace-nowrap shadow-sm ${badgeBg}`}
                    >
                      {badgeText}
                    </span>
                  </div>

                  {/* Progress Bar for Goals */}
                  {item.type === 'goal' && item.target_hours > 0 && (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-300"
                          style={{ width: `${item.progress_percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-white/40">
                        <span>Tiến độ mục tiêu</span>
                        <span>{item.progress_percent}%</span>
                      </div>
                    </div>
                  )}

                  {/* Action Quick Launch */}
                  {item.type === 'goal' && onStartPomodoro && (
                    <div className="pt-2 border-t border-white/10 flex items-center justify-end">
                      <button
                        onClick={() => {
                          onStartPomodoro(item.id)
                          onClose()
                          toast.success(`Đã kích hoạt mục tiêu "${item.title}"! Bắt đầu tập trung nào!`)
                        }}
                        className="px-3 py-1 bg-amber-400/20 hover:bg-amber-400 hover:text-black text-amber-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Bắt đầu Pomodoro</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 flex-shrink-0 text-xs">
          <span className="text-white/50 text-[11px] hidden sm:inline">
            💡 Mẹo: Nhận thông báo nhắc nhở deadline mỗi sáng qua bot Telegram!
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-white/15 hover:bg-white/25 text-white rounded-xl transition ml-auto"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
