import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { focusService } from '@/services/focusService'
import type {
  DeadlineItem,
  DeadlineSummary,
  DeadlinesResponse,
} from '@/utils/deadlineUtils'
import { getLocalTodayYmd } from '@/utils/deadlineUtils'
import {
  completeDeadlineItem,
  DeadlineItemRow,
  DeadlineQuickAddForm,
  EmptyDeadlineGuidance,
  filterDeadlinesByTab,
  rescheduleDeadlineItem,
  triggerTelegramDeadlineNudge,
  type DeadlineFilterTab,
} from './DeadlineShared'
import { DeadlineMonthCalendar } from './DeadlineMonthCalendar'
import { ScheduleDayDetailCard } from './ScheduleDayDetailCard'
import { AIBreakdownModal } from './AIBreakdownModal'

export type { DeadlineItem, DeadlineSummary }

interface DeadlineCalendarModalProps {
  isOpen: boolean
  onClose: () => void
  onStartPomodoro?: (goalId: number) => void
  onDataChanged?: () => Promise<void> | void
  onOpenNotificationSettings?: () => void
  initialData?: DeadlinesResponse
}

export const DeadlineCalendarModal: React.FC<DeadlineCalendarModalProps> = ({
  isOpen,
  onClose,
  onStartPomodoro,
  onDataChanged,
  onOpenNotificationSettings,
  initialData,
}) => {
  const [data, setData] = useState<DeadlinesResponse | null>(initialData ?? null)
  const [loading, setLoading] = useState<boolean>(!initialData)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const todayYmd = useMemo(() => getLocalTodayYmd(), [])
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd)
  const [addFormDate, setAddFormDate] = useState<string>(todayYmd)

  const [activeTab, setActiveTab] = useState<DeadlineFilterTab>('all')
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [showAIBreakdownModal, setShowAIBreakdownModal] = useState<boolean>(false)
  const [recentAIBatchId, setRecentAIBatchId] = useState<string | null>(null)
  const [rollingBack, setRollingBack] = useState<boolean>(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [sendingTelegram, setSendingTelegram] = useState<boolean>(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await focusService.getDeadlines()
      setData(res)
    } catch {
      // Never surface raw 404 "Not Found" to users; keep fallback/empty list usable
      setData((prev) =>
        prev ?? {
          items: [],
          summary: {
            overdue: 0,
            today: 0,
            urgent: 0,
            soon: 0,
            future: 0,
            total_active: 0,
          },
        }
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setData(initialData)
      }
      loadData()
    }
  }, [isOpen, initialData, loadData])

  if (!isOpen) return null

  const items = data?.items ?? []
  const filteredItems = filterDeadlinesByTab(items, activeTab)
  const selectedDayItems = items.filter((item) => item.date?.slice(0, 10) === selectedDate)

  const handleAfterMutation = async () => {
    await loadData()
    if (onDataChanged) {
      await onDataChanged()
    }
  }

  const handleComplete = async (item: DeadlineItem) => {
    const key = `${item.type}-${item.id}`
    try {
      setBusyKey(key)
      await completeDeadlineItem(item)
      await handleAfterMutation()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không thể đánh dấu hoàn thành'
      toast.error(msg)
    } finally {
      setBusyKey(null)
    }
  }

  const handleReschedule = async (item: DeadlineItem, newDate: string) => {
    const key = `${item.type}-${item.id}`
    try {
      setBusyKey(key)
      await rescheduleDeadlineItem(item, newDate)
      await handleAfterMutation()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không thể cập nhật ngày deadline'
      toast.error(msg)
    } finally {
      setBusyKey(null)
    }
  }

  const handleTelegramNudge = async () => {
    try {
      setSendingTelegram(true)
      await triggerTelegramDeadlineNudge(onOpenNotificationSettings)
    } finally {
      setSendingTelegram(false)
    }
  }

  const handleUndoRecentAIBreakdown = async () => {
    if (!recentAIBatchId) return
    try {
      setRollingBack(true)
      const res = await focusService.rollbackAIBreakdown(recentAIBatchId)
      toast.success(res.message || 'Đã hoàn tác lịch do AI tạo!')
      setRecentAIBatchId(null)
      await handleAfterMutation()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể hoàn tác lịch AI'
      toast.error(msg)
    } finally {
      setRollingBack(false)
    }
  }

  const handleStartFromModal = (goalId: number) => {
    if (onStartPomodoro) {
      onStartPomodoro(goalId)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-2 bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-rose-500/20 to-amber-500/20 rounded-xl border border-rose-500/30 text-rose-400 shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                Lịch Thi & Deadline Cá Nhân
              </h2>
              <p className="text-xs text-slate-400">
                Lịch tháng trường học • Bấm ngày xem môn thi, phòng & việc Ô 1 khẩn cấp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Lịch Deadline"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary KPI Cards & Quick Actions */}
        <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800/80 space-y-3">
          {data?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
                <span className="text-xs text-rose-300 font-medium">Quá hạn</span>
                <span className="text-base font-bold text-rose-400">
                  {data.summary.overdue}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between">
                <span className="text-xs text-orange-300 font-medium">Hôm nay</span>
                <span className="text-base font-bold text-orange-400">
                  {data.summary.today}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <span className="text-xs text-amber-300 font-medium">
                  Khẩn cấp (≤3d)
                </span>
                <span className="text-base font-bold text-amber-400">
                  {data.summary.urgent}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
                <span className="text-xs text-indigo-300 font-medium">Tổng cộng</span>
                <span className="text-base font-bold text-indigo-400">
                  {data.summary.total_active}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center rounded-xl bg-slate-800 p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'calendar'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Lịch Tháng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Danh Sách</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAddFormDate(selectedDate)
                  setShowAddForm((prev) => !prev)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Đóng form' : '+ Thêm Lịch'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAIBreakdownModal(true)}
                title="Dùng AI chia nhỏ nhiệm vụ lớn ra từng ngày hoặc Import thời khóa biểu"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/25 via-purple-500/25 to-pink-500/25 hover:from-indigo-500/35 hover:to-pink-500/35 text-indigo-300 border border-indigo-500/40 font-semibold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>✨ AI Chia Nhỏ</span>
              </button>

              <button
                type="button"
                disabled={sendingTelegram}
                onClick={handleTelegramNudge}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 font-semibold text-xs transition-all disabled:opacity-60 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingTelegram ? 'Đang gửi...' : '📲 Nhắc Telegram'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Undo Banner if AI batch created recently */}
        {recentAIBatchId && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-indigo-950/70 border-b border-indigo-500/40 text-xs text-indigo-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>AI đã thêm lịch thành công!</strong> Các task mới đã xuất hiện ở Ô 1 trên lịch. Bạn có thể bấm hoàn tác nếu chưa vừa ý.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={rollingBack}
                onClick={handleUndoRecentAIBreakdown}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {rollingBack ? 'Đang hoàn tác...' : '↩️ Hoàn tác'}
              </button>
              <button
                type="button"
                onClick={() => setRecentAIBatchId(null)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Inline Add Form */}
        {showAddForm && (
          <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/30">
            <DeadlineQuickAddForm
              compact
              initialDate={addFormDate}
              onCreated={handleAfterMutation}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {/* Modal Main View: Calendar (2-columns) or List */}
        {viewMode === 'calendar' ? (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-6">
                <DeadlineMonthCalendar
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  items={items}
                  todayYmd={todayYmd}
                  onSelectDate={setSelectedDate}
                  onMonthChange={setCurrentDate}
                />
              </div>

              <div className="md:col-span-6">
                <ScheduleDayDetailCard
                  selectedDate={selectedDate}
                  todayYmd={todayYmd}
                  items={selectedDayItems}
                  busyKey={busyKey}
                  onComplete={handleComplete}
                  onReschedule={handleReschedule}
                  onStartPomodoro={onStartPomodoro ? handleStartFromModal : undefined}
                  onOpenQuickAdd={(d) => {
                    setAddFormDate(d)
                    setShowAddForm(true)
                  }}
                  onTriggerTelegram={handleTelegramNudge}
                  sendingTelegram={sendingTelegram}
                />
              </div>
            </div>
          </div>
        ) : (
          /* List Mode with Tabs */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-slate-800/80 overflow-x-auto shrink-0">
              {[
                { id: 'all', label: `Tất cả (${items.length})` },
                { id: 'urgent', label: 'Khẩn cấp (≤ 3 ngày)' },
                { id: 'week', label: 'Tuần này (≤ 7 ngày)' },
                { id: 'future', label: 'Xa hơn (> 7 ngày)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as DeadlineFilterTab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
              {loading && !data ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3" />
                  <p className="text-sm">Đang đồng bộ danh sách deadline...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <EmptyDeadlineGuidance
                  onOpenQuickAdd={() => setShowAddForm(true)}
                  isFiltered={activeTab !== 'all' && items.length > 0}
                />
              ) : (
                filteredItems.map((item) => (
                  <DeadlineItemRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    busyKey={busyKey}
                    onComplete={handleComplete}
                    onReschedule={handleReschedule}
                    onStartPomodoro={onStartPomodoro ? handleStartFromModal : undefined}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Breakdown & Import Modal */}
      <AIBreakdownModal
        isOpen={showAIBreakdownModal}
        onClose={() => setShowAIBreakdownModal(false)}
        onSuccess={async (batchId) => {
          if (batchId) {
            setRecentAIBatchId(batchId)
          }
          await handleAfterMutation()
        }}
        deadlines={items}
      />
    </div>
  )
}
