import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Flame,
  HelpCircle,
  Layers,
  MessageSquare,
  Minus,
  PieChart,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  focusService,
  type FinancialJar,
  type JarTransaction,
  type TetEarningPlan,
  type DualCoachAdvice,
  type SchoolScheduleItem,
} from '@/services/focusService'
import { ImportSchoolScheduleModal } from './ImportSchoolScheduleModal'

interface Props {
  className?: string
}

export const FinancialJarsCard: React.FC<Props> = ({ className = '' }) => {
  const [jars, setJars] = useState<FinancialJar[]>([])
  const [plan, setPlan] = useState<TetEarningPlan | null>(null)
  const [advice, setAdvice] = useState<DualCoachAdvice | null>(null)
  const [transactions, setTransactions] = useState<JarTransaction[]>([])
  const [schoolSchedules, setSchoolSchedules] = useState<SchoolScheduleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Modals state
  const [isGigModalOpen, setIsGigModalOpen] = useState(false)
  const [gigAmount, setGigAmount] = useState<string>('260000')
  const [tetPercent, setTetPercent] = useState<number>(60)
  const [gigNote, setGigNote] = useState<string>('Thu nhập ca chạy 10h-14h')
  const [isSubmittingGig, setIsSubmittingGig] = useState(false)

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState<string>('50000')
  const [expenseCat, setExpenseCat] = useState<string>('an_uong')
  const [expenseDesc, setExpenseDesc] = useState<string>('')
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false)

  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false)
  const [isTestingTelegram, setIsTestingTelegram] = useState(false)

  // Config Plan Modal
  const [isPlanConfigModalOpen, setIsPlanConfigModalOpen] = useState(false)
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false)
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false)

  // Plan Edit Form
  const [formPlanName, setFormPlanName] = useState('Kế Hoạch Tài Chính')
  const [formTargetAmount, setFormTargetAmount] = useState('15000000')
  const [formTetDate, setFormTetDate] = useState('2027-02-06')
  const [formShiftEnabled, setFormShiftEnabled] = useState(false)
  const [formShiftName, setFormShiftName] = useState('Ca chạy xe')
  const [formShiftStart, setFormShiftStart] = useState('10:00')
  const [formShiftEnd, setFormShiftEnd] = useState('14:00')
  const [formHomeArrival, setFormHomeArrival] = useState('15:00')
  const [formSkillFocus, setFormSkillFocus] = useState('')

  const loadData = async () => {
    try {
      const [jarsData, planData, adviceData, txsData, schedData] = await Promise.all([
        focusService.getFinancialJars(),
        focusService.getTetEarningPlan(),
        focusService.getDualCoachAdvice(),
        focusService.getJarTransactions(),
        focusService.getSchoolSchedules(),
      ])
      setJars(jarsData)
      setPlan(planData)
      setAdvice(adviceData)
      setTransactions(txsData.slice(0, 10))
      setSchoolSchedules(schedData)

      if (planData) {
        setFormPlanName(planData.plan_name || 'Kế Hoạch Tài Chính')
        setFormTargetAmount(String(planData.tet_target_amount || 15000000))
        setFormTetDate(planData.tet_date ? planData.tet_date.slice(0, 10) : '2027-02-06')
        setFormShiftEnabled(Boolean(planData.shift_enabled))
        setFormShiftName(planData.shift_name || 'Ca kiếm tiền')
        setFormShiftStart(planData.daily_shift_start || '10:00')
        setFormShiftEnd(planData.daily_shift_end || '14:00')
        setFormHomeArrival(planData.home_arrival_time || '15:00')
        setFormSkillFocus(planData.primary_skill_focus || '')
      }
    } catch (err) {
      console.error('Error loading finance jars data:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadData()
  }

  // Nạp ca chạy 10h-14h
  const handleDepositGig = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(gigAmount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ!')
      return
    }
    setIsSubmittingGig(true)
    try {
      const res = await focusService.depositGigEarnings({
        amount: amt,
        tet_percent: tetPercent,
        living_percent: 100 - tetPercent,
        description: gigNote || 'Thu nhập ca chạy 10h-14h',
      })
      toast.success(res.message)
      setIsGigModalOpen(false)
      loadData()
    } catch {
      toast.error('Lỗi khi nạp tiền ca chạy!')
    } finally {
      setIsSubmittingGig(false)
    }
  }

  // Ghi chép chi tiêu
  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(expenseAmount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('Vui lòng nhập số tiền chi tiêu hợp lệ!')
      return
    }
    setIsSubmittingExpense(true)
    try {
      const res = await focusService.logExpense({
        amount: amt,
        category: expenseCat,
        description: expenseDesc || 'Chi tiêu sinh hoạt',
      })
      toast.success(res.advice)
      setIsExpenseModalOpen(false)
      setExpenseDesc('')
      loadData()
    } catch {
      toast.error('Lỗi khi ghi nhận chi tiêu!')
    } finally {
      setIsSubmittingExpense(false)
    }
  }

  // Test giả lập Bot Telegram hỏi chi tiêu
  const handleTestTelegramExpense = async () => {
    setIsTestingTelegram(true)
    try {
      const res = await focusService.testTriggerBankExpense(50000, 'Ăn trưa cơm sườn')
      if (res.success) {
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } catch {
      toast.error('Không thể kích hoạt test Telegram. Hãy kiểm tra Bot Token trong Cài đặt!')
    } finally {
      setIsTestingTelegram(false)
    }
  }

  // Test giả lập Bot Telegram nạp ca chạy
  const handleTestTelegramIncome = async () => {
    setIsTestingTelegram(true)
    try {
      const res = await focusService.testTriggerBankIncome(260000, 'Thu nhập ca chạy 10h-14h')
      if (res.success) {
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } catch {
      toast.error('Không thể kích hoạt test Telegram!')
    } finally {
      setIsTestingTelegram(false)
    }
  }

  const handleSavePlanConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingPlan(true)
    try {
      const updated = await focusService.updateTetEarningPlan({
        plan_name: formPlanName.trim() || 'Kế Hoạch Tài Chính',
        tet_target_amount: parseFloat(formTargetAmount) || 0,
        tet_date: formTetDate,
        shift_enabled: formShiftEnabled,
        shift_name: formShiftName.trim() || 'Ca kiếm tiền',
        daily_shift_start: formShiftStart,
        daily_shift_end: formShiftEnd,
        home_arrival_time: formHomeArrival,
        primary_skill_focus: formSkillFocus.trim() || undefined,
      })
      setPlan(updated)
      setIsPlanConfigModalOpen(false)
      toast.success('Đã lưu cấu hình mục tiêu & ca làm việc cá nhân!')
      loadData()
    } catch {
      toast.error('Lỗi khi lưu cấu hình.')
    } finally {
      setIsSavingPlan(false)
    }
  }

  const handleApplyTemplate = async (
    templateKey: 'tet_gig' | 'six_jars' | 'simple_three' | 'empty'
  ) => {
    setIsApplyingTemplate(true)
    try {
      const newJars = await focusService.applyJarTemplate(templateKey)
      setJars(newJars)
      setIsTemplatePickerOpen(false)
      toast.success('Đã áp dụng mẫu hũ tài chính thành công!')
      loadData()
    } catch {
      toast.error('Lỗi khi áp dụng mẫu hũ.')
    } finally {
      setIsApplyingTemplate(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 animate-pulse">
        <Wallet className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-spin" />
        <p className="text-xs text-slate-500">Đang đồng bộ Hũ Tài Chính & Lịch Chạy...</p>
      </div>
    )
  }

  const tetJar = jars.find((j) => j.jar_type === 'TET')
  const livingJar = jars.find((j) => j.jar_type === 'LIVING')

  const dailyTarget = plan?.daily_target_needed || 250000
  const todayEarned = plan?.today_earned || 0
  const dailyProgress = Math.min(100, Math.round((todayEarned / (dailyTarget || 1)) * 100))
  const totalSaved = jars.reduce((sum, j) => sum + (j.current_balance || 0), 0)
  const totalTarget = plan?.tet_target_amount || 1
  const overallProgress = Math.min(100, Math.round((totalSaved / totalTarget) * 100))

  return (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm overflow-hidden ${className}`}
    >
      {/* 1. Header & Actions Bar */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-500/5 via-rose-500/5 to-blue-500/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md shadow-rose-500/20">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {plan?.plan_name || 'Hũ Tài Chính & Mục Tiêu'}
                </h3>
                {plan?.shift_enabled ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse">
                    {plan.shift_name} ({plan.daily_shift_start} - {plan.daily_shift_end})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    Mục tiêu cá nhân
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {plan?.shift_enabled
                  ? `${plan.shift_name} cố định • Tự động hỏi qua Telegram khi chi tiêu & nhận tiền`
                  : 'Quản lý chi tiêu đa hũ • Tự động hỏi qua Telegram khi chi tiêu & nhận tiền'}
              </p>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsPlanConfigModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-all"
              title="Tùy biến mục tiêu & ca làm việc"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" /> Cài đặt mục tiêu
            </button>
            <button
              onClick={() => setIsTemplatePickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-all"
              title="Chọn mẫu hũ tài chính phù hợp"
            >
              <Layers className="w-3.5 h-3.5 text-purple-500" /> Mẫu hũ
            </button>
            <button
              onClick={() => setIsGigModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />{' '}
              {plan?.shift_enabled ? `Nạp ${plan.shift_name}` : 'Nạp thu nhập'}
            </button>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg border border-rose-200 dark:border-rose-900 transition-all"
            >
              <Minus className="w-3.5 h-3.5" /> Ghi chi tiêu
            </button>
            <button
              onClick={() => setIsSchoolModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />{' '}
              {schoolSchedules[0]?.school_name || 'Thời khóa biểu'} ({schoolSchedules.length})
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                title="Tự động đồng bộ định kỳ"
              >
                🔄 2w
              </span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* 2. Target Countdown & Today Shift Progress */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Tiến độ hôm nay hoặc tiến độ tích lũy cá nhân */}
          {plan?.shift_enabled ? (
            <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950/40 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 truncate">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />{' '}
                  {plan.shift_name} ({plan.daily_shift_start} - {plan.daily_shift_end})
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {dailyProgress}%
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  {todayEarned.toLocaleString('vi-VN')}đ
                </span>
                <span className="text-xs text-slate-500">
                  / {dailyTarget.toLocaleString('vi-VN')}đ chỉ tiêu
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${dailyProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                {todayEarned >= dailyTarget ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đạt chỉ tiêu ngày! Hãy về nghỉ lúc{' '}
                    {plan.home_arrival_time || '15:00'}.
                  </span>
                ) : (
                  <span>
                    Còn thiếu{' '}
                    <b className="text-slate-700 dark:text-slate-300">
                      {(dailyTarget - todayEarned).toLocaleString('vi-VN')}đ
                    </b>{' '}
                    để đủ chỉ tiêu.
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-950/40 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Tổng Tiết Kiệm Đã Tích Lũy
                </span>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {overallProgress}%
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  {totalSaved.toLocaleString('vi-VN')}đ
                </span>
                <span className="text-xs text-slate-500">
                  / {totalTarget.toLocaleString('vi-VN')}đ mục tiêu
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Đã đạt <b>{overallProgress}%</b> mục tiêu <b>{plan?.plan_name || 'tài chính'}</b>.
              </p>
            </div>
          )}

          {/* Card 2: Mục tiêu Hũ Tết */}
          <div className="p-4 rounded-xl border border-rose-100 dark:border-rose-950/40 bg-gradient-to-br from-rose-50/50 to-amber-50/30 dark:from-rose-950/20 dark:to-amber-950/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-600" /> Đếm Ngược Đón Tết
              </span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-rose-200/70 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                Còn {plan?.days_remaining || 78} ngày
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {(tetJar?.current_balance || 0).toLocaleString('vi-VN')}đ
              </span>
              <span className="text-xs text-slate-500">
                / {(plan?.tet_target_amount || 15000000).toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${tetJar?.progress_percent || 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Tiến độ tích lũy: <b>{tetJar?.progress_percent || 0}%</b> quỹ tiêu Tết sung túc.
            </p>
          </div>

          {/* Card 3: Bot Telegram 2 Chiều */}
          <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-950/40 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" /> Trợ Lý Telegram Tự Động
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                Khi bạn chuyển khoản trên ngân hàng, bot sẽ lập tức hỏi lý do và trừ Hũ Sinh Hoạt!
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-blue-200/40 dark:border-blue-900/40">
              <button
                onClick={handleTestTelegramExpense}
                disabled={isTestingTelegram}
                className="flex-1 py-1.5 px-2 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                title="Giả lập chuyển khoản 50k ăn trưa"
              >
                <Send className="w-3 h-3" /> Test Hỏi Chi Tiêu
              </button>
              <button
                onClick={handleTestTelegramIncome}
                disabled={isTestingTelegram}
                className="flex-1 py-1.5 px-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1"
                title="Giả lập nhận tiền 260k ca chạy"
              >
                <Zap className="w-3 h-3" /> Test Nạp Ca Chạy
              </button>
            </div>
          </div>
        </div>

        {/* 3. Grid 4 Hũ Tài Chính Cá Nhân */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-500" /> 4 Hũ Tài Chính Của Bạn
            </h4>
            <span className="text-xs text-slate-400">Tự động cân đối thu nhập & chi tiêu</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {jars.map((jar) => (
              <div
                key={jar.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl">{jar.icon}</span>
                    <span
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md"
                      style={{ backgroundColor: `${jar.color}15`, color: jar.color }}
                    >
                      {jar.progress_percent}%
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {jar.name}
                  </h5>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mb-3">{jar.note}</p>
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {jar.current_balance.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-[11px] text-slate-400">
                      / {jar.target_amount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${jar.progress_percent}%`, backgroundColor: jar.color }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. AI Dual-Coach Advice & Daily Balance Timeline */}
        {advice && (
          <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-950/50 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-transparent dark:from-indigo-950/20 dark:via-purple-950/10 space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI Dual-Coach: Cân Bằng Giữa Kiếm Tiền & Học Tập Đỉnh Cao</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lời khuyên tiền */}
              <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-indigo-100/60 dark:border-indigo-900/40">
                <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <DollarSign className="w-3.5 h-3.5" /> Chiến lược tài chính Tết:
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {advice.financial_advice}
                </p>
              </div>

              {/* Lời khuyên học */}
              <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-indigo-100/60 dark:border-indigo-900/40">
                <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <BookOpen className="w-3.5 h-3.5" /> Kỷ luật học tập & Kỹ năng dài hạn:
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {advice.study_skill_advice}
                </p>
              </div>
            </div>

            {/* Timeline biểu đồ trực quan trong ngày */}
            <div>
              <span className="text-xs font-semibold text-slate-500 mb-2 block">
                Thời khóa biểu cân bằng lý tưởng hôm nay:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {advice.daily_schedule_summary.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-800/80 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          {item.time}
                        </span>
                        <span
                          className="px-1.5 py-0.5 text-[9px] font-bold rounded"
                          style={{ backgroundColor: `${item.color}20`, color: item.color }}
                        >
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-100 line-clamp-1">
                        {item.title}
                      </p>
                    </div>
                    {item.room && (
                      <span className="text-[10px] text-slate-400 mt-1">📍 {item.room}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quote động lực */}
            <div className="text-center pt-1 border-t border-indigo-200/30 dark:border-indigo-900/30">
              <p className="text-xs italic text-indigo-700/80 dark:text-indigo-300/80">
                "{advice.motivation_quote}"
              </p>
            </div>
          </div>
        )}

        {/* 5. Giao Dịch Gần Nhất */}
        {transactions.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Lịch sử biến động gần nhất
              </span>
              <span className="text-[11px] text-slate-400">
                Hiển thị {transactions.length} giao dịch
              </span>
            </div>
            <div className="space-y-1.5">
              {transactions.map((tx) => {
                const isPositive = tx.amount > 0
                return (
                  <div
                    key={tx.id}
                    className="px-3.5 py-2 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-md ${
                          isPositive
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {tx.description}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-2">
                          ({tx.jar_name || 'Hũ'})
                        </span>
                      </div>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {tx.amount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL NẠP CA CHẠY 10H-14H --- */}
      {isGigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-500" /> Nạp Thu Nhập Ca Chạy (10h-14h)
              </h3>
              <button
                onClick={() => setIsGigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositGig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Số tiền kiếm được (VNĐ)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={gigAmount}
                  onChange={(e) => setGigAmount(e.target.value)}
                  placeholder="260000"
                  required
                  className="w-full px-3 py-2 text-base font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 text-xs font-semibold">
                  <span>Tỷ lệ phân bổ:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    🧧 Tết {tetPercent}% — 🍲 Sống {100 - tetPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={tetPercent}
                  onChange={(e) => setTetPercent(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>
                    Vào Hũ Tết: <b>{Math.round((parseFloat(gigAmount || '0') * tetPercent) / 100).toLocaleString('vi-VN')}đ</b>
                  </span>
                  <span>
                    Vào Hũ Sống: <b>{Math.round((parseFloat(gigAmount || '0') * (100 - tetPercent)) / 100).toLocaleString('vi-VN')}đ</b>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú ca chạy
                </label>
                <input
                  type="text"
                  value={gigNote}
                  onChange={(e) => setGigNote(e.target.value)}
                  placeholder="Thu nhập ca chạy 10h-14h"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGigModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGig}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  {isSubmittingGig ? 'Đang nạp...' : 'Xác Nhận Nạp Hũ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL GHI CHI TIÊU --- */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Minus className="w-5 h-5 text-rose-500" /> Ghi Nhận Chi Tiêu (Tiêu Tiền)
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Số tiền chi tiêu (VNĐ)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="50000"
                  required
                  className="w-full px-3 py-2 text-base font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Danh mục
                </label>
                <select
                  value={expenseCat}
                  onChange={(e) => setExpenseCat(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="an_uong">🍜 Ăn uống (cơm, phở, cà phê)</option>
                  <option value="xang_xe">⛽ Đổ xăng & bảo dưỡng xe</option>
                  <option value="mua_sam">🛒 Mua sắm vật dụng</option>
                  <option value="hoc_tap">📚 Học tập, tài liệu</option>
                  <option value="khac">💡 Chi tiêu khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung chi tiêu
                </label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Ví dụ: Ăn trưa cơm sườn"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                Khoản chi này sẽ được tự động trừ từ <b>Hũ Sinh Hoạt Hàng Ngày</b>.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                >
                  {isSubmittingExpense ? 'Đang trừ...' : 'Ghi Chi Tiêu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CÀI ĐẶT MỤC TIÊU & CA LÀM VIỆC CÁ NHÂN --- */}
      {isPlanConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-500" /> Cài Đặt Kế Hoạch & Ca Làm Việc
              </h3>
              <button
                onClick={() => setIsPlanConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlanConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên kế hoạch mục tiêu
                </label>
                <input
                  type="text"
                  value={formPlanName}
                  onChange={(e) => setFormPlanName(e.target.value)}
                  placeholder="Ví dụ: Kế Hoạch Đón Tết, Quỹ Mua Laptop..."
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số tiền mục tiêu (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="100000"
                    value={formTargetAmount}
                    onChange={(e) => setFormTargetAmount(e.target.value)}
                    placeholder="15000000"
                    required
                    className="w-full px-3 py-2 text-sm font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày đích đến
                  </label>
                  <input
                    type="date"
                    value={formTetDate}
                    onChange={(e) => setFormTetDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kỹ năng / Môn học trọng tâm muốn phát triển
                </label>
                <input
                  type="text"
                  value={formSkillFocus}
                  onChange={(e) => setFormSkillFocus(e.target.value)}
                  placeholder="Ví dụ: Fullstack Web & AI, Tiếng Anh IELTS, Luyện Thuật Toán..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  AI Dual-Coach sẽ ưu tiên động viên và cân đối lịch học cho kỹ năng này.
                </p>
              </div>

              {/* Toggle Ca Làm Việc */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formShiftEnabled}
                    onChange={(e) => setFormShiftEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Bật ca làm việc / kiếm thêm thu nhập hàng ngày
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Nếu bật, ca làm sẽ được đẩy vào Lịch Tháng và nhắc nhở thời gian làm việc cân đối với học tập.
                    </span>
                  </div>
                </label>

                {formShiftEnabled && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tên ca làm việc
                      </label>
                      <input
                        type="text"
                        value={formShiftName}
                        onChange={(e) => setFormShiftName(e.target.value)}
                        placeholder="Ví dụ: Ca chạy xe công nghệ, Ca phục vụ quán cafe, Gia sư..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Bắt đầu ca
                        </label>
                        <input
                          type="time"
                          value={formShiftStart}
                          onChange={(e) => setFormShiftStart(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Kết thúc ca
                        </label>
                        <input
                          type="time"
                          value={formShiftEnd}
                          onChange={(e) => setFormShiftEnd(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Về nhà / Học
                        </label>
                        <input
                          type="time"
                          value={formHomeArrival}
                          onChange={(e) => setFormHomeArrival(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanConfigModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {isSavingPlan ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CHỌN MẪU HŨ TÀI CHÍNH --- */}
      {isTemplatePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-500" /> Chọn Mẫu Hũ Tài Chính Cá Nhân
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chọn mô hình phân bổ phù hợp với lối sống và mục tiêu của bạn
                </p>
              </div>
              <button
                onClick={() => setIsTemplatePickerOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Option 1: tet_gig */}
              <div
                onClick={() => !isApplyingTemplate && handleApplyTemplate('tet_gig')}
                className="p-4 rounded-xl border-2 border-amber-200 dark:border-amber-900/60 hover:border-amber-500 dark:hover:border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🧧</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        Làm Thêm & Đón Tết (4 Hũ)
                      </h4>
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        Phổ biến cho sinh viên & làm thêm
                      </span>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 my-2">
                    <li>• <b>Tết & Gia đình</b>: 60% thu nhập</li>
                    <li>• <b>Chi tiêu sinh hoạt</b>: 40% thu nhập</li>
                    <li>• <b>Khẩn cấp & Dự phòng</b>: Tích lũy an toàn</li>
                    <li>• <b>Đầu tư học tập</b>: Mua sách, khóa học</li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={isApplyingTemplate}
                  className="w-full mt-2 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all"
                >
                  {isApplyingTemplate ? 'Đang áp dụng...' : 'Áp dụng mẫu này'}
                </button>
              </div>

              {/* Option 2: six_jars */}
              <div
                onClick={() => !isApplyingTemplate && handleApplyTemplate('six_jars')}
                className="p-4 rounded-xl border-2 border-purple-200 dark:border-purple-900/60 hover:border-purple-500 dark:hover:border-purple-500 bg-purple-50/30 dark:bg-purple-950/20 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🏺</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        6 Chiếc Lọ Tư Duy Triệu Phú
                      </h4>
                      <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                        Phương pháp T. Harv Eker
                      </span>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 my-2">
                    <li>• <b>Thiết yếu (NEC)</b>: 55%</li>
                    <li>• <b>Tự do tài chính (FFA)</b>: 10%</li>
                    <li>• <b>Tiết kiệm dài hạn (LTSS)</b>: 10%</li>
                    <li>• <b>Hưởng thụ (PLAY)</b>: 10%</li>
                    <li>• <b>Học tập (EDU)</b>: 10% • <b>Cho đi (GIVE)</b>: 5%</li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={isApplyingTemplate}
                  className="w-full mt-2 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all"
                >
                  {isApplyingTemplate ? 'Đang áp dụng...' : 'Áp dụng mẫu này'}
                </button>
              </div>

              {/* Option 3: simple_three */}
              <div
                onClick={() => !isApplyingTemplate && handleApplyTemplate('simple_three')}
                className="p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-500 dark:hover:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⚖️</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        Quy Tắc 50/30/20 (3 Hũ)
                      </h4>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Đơn giản, dễ thực hiện
                      </span>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 my-2">
                    <li>• <b>Nhu cầu thiết yếu</b>: 50%</li>
                    <li>• <b>Mục tiêu tiết kiệm</b>: 30%</li>
                    <li>• <b>Sở thích & Linh hoạt</b>: 20%</li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={isApplyingTemplate}
                  className="w-full mt-2 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                >
                  {isApplyingTemplate ? 'Đang áp dụng...' : 'Áp dụng mẫu này'}
                </button>
              </div>

              {/* Option 4: empty */}
              <div
                onClick={() => !isApplyingTemplate && handleApplyTemplate('empty')}
                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/40 dark:bg-slate-800/30 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📦</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        Tùy Biến Từ Đầu
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Khởi tạo 2 hũ căn bản
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 my-2">
                    Tạo 2 hũ cơ bản (Mục tiêu & Sinh hoạt) để bạn tự do đặt tên và thêm hũ riêng của mình.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isApplyingTemplate}
                  className="w-full mt-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-lg transition-all"
                >
                  {isApplyingTemplate ? 'Đang áp dụng...' : 'Chọn mẫu này'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL THỜI KHÓA BIỂU PHENIKAA --- */}
      <ImportSchoolScheduleModal
        isOpen={isSchoolModalOpen}
        onClose={() => setIsSchoolModalOpen(false)}
        schedules={schoolSchedules}
        onRefresh={loadData}
      />
    </div>
  )
}
