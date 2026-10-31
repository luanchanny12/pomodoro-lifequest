import React, { useState } from 'react'
import { X, Clock, Calendar, BookOpen, CheckCircle, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { focusService, StudyGoal } from '@/services/focusService'

interface ManualLogModalProps {
  isOpen: boolean
  onClose: () => void
  goals: StudyGoal[]
  selectedGoalId?: number | null
  onSuccess: (newCurrentHours: number, isCompleted: boolean, goalTitle: string) => void
}

const PRESET_MINUTES = [15, 30, 45, 60, 90, 120]

export const ManualLogModal: React.FC<ManualLogModalProps> = ({
  isOpen,
  onClose,
  goals,
  selectedGoalId,
  onSuccess,
}) => {
  const [goalId, setGoalId] = useState<number | ''>(selectedGoalId || (goals[0]?.id ?? ''))
  const [minutes, setMinutes] = useState<number>(30)
  const [sessionDate, setSessionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [topicNote, setTopicNote] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  React.useEffect(() => {
    if (isOpen) {
      setGoalId(selectedGoalId || (goals[0]?.id ?? ''))
    }
  }, [isOpen, selectedGoalId, goals])

  if (!isOpen) return null

  const selectedGoal = goals.find((g) => g.id === Number(goalId))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (minutes <= 0) {
      toast.error('Vui lòng chọn hoặc nhập thời lượng học hợp lệ')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await focusService.createSession({
        goal_id: goalId ? Number(goalId) : null,
        duration_minutes: minutes,
        session_date: sessionDate,
        topic_note: topicNote.trim(),
        source: 'manual',
      })

      const addedHours = res.duration_hours
      const currentHours = (selectedGoal?.current_hours || 0) + addedHours
      const targetHours = selectedGoal?.target_hours || 0
      const isCompleted = targetHours > 0 && currentHours >= targetHours

      toast.success(
        `Đã ghi nhận +${minutes} phút (${addedHours}h)${
          selectedGoal ? ` vào mục tiêu "${selectedGoal.title}"` : ''
        }!`
      )

      if (isCompleted && selectedGoal) {
        toast.success(
          `🎉 CHÚC MỪNG! Bạn đã đạt mốc ${selectedGoal.target_hours} giờ của mục tiêu "${selectedGoal.title}"! Đã đánh dấu DONE!`,
          { duration: 6000 }
        )
      }

      onSuccess(currentHours, isCompleted, selectedGoal?.title || '')
      onClose()
      setTopicNote('')
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu bản ghi học tập')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#1F232B] border border-white/10 rounded-2xl shadow-2xl p-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Ghi nhận giờ học thủ công</h2>
              <p className="text-xs text-white/60">Học offline không mở máy tính? Thêm giờ học tại đây</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Goal selection */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Mục tiêu học tập
            </label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60"
            >
              {goals.length === 0 && <option value="">Chưa có mục tiêu nào</option>}
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} ({g.current_hours} / {g.target_hours} giờ)
                  {g.is_completed ? ' - [ĐÃ XONG]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick preset minutes */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Thời lượng học (Phút)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
              {PRESET_MINUTES.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={`py-2 text-xs font-medium rounded-lg transition border ${
                    minutes === m
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-[#14171E] border-white/10 text-white/70 hover:bg-white/5'
                  }`}
                >
                  {m < 60 ? `+${m}p` : `+${m / 60}h`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="1440"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60"
                placeholder="Nhập số phút khác..."
              />
              <span className="text-xs text-white/50 whitespace-nowrap">
                = {(minutes / 60).toFixed(2)} giờ
              </span>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-white/50" />
              Ngày học
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60"
            />
          </div>

          {/* Notes / Topics */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-white/50" />
              Ghi chú nội dung / chủ đề đã học
            </label>
            <textarea
              rows={3}
              value={topicNote}
              onChange={(e) => setTopicNote(e.target.value)}
              placeholder="Ví dụ: Nói tiếng Anh 30 phút chủ đề Du lịch và Thói quen hàng ngày, luyện Shadowing..."
              className="w-full px-3.5 py-2.5 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-red-500/60 resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-xl shadow-lg shadow-red-500/25 transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Đang lưu...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Lưu giờ học</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
