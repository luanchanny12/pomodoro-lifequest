import React, { useState, useEffect, startTransition } from 'react'
import {
  CalendarDays,
  Coins,
  GraduationCap,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import type { DeadlinesResponse } from '@/utils/deadlineUtils'
import { FinancialJarsCard } from './FinancialJarsCard'
import { DeadlineHomeSection } from './DeadlineHomeSection'

export type HubTab = 'finance' | 'schedule'

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

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

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

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 shadow-2xl overflow-hidden">
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
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => startTransition(() => setActiveTab('schedule'))}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-sky-300" />
            <span>Thời Khóa Biểu & Lịch Thi</span>
            {deadlinesData.items.length > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-sky-200">
                {deadlinesData.items.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => startTransition(() => setActiveTab('finance'))}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
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
              <DeadlineHomeSection
                id="hub-deadline-section"
                isAuthenticated={isAuthenticated}
                data={deadlinesData}
                loading={deadlinesLoading}
                onRefresh={onRefreshDeadlines}
                onStartPomodoro={onStartPomodoro}
                onOpenCalendarModal={() => {}}
                onOpenNotificationSettings={onOpenNotificationSettings}
                onOpenAuthModal={onOpenAuthModal}
                defaultViewMode="timetable"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <FinancialJarsCard />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const FinanceScheduleHubModal = React.memo(FinanceScheduleHubModalComponent)
