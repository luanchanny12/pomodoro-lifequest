import React, { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Coins,
  ExternalLink,
  Flame,
  GraduationCap,
  Layers,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { DeadlinesResponse } from '@/utils/deadlineUtils'
import { getLocalTodayYmd } from '@/utils/deadlineUtils'
import {
  focusService,
  type FinancialJar,
  type TetEarningPlan,
} from '@/services/focusService'
import { FinancialJarsCard } from './FinancialJarsCard'
import { DeadlineHomeSection } from './DeadlineHomeSection'

interface FinanceScheduleHubCardProps {
  isAuthenticated: boolean
  deadlinesData: DeadlinesResponse
  deadlinesLoading?: boolean
  onRefreshDeadlines: () => Promise<void> | void
  onStartPomodoro?: (goalId: number) => void
  onOpenHubModal: (tab?: 'finance' | 'schedule') => void
  onOpenNotificationSettings?: () => void
  onOpenAuthModal?: () => void
}

export const FinanceScheduleHubCard: React.FC<FinanceScheduleHubCardProps> = ({
  isAuthenticated,
  deadlinesData,
  deadlinesLoading = false,
  onRefreshDeadlines,
  onStartPomodoro,
  onOpenHubModal,
  onOpenNotificationSettings,
  onOpenAuthModal,
}) => {
  const [jars, setJars] = useState<FinancialJar[]>([])
  const [plan, setPlan] = useState<TetEarningPlan | null>(null)
  const [isExpandedOnPage, setIsExpandedOnPage] = useState<boolean>(false)

  const todayYmd = useMemo(() => getLocalTodayYmd(), [])

  // Load finance summary
  useEffect(() => {
    if (!isAuthenticated) return
    let isMounted = true

    const loadFinanceSummary = async () => {
      try {
        const [jarsData, planData] = await Promise.allSettled([
          focusService.getFinancialJars(),
          focusService.getTetEarningPlan(),
        ])
        if (!isMounted) return
        if (jarsData.status === 'fulfilled') {
          setJars(jarsData.value || [])
        }
        if (planData.status === 'fulfilled') {
          setPlan(planData.value || null)
        }
      } catch {
        // Silently keep default summary
      }
    }

    loadFinanceSummary()
    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  // Today's schedule items
  const todayItems = useMemo(
    () => deadlinesData.items.filter((item) => item.date?.slice(0, 10) === todayYmd),
    [deadlinesData.items, todayYmd]
  )

  const schoolCount = useMemo(
    () => todayItems.filter((i) => i.type === 'school_class').length,
    [todayItems]
  )

  const gigCount = useMemo(
    () => todayItems.filter((i) => i.type === 'gig_shift').length,
    [todayItems]
  )

  const taskCount = useMemo(
    () => todayItems.filter((i) => i.type === 'task' || i.type === 'goal').length,
    [todayItems]
  )

  const nextUpcomingSchool = useMemo(
    () => todayItems.find((i) => i.type === 'school_class'),
    [todayItems]
  )

  // Finance stats
  const totalBalance = useMemo(
    () => jars.reduce((acc, j) => acc + (j.current_balance || 0), 0),
    [jars]
  )

  const tetJar = useMemo(
    () => jars.find((j) => j.jar_type === 'TET'),
    [jars]
  )

  const tetProgressPct = useMemo(() => {
    if (!tetJar) return 0
    const target = tetJar.target_amount || plan?.tet_target_amount || 15000000
    if (target <= 0) return 0
    return Math.min(100, Math.round((tetJar.current_balance / target) * 100))
  }, [tetJar, plan])

  const formatVndShort = (amount: number) => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M`
    }
    if (amount >= 1_000) {
      return `${Math.round(amount / 1_000)}k`
    }
    return `${amount}đ`
  }

  return (
    <div className="mt-5 space-y-3">
      {/* ── COMPACT HUB BANNER (Gọn gàng ~120px) ── */}
      <div className="relative rounded-2xl border border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/70 p-3.5 sm:p-4 shadow-xl overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
          {/* Section 1: Brand & Finance Quick Peek */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-sky-500/20 border border-amber-500/30 text-amber-300 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-white text-sm sm:text-base tracking-tight flex items-center gap-1.5">
                  <span>Tài Chính & Thời Khóa Biểu</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  LifeQuest Hub
                </span>
              </div>

              {/* Financial Snapshot */}
              <div className="mt-1 flex items-center gap-2.5 text-xs text-slate-300 flex-wrap">
                <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tổng hũ: {formatVndShort(totalBalance)}</span>
                </span>
                {tetJar && (
                  <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                    <span>• Hũ Tết:</span>
                    <strong className="text-emerald-300">{formatVndShort(tetJar.current_balance)}</strong>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      {tetProgressPct}%
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Today's Schedule Quick Peek */}
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Lịch Hôm Nay
              </span>
              <div className="flex items-center gap-2 mt-0.5 font-bold text-white">
                {schoolCount > 0 ? (
                  <span className="text-sky-300 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {schoolCount} môn học
                  </span>
                ) : (
                  <span className="text-slate-400">Không có tiết</span>
                )}

                {gigCount > 0 && (
                  <span className="text-emerald-300 flex items-center gap-1">
                    • 🛵 1 ca chạy
                  </span>
                )}

                {taskCount > 0 && (
                  <span className="text-rose-400 flex items-center gap-1">
                    • 🔥 {taskCount} việc Ô 1
                  </span>
                )}
              </div>
            </div>

            {nextUpcomingSchool && (
              <div className="hidden sm:flex flex-col border-l border-slate-800 pl-3 max-w-[200px]">
                <span className="text-[10px] text-slate-400">Tiết tới:</span>
                <span className="text-[11px] font-semibold text-slate-200 truncate">
                  {nextUpcomingSchool.time_range} • {nextUpcomingSchool.title.replace(/^📚\s*/, '')}
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Main Hub Modal Trigger Button */}
            <button
              type="button"
              onClick={() => onOpenHubModal('schedule')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 border border-blue-400/30 transition active:scale-95 cursor-pointer"
            >
              <CalendarDays className="w-4 h-4 text-sky-200" />
              <span>Mở Trung Tâm Toàn Năng 🚀</span>
            </button>

            {/* Quick Finance Modal Trigger */}
            <button
              type="button"
              onClick={() => onOpenHubModal('finance')}
              title="Quản lý Hũ tài chính & Ghi chi tiêu"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hũ Tiền</span>
            </button>

            {/* Expand / Collapse Directly on Page */}
            <button
              type="button"
              onClick={() => setIsExpandedOnPage((prev) => !prev)}
              title={isExpandedOnPage ? 'Thu gọn hiển thị trên trang' : 'Mở rộng hiển thị trên trang'}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              {isExpandedOnPage ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── EXPANDED INLINE VIEW (Only if user toggles "Mở rộng trên trang") ── */}
      {isExpandedOnPage && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <FinancialJarsCard />
          <DeadlineHomeSection
            id="deadline-home-section"
            isAuthenticated={isAuthenticated}
            data={deadlinesData}
            loading={deadlinesLoading}
            onRefresh={onRefreshDeadlines}
            onStartPomodoro={onStartPomodoro}
            onOpenCalendarModal={() => onOpenHubModal('schedule')}
            onOpenNotificationSettings={onOpenNotificationSettings}
            onOpenAuthModal={onOpenAuthModal}
            defaultViewMode="timetable"
          />
        </div>
      )}
    </div>
  )
}
