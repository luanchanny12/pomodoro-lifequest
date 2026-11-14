import React from 'react'
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  MapPin,
  Play,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react'
import type { DeadlineItem } from '@/utils/deadlineUtils'
import { parseScheduleDetails } from '@/utils/deadlineUtils'
import { formatSafeDate, parseSafeDate } from '@/utils/dateUtils'

interface ScheduleDayDetailCardProps {
  selectedDate: string // YYYY-MM-DD
  todayYmd: string // YYYY-MM-DD
  items: DeadlineItem[]
  busyKey: string | null
  onComplete: (item: DeadlineItem) => Promise<void> | void
  onReschedule?: (item: DeadlineItem, newDate: string) => Promise<void> | void
  onStartPomodoro?: (goalId: number) => void
  onOpenQuickAdd: (dateStr: string) => void
  onTriggerTelegram?: (dateStr: string) => void
  sendingTelegram?: boolean
}

export const ScheduleDayDetailCard: React.FC<ScheduleDayDetailCardProps> = ({
  selectedDate,
  todayYmd,
  items,
  busyKey,
  onComplete,
  onStartPomodoro,
  onOpenQuickAdd,
  onTriggerTelegram,
  sendingTelegram = false,
}) => {
  const isToday = selectedDate === todayYmd
  const parsed = parseSafeDate(selectedDate)

  // Format date display
  const dateFormatted = parsed ? formatSafeDate(parsed, 'dd/MM/yyyy') : selectedDate
  const dayOfWeekName = parsed
    ? ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][parsed.getDay()]
    : 'Ngày'

  const exams = items.filter(
    (i) =>
      i.category?.toLowerCase().includes('thi') ||
      i.title?.toLowerCase().includes('thi') ||
      i.category?.toLowerCase().includes('lịch')
  )
  const otherGoals = items.filter((i) => i.type === 'goal' && !exams.includes(i))
  const matrixTasks = items.filter((i) => i.type === 'task')

  return (
    <div className="w-full rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md p-3.5 sm:p-4 flex flex-col justify-between">
      {/* Top Header of Selected Day */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
              <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                {dayOfWeekName}, {dateFormatted}
              </span>
            </h4>
            {isToday && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f26522] text-white shadow-sm shrink-0">
                Hôm nay
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {items.length === 0
              ? 'Chưa có lịch nào trong ngày này'
              : `Có ${items.length} mục cần chú ý (Lịch thi & Việc Ô 1)`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenQuickAdd(selectedDate)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm việc</span>
          </button>

          {onTriggerTelegram && (
            <button
              type="button"
              disabled={sendingTelegram || items.length === 0}
              onClick={() => onTriggerTelegram(selectedDate)}
              title="Gửi danh sách ngày này sang Telegram"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{sendingTelegram ? 'Đang gửi...' : 'Nhắc Telegram'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Schedule List: STRICT FIXED HEIGHT to prevent lengthening page */}
      <div className="mt-3 max-h-[290px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
            <div className="p-3 rounded-full bg-slate-800 text-slate-400">
              <Calendar className="w-6 h-6 text-slate-500" />
            </div>
            <p className="font-medium text-slate-300">
              Không có deadline hay lịch học/thi nào trong ngày này.
            </p>
            <button
              type="button"
              onClick={() => onOpenQuickAdd(selectedDate)}
              className="mt-1 text-xs text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
            >
              + Bấm vào đây để thêm lịch hoặc việc Ô 1 cho ngày này
            </button>
          </div>
        ) : (
          <>
            {/* 1. School Exams & Classes (Phenikaa portal card style) */}
            {exams.map((item) => {
              const details = parseScheduleDetails(item.notes)
              const isBusy = busyKey === `${item.type}-${item.id}`

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="rounded-xl overflow-hidden border border-sky-500/40 bg-slate-900 shadow-sm"
                >
                  {/* Dark Blue Header Bar */}
                  <div className="bg-[#1e3a8a] text-white px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h5 className="font-bold text-xs sm:text-sm tracking-wide truncate">
                        {item.title}
                      </h5>
                      {details.timeRange && (
                        <div className="text-[11px] text-sky-200 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{details.timeRange}</span>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-950/70 border border-sky-400/40 text-sky-300 shrink-0">
                      {item.category || 'Lịch thi'}
                    </span>
                  </div>

                  {/* White / Light details box */}
                  <div className="bg-slate-800/80 p-2.5 sm:p-3 text-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      {details.format && (
                        <div className="text-slate-300 font-medium">
                          📝 {details.format}
                        </div>
                      )}
                      {details.room && (
                        <div className="text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span>{details.room}</span>
                        </div>
                      )}
                      {!details.format && !details.room && details.cleanNotes && (
                        <div className="text-slate-400 line-clamp-2">
                          {details.cleanNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onStartPomodoro && (
                        <button
                          type="button"
                          onClick={() => onStartPomodoro(item.id)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Ôn ngay
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onComplete(item)}
                        className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        {isBusy ? '...' : 'Xong'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* 2. Other Study Goals / Deadlines */}
            {otherGoals.map((item) => {
              const isBusy = busyKey === `${item.type}-${item.id}`
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="rounded-xl border border-amber-500/40 bg-slate-800/60 p-2.5 sm:p-3 flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        🎯 Deadline
                      </span>
                      <h5 className="font-bold text-white text-xs truncate">
                        {item.title}
                      </h5>
                    </div>

                    {item.target_hours > 0 && (
                      <div className="flex items-center gap-2 max-w-xs text-[11px] text-slate-400">
                        <span>
                          {item.current_hours}h / {item.target_hours}h
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${item.progress_percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onStartPomodoro && (
                      <button
                        type="button"
                        onClick={() => onStartPomodoro(item.id)}
                        className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
                        title="Bắt đầu Pomodoro"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onComplete(item)}
                      className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium cursor-pointer"
                    >
                      {isBusy ? '...' : 'Xong'}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* 3. Quadrant 1 Matrix Tasks (Làm ngay: Khẩn cấp & Quan trọng) */}
            {matrixTasks.map((item) => {
              const isBusy = busyKey === `${item.type}-${item.id}`
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="rounded-xl border border-emerald-500/40 bg-slate-800/60 p-2.5 flex items-center justify-between gap-2.5"
                >
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onComplete(item)}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
                  >
                    <Circle className="w-4 h-4 text-emerald-400 group-hover:scale-110 shrink-0 transition-transform" />
                    <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-300">
                      {item.title}
                    </span>
                  </button>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    🔥 Ô 1 Làm ngay
                  </span>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
