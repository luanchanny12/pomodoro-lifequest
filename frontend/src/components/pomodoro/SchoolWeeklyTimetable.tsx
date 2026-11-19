import React, { useMemo, useState, startTransition } from 'react'
import {
  AlertCircle,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  GraduationCap,
  MapPin,
  Play,
  Plus,
  Sparkles,
  User,
} from 'lucide-react'
import type { DeadlineItem } from '@/utils/deadlineUtils'

export type TimetableSession = 'morning' | 'afternoon' | 'evening' | 'allday'

export interface SchoolWeeklyTimetableProps {
  items: DeadlineItem[]
  todayYmd: string
  onStartPomodoro?: (goalId: number) => void
  onComplete?: (item: DeadlineItem) => Promise<void> | void
  onReschedule?: (item: DeadlineItem, newDate: string) => Promise<void> | void
  onOpenQuickAdd?: (dateYmd: string) => void
  busyKey?: string | null
}

export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `Tuần từ ${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} đến ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}/${sunday.getFullYear()}`
}

export function classifyItemSession(item: DeadlineItem): TimetableSession {
  let timeStr = item.time_range || ''
  if (!timeStr && item.notes) {
    const match = item.notes.match(/(?:Giờ học|Thời gian|Khung giờ):\s*(\d{1,2}:\d{2})/i)
    if (match) timeStr = match[1]
  }
  if (!timeStr && item.title) {
    const match = item.title.match(/(\d{1,2}:\d{2})/i)
    if (match) timeStr = match[1]
  }

  if (timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})/)
    if (match) {
      const hour = parseInt(match[1], 10)
      const minute = parseInt(match[2], 10)
      const totalMin = hour * 60 + minute
      // Sáng: Trước 12:35
      if (totalMin < 12 * 60 + 35) {
        return 'morning'
      }
      // Chiều: Từ 12:35 đến trước 18:00
      if (totalMin < 18 * 60) {
        return 'afternoon'
      }
      // Tối: Từ 18:00 trở đi
      return 'evening'
    }
  }

  if (item.type === 'school_class') {
    return 'morning'
  }
  return 'allday'
}

const SchoolWeeklyTimetableComponent: React.FC<SchoolWeeklyTimetableProps> = ({
  items,
  todayYmd,
  onStartPomodoro,
  onComplete,
  onOpenQuickAdd,
  busyKey,
}) => {
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => {
    const now = new Date()
    return getMondayOfWeek(now)
  })

  // 7 days of current week
  const weekDays = useMemo(() => {
    const days = []
    const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']
    const pad = (n: number) => String(n).padStart(2, '0')
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekMonday)
      d.setDate(currentWeekMonday.getDate() + i)
      const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      days.push({
        dayIndex: i,
        label: dayLabels[i],
        date: d,
        ymd,
        displayDate: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
        isToday: ymd === todayYmd,
      })
    }
    return days
  }, [currentWeekMonday, todayYmd])

  // Items mapped by YMD
  const itemsByYmd = useMemo(() => {
    const map = new Map<string, DeadlineItem[]>()
    items.forEach((item) => {
      const ymd = item.date?.slice(0, 10)
      if (ymd) {
        const list = map.get(ymd) || []
        list.push(item)
        map.set(ymd, list)
      }
    })
    return map
  }, [items])

  const handlePrevWeek = () => {
    startTransition(() => {
      setCurrentWeekMonday((prev) => {
        const d = new Date(prev)
        d.setDate(d.getDate() - 7)
        return d
      })
    })
  }

  const handleNextWeek = () => {
    startTransition(() => {
      setCurrentWeekMonday((prev) => {
        const d = new Date(prev)
        d.setDate(d.getDate() + 7)
        return d
      })
    })
  }

  const handleCurrentWeek = () => {
    startTransition(() => {
      setCurrentWeekMonday(getMondayOfWeek(new Date()))
    })
  }

  // Count items this week
  const weekItemCount = useMemo(() => {
    let count = 0
    weekDays.forEach((d) => {
      count += (itemsByYmd.get(d.ymd) || []).length
    })
    return count
  }, [weekDays, itemsByYmd])

  // Helper render item card
  const renderItemCard = (item: DeadlineItem) => {
    const isBusy = busyKey === `${item.type}-${item.id}`
    const isSchool = item.type === 'school_class'
    const isGig = item.type === 'gig_shift'
    const isUrgent = item.urgency === 'overdue' || item.urgency === 'today'

    // Extract lecturer & room if notes present
    let lecturer = ''
    let room = item.room || ''
    if (item.notes) {
      const lecMatch = item.notes.match(/GV:\s*([^|]+)/i)
      if (lecMatch) lecturer = lecMatch[1].trim()
      if (!room) {
        const roomMatch = item.notes.match(/Phòng:\s*([^|]+)/i)
        if (roomMatch) room = roomMatch[1].trim()
      }
    }

    if (isSchool) {
      return (
        <div
          key={`${item.type}-${item.id}`}
          className="group relative rounded-xl border border-blue-500/40 bg-gradient-to-br from-blue-950/80 via-slate-900/90 to-indigo-950/70 p-2.5 shadow-md hover:border-blue-400 hover:shadow-blue-500/10 transition-all text-xs"
        >
          {/* Header Tag: Room + Time */}
          <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px]">
              <Clock className="w-3 h-3 text-blue-400 shrink-0" />
              <span>{item.time_range || 'Tiết học'}</span>
            </span>
            {room && (
              <span className="inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                <MapPin className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span className="truncate max-w-[100px]">{room}</span>
              </span>
            )}
          </div>

          {/* Subject Name */}
          <div className="font-bold text-white text-[12px] leading-snug line-clamp-2 group-hover:text-sky-300 transition-colors">
            {item.title.replace(/^📚\s*/, '')}
          </div>

          {/* Lecturer / Campus Tag */}
          <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            {lecturer ? (
              <span className="inline-flex items-center gap-1 truncate text-slate-300">
                <User className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                <span className="truncate">{lecturer}</span>
              </span>
            ) : (
              <span className="text-slate-400">Phenikaa Uni</span>
            )}
            <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">Cổng ĐT</span>
          </div>
        </div>
      )
    }

    if (isGig) {
      return (
        <div
          key={`${item.type}-${item.id}`}
          className="group relative rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/70 via-slate-900/90 to-teal-950/70 p-2.5 shadow-md hover:border-emerald-400 transition-all text-xs"
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{item.time_range || '10:00 - 14:00'}</span>
            </span>
            <span className="text-[10px] font-semibold text-emerald-400">🛵 Ca Kiếm Tiền</span>
          </div>
          <div className="font-bold text-emerald-200 text-[11px] leading-tight">
            {item.title.replace(/^🛵\s*/, '')}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
            Nạp hũ Tết • Về nhà 15:00 tập trung học
          </p>
        </div>
      )
    }

    // Task / Goal (Ô 1 & Deadline)
    return (
      <div
        key={`${item.type}-${item.id}`}
        className={`group relative rounded-xl border p-2 shadow-sm transition-all text-xs ${
          isUrgent
            ? 'border-rose-500/60 bg-gradient-to-br from-rose-950/60 via-slate-900 to-amber-950/40 hover:border-rose-400'
            : 'border-amber-500/40 bg-slate-900/90 hover:border-amber-400'
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span
            className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md text-[10px] ${
              isUrgent
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/35'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/35'
            }`}
          >
            {isUrgent ? (
              <Flame className="w-2.5 h-2.5 text-rose-400 animate-pulse" />
            ) : (
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            )}
            <span>{isUrgent ? 'Khẩn cấp Ô 1' : 'Deadline'}</span>
          </span>

          {item.type === 'goal' && onStartPomodoro && (
            <button
              type="button"
              onClick={() => onStartPomodoro(Number(item.id))}
              title="Vào Pomodoro tập trung học mục tiêu này"
              className="p-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors"
            >
              <Play className="w-2.5 h-2.5" />
            </button>
          )}

          {item.type === 'task' && onComplete && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onComplete(item)}
              title="Đánh dấu hoàn thành việc này"
              className="p-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        <div className="font-semibold text-slate-100 text-[11px] leading-tight line-clamp-2">
          {item.title}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Xem tuần trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCurrentWeek}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Xem tuần sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-2 text-xs sm:text-sm font-bold text-white tracking-wide">
            {formatWeekRange(currentWeekMonday)}
          </span>
        </div>

        {/* Legend / Status */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            <span className="text-slate-300 font-medium">Môn học Phenikaa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-300 font-medium">Ca kiếm tiền</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span className="text-slate-300 font-medium">Việc Ô 1 / Thi cử</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px]">
            {weekItemCount} sự kiện tuần này
          </span>
        </div>
      </div>

      {/* Main Timetable Matrix: Scrollable container on mobile */}
      <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-950/60 shadow-xl pb-2">
        <table className="w-full min-w-[850px] border-collapse text-left">
          {/* Header 7 Days */}
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/90">
              <th className="w-28 p-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center border-r border-slate-800/80">
                Khung Giờ
              </th>
              {weekDays.map((d) => (
                <th
                  key={d.ymd}
                  className={`p-2.5 text-center border-r border-slate-800/80 last:border-r-0 transition-colors ${
                    d.isToday ? 'bg-orange-500/10' : ''
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={`text-xs font-bold ${
                        d.isToday ? 'text-orange-400' : 'text-slate-300'
                      }`}
                    >
                      {d.label}
                    </span>
                    <span
                      className={`text-[11px] font-semibold mt-0.5 px-2 py-0.5 rounded-full ${
                        d.isToday
                          ? 'bg-orange-500 text-slate-950 font-extrabold shadow-sm shadow-orange-500/30'
                          : 'text-slate-400'
                      }`}
                    >
                      {d.displayDate}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── ROW 1: BUỔI SÁNG (06:45 - 12:30) ── */}
            <tr className="border-b border-slate-800/80 hover:bg-slate-900/30 transition-colors">
              <td className="p-3 align-top border-r border-slate-800/80 bg-slate-900/50">
                <div className="flex flex-col items-center text-center space-y-1">
                  <span className="text-base">🌅</span>
                  <span className="text-xs font-extrabold text-amber-300">Buổi Sáng</span>
                  <span className="text-[10px] text-slate-400 font-mono">06:45 - 12:30</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Tiết 1 - 6
                  </span>
                </div>
              </td>
              {weekDays.map((d) => {
                const dayItems = itemsByYmd.get(d.ymd) || []
                const morningItems = dayItems.filter(
                  (it) => classifyItemSession(it) === 'morning'
                )
                return (
                  <td
                    key={`morning-${d.ymd}`}
                    className={`p-2 align-top border-r border-slate-800/80 last:border-r-0 h-36 ${
                      d.isToday ? 'bg-orange-500/[0.04]' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      {morningItems.map(renderItemCard)}
                      {morningItems.length === 0 && (
                        <div className="h-28 flex flex-col items-center justify-center text-[11px] text-slate-600/70 border border-dashed border-slate-800/60 rounded-xl">
                          <span>Trống</span>
                          {onOpenQuickAdd && (
                            <button
                              type="button"
                              onClick={() => onOpenQuickAdd(d.ymd)}
                              className="mt-1 text-[10px] text-slate-500 hover:text-amber-300 cursor-pointer"
                            >
                              + Thêm
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>

            {/* ── ROW 2: BUỔI CHIỀU (12:45 - 18:15) ── */}
            <tr className="border-b border-slate-800/80 hover:bg-slate-900/30 transition-colors">
              <td className="p-3 align-top border-r border-slate-800/80 bg-slate-900/50">
                <div className="flex flex-col items-center text-center space-y-1">
                  <span className="text-base">☀️</span>
                  <span className="text-xs font-extrabold text-sky-300">Buổi Chiều</span>
                  <span className="text-[10px] text-slate-400 font-mono">12:45 - 18:15</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Tiết 7 - 12
                  </span>
                </div>
              </td>
              {weekDays.map((d) => {
                const dayItems = itemsByYmd.get(d.ymd) || []
                const afternoonItems = dayItems.filter(
                  (it) => classifyItemSession(it) === 'afternoon'
                )
                return (
                  <td
                    key={`afternoon-${d.ymd}`}
                    className={`p-2 align-top border-r border-slate-800/80 last:border-r-0 h-36 ${
                      d.isToday ? 'bg-orange-500/[0.04]' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      {afternoonItems.map(renderItemCard)}
                      {afternoonItems.length === 0 && (
                        <div className="h-28 flex flex-col items-center justify-center text-[11px] text-slate-600/70 border border-dashed border-slate-800/60 rounded-xl">
                          <span>Trống</span>
                          {onOpenQuickAdd && (
                            <button
                              type="button"
                              onClick={() => onOpenQuickAdd(d.ymd)}
                              className="mt-1 text-[10px] text-slate-500 hover:text-amber-300 cursor-pointer"
                            >
                              + Thêm
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>

            {/* ── ROW 3: BUỔI TỐI (18:15 - 21:00) ── */}
            <tr className="border-b border-slate-800/80 hover:bg-slate-900/30 transition-colors">
              <td className="p-3 align-top border-r border-slate-800/80 bg-slate-900/50">
                <div className="flex flex-col items-center text-center space-y-1">
                  <span className="text-base">🌙</span>
                  <span className="text-xs font-extrabold text-indigo-300">Buổi Tối</span>
                  <span className="text-[10px] text-slate-400 font-mono">18:15 - 21:00</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Tiết 13 - 16
                  </span>
                </div>
              </td>
              {weekDays.map((d) => {
                const dayItems = itemsByYmd.get(d.ymd) || []
                const eveningItems = dayItems.filter(
                  (it) => classifyItemSession(it) === 'evening'
                )
                return (
                  <td
                    key={`evening-${d.ymd}`}
                    className={`p-2 align-top border-r border-slate-800/80 last:border-r-0 h-28 ${
                      d.isToday ? 'bg-orange-500/[0.04]' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      {eveningItems.map(renderItemCard)}
                      {eveningItems.length === 0 && (
                        <div className="h-20 flex flex-col items-center justify-center text-[11px] text-slate-600/70 border border-dashed border-slate-800/60 rounded-xl">
                          <span>Trống</span>
                          {onOpenQuickAdd && (
                            <button
                              type="button"
                              onClick={() => onOpenQuickAdd(d.ymd)}
                              className="mt-1 text-[10px] text-slate-500 hover:text-amber-300 cursor-pointer"
                            >
                              + Thêm
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>

            {/* ── ROW 4: VIỆC Ô 1 & HẠN CHÓT TRONG NGÀY (NẾU CÓ) ── */}
            <tr className="hover:bg-slate-900/30 transition-colors bg-slate-950/40">
              <td className="p-3 align-top border-r border-slate-800/80 bg-slate-900/60">
                <div className="flex flex-col items-center text-center space-y-1">
                  <span className="text-base">🎯</span>
                  <span className="text-xs font-extrabold text-rose-300">Việc Cần Làm</span>
                  <span className="text-[9px] text-slate-400">Ma trận Ô 1 / Deadline</span>
                </div>
              </td>
              {weekDays.map((d) => {
                const dayItems = itemsByYmd.get(d.ymd) || []
                const allDayItems = dayItems.filter(
                  (it) => classifyItemSession(it) === 'allday'
                )
                return (
                  <td
                    key={`allday-${d.ymd}`}
                    className={`p-2 align-top border-r border-slate-800/80 last:border-r-0 min-h-20 ${
                      d.isToday ? 'bg-orange-500/[0.04]' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      {allDayItems.map(renderItemCard)}
                      {allDayItems.length === 0 && (
                        <div className="h-14 flex items-center justify-center text-[10px] text-slate-600">
                          Không có việc Ô 1
                        </div>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const SchoolWeeklyTimetable = React.memo(SchoolWeeklyTimetableComponent)
