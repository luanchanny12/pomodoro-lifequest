import React, { useState, useEffect, useMemo, startTransition } from 'react'
import {
  Bell,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  GraduationCap,
  LayoutGrid,
  MapPin,
  Play,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react'
import type { DeadlineItem, DeadlinesResponse } from '@/utils/deadlineUtils'
import { getLocalTodayYmd } from '@/utils/deadlineUtils'
import { focusService } from '@/services/focusService'
import { OFFICIAL_PHENIKAA_K17_SCHEDULE, type SchoolScheduleItem } from '@/utils/phenikaaSchedules'
import { FinancialJarsCard } from './FinancialJarsCard'
import { SchoolWeeklyTimetable } from './SchoolWeeklyTimetable'
import { ScheduleDayDetailCard } from './ScheduleDayDetailCard'
import { DeadlineMonthCalendar } from './DeadlineMonthCalendar'
import { AIBreakdownModal } from './AIBreakdownModal'
import {
  completeDeadlineItem,
  DeadlineQuickAddForm,
  deleteDeadlineItem,
  markScheduleItemHandledLocally,
  rescheduleDeadlineItem,
  triggerTelegramDeadlineNudge,
  triggerTelegramSchoolScheduleNudge,
} from './DeadlineShared'
import { toast } from 'sonner'

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
  const [sendingSchoolTelegram, setSendingSchoolTelegram] = useState(false)

  // Pure School Schedules (Lịch học trường Phenikaa)
  const [schoolSchedules, setSchoolSchedules] = useState<SchoolScheduleItem[]>(() => {
    try {
      const cached = localStorage.getItem('lifequest_cached_school_schedules')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (_) {}
    return OFFICIAL_PHENIKAA_K17_SCHEDULE
  })
  const [loadingSchedules, setLoadingSchedules] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      setSelectedDate(todayYmd)
      loadSchoolSchedules()
    }
  }, [isOpen, initialTab, todayYmd])

  const loadSchoolSchedules = async () => {
    try {
      setLoadingSchedules(true)
      const data = await focusService.getSchoolSchedules()
      if (Array.isArray(data) && data.length > 0) {
        setSchoolSchedules(data)
      } else {
        setSchoolSchedules(OFFICIAL_PHENIKAA_K17_SCHEDULE)
      }
    } catch (e) {
      console.warn('Could not load school schedules:', e)
      setSchoolSchedules(OFFICIAL_PHENIKAA_K17_SCHEDULE)
    } finally {
      setLoadingSchedules(false)
    }
  }

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

  const [handledItemKeys, setHandledItemKeys] = useState<Set<string>>(() => {
    try {
      if (typeof localStorage === 'undefined') return new Set()
      const stored = localStorage.getItem('lifequest_handled_deadline_items')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  // Purge erroneous machine learning exam on 20/11/2026
  useEffect(() => {
    const erroneous = deadlinesData.items.filter(
      (item) =>
        item.date?.slice(0, 10) === '2026-11-20' &&
        (item.title.toLowerCase().includes('học máy') || item.title.includes('CSE702035'))
    )
    if (erroneous.length > 0) {
      setHandledItemKeys((prev) => {
        const next = new Set(prev)
        erroneous.forEach((item) => {
          const k = `${item.type}-${item.id}`
          next.add(k)
          markScheduleItemHandledLocally(k)
          deleteDeadlineItem(item).catch(() => {})
        })
        return next
      })
    }
  }, [deadlinesData.items])

  // Pure Tasks & Deadlines (CHỈ CÔNG VIỆC VÀ MỤC TIÊU - TÁCH RỜI KHỎI LỊCH HỌC)
  const tasksAndDeadlines = useMemo(() => {
    return deadlinesData.items.filter(
      (item) =>
        item.type !== 'school_class' &&
        !handledItemKeys.has(`${item.type}-${item.id}`)
    )
  }, [deadlinesData.items, handledItemKeys])

  // Tasks for selected date
  const selectedDayTasks = useMemo(
    () => tasksAndDeadlines.filter((item) => item.date?.slice(0, 10) === selectedDate),
    [tasksAndDeadlines, selectedDate]
  )

  // Classes for selected date (based on day of week 2..8)
  const selectedDayClasses = useMemo(() => {
    const parts = selectedDate.split('-').map(Number)
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      const dow = d.getDay() === 0 ? 8 : d.getDay() + 1
      const activeList = schoolSchedules.length > 0 ? schoolSchedules : OFFICIAL_PHENIKAA_K17_SCHEDULE
      return activeList.filter((s) => s.day_of_week === dow && s.is_active)
    }
    return []
  }, [selectedDate, schoolSchedules])

  const handleComplete = async (item: DeadlineItem) => {
    const key = `${item.type}-${item.id}`
    try {
      setBusyKey(key)
      // Optimistic removal from UI immediately
      setHandledItemKeys((prev) => new Set(prev).add(key))
      await completeDeadlineItem(item)
      await onRefreshDeadlines()
    } catch (err: any) {
      console.error('Error completing item:', err)
    } finally {
      setBusyKey(null)
    }
  }

  const handleDeleteItem = async (item: DeadlineItem) => {
    const key = `${item.type}-${item.id}`
    try {
      setBusyKey(key)
      // Optimistic removal from UI immediately
      setHandledItemKeys((prev) => new Set(prev).add(key))
      await deleteDeadlineItem(item)
      await onRefreshDeadlines()
    } catch (err: any) {
      console.error('Error deleting item:', err)
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

  // Nhắc việc cần làm & deadline qua Telegram
  const handleTaskTelegramNudge = async () => {
    try {
      setSendingTelegram(true)
      await triggerTelegramDeadlineNudge(onOpenNotificationSettings)
    } finally {
      setSendingTelegram(false)
    }
  }

  // Nhắc Lịch Học Phenikaa hôm nay qua Telegram (TÁCH RIÊNG HOÀN TOÀN)
  const handleSchoolScheduleTelegramNudge = async () => {
    try {
      setSendingSchoolTelegram(true)
      await triggerTelegramSchoolScheduleNudge(onOpenNotificationSettings)
    } finally {
      setSendingSchoolTelegram(false)
    }
  }

  const handleDeleteCourse = async (courseId: number, courseName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa môn "${courseName}" khỏi thời khóa biểu?`)) return
    try {
      await focusService.deleteSchoolScheduleItem(courseId)
      toast.success(`Đã xóa môn "${courseName}"!`)
      await loadSchoolSchedules()
      await onRefreshDeadlines()
    } catch {
      toast.error('Chưa thể xóa môn học!')
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
                Tách biệt hoàn hảo: Lịch học Phenikaa (PKA) • Việc cần làm & Deadline • Hũ tài chính
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

        {/* Tab Navigation Strip (3 TAB TÁCH BIỆT RÕ RÀNG) */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 shrink-0 overflow-x-auto">
          {/* Tab 1: Thời khóa biểu & Lịch học Phenikaa */}
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
            <span>Thời Khóa Biểu & Lịch Thi (Phenikaa PKA)</span>
            {schoolSchedules.length > 0 && (
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-sky-200 font-bold border border-sky-500/30">
                {schoolSchedules.length} môn
              </span>
            )}
          </button>

          {/* Tab 2: Việc cần làm & Deadline */}
          <button
            type="button"
            onClick={() => startTransition(() => setActiveTab('calendar'))}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-500/25 border border-rose-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-rose-300" />
            <span>Danh Sách Việc Cần Làm & Deadline</span>
            {tasksAndDeadlines.length > 0 && (
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-rose-200 font-bold border border-rose-500/30">
                {tasksAndDeadlines.length} việc
              </span>
            )}
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
            /* ═══════════ TAB 1: LỊCH HỌC PHENIKAA CHUYÊN BIỆT (KHÔNG CHỨA TO-DO) ═══════════ */
            <div className="space-y-4">
              {/* Quick Actions Toolbar cho Lịch Học Phenikaa */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-sky-300 px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30">
                    🏛️ Lịch Học Trường ĐH Phenikaa ({schoolSchedules.length} môn học)
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Lịch học chuẩn tiết học (Sáng / Chiều / Tối) theo Thứ 2 đến Chủ Nhật
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Nút gửi nhắc Lịch Học Phenikaa riêng */}
                  <button
                    type="button"
                    disabled={sendingSchoolTelegram}
                    onClick={handleSchoolScheduleTelegramNudge}
                    title="Gửi ngay danh sách lịch học hôm nay tới Telegram điện thoại"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-sky-300 border border-blue-500/40 font-semibold text-xs transition-all disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingSchoolTelegram ? 'Đang gửi...' : '📲 Nhắc Lịch Học PKA'}</span>
                  </button>

                  {onOpenNotificationSettings && (
                    <button
                      type="button"
                      onClick={onOpenNotificationSettings}
                      title="Cài đặt thông báo Telegram"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cài đặt nhắc</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setAddFormDate(todayYmd)
                      setShowAddForm((prev) => !prev)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddForm ? 'Đóng' : '+ Thêm Môn Học'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Add Form Modal/Inline */}
              {showAddForm && (
                <DeadlineQuickAddForm
                  compact
                  initialDate={addFormDate}
                  onCreated={() => {
                    loadSchoolSchedules()
                    onRefreshDeadlines()
                  }}
                  onCancel={() => setShowAddForm(false)}
                />
              )}

              {/* 🌟 BỐ CỤC 2 CỘT CHO LỊCH HỌC PHENIKAA */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Cột trái (8/12 ~ 67%): Bảng Thời Khóa Biểu Tuần Phenikaa (CHỈ CHỨA MÔN HỌC) */}
                <div className="lg:col-span-8">
                  <SchoolWeeklyTimetable
                    schedules={schoolSchedules}
                    todayYmd={todayYmd}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    onOpenQuickAdd={(d) => {
                      setAddFormDate(d)
                      setShowAddForm(true)
                    }}
                  />
                </div>

                {/* Cột phải (4/12 ~ 33%): Chi tiết môn học của ngày được chọn */}
                <div className="lg:col-span-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-sky-400" />
                        <span>Môn Học Ngày: {selectedDate}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {selectedDayClasses.length === 0
                          ? 'Ngày này không có lịch học trường'
                          : `Có ${selectedDayClasses.length} môn học/tiết học`}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={sendingSchoolTelegram || selectedDayClasses.length === 0}
                      onClick={handleSchoolScheduleTelegramNudge}
                      className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      title="Gửi môn học ngày này sang Telegram"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5 custom-scrollbar">
                    {selectedDayClasses.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2 p-3">
                        <BookOpen className="w-7 h-7 text-sky-500/70" />
                        {selectedDate < '2026-11-30' ? (
                          <>
                            <p className="text-sky-300 font-semibold">
                              🏛️ Kỳ học chính thức bắt đầu từ Thứ 2, 30/11/2026
                            </p>
                            <p className="text-slate-400 text-[11px] max-w-xs">
                              Hôm nay ({selectedDate}) bạn chưa có lịch học tại trường. Lịch học sẽ tự động bắt đầu từ tuần ngày 30/11!
                            </p>
                            <button
                              type="button"
                              onClick={() => setSelectedDate('2026-11-30')}
                              className="mt-2 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>👉 Xem ngày 30/11 (Thứ 2)</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-slate-300 font-medium">Không có tiết học Phenikaa trong ngày này.</p>
                            <span className="text-[11px] text-slate-500">
                              Bấm vào các ngày Thứ 2, 4, 5, 6 trên bảng để xem chi tiết môn học!
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      selectedDayClasses.map((c) => (
                        <div
                          key={`class-detail-${c.id}`}
                          className="rounded-xl border border-blue-500/40 bg-gradient-to-br from-blue-950/70 to-slate-900 p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-white text-xs sm:text-sm leading-snug">
                              {c.course_name}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteCourse(c.id, c.course_name)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition"
                              title="Xóa môn này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              <Clock className="w-3 h-3 text-blue-400" />
                              <span>{c.start_time} - {c.end_time}</span>
                            </span>
                            {c.room && (
                              <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <MapPin className="w-2.5 h-2.5 text-amber-400" />
                                <span>Phòng: {c.room}</span>
                              </span>
                            )}
                          </div>

                          {c.lecturer && (
                            <div className="text-[11px] text-slate-300 flex items-center gap-1 pt-1 border-t border-slate-800">
                              <User className="w-3 h-3 text-sky-400" />
                              <span>Giảng viên: {c.lecturer}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'calendar' ? (
            /* ═══════════ TAB 2: VIỆC CẦN LÀM & DEADLINE CHUYÊN BIỆT ═══════════ */
            <div className="space-y-4">
              {/* Quick Actions Toolbar cho Việc Cần Làm */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-rose-300 px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30">
                    🎯 Danh Sách Việc Cần Làm & Hạn Chót ({tasksAndDeadlines.length} việc)
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Ma trận Ô 1 (Làm ngay) & Hạn chót mục tiêu cá nhân
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Nút gửi nhắc Việc cần làm riêng */}
                  <button
                    type="button"
                    disabled={sendingTelegram}
                    onClick={handleTaskTelegramNudge}
                    title="Gửi ngay danh sách việc cần làm tới Telegram điện thoại"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold text-xs transition-all disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingTelegram ? 'Đang gửi...' : '📲 Nhắc Việc Cần Làm'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAIBreakdownModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/25 to-pink-500/25 text-indigo-300 border border-indigo-500/40 font-semibold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>✨ AI Chia Nhỏ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddFormDate(todayYmd)
                      setShowAddForm((prev) => !prev)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddForm ? 'Đóng' : '+ Thêm Việc Mới'}</span>
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

              {/* Lịch Tháng & Danh Sách Việc Chi Tiết */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-6">
                  <DeadlineMonthCalendar
                    currentDate={calendarMonthDate}
                    selectedDate={selectedDate}
                    items={tasksAndDeadlines}
                    todayYmd={todayYmd}
                    onSelectDate={setSelectedDate}
                    onMonthChange={setCalendarMonthDate}
                  />
                </div>
                <div className="lg:col-span-6">
                  <ScheduleDayDetailCard
                    selectedDate={selectedDate}
                    todayYmd={todayYmd}
                    items={selectedDayTasks}
                    busyKey={busyKey}
                    onComplete={handleComplete}
                    onDelete={handleDeleteItem}
                    onReschedule={handleReschedule}
                    onStartPomodoro={onStartPomodoro}
                    onOpenQuickAdd={(d) => {
                      setAddFormDate(d)
                      setShowAddForm(true)
                    }}
                    onTriggerTelegram={handleTaskTelegramNudge}
                    sendingTelegram={sendingTelegram}
                    maxHeightClass="max-h-[480px]"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ═══════════ TAB 3: HŨ TÀI CHÍNH & MỤC TIÊU TẾT ═══════════ */
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
          deadlines={tasksAndDeadlines}
        />
      )}
    </div>
  )
}

export const FinanceScheduleHubModal = React.memo(FinanceScheduleHubModalComponent)
