import React, { useState, useEffect } from 'react'
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
  onStartPomodoroWithGoal?: (goalId?: number) => void
}

export const EisenhowerMatrixView: React.FC<EisenhowerMatrixViewProps> = ({
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
    try {
      const updated = await focusService.toggleMatrixTask(taskId)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
      if (updated.is_completed) {
        toast.success(`Đã hoàn thành: ${updated.title}! 👏`)
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật trạng thái')
    }
  }

  // Handle Quick Add
  const handleCreateTask = async (quadrant: number) => {
    if (!newTitle.trim()) {
      toast.error('Vui lòng nhập tên công việc')
      return
    }

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
    }
  }

  // Handle Delete
  const handleDeleteTask = async (taskId: number) => {
    try {
      await focusService.deleteMatrixTask(taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      toast.success('Đã xóa công việc')
    } catch (err) {
      toast.error('Không thể xóa công việc')
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
    try {
      const res = await focusService.rolloverMatrixTasks(todayStr, tomorrowStr)
      toast.success(res.message)
      if (selectedDate === tomorrowStr) {
        loadData(tomorrowStr)
      }
    } catch (err) {
      toast.error('Lỗi khi chuyển việc dở sang ngày mai')
    }
  }

  const q1Tasks = tasks.filter((t) => t.quadrant === 1)
  const q2Tasks = tasks.filter((t) => t.quadrant === 2)
  const q3Tasks = tasks.filter((t) => t.quadrant === 3)
  const q4Tasks = tasks.filter((t) => t.quadrant === 4)

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
              title="Sao chép toàn bộ việc chưa xong hôm nay sang ngày mai để tối nay chuẩn bị trước"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chuyển việc dở sang ngày mai</span>
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
          isAdding={addingQuadrant === 1}
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
          isAdding={addingQuadrant === 2}
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
          isAdding={addingQuadrant === 3}
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
          isAdding={addingQuadrant === 4}
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

// ── REUSABLE QUADRANT CARD COMPONENT ──
interface QuadrantCardProps {
  quadrantNumber: number
  title: string
  subtitle: string
  themeColor: 'rose' | 'emerald' | 'amber' | 'purple'
  badge?: string
  tasks: DailyMatrixTask[]
  goals: StudyGoal[]
  isAdding: boolean
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
  onStartPomodoro?: (goalId?: number) => void
}

const QuadrantCard: React.FC<QuadrantCardProps> = ({
  quadrantNumber,
  title,
  subtitle,
  themeColor,
  badge,
  tasks,
  goals,
  isAdding,
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
  const colorStyles = {
    rose: {
      border: 'border-rose-500/35',
      headerBg: 'from-rose-950/40 via-black/40 to-black/30',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      accentText: 'text-rose-400',
      addBtn: 'hover:bg-rose-500/20 text-rose-300',
    },
    emerald: {
      border: 'border-emerald-500/35',
      headerBg: 'from-emerald-950/40 via-black/40 to-black/30',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      accentText: 'text-emerald-400',
      addBtn: 'hover:bg-emerald-500/20 text-emerald-300',
    },
    amber: {
      border: 'border-amber-500/35',
      headerBg: 'from-amber-950/40 via-black/40 to-black/30',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      accentText: 'text-amber-400',
      addBtn: 'hover:bg-amber-500/20 text-amber-300',
    },
    purple: {
      border: 'border-purple-500/35',
      headerBg: 'from-purple-950/40 via-black/40 to-black/30',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      accentText: 'text-purple-400',
      addBtn: 'hover:bg-purple-500/20 text-purple-300',
    },
  }[themeColor]

  const completedCount = tasks.filter((t) => t.is_completed).length

  return (
    <div
      className={`bg-black/40 backdrop-blur-xl border ${colorStyles.border} rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all duration-200`}
    >
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

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs px-2 py-0.5 rounded-lg bg-white/10 text-white/80 font-mono font-bold">
              {completedCount}/{tasks.length}
            </span>
            <button
              onClick={onStartAdd}
              className={`p-1.5 rounded-xl bg-white/10 ${colorStyles.addBtn} transition`}
              title="Thêm công việc vào ô này"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Add Task Form */}
        {isAdding && (
          <div className="mt-3 p-3 rounded-2xl bg-white/5 border border-white/15 space-y-2 animate-in fade-in duration-150">
            <input
              type="text"
              autoFocus
              value={newTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmitAdd()
                if (e.key === 'Escape') onCancelAdd()
              }}
              placeholder={`Nhập tên việc Ô ${quadrantNumber}... (Enter để lưu)`}
              className="w-full px-3 py-1.5 bg-black/50 border border-white/20 rounded-xl text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/60"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              {/* Optional Goal Link Dropdown */}
              <select
                value={newGoalId}
                onChange={(e) => onGoalChange(e.target.value)}
                className="w-full sm:w-auto px-2 py-1 bg-black/50 border border-white/20 rounded-xl text-[11px] text-white/80 focus:outline-none"
              >
                <option value="">🎯 Không gắn mục tiêu lớn (việc đời sống/khác)</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#1A1E26] text-white">
                    🎯 {g.title} ({g.current_hours}/{g.target_hours}h)
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                <button
                  onClick={onCancelAdd}
                  className="px-2.5 py-1 text-[11px] text-white/60 hover:text-white rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  onClick={onSubmitAdd}
                  className="px-3 py-1 bg-white text-black font-bold text-xs rounded-xl hover:bg-white/90 transition shadow"
                >
                  Thêm việc
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
              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-2xl border transition-all duration-150 ${
                    task.is_completed
                      ? 'bg-white/5 border-white/10 opacity-70'
                      : 'bg-black/30 border-white/15 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    {/* Checkbox & Title */}
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <button
                        onClick={() => onToggle(task.id)}
                        className="mt-0.5 text-white/50 hover:text-emerald-400 transition flex-shrink-0"
                        title={task.is_completed ? 'Đánh dấu chưa xong' : 'Tích hoàn thành'}
                      >
                        {task.is_completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                        ) : (
                          <Circle className="w-5 h-5 text-white/40 hover:text-white" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-semibold break-words leading-tight ${
                            task.is_completed ? 'line-through text-white/50' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </div>

                        {/* Associated Goal Badge */}
                        {task.goal_title && (
                          <div className="mt-1 flex items-center gap-1.5">
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
                              <span className="truncate max-w-[150px]">{task.goal_title}</span>
                            </span>

                            {onStartPomodoro && task.goal_id && (
                              <button
                                onClick={() => onStartPomodoro(task.goal_id || undefined)}
                                className="text-[10px] text-white/50 hover:text-white underline"
                                title="Bật đồng hồ Pomodoro cho mục tiêu này"
                              >
                                Học Pomodoro
                              </button>
                            )}
                          </div>
                        )}

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
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Reflection button if not already has one */}
                      {!task.reflection_note && !isEditingRef && (
                        <button
                          onClick={() => onStartEditReflection(task)}
                          className="p-1 text-white/40 hover:text-amber-300 hover:bg-white/10 rounded-lg transition"
                          title="Thêm ghi chú tự đánh giá cá nhân (lý do chưa xong, thiếu giờ...)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Move Quadrant Dropdown */}
                      <select
                        value={task.quadrant}
                        onChange={(e) => onMove(task.id, Number(e.target.value))}
                        className="bg-black/50 border border-white/15 rounded-lg px-1.5 py-0.5 text-[10px] text-white/70 focus:outline-none"
                        title="Chuyển sang ô khác"
                      >
                        <option value={1}>Ô 1 (Làm ngay)</option>
                        <option value={2}>Ô 2 (Lên lịch)</option>
                        <option value={3}>Ô 3 (Nhanh)</option>
                        <option value={4}>Ô 4 (Loại bỏ)</option>
                      </select>

                      {/* Delete */}
                      <button
                        onClick={() => onDelete(task.id)}
                        className="p-1 text-white/30 hover:text-rose-400 hover:bg-white/10 rounded-lg transition"
                        title="Xóa việc này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
          className="mt-3 w-full py-1.5 rounded-xl border border-dashed border-white/20 hover:border-white/40 text-white/60 hover:text-white text-xs font-medium transition flex items-center justify-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm việc vào Ô {quadrantNumber}</span>
        </button>
      )}
    </div>
  )
}
