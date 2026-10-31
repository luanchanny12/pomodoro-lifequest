import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Flame,
  Clock,
  ArrowRight,
  TrendingUp,
  Moon,
  Sun,
  AlertCircle,
  Sparkles,
  Target,
  Edit3,
  Check,
  ChevronRight,
  RotateCcw,
  MessageSquare,
  GripVertical,
  Lock,
} from 'lucide-react'
import { format, addDays, isSameDay, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from 'sonner'

import {
  focusService,
  DailyMatrixTask,
  DailyMatrixTaskCreateInput,
  StudyGoal,
} from '@/services/focusService'
import { MonthlyMatrixReportModal } from './MonthlyMatrixReportModal'

interface EisenhowerMatrixViewProps {
  onStartPomodoroWithGoal?: (goalId?: number, taskTitle?: string) => void
}

const EisenhowerMatrixViewComponent: React.FC<EisenhowerMatrixViewProps> = ({
  onStartPomodoroWithGoal,
}) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [tasks, setTasks] = useState<DailyMatrixTask[]>([])
  const [goals, setGoals] = useState<StudyGoal[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false)

  // Quick Add State per quadrant
  const [addingQuadrant, setAddingQuadrant] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState<string>('')
  const [newGoalId, setNewGoalId] = useState<string>('')

  // Reflection Editing State
  const [editingReflectionTaskId, setEditingReflectionTaskId] = useState<number | null>(null)
  const [reflectionInput, setReflectionInput] = useState<string>('')

  // Anti-Double Click & Action State
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false)
  const lastCreateRef = useRef<number>(0)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [isRollingOver, setIsRollingOver] = useState<boolean>(false)

  // Load Data
  const loadData = async (date: string) => {
    setIsLoading(true)
    try {
      const [matrixData, goalsData] = await Promise.all([
        focusService.getMatrixTasks(date),
        focusService.getGoals(false), // active goals
      ])
      setTasks(matrixData)
      setGoals(goalsData)
    } catch (err) {
      console.error('Error loading matrix data:', err)
      toast.error('Không thể tải danh sách công việc')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData(selectedDate)
  }, [selectedDate])

  // Handle Toggle
  const handleToggle = async (taskId: number) => {
    if (actionLoadingId === taskId) return
    const targetTask = tasks.find((t) => t.id === taskId)
    if (targetTask && targetTask.date < todayStr && !targetTask.is_completed) {
      toast.error('Không thể hoàn thành bù công việc của ngày trong quá khứ! Các việc chưa xong đã được tự động chuyển sang ngày tiếp theo để bạn làm tiếp.')
      return
    }
    setActionLoadingId(taskId)
    try {
      const updated = await focusService.toggleMatrixTask(taskId)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
      if (updated.is_completed) {
        toast.success(`Đã hoàn thành: ${updated.title}! 👏`)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Lỗi khi cập nhật trạng thái'
      toast.error(msg)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Quick Add with Anti-Double Click & Debounce
  const handleCreateTask = async (quadrant: number) => {
    const now = Date.now()
    if (isCreatingTask || now - lastCreateRef.current < 600) {
      return
    }

    if (!newTitle.trim()) {
      toast.error('Vui lòng nhập tên công việc')
      return
    }

    lastCreateRef.current = now
    setIsCreatingTask(true)
    try {
      const created = await focusService.createMatrixTask({
        title: newTitle.trim(),
        quadrant,
        date: selectedDate,
        goal_id: newGoalId ? Number(newGoalId) : null,
      })

      setTasks((prev) => [...prev, created])
      setNewTitle('')
      setNewGoalId('')
      setAddingQuadrant(null)
      toast.success('Đã thêm công việc vào Ô ' + quadrant)
    } catch (err) {
      toast.error('Không thể thêm công việc')
    } finally {
      setIsCreatingTask(false)
    }
  }

  // Handle Delete
  const handleDeleteTask = async (taskId: number) => {
    if (actionLoadingId === taskId) return
    setActionLoadingId(taskId)
    try {
      await focusService.deleteMatrixTask(taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      toast.success('Đã xóa công việc')
    } catch (err) {
      toast.error('Không thể xóa công việc')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Move Quadrant
  const handleMoveQuadrant = async (taskId: number, newQuadrant: number) => {
    try {
      const updated = await focusService.updateMatrixTask(taskId, { quadrant: newQuadrant })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
      toast.success(`Đã chuyển sang Ô ${newQuadrant}`)
    } catch (err) {
      toast.error('Lỗi khi chuyển ô')
    }
  }

  // Handle Save Reflection Note
  const handleSaveReflection = async (taskId: number) => {
    try {
      const updated = await focusService.updateMatrixReflection(taskId, reflectionInput.trim())
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
      setEditingReflectionTaskId(null)
      setReflectionInput('')
      toast.success('Đã lưu ghi chú tự đánh giá 📝')
    } catch (err) {
      toast.error('Lỗi khi lưu ghi chú')
    }
  }

  // Handle Rollover (Sao chép việc dở hôm nay sang ngày mai)
  const handleRollover = async () => {
    if (isRollingOver) return
    setIsRollingOver(true)
    try {
      const res = await focusService.rolloverMatrixTasks(todayStr, tomorrowStr)
      toast.success(res.message)
      if (selectedDate === tomorrowStr) {
        loadData(tomorrowStr)
      }
    } catch (err) {
      toast.error('Lỗi khi chuyển việc dở sang ngày mai')
    } finally {
      setIsRollingOver(false)
    }
  }

  const q1Tasks = tasks.filter((t) => t.quadrant === 1)
  const q2Tasks = tasks.filter((t) => t.quadrant === 2)
  const q3Tasks = tasks.filter((t) => t.quadrant === 3)
  const q4Tasks = tasks.filter((t) => t.quadrant === 4)

  const totalCount = tasks.length
  const completedCount = tasks.filter((t) => t.is_completed).length
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const q1Done = q1Tasks.filter((t) => t.is_completed).length
  const q2Done = q2Tasks.filter((t) => t.is_completed).length
  const q3Done = q3Tasks.filter((t) => t.is_completed).length
  const q4Done = q4Tasks.filter((t) => t.is_completed).length

  // Huấn luyện viên Năng suất & Động lực Thông minh
  const coachFeedback = useMemo(() => {
    if (totalCount === 0) {
      return {
        badge: 'Khởi đầu ngày mới',
        icon: '🎯',
        quote: 'Một ngày mới ngập tràn cơ hội! Hãy chọn ra 1-3 việc trọng tâm ở Ô 1 hoặc Ô 2 để bắt đầu ngày làm việc hiệu quả nhé.',
      }
    }
    if (completedCount === totalCount) {
      return {
        badge: 'Đỉnh cao kỷ luật',
        icon: '🏆',
        quote: 'Xuất sắc tuyệt đối! Bạn đã hoàn thành trọn vẹn 100% danh sách công việc. Một ngày đại thắng không còn gì nuối tiếc. Hãy tận hưởng buổi tối thư giãn và nạp năng lượng nhé!',
      }
    }
    if (q2Done > 0 && q2Done >= q2Tasks.length && q2Tasks.length > 0) {
      return {
        badge: 'Tư duy chiến lược',
        icon: '⭐',
        quote: 'Rất ấn tượng! Bạn đã hoàn thành các mục tiêu ở Ô 2 (Đầu tư dài hạn & Cốt lõi). Đây chính là bí quyết của những người thành công nhất để tạo bước nhảy vọt tương lai!',
      }
    }
    if (q1Done > 0 && q1Done >= q1Tasks.length && q1Tasks.length > 0) {
      return {
        badge: 'Dọn sạch khủng hoảng',
        icon: '🔥',
        quote: 'Phản xạ tuyệt vời! Áp lực và các việc khẩn cấp ở Ô 1 đã được bạn xử lý dứt điểm. Tâm trí đã nhẹ nhõm, hãy chuyển sang các mục tiêu dài hạn tiếp theo nhé!',
      }
    }
    if (completionPercent >= 50) {
      return {
        badge: 'Đang bứt phá mạnh mẽ',
        icon: '⚡',
        quote: `Tiến độ rất tốt (${completionPercent}%)! Bạn đã đi được hơn nửa chặng đường của danh sách việc. Tiếp tục giữ vững nhịp độ tập trung này nhé!`,
      }
    }
    if (completedCount > 0) {
      return {
        badge: 'Khởi động tích cực',
        icon: '🌱',
        quote: `Khởi đầu vững chắc! Bạn đã giải quyết được ${completedCount} việc. Từng bước nhỏ kiên trì sẽ tạo nên thành tựu lớn. Đừng ngại bấm "Chuyển việc dở sang ngày mai" nếu cần nghỉ ngơi!`,
      }
    }
    return {
      badge: 'Sẵn sàng hành động',
      icon: '🚀',
      quote: 'Mọi hành trình vạn dặm đều bắt đầu từ một bước chân. Hãy bật Pomodoro 25 phút để dứt điểm ngay công việc đầu tiên nào!',
    }
  }, [totalCount, completedCount, completionPercent, q1Done, q1Tasks.length, q2Done, q2Tasks.length])

  const isToday = selectedDate === todayStr
  const isTomorrow = selectedDate === tomorrowStr

  return (
    <div className="space-y-6 text-white animate-in fade-in duration-300">
      {/* ── HEADER & DATE NAVIGATION ── */}
      <div className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300 bg-clip-text text-transparent">
              Ma Trận Quản Lý Công Việc 4 Ô
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
              Eisenhower Matrix
            </span>
          </div>
          <p className="text-xs text-white/70 mt-1">
            Phân loại rõ việc lớn - việc nhỏ • Lên lịch tối hôm trước • Tự đánh giá và hoàn thiện bản thân
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Today Button */}
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              isToday
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Hôm nay</span>
          </button>

          {/* Tomorrow / Night-Before Button */}
          <button
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              isTomorrow
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Ngày mai 🌙</span>
          </button>

          {/* Date Picker Input */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-black/40 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
          />

          {/* Rollover Button */}
          {isToday && (
            <button
              onClick={handleRollover}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/60 hover:bg-indigo-600 text-white transition flex items-center gap-1 shadow-md border border-indigo-400/30 active:scale-95"
              title="Hệ thống tự động chuyển việc dở sang ngày mai. Bạn cũng có thể bấm nút này để đồng bộ ngay lập tức"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chuyển việc dở sang mai (Tự động)</span>
              <span className="sm:hidden">Dở sang mai</span>
            </button>
          )}

          {/* Monthly Report Modal Trigger */}
          <button
            onClick={() => setIsReportOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Báo cáo tháng</span>
          </button>
        </div>
      </div>

      {/* Past Date Archive Reminder Banner */}
      {selectedDate < todayStr && (
        <div className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-black/40 to-slate-900/40 border border-amber-500/30 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📅</span>
            <div>
              <span className="font-bold text-amber-300">
                Lịch sử ngày {format(parseISO(selectedDate), 'dd/MM/yyyy')}:
              </span>{' '}
              <span className="text-white/80">
                Các việc chưa hoàn thành ở ngày này đã được khóa lại và tự động chuyển sang ngày tiếp theo để bảo toàn tính kỷ luật.
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedDate(todayStr)}
            className="text-xs text-amber-400 underline font-semibold flex-shrink-0 hover:text-amber-300"
          >
            Về hôm nay
          </button>
        </div>
      )}

      {/* Night-before Planning Reminder Banner */}
      {isTomorrow && (
        <div className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900/40 border border-purple-500/40 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🌙</span>
            <div>
              <span className="font-bold text-purple-200">
                Chế độ Lập Kế Hoạch Tối Hôm Trước (Night-Before Routine):
              </span>{' '}
              <span className="text-white/80">
                Bạn đang lên danh sách cho ngày mai ({format(parseISO(tomorrowStr), 'dd/MM/yyyy')}). Chuẩn bị trước giúp sáng mai thức dậy hành động ngay mà không tốn ý chí!
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedDate(todayStr)}
            className="text-xs text-purple-300 underline font-semibold flex-shrink-0"
          >
            Quay lại hôm nay
          </button>
        </div>
      )}

      {/* ── DAILY MATRIX ANALYTICS & MOTIVATIONAL COACH ── */}
      <div className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-3xl p-5 shadow-2xl relative overflow-hidden transition-all">
        {/* Glowing backdrop accent */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Top Bar: Progress & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center text-black font-black text-base shadow-md shadow-amber-500/20 flex-shrink-0">
                📊
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>Tiến Độ Công Việc Hôm Nay</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white font-mono font-bold border border-white/15">
                    {completedCount}/{totalCount} ({completionPercent}%)
                  </span>
                </h3>
                <p className="text-[11px] text-white/60">
                  Thống kê thời gian thực theo 4 ô nguyên lý Eisenhower
                </p>
              </div>
            </div>

            {/* 4-Quadrant Mini Pills */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 text-[11px] font-semibold">
              <div className="px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-between sm:justify-start gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                <span>Ô 1:</span>
                <span className="font-bold text-white font-mono">{q1Done}/{q1Tasks.length}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between sm:justify-start gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Ô 2 ⭐:</span>
                <span className="font-bold text-white font-mono">{q2Done}/{q2Tasks.length}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-between sm:justify-start gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span>Ô 3:</span>
                <span className="font-bold text-white font-mono">{q3Done}/{q3Tasks.length}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-between sm:justify-start gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                <span>Ô 4:</span>
                <span className="font-bold text-white font-mono">{q4Done}/{q4Tasks.length}</span>
              </div>
            </div>
          </div>

          {/* Glowing Animated Progress Bar */}
          <div className="w-full bg-black/50 border border-white/10 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completionPercent === 100
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                  : completionPercent >= 50
                  ? 'bg-gradient-to-r from-amber-400 to-emerald-400'
                  : 'bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-400'
              }`}
              style={{ width: `${Math.max(completionPercent > 0 ? 5 : 0, Math.min(100, completionPercent))}%` }}
            />
          </div>

          {/* Motivational Coach Box */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start sm:items-center gap-3">
            <div className="text-2xl flex-shrink-0 animate-bounce duration-1000">
              {coachFeedback.icon}
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {coachFeedback.badge}
                </span>
                <span className="text-[11px] text-white/50">Huấn Luyện Viên Động Lực</span>
              </div>
              <p className="text-xs text-white/90 font-medium leading-relaxed">
                {coachFeedback.quote}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4-QUADRANT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ================= Ô 1 ================= */}
        <QuadrantCard
          quadrantNumber={1}
          title="Ô 1: Quan Trọng + Khẩn Cấp"
          subtitle="Làm ngay • Sắp đến hạn, bài thi ngày mai, lỗi nghiêm trọng"
          themeColor="rose"
          tasks={q1Tasks}
          goals={goals}
          todayStr={todayStr}
          isAdding={addingQuadrant === 1}
          isSubmitting={isCreatingTask}
          actionLoadingId={actionLoadingId}
          newTitle={newTitle}
          newGoalId={newGoalId}
          onStartAdd={() => {
            setAddingQuadrant(1)
            setNewTitle('')
            setNewGoalId('')
          }}
          onCancelAdd={() => setAddingQuadrant(null)}
          onTitleChange={setNewTitle}
          onGoalChange={setNewGoalId}
          onSubmitAdd={() => handleCreateTask(1)}
          onToggle={handleToggle}
          onDelete={handleDeleteTask}
          onMove={handleMoveQuadrant}
          onStartEditReflection={(t) => {
            setEditingReflectionTaskId(t.id)
            setReflectionInput(t.reflection_note || '')
          }}
          editingReflectionTaskId={editingReflectionTaskId}
          reflectionInput={reflectionInput}
          onReflectionInputChange={setReflectionInput}
          onSaveReflection={handleSaveReflection}
          onCancelReflection={() => setEditingReflectionTaskId(null)}
          onStartPomodoro={onStartPomodoroWithGoal}
        />

        {/* ================= Ô 2 ================= */}
        <QuadrantCard
          quadrantNumber={2}
          title="Ô 2: Quan Trọng + Chưa Khẩn Cấp ⭐"
          subtitle="Lên lịch làm • Đầu tư dài hạn, 1000h Tiếng Anh, lập trình, luyện thanh"
          themeColor="emerald"
          badge="Cốt lõi thành công"
          tasks={q2Tasks}
          goals={goals}
          todayStr={todayStr}
          isAdding={addingQuadrant === 2}
          isSubmitting={isCreatingTask}
          actionLoadingId={actionLoadingId}
          newTitle={newTitle}
          newGoalId={newGoalId}
          onStartAdd={() => {
            setAddingQuadrant(2)
            setNewTitle('')
            setNewGoalId('')
          }}
          onCancelAdd={() => setAddingQuadrant(null)}
          onTitleChange={setNewTitle}
          onGoalChange={setNewGoalId}
          onSubmitAdd={() => handleCreateTask(2)}
          onToggle={handleToggle}
          onDelete={handleDeleteTask}
          onMove={handleMoveQuadrant}
          onStartEditReflection={(t) => {
            setEditingReflectionTaskId(t.id)
            setReflectionInput(t.reflection_note || '')
          }}
          editingReflectionTaskId={editingReflectionTaskId}
          reflectionInput={reflectionInput}
          onReflectionInputChange={setReflectionInput}
          onSaveReflection={handleSaveReflection}
          onCancelReflection={() => setEditingReflectionTaskId(null)}
          onStartPomodoro={onStartPomodoroWithGoal}
        />

        {/* ================= Ô 3 ================= */}
        <QuadrantCard
          quadrantNumber={3}
          title="Ô 3: Không Quan Trọng + Khẩn Cấp"
          subtitle="Ủy quyền hoặc Xử lý nhanh • Tin nhắn gấp, việc nhờ người khác, quét nhà"
          themeColor="amber"
          tasks={q3Tasks}
          goals={goals}
          todayStr={todayStr}
          isAdding={addingQuadrant === 3}
          isSubmitting={isCreatingTask}
          actionLoadingId={actionLoadingId}
          newTitle={newTitle}
          newGoalId={newGoalId}
          onStartAdd={() => {
            setAddingQuadrant(3)
            setNewTitle('')
            setNewGoalId('')
          }}
          onCancelAdd={() => setAddingQuadrant(null)}
          onTitleChange={setNewTitle}
          onGoalChange={setNewGoalId}
          onSubmitAdd={() => handleCreateTask(3)}
          onToggle={handleToggle}
          onDelete={handleDeleteTask}
          onMove={handleMoveQuadrant}
          onStartEditReflection={(t) => {
            setEditingReflectionTaskId(t.id)
            setReflectionInput(t.reflection_note || '')
          }}
          editingReflectionTaskId={editingReflectionTaskId}
          reflectionInput={reflectionInput}
          onReflectionInputChange={setReflectionInput}
          onSaveReflection={handleSaveReflection}
          onCancelReflection={() => setEditingReflectionTaskId(null)}
          onStartPomodoro={onStartPomodoroWithGoal}
        />

        {/* ================= Ô 4 ================= */}
        <QuadrantCard
          quadrantNumber={4}
          title="Ô 4: Không Quan Trọng + Chưa Khẩn Cấp"
          subtitle="Hạn chế hoặc Loại bỏ • Lướt TikTok vô bổ, xem video liên tục"
          themeColor="purple"
          tasks={q4Tasks}
          goals={goals}
          todayStr={todayStr}
          isAdding={addingQuadrant === 4}
          isSubmitting={isCreatingTask}
          actionLoadingId={actionLoadingId}
          newTitle={newTitle}
          newGoalId={newGoalId}
          onStartAdd={() => {
            setAddingQuadrant(4)
            setNewTitle('')
            setNewGoalId('')
          }}
          onCancelAdd={() => setAddingQuadrant(null)}
          onTitleChange={setNewTitle}
          onGoalChange={setNewGoalId}
          onSubmitAdd={() => handleCreateTask(4)}
          onToggle={handleToggle}
          onDelete={handleDeleteTask}
          onMove={handleMoveQuadrant}
          onStartEditReflection={(t) => {
            setEditingReflectionTaskId(t.id)
            setReflectionInput(t.reflection_note || '')
          }}
          editingReflectionTaskId={editingReflectionTaskId}
          reflectionInput={reflectionInput}
          onReflectionInputChange={setReflectionInput}
          onSaveReflection={handleSaveReflection}
          onCancelReflection={() => setEditingReflectionTaskId(null)}
          onStartPomodoro={onStartPomodoroWithGoal}
        />
      </div>

      {/* Monthly Report Modal */}
      <MonthlyMatrixReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  )
}

export const EisenhowerMatrixView = React.memo(EisenhowerMatrixViewComponent)

// ── REUSABLE QUADRANT CARD COMPONENT ──
interface QuadrantCardProps {
  quadrantNumber: number
  title: string
  subtitle: string
  themeColor: 'rose' | 'emerald' | 'amber' | 'purple'
  badge?: string
  tasks: DailyMatrixTask[]
  goals: StudyGoal[]
  todayStr: string
  isAdding: boolean
  isSubmitting?: boolean
  actionLoadingId?: number | null
  newTitle: string
  newGoalId: string
  onStartAdd: () => void
  onCancelAdd: () => void
  onTitleChange: (val: string) => void
  onGoalChange: (val: string) => void
  onSubmitAdd: () => void
  onToggle: (taskId: number) => void
  onDelete: (taskId: number) => void
  onMove: (taskId: number, newQuad: number) => void
  onStartEditReflection: (task: DailyMatrixTask) => void
  editingReflectionTaskId: number | null
  reflectionInput: string
  onReflectionInputChange: (val: string) => void
  onSaveReflection: (taskId: number) => void
  onCancelReflection: () => void
  onStartPomodoro?: (goalId?: number, taskTitle?: string) => void
}

const QuadrantCardComponent: React.FC<QuadrantCardProps> = ({
  quadrantNumber,
  title,
  subtitle,
  themeColor,
  badge,
  tasks,
  goals,
  todayStr,
  isAdding,
  isSubmitting = false,
  actionLoadingId = null,
  newTitle,
  newGoalId,
  onStartAdd,
  onCancelAdd,
  onTitleChange,
  onGoalChange,
  onSubmitAdd,
  onToggle,
  onDelete,
  onMove,
  onStartEditReflection,
  editingReflectionTaskId,
  reflectionInput,
  onReflectionInputChange,
  onSaveReflection,
  onCancelReflection,
  onStartPomodoro,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const colorStyles = {
    rose: {
      border: 'border-rose-500/40 hover:border-rose-400/60 shadow-rose-950/30',
      headerBg: 'from-rose-950/50 via-black/40 to-black/30',
      badge: 'bg-rose-500/25 text-rose-200 border-rose-500/50',
      accentText: 'text-rose-400',
      addBtn: 'hover:bg-rose-500/25 text-rose-300',
    },
    emerald: {
      border: 'border-emerald-500/40 hover:border-emerald-400/60 shadow-emerald-950/30',
      headerBg: 'from-emerald-950/50 via-black/40 to-black/30',
      badge: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50',
      accentText: 'text-emerald-400',
      addBtn: 'hover:bg-emerald-500/25 text-emerald-300',
    },
    amber: {
      border: 'border-amber-500/40 hover:border-amber-400/60 shadow-amber-950/30',
      headerBg: 'from-amber-950/50 via-black/40 to-black/30',
      badge: 'bg-amber-500/25 text-amber-200 border-amber-500/50',
      accentText: 'text-amber-400',
      addBtn: 'hover:bg-amber-500/25 text-amber-300',
    },
    purple: {
      border: 'border-purple-500/40 hover:border-purple-400/60 shadow-purple-950/30',
      headerBg: 'from-purple-950/50 via-black/40 to-black/30',
      badge: 'bg-purple-500/25 text-purple-200 border-purple-500/50',
      accentText: 'text-purple-400',
      addBtn: 'hover:bg-purple-500/25 text-purple-300',
    },
  }[themeColor]

  const completedCount = tasks.filter((t) => t.is_completed).length

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (!isDragOver) setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const taskIdStr = e.dataTransfer.getData('text/plain')
        if (taskIdStr) {
          const taskId = Number(taskIdStr)
          if (taskId) {
            onMove(taskId, quadrantNumber)
          }
        }
      }}
      className={`bg-black/40 backdrop-blur-xl border ${colorStyles.border} rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all duration-200 relative ${
        isDragOver ? 'ring-2 ring-amber-400 bg-amber-500/10 shadow-2xl scale-[1.015]' : ''
      }`}
    >
      {isDragOver && (
        <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-amber-400 pointer-events-none flex items-center justify-center bg-black/40 z-20">
          <span className="text-xs font-bold text-amber-300 px-3 py-1.5 rounded-xl bg-black/80 shadow">
            Thả vào đây để chuyển sang Ô {quadrantNumber} 📥
          </span>
        </div>
      )}
      <div>
        {/* Quadrant Header */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                <span>{title}</span>
              </h3>
              {badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/60 mt-0.5">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-white/80 font-mono font-bold">
              {completedCount}/{tasks.length}
            </span>
            <button
              onClick={onStartAdd}
              className={`p-2.5 sm:p-1.5 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl bg-white/10 ${colorStyles.addBtn} active:scale-95 transition shadow-sm`}
              title="Thêm công việc vào ô này"
            >
              <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Inline Add Task Form */}
        {isAdding && (
          <div className="mt-3 p-3 rounded-2xl bg-white/5 border border-white/15 space-y-2.5 animate-in fade-in duration-150">
            <input
              type="text"
              autoFocus
              disabled={isSubmitting}
              value={newTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) onSubmitAdd()
                if (e.key === 'Escape' && !isSubmitting) onCancelAdd()
              }}
              placeholder={`Nhập tên việc Ô ${quadrantNumber}... (Enter để lưu)`}
              className="w-full px-3.5 py-2.5 sm:py-2 bg-black/50 border border-white/20 rounded-xl text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/60 disabled:opacity-50"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              {/* Optional Goal Link Dropdown */}
              <select
                value={newGoalId}
                disabled={isSubmitting}
                onChange={(e) => onGoalChange(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 sm:py-1 bg-black/50 border border-white/20 rounded-xl text-xs sm:text-[11px] text-white/80 focus:outline-none min-h-[36px] sm:min-h-0"
              >
                <option value="">🎯 Không gắn mục tiêu lớn (việc đời sống/khác)</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#1A1E26] text-white">
                    🎯 {g.title} ({g.current_hours}/{g.target_hours}h)
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={onCancelAdd}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 sm:py-1 text-xs sm:text-[11px] text-white/60 hover:text-white rounded-lg transition min-h-[38px] sm:min-h-0 disabled:opacity-40"
                >
                  Hủy
                </button>
                <button
                  onClick={onSubmitAdd}
                  disabled={isSubmitting}
                  className="px-4 py-2 sm:py-1 bg-white text-black font-bold text-xs rounded-xl hover:bg-white/90 active:scale-95 transition shadow flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Đang thêm...</span>
                    </>
                  ) : (
                    <span>Thêm việc</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Items List */}
        <div className="mt-3 space-y-2.5 min-h-[140px]">
          {tasks.length === 0 && !isAdding ? (
            <div className="h-28 flex flex-col items-center justify-center text-center text-white/40 text-xs">
              <Circle className="w-5 h-5 mb-1.5 opacity-30" />
              <span>Chưa có việc nào trong ô này.</span>
              <button
                onClick={onStartAdd}
                className="mt-1 text-white/70 hover:text-white underline font-medium text-[11px]"
              >
                + Bấm để thêm ngay
              </button>
            </div>
          ) : (
            tasks.map((task) => {
              const isEditingRef = editingReflectionTaskId === task.id
              const isPastUnfinished = task.date < todayStr && !task.is_completed
              return (
                <div
                  key={task.id}
                  draggable={!task.is_completed && !isPastUnfinished}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(task.id))
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className={`p-3 rounded-2xl border transition-all duration-150 group/task relative ${
                    task.is_completed
                      ? 'bg-white/5 border-white/10 opacity-70'
                      : isPastUnfinished
                      ? 'bg-rose-950/20 border-rose-500/20 hover:border-rose-500/30'
                      : 'bg-black/30 border-white/15 hover:border-white/30 cursor-grab active:cursor-grabbing hover:bg-white/5'
                  }`}
                  title={!task.is_completed && !isPastUnfinished ? 'Kéo thả sang ô khác hoặc bấm vào để học' : undefined}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    {/* Grip handle & Checkbox & Title */}
                    <div className="flex items-start gap-1.5 flex-1 min-w-0">
                      {!task.is_completed && !isPastUnfinished && (
                        <div className="mt-1 text-white/20 group-hover/task:text-white/60 transition flex-shrink-0 cursor-grab active:cursor-grabbing" title="Kéo để đổi ô">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (isPastUnfinished) {
                            toast.error(
                              'Không thể tích bù công việc của ngày trong quá khứ! Các việc chưa xong đã được tự động chuyển sang ngày tiếp theo để bạn làm tiếp.'
                            )
                            return
                          }
                          onToggle(task.id)
                        }}
                        disabled={actionLoadingId === task.id}
                        className={`p-1 sm:p-0.5 mt-0.5 flex-shrink-0 transition rounded-lg ${
                          isPastUnfinished
                            ? 'text-rose-400/80 hover:bg-rose-500/10 cursor-not-allowed'
                            : 'text-white/50 hover:text-emerald-400 active:scale-90 disabled:opacity-50'
                        }`}
                        title={
                          isPastUnfinished
                            ? 'Đã khóa - Không thể tích bù việc chưa xong trong quá khứ (đã tự động chuyển tiếp)'
                            : task.is_completed
                            ? 'Đánh dấu chưa xong'
                            : 'Tích hoàn thành'
                        }
                      >
                        {isPastUnfinished ? (
                          <Lock className="w-5 h-5 text-rose-400/80" />
                        ) : task.is_completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                        ) : (
                          <Circle className="w-5 h-5 text-white/40 hover:text-white" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-semibold break-words leading-tight ${
                            task.is_completed
                              ? 'line-through text-white/50'
                              : isPastUnfinished
                              ? 'text-rose-200/90'
                              : 'text-white'
                          }`}
                        >
                          {task.title}
                        </div>

                        {/* Associated Goal Badge & Quick Pomodoro Focus Button */}
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          {isPastUnfinished && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Khóa quá khứ</span>
                            </span>
                          )}

                          {task.reflection_note && /chuyển từ/i.test(task.reflection_note) && !task.is_completed && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Tự động chuyển tiếp</span>
                            </span>
                          )}

                          {task.goal_title && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                              style={{
                                backgroundColor: `${task.goal_color || '#3b82f6'}25`,
                                color: task.goal_color || '#60a5fa',
                                borderColor: `${task.goal_color || '#3b82f6'}40`,
                                borderWidth: 1,
                              }}
                            >
                              <Target className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[140px]">{task.goal_title}</span>
                            </span>
                          )}

                          {onStartPomodoro && !task.is_completed && !isPastUnfinished && (
                            <button
                              onClick={() => onStartPomodoro(task.goal_id || undefined, task.title)}
                              className="text-[10px] text-cyan-300 hover:text-cyan-200 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 px-2 py-0.5 rounded-md font-semibold transition flex items-center gap-1"
                              title="Điền tên việc này vào đồng hồ Pomodoro và bắt đầu cày ngay"
                            >
                              <span>▶ Học Pomodoro</span>
                            </button>
                          )}
                        </div>

                        {/* Reflection Note display if present */}
                        {task.reflection_note && !isEditingRef && (
                          <div className="mt-1.5 p-2 rounded-xl bg-black/40 border border-white/10 text-[11px] text-amber-200/90 italic flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold not-italic">📝:</span>
                            <span className="flex-1">{task.reflection_note}</span>
                            <button
                              onClick={() => onStartEditReflection(task)}
                              className="text-white/40 hover:text-white p-0.5 rounded"
                              title="Chỉnh sửa ghi chú"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Reflection Note inline editor */}
                        {isEditingRef && (
                          <div className="mt-2 p-2.5 rounded-xl bg-black/60 border border-amber-400/40 space-y-2">
                            <div className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
                              <span>📝 Tự đánh giá / Ghi chú cá nhân hóa:</span>
                            </div>
                            <textarea
                              rows={2}
                              value={reflectionInput}
                              onChange={(e) => onReflectionInputChange(e.target.value)}
                              placeholder="Ghi chú lý do chưa xong (bận, mệt) hoặc hoàn thành nhưng thiếu giờ cần bù..."
                              className="w-full p-2 bg-black/50 border border-white/20 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={onCancelReflection}
                                className="px-2 py-0.5 text-[10px] text-white/60 hover:text-white"
                              >
                                Đóng
                              </button>
                              <button
                                onClick={() => onSaveReflection(task.id)}
                                className="px-2.5 py-0.5 bg-amber-400 text-black font-bold text-[10px] rounded-lg hover:bg-amber-300"
                              >
                                Lưu ghi chú
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons (Reflection, Move, Delete) */}
                    <div className="flex items-center gap-1.5 sm:gap-1 flex-shrink-0">
                      {/* Reflection button if not already has one */}
                      {!task.reflection_note && !isEditingRef && (
                        <button
                          onClick={() => onStartEditReflection(task)}
                          className="p-2 sm:p-1 min-w-[34px] min-h-[34px] flex items-center justify-center text-white/40 hover:text-amber-300 hover:bg-white/10 rounded-lg transition active:scale-90"
                          title="Thêm ghi chú tự đánh giá cá nhân (lý do chưa xong, thiếu giờ...)"
                        >
                          <Edit3 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}

                      {/* Move Quadrant Dropdown */}
                      <select
                        value={task.quadrant}
                        disabled={isPastUnfinished}
                        onChange={(e) => onMove(task.id, Number(e.target.value))}
                        className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 min-h-[34px] sm:min-h-0 text-xs sm:text-[10px] text-white/70 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        title={isPastUnfinished ? "Không thể chuyển ô công việc của ngày trong quá khứ" : "Chuyển sang ô khác"}
                      >
                        <option value={1}>Ô 1 (Làm ngay)</option>
                        <option value={2}>Ô 2 (Lên lịch)</option>
                        <option value={3}>Ô 3 (Nhanh)</option>
                        <option value={4}>Ô 4 (Loại bỏ)</option>
                      </select>

                      {/* Delete */}
                      <button
                        onClick={() => onDelete(task.id)}
                        disabled={actionLoadingId === task.id}
                        className="p-2 sm:p-1 min-w-[34px] min-h-[34px] flex items-center justify-center text-white/30 hover:text-rose-400 hover:bg-white/10 rounded-lg transition active:scale-90 disabled:opacity-40"
                        title="Xóa việc này"
                      >
                        <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Card Footer Quick Add Button */}
      {!isAdding && tasks.length > 0 && (
        <button
          onClick={onStartAdd}
          className="mt-3 w-full py-2.5 sm:py-2 min-h-[44px] rounded-xl border border-dashed border-white/20 hover:border-white/40 active:bg-white/10 text-white/70 hover:text-white text-xs sm:text-[11px] font-bold transition flex items-center justify-center gap-2 active:scale-98 shadow-sm"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Thêm việc vào Ô {quadrantNumber}</span>
        </button>
      )}
    </div>
  )
}

const QuadrantCard = React.memo(QuadrantCardComponent)
