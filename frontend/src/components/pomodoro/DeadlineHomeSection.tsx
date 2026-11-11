import React, { useMemo, useState } from 'react'
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  LogIn,
  Plus,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import type { DeadlineItem, DeadlinesResponse } from '@/utils/deadlineUtils'
import {
  completeDeadlineItem,
  DeadlineQuickAddForm,
  DeadlineItemRow,
  EmptyDeadlineGuidance,
  filterDeadlinesByTab,
  rescheduleDeadlineItem,
  triggerTelegramDeadlineNudge,
  type DeadlineFilterTab,
} from './DeadlineShared'

interface DeadlineHomeSectionProps {
  id?: string
  isAuthenticated: boolean
  data: DeadlinesResponse
  loading?: boolean
  onRefresh: () => Promise<void> | void
  onStartPomodoro?: (goalId: number) => void
  onOpenCalendarModal: () => void
  onOpenNotificationSettings?: () => void
  onOpenAuthModal?: () => void
}

export const DeadlineHomeSection: React.FC<DeadlineHomeSectionProps> = ({
  id = 'deadline-home-section',
  isAuthenticated,
  data,
  loading = false,
  onRefresh,
  onStartPomodoro,
  onOpenCalendarModal,
  onOpenNotificationSettings,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<DeadlineFilterTab>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [sendingTelegram, setSendingTelegram] = useState(false)

  const filteredItems = useMemo(
    () => filterDeadlinesByTab(data.items, activeTab),
    [data.items, activeTab]
  )

  const visibleItems = expanded ? filteredItems : filteredItems.slice(0, 5)
  const hotCount = (data.summary.overdue || 0) + (data.summary.today || 0)
  const soon3DaysCount = useMemo(
    () => data.items.filter((i) => i.days_left >= 1 && i.days_left <= 3).length,
    [data.items]
  )

  const handleComplete = async (item: DeadlineItem) => {
    const key = `${item.type}-${item.id}`
    try {
      setBusyKey(key)
      await completeDeadlineItem(item)
      await onRefresh()
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
      await onRefresh()
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

  if (!isAuthenticated) {
    return (
      <section
        id={id}
        className="mt-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900/95 via-slate-900 to-indigo-950/60 p-4 sm:p-5 shadow-lg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/35 text-amber-400 shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Lịch Deadline Của Bạn
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Mới
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Đăng nhập để theo dõi tất cả kỳ thi, bài tập, tự động highlight cảnh báo ngay trên trang chính và nhắc qua Telegram hằng ngày.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Đăng nhập để bật Lịch
              </button>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      id={id}
      aria-label="Bảng Lịch Deadline Trang Chính"
      className="mt-4 rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900/95 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-xl space-y-3.5"
    >
      {/* Top Header + Summary Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/25 to-rose-500/20 border border-amber-500/40 text-amber-400 shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                📅 Lịch Deadline Của Bạn
              </h3>
              {hotCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/45">
                  <Flame className="w-3 h-3 text-rose-400" />
                  {hotCount} Gấp / Hôm nay
                </span>
              )}
              {soon3DaysCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                  ⏳ {soon3DaysCount} Sắp tới (1-3d)
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                📋 {data.summary.total_active} Đang mở
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Hiển thị trực tiếp mỗi ngày • Tự động tô màu theo độ khẩn cấp
            </p>
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Đóng form' : '+ Thêm Deadline'}</span>
          </button>

          <button
            type="button"
            disabled={sendingTelegram}
            onClick={handleTelegramNudge}
            title="Gửi ngay danh sách deadline hiện tại tới Telegram điện thoại"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 font-semibold text-xs transition-all disabled:opacity-60 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingTelegram ? 'Đang gửi...' : '📲 Nhắc Telegram'}</span>
          </button>

          {onOpenNotificationSettings && (
            <button
              type="button"
              onClick={onOpenNotificationSettings}
              title="Cấu hình lịch nhắc Telegram hằng ngày"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Cài đặt nhắc</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCalendarModal}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
          >
            <span>Lịch chi tiết</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Quick Add Form */}
      {showAddForm && (
        <DeadlineQuickAddForm
          compact
          onCreated={onRefresh}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {(
          [
            { id: 'all', label: `Tất cả (${data.items.length})` },
            {
              id: 'urgent',
              label: `🔥 Khẩn cấp (${data.items.filter((i) => i.days_left <= 3).length})`,
            },
            {
              id: 'week',
              label: `📅 Tuần này (${data.items.filter((i) => i.days_left <= 7).length})`,
            },
            {
              id: 'future',
              label: `🗓️ Xa hơn (${data.items.filter((i) => i.days_left > 7).length})`,
            },
          ] as { id: DeadlineFilterTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-slate-800/70 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items List */}
      {loading && data.items.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          Đang đồng bộ danh sách deadline...
        </div>
      ) : visibleItems.length === 0 ? (
        <EmptyDeadlineGuidance
          onOpenQuickAdd={() => setShowAddForm(true)}
          isFiltered={activeTab !== 'all' && data.items.length > 0}
        />
      ) : (
        <div className="space-y-2.5">
          {visibleItems.map((item) => (
            <DeadlineItemRow
              key={`${item.type}-${item.id}`}
              item={item}
              compact
              busyKey={busyKey}
              onComplete={handleComplete}
              onReschedule={handleReschedule}
              onStartPomodoro={onStartPomodoro}
            />
          ))}

          {filteredItems.length > 5 && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="w-full py-2 rounded-xl border border-slate-700/80 bg-slate-900/70 hover:bg-slate-800 text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Thu gọn danh sách
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Xem thêm {filteredItems.length - 5} deadline khác
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
