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
                  Hũ Tài Chính & Kế Hoạch Đón Tết
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse">
                  Ca 10h - 14h (15h về)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chỉ chạy cố định 4 tiếng mỗi ngày • Tự động hỏi qua Telegram khi chi tiêu & nhận
                tiền
              </p>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGigModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Nạp ca chạy (10h-14h)
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
              <BookOpen className="w-3.5 h-3.5 text-blue-500" /> TKB Phenikaa (
              {schoolSchedules.length})
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                title="Tự động đồng bộ 2 tuần / lần"
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
          {/* Card 1: Tiến độ hôm nay */}
          <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950/40 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" /> Ca Chạy Hôm Nay (10h - 14h)
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
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
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đạt chỉ tiêu ngày! Hãy về nghỉ lúc 15h.
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
