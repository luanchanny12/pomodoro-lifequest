import React, { useState, useEffect, useMemo, startTransition } from 'react'
import {
  CalendarDays,
  Coins,
  GraduationCap,
  LayoutGrid,
  Plus,
  Send,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import type { DeadlineItem, DeadlinesResponse } from '@/utils/deadlineUtils'
import { getLocalTodayYmd } from '@/utils/deadlineUtils'
import { FinancialJarsCard } from './FinancialJarsCard'
import { SchoolWeeklyTimetable } from './SchoolWeeklyTimetable'
import { ScheduleDayDetailCard } from './ScheduleDayDetailCard'
import { DeadlineMonthCalendar } from './DeadlineMonthCalendar'
import { AIBreakdownModal } from './AIBreakdownModal'
import {
  completeDeadlineItem,
  DeadlineQuickAddForm,
  rescheduleDeadlineItem,
  triggerTelegramDeadlineNudge,
} from './DeadlineShared'

export type HubTab = 'finance' | 'schedule' | 'calendar'

interface FinanceScheduleHubModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: HubTab
  isAuthenticated: boolean
  deadlinesData: DeadlinesResponse
  deadlinesLoading?: boolean
  onRefreshDeadlines: () => Promise<void> | void
  onStartPomodoro?: (goalId: number) => void
  onOpenNotificationSettings?: () => void
  onOpenAuthModal?: () => void
}

const FinanceScheduleHubModalComponent: React.FC<FinanceScheduleHubModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'schedule',
  isAuthenticated,
  deadlinesData,
  deadlinesLoading = false,
  onRefreshDeadlines,
  onStartPomodoro,
  onOpenNotificationSettings,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<HubTab>(initialTab)
  const todayYmd = useMemo(() => getLocalTodayYmd(), [])
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd)
  const [calendarMonthDate, setCalendarMonthDate] = useState<Date>(() => new Date())
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormDate, setAddFormDate] = useState<string>(todayYmd)
  const [showAIBreakdownModal, setShowAIBreakdownModal] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [sendingTelegram, setSendingTelegram] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      setSelectedDate(todayYmd)
    }
  }, [isOpen, initialTab, todayYmd])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Filter items for selected date
  const selectedDayItems = useMemo(
    () => deadlinesData.items.filter((item) => item.date?.slice(0, 10) === selectedDate),
    [deadlinesData.items, selectedDate]
  )

  const handleComplete = async (item: DeadlineItem) => {
    const key = `${item.type}-${item.id}`
    try {
      setBusyKey(key)
      await completeDeadlineItem(item)
      await onRefreshDeadlines()
    } finally {
      setBusyKey(null)
    }
  }

  const handleReschedule = async (item: DeadlineItem, newDate: string) => {
    const key = `${item.type}-${item.id}`
    try {
      setBusyKey(key)
      await rescheduleDeadlineItem(item, newDate)
      await onRefreshDeadlines()
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

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-7xl max-h-[94vh] flex flex-col rounded-3xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/25 via-sky-500/25 to-indigo-500/25 border border-amber-500/40 text-amber-300">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2
                id="hub-modal-title"
                className="text-base sm:text-lg font-black text-white flex items-center gap-2"
              >
                <span>Trung Tâm Quản Lý Tài Chính & Lịch Học</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-sky-500/20 text-amber-300 border border-amber-500/30">
                  LifeQuest Hub
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cân bằng mượt mà giữa thời khóa biểu Phenikaa, ca kiếm tiền và hũ tài chính
              </p>
            </div>
          </div>

          {/* Right Action: Close Button */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng Trung Tâm"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 shrink-0 overflow-x-auto">
          {/* Tab 1: Thời khóa biểu tuần */}
          <button
            type="button"
            onClick={() => startTransition(() => setActiveTab('schedule'))}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-sky-300" />
            <span>Thời Khóa Biểu & Lịch Thi</span>
            {deadlinesData.items.length > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-sky-200 font-semibold">
                {deadlinesData.items.length}
              </span>
            )}
          </button>

          {/* Tab 2: Lịch tháng & Deadline */}
          <button
            type="button"
            onClick={() => startTransition(() => setActiveTab('calendar'))}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25 border border-sky-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-sky-300" />
            <span>Lịch Tháng & Deadline</span>
          </button>

          {/* Tab 3: Hũ tài chính */}
          <button
            type="button"
            onClick={() => startTransition(() => setActiveTab('finance'))}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'finance'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/25 border border-amber-300/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Hũ Tài Chính & Mục Tiêu Tết</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {activeTab === 'schedule' ? (
            <div className="space-y-4">
              {/* Quick Actions Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-sky-300 px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30">
                    🏛️ TKB Trường Đại Học & Ca Kiếm Tiền
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Bấm ngày trên bảng để xem và xử lý việc Ô 1 bên phải
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setAddFormDate(selectedDate || todayYmd)
                      setShowAddForm((prev) => !prev)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddForm ? 'Đóng form' : '+ Thêm Việc/Lịch'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAIBreakdownModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/25 via-purple-500/25 to-pink-500/25 hover:from-indigo-500/35 hover:to-pink-500/35 text-indigo-300 border border-indigo-500/40 font-semibold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>✨ AI Chia Nhỏ</span>
                  </button>

                  <button
                    type="button"
                    disabled={sendingTelegram}
                    onClick={handleTelegramNudge}
                    title="Gửi ngay danh sách việc ngày này tới Telegram điện thoại"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 font-semibold text-xs transition-all disabled:opacity-60 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingTelegram ? 'Đang gửi...' : '📲 Nhắc Telegram'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Add Form Modal/Inline */}
              {showAddForm && (
                <DeadlineQuickAddForm
                  compact
                  initialDate={addFormDate}
                  onCreated={onRefreshDeadlines}
                  onCancel={() => setShowAddForm(false)}
                />
              )}

              {/* 🌟 2-COLUMN MASTER-DETAIL LAYOUT (Chống vỡ bảng và cân đối 100%) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Cột trái (8/12 ~ 67%): Bảng Thời Khóa Biểu Tuần Phenikaa */}
                <div className="lg:col-span-8">
                  <SchoolWeeklyTimetable
                    items={deadlinesData.items}
                    todayYmd={todayYmd}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    onStartPomodoro={onStartPomodoro}
                    onComplete={handleComplete}
                    onReschedule={handleReschedule}
                    onOpenQuickAdd={(d) => {
                      setAddFormDate(d)
                      setShowAddForm(true)
                    }}
                    busyKey={busyKey}
                  />
                </div>

                {/* Cột phải (4/12 ~ 33%): Panel Nhiệm Vụ Khẩn Cấp Ô 1 & Chi Tiết Ngày */}
                <div className="lg:col-span-4">
                  <ScheduleDayDetailCard
                    selectedDate={selectedDate}
                    todayYmd={todayYmd}
                    items={selectedDayItems}
                    busyKey={busyKey}
                    onComplete={handleComplete}
                    onReschedule={handleReschedule}
                    onStartPomodoro={onStartPomodoro}
                    onOpenQuickAdd={(d) => {
                      setAddFormDate(d)
                      setShowAddForm(true)
                    }}
                    onTriggerTelegram={handleTelegramNudge}
                    sendingTelegram={sendingTelegram}
                    maxHeightClass="max-h-[500px]"
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'calendar' ? (
            /* Tab 2: Lịch tháng 30 ngày kiểu Phenikaa */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-6">
                <DeadlineMonthCalendar
                  currentDate={calendarMonthDate}
                  selectedDate={selectedDate}
                  items={deadlinesData.items}
                  todayYmd={todayYmd}
                  onSelectDate={setSelectedDate}
                  onMonthChange={setCalendarMonthDate}
                />
              </div>
              <div className="lg:col-span-6">
                <ScheduleDayDetailCard
                  selectedDate={selectedDate}
                  todayYmd={todayYmd}
                  items={selectedDayItems}
                  busyKey={busyKey}
                  onComplete={handleComplete}
                  onReschedule={handleReschedule}
                  onStartPomodoro={onStartPomodoro}
                  onOpenQuickAdd={(d) => {
                    setAddFormDate(d)
                    setShowAddForm(true)
                  }}
                  onTriggerTelegram={handleTelegramNudge}
                  sendingTelegram={sendingTelegram}
                  maxHeightClass="max-h-[460px]"
                />
              </div>
            </div>
          ) : (
            /* Tab 3: Hũ tài chính & Mục tiêu Tết */
            <div className="space-y-4">
              <FinancialJarsCard />
            </div>
          )}
        </div>
      </div>

      {/* AI Breakdown Modal */}
      {showAIBreakdownModal && (
        <AIBreakdownModal
          isOpen={showAIBreakdownModal}
          onClose={() => setShowAIBreakdownModal(false)}
          onSuccess={onRefreshDeadlines}
          deadlines={deadlinesData.items}
        />
      )}
    </div>
  )
}

export const FinanceScheduleHubModal = React.memo(FinanceScheduleHubModalComponent)
