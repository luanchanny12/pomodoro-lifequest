import React, { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DeadlineItem } from '@/utils/deadlineUtils'
import { groupDeadlinesByDate } from '@/utils/deadlineUtils'

interface DeadlineMonthCalendarProps {
  currentDate: Date
  selectedDate: string // YYYY-MM-DD
  items: DeadlineItem[]
  todayYmd: string // YYYY-MM-DD
  onSelectDate: (ymd: string) => void
  onMonthChange: (newDate: Date) => void
}

interface CalendarCell {
  date: Date
  ymd: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  items: DeadlineItem[]
}

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'Cn']

export const DeadlineMonthCalendar: React.FC<DeadlineMonthCalendarProps> = ({
  currentDate,
  selectedDate,
  items,
  todayYmd,
  onSelectDate,
  onMonthChange,
}) => {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() // 0-indexed

  const grouped = useMemo(() => groupDeadlinesByDate(items), [items])

  const calendarGrid = useMemo<CalendarCell[]>(() => {
    // 1st day of month
    const firstDay = new Date(year, month, 1)
    // Day of week: Sunday=0, Monday=1... -> convert so Monday=0, Sunday=6
    const firstDayIndex = (firstDay.getDay() + 6) % 7

    // Last day of month
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    // Days in previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate()

    const cells: CalendarCell[] = []

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i
      const dateObj = new Date(year, month - 1, d)
      const ymd = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({
        date: dateObj,
        ymd,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: ymd === todayYmd,
        isSelected: ymd === selectedDate,
        items: grouped[ymd] || [],
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d)
      const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({
        date: dateObj,
        ymd,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: ymd === todayYmd,
        isSelected: ymd === selectedDate,
        items: grouped[ymd] || [],
      })
    }

    // Next month filler days (fill to 35 or 42 cells)
    const remaining = (7 - (cells.length % 7)) % 7
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d)
      const ymd = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({
        date: dateObj,
        ymd,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: ymd === todayYmd,
        isSelected: ymd === selectedDate,
        items: grouped[ymd] || [],
      })
    }

    return cells
  }, [year, month, todayYmd, selectedDate, grouped])

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1))
  }

  const monthLabel = `Tháng ${month + 1}-${year}`

  return (
    <div className="w-full rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md overflow-hidden flex flex-col">
      {/* Month Header - Phenikaa portal style: Blue bar with month name & arrows */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 text-white font-bold select-none">
        <span className="text-sm tracking-wide font-extrabold">{monthLabel}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Tháng trước"
            className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Tháng sau"
            className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers: T2, T3, T4, T5, T6, T7, Cn */}
      <div className="grid grid-cols-7 border-b border-slate-800 text-center py-2 bg-slate-800/40 text-[11px] font-semibold text-slate-400">
        {DAY_NAMES.map((name) => (
          <div key={name} className="truncate">
            {name}
          </div>
        ))}
      </div>

      {/* Date cells grid */}
      <div className="grid grid-cols-7 gap-y-1 p-2">
        {calendarGrid.map((cell) => {
          const hasExam = cell.items.some(
            (i) =>
              i.category?.toLowerCase().includes('thi') ||
              i.title?.toLowerCase().includes('thi') ||
              i.category?.toLowerCase().includes('lịch')
          )
          const hasTask = cell.items.some((i) => i.type === 'task')
          const hasUrgent = cell.items.some((i) => i.urgency === 'urgent' || i.urgency === 'overdue')

          return (
            <button
              key={cell.ymd}
              type="button"
              onClick={() => onSelectDate(cell.ymd)}
              className={`relative flex flex-col items-center justify-center h-10 rounded-xl transition-all cursor-pointer ${
                cell.isSelected
                  ? 'bg-sky-500/25 ring-2 ring-sky-400'
                  : 'hover:bg-slate-800/70'
              }`}
            >
              {/* Day Number / Today Orange Circle (Phenikaa portal style) */}
              <span
                className={`flex items-center justify-center text-xs font-semibold w-6 h-6 rounded-full transition-transform ${
                  cell.isToday
                    ? 'bg-[#f26522] text-white font-bold shadow-sm shadow-orange-500/40'
                    : cell.isCurrentMonth
                    ? cell.isSelected
                      ? 'text-sky-300 font-bold'
                      : 'text-slate-200'
                    : 'text-slate-500'
                }`}
              >
                {cell.dayNumber}
              </span>

              {/* Event indicator dots */}
              {cell.items.length > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {hasExam ? (
                    <span
                      title="Có lịch thi / lịch học"
                      className="w-1.5 h-1.5 rounded-full bg-sky-400"
                    />
                  ) : hasUrgent ? (
                    <span
                      title="Có deadline gấp"
                      className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"
                    />
                  ) : (
                    <span
                      title="Có hạn chót"
                      className="w-1.5 h-1.5 rounded-full bg-amber-400"
                    />
                  )}

                  {hasTask && !hasExam && (
                    <span
                      title="Có việc Ô 1"
                      className="w-1 h-1 rounded-full bg-emerald-400"
                    />
                  )}

                  {cell.items.length > 2 && (
                    <span className="text-[9px] font-bold text-slate-400 leading-none">
                      +{cell.items.length - 1}
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend footer */}
      <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#f26522]" /> Hôm nay
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> Lịch thi / Học
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Hạn chót
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Việc Ô 1
          </span>
        </div>
        <span className="text-[10px] text-slate-500">Chỉ hiển thị Ô 1</span>
      </div>
    </div>
  )
}
