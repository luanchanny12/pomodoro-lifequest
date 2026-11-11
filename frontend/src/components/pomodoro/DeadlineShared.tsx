import React, { useState } from 'react'
import {
  Calendar,
  CalendarClock,
  Check,
  Clock,
  Flame,
  Play,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { focusService } from '@/services/focusService'
import { notificationService } from '@/services/notificationService'
import { formatSafeDate } from '@/utils/dateUtils'
import {
  getLocalTodayYmd,
  type DeadlineItem,
  type DeadlineUrgency,
} from '@/utils/deadlineUtils'

export type DeadlineFilterTab = 'all' | 'urgent' | 'week' | 'future'

export function filterDeadlinesByTab(
  items: DeadlineItem[],
  tab: DeadlineFilterTab
): DeadlineItem[] {
  return items.filter((item) => {
    if (tab === 'urgent') return item.days_left <= 3
    if (tab === 'week') return item.days_left <= 7
    if (tab === 'future') return item.days_left > 7
    return true
  })
}

export function getUrgencyMeta(urgency: DeadlineUrgency, daysLeft: number) {
  let badgeText = `Còn ${daysLeft} ngày`
  if (daysLeft < 0) {
    badgeText = `Quá hạn ${Math.abs(daysLeft)} ngày`
  } else if (daysLeft === 0) {
    badgeText = 'HÔM NAY HẾT HẠN!'
  }

  switch (urgency) {
    case 'overdue':
      return {
        badgeText,
        containerClass:
          'border-rose-500/70 bg-rose-950/35 hover:border-rose-400/90 shadow-[0_0_16px_rgba(244,63,94,0.16)]',
        badgeClass:
          'bg-rose-500 text-white border border-rose-400/80 shadow-sm shadow-rose-500/30 animate-pulse',
        accentBarClass: 'bg-rose-500',
        isHot: true,
      }
    case 'today':
      return {
        badgeText,
        containerClass:
          'border-orange-500/75 bg-orange-950/35 hover:border-orange-400 shadow-[0_0_16px_rgba(249,115,22,0.16)]',
        badgeClass:
          'bg-orange-500 text-white border border-orange-300/70 shadow-sm shadow-orange-500/30',
        accentBarClass: 'bg-orange-500',
        isHot: true,
      }
    case 'urgent':
      return {
        badgeText,
        containerClass:
          'border-amber-500/60 bg-amber-950/25 hover:border-amber-400/80',
        badgeClass:
          'bg-amber-500/20 text-amber-300 border border-amber-500/45',
        accentBarClass: 'bg-amber-400',
        isHot: false,
      }
    case 'soon':
      return {
        badgeText,
        containerClass:
          'border-emerald-500/45 bg-emerald-950/20 hover:border-emerald-400/70',
        badgeClass:
          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
        accentBarClass: 'bg-emerald-400',
        isHot: false,
      }
    default:
      return {
        badgeText,
        containerClass:
          'border-indigo-500/35 bg-slate-900/65 hover:border-indigo-400/60',
        badgeClass:
          'bg-indigo-500/20 text-indigo-300 border border-indigo-500/35',
        accentBarClass: 'bg-indigo-400',
        isHot: false,
      }
  }
}

export async function completeDeadlineItem(item: DeadlineItem): Promise<void> {
  if (item.type === 'goal') {
    await focusService.updateGoal(item.id, { is_completed: true })
    toast.success(`🎉 Đã hoàn thành deadline "${item.title}"!`)
    return
  }

  if (item.days_left < 0) {
    // Backend disallows toggling unrolled past matrix tasks directly; move to today first
    await focusService.updateMatrixTask(item.id, { date: getLocalTodayYmd() })
  }
  await focusService.toggleMatrixTask(item.id)
  toast.success(`✔ Đã đánh dấu xong "${item.title}"!`)
}

export async function rescheduleDeadlineItem(
  item: DeadlineItem,
  newDate: string
): Promise<void> {
  if (!newDate) return
  if (item.type === 'goal') {
    await focusService.updateGoal(item.id, { target_date: newDate })
  } else {
    await focusService.updateMatrixTask(item.id, { date: newDate })
  }
  const formatted = formatSafeDate(newDate, 'dd/MM/yyyy') || newDate
  toast.success(`📅 Đã dời lịch "${item.title}" sang ${formatted}`)
}

export async function triggerTelegramDeadlineNudge(
  onOpenSettings?: () => void
): Promise<void> {
  try {
    const res = await notificationService.sendDeadlineReminder()
    toast.success(res.message || '📲 Đã gửi nhắc nhở Deadline sang Telegram!')
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Chưa thể gửi nhắc nhở Telegram'
    toast.error(msg)
    if (onOpenSettings) {
      onOpenSettings()
    }
  }
}

interface DeadlineQuickAddFormProps {
  onCreated: () => Promise<void> | void
  onCancel?: () => void
  compact?: boolean
}

export const DeadlineQuickAddForm: React.FC<DeadlineQuickAddFormProps> = ({
  onCreated,
  onCancel,
  compact = false,
}) => {
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState(getLocalTodayYmd())
  const [itemKind, setItemKind] = useState<'goal' | 'task'>('goal')
  const [targetHours, setTargetHours] = useState('2')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      toast.error('Vui lòng nhập tên deadline!')
      return
    }
    if (!targetDate) {
      toast.error('Vui lòng chọn ngày hạn chót!')
      return
    }

    try {
      setSubmitting(true)
      const parsedHours = Math.max(0.5, Math.min(500, Number(targetHours) || 2))
      if (itemKind === 'goal') {
        await focusService.createGoal({
          title: cleanTitle,
          goal_type: 'deadline',
          target_date: targetDate,
          target_hours: parsedHours,
          category: 'Deadline',
          color: '#f97316',
        })
      } else {
        await focusService.createMatrixTask({
          title: cleanTitle,
          date: targetDate,
          quadrant: 1,
        })
      }
      toast.success(`📅 Đã thêm deadline "${cleanTitle}"!`)
      setTitle('')
      await onCreated()
      if (onCancel) onCancel()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Không thể thêm deadline mới'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl border border-amber-500/35 bg-slate-900/90 ${
        compact ? 'p-3' : 'p-4'
      } space-y-3 shadow-inner`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Thêm Deadline mới
        </span>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Đóng form"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Thi cuối kỳ Giải Tích, Nộp báo cáo đồ án..."
          maxLength={120}
          className="sm:col-span-6 w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
        />

        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          aria-label="Ngày hạn chót"
          className="sm:col-span-3 w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
        />

        {itemKind === 'goal' ? (
          <div className="sm:col-span-3 flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="500"
              value={targetHours}
              onChange={(e) => setTargetHours(e.target.value)}
              aria-label="Số giờ ôn dự kiến"
              className="w-full bg-transparent text-sm text-white focus:outline-none"
            />
            <span className="text-xs text-slate-400 shrink-0">giờ</span>
          </div>
        ) : (
          <div className="sm:col-span-3 flex items-center px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-medium">
            ⚡ Ma trận Ô 1
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setItemKind('goal')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              itemKind === 'goal'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            🎯 Mục tiêu lớn / Kỳ thi
          </button>
          <button
            type="button"
            onClick={() => setItemKind('task')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              itemKind === 'task'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            ⚡ Việc Ô 1 hôm nay
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {submitting ? 'Đang lưu...' : 'Lưu Deadline'}
        </button>
      </div>
    </form>
  )
}

interface DeadlineItemRowProps {
  item: DeadlineItem
  busyKey: string | null
  onComplete: (item: DeadlineItem) => Promise<void> | void
  onReschedule: (item: DeadlineItem, newDate: string) => Promise<void> | void
  onStartPomodoro?: (goalId: number) => void
  compact?: boolean
}

export const DeadlineItemRow: React.FC<DeadlineItemRowProps> = ({
  item,
  busyKey,
  onComplete,
  onReschedule,
  onStartPomodoro,
  compact = false,
}) => {
  const [editingDate, setEditingDate] = useState(false)
  const [draftDate, setDraftDate] = useState(item.date || getLocalTodayYmd())

  const itemKey = `${item.type}-${item.id}`
  const isBusy = busyKey === itemKey
  const meta = getUrgencyMeta(item.urgency, item.days_left)
  const formattedDate = formatSafeDate(item.date, 'dd/MM/yyyy') || item.date

  const handleSaveDate = async () => {
    if (!draftDate || draftDate === item.date) {
      setEditingDate(false)
      return
    }
    await onReschedule(item, draftDate)
    setEditingDate(false)
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border ${meta.containerClass} ${
        compact ? 'p-3' : 'p-4'
      } transition-all`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${meta.accentBarClass}`}
        aria-hidden="true"
      />

      <div className="pl-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${meta.badgeClass}`}
            >
              {meta.isHot ? (
                <Flame className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              <span>{meta.badgeText}</span>
            </span>

            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700/80">
              {item.type === 'goal' ? '🎯 Mục tiêu' : '📋 Việc làm'} • {item.category}
            </span>

            <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              {formattedDate}
            </span>
          </div>

          <h4 className="font-bold text-white text-sm sm:text-base leading-snug break-words">
            {item.title}
          </h4>

          {item.type === 'goal' && item.target_hours > 0 && (
            <div className="flex items-center gap-2.5 max-w-sm">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${item.progress_percent}%`,
                    backgroundColor: item.color || '#f59e0b',
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 tabular-nums shrink-0">
                {item.current_hours}h / {item.target_hours}h ({item.progress_percent}%)
              </span>
            </div>
          )}

          {editingDate && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                aria-label={`Chọn ngày mới cho ${item.title}`}
                className="px-2.5 py-1 rounded-lg bg-slate-800 border border-amber-500/50 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={handleSaveDate}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Lưu ngày
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftDate(item.date)
                  setEditingDate(false)
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Hủy
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onComplete(item)}
            title="Đánh dấu đã hoàn thành"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Xong</span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              setDraftDate(item.date || getLocalTodayYmd())
              setEditingDate((prev) => !prev)
            }}
            title="Gia hạn hoặc đổi ngày"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
          >
            <CalendarClock className="w-3.5 h-3.5 text-sky-400" />
            <span>Đổi ngày</span>
          </button>

          {item.type === 'goal' && onStartPomodoro && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onStartPomodoro(item.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Bắt đầu Pomodoro</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export const EmptyDeadlineGuidance: React.FC<{
  onOpenQuickAdd: () => void
  isFiltered?: boolean
}> = ({ onOpenQuickAdd, isFiltered = false }) => (
  <div className="flex flex-col items-center justify-center py-6 px-4 text-center rounded-xl border border-dashed border-slate-700/80 bg-slate-900/40">
    <Sparkles className="w-8 h-8 text-amber-400/80 mb-2" />
    <p className="text-sm font-semibold text-slate-200">
      {isFiltered
        ? 'Không có deadline nào trong mục lọc này'
        : 'Bạn chưa có deadline nào sắp tới!'}
    </p>
    <p className="text-xs text-slate-400 mt-1 max-w-md">
      Thêm kỳ thi, bài tập lớn hoặc ngày nộp đồ án để web tự tô màu cảnh báo và nhắc qua Telegram hằng ngày.
    </p>
    {!isFiltered && (
      <button
        type="button"
        onClick={onOpenQuickAdd}
        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Tạo Deadline đầu tiên
      </button>
    )}
  </div>
)
