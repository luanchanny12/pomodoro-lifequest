import React, { useState, useEffect } from 'react'
import { X, Target, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { focusService, StudyGoal } from '@/services/focusService'

interface GoalModalProps {
  isOpen: boolean
  onClose: () => void
  goalToEdit?: StudyGoal | null
  onSuccess: () => void
}

const COLOR_OPTIONS = [
  '#E24A4A', // Tomato red
  '#38858A', // Teal forest
  '#4D96FF', // Ocean blue
  '#9D4EDD', // Sunset purple
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#64748B', // Slate
]

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  goalToEdit,
  onSuccess,
}) => {
  const [title, setTitle] = useState('')
  const [targetHours, setTargetHours] = useState(100)
  const [currentHours, setCurrentHours] = useState(0)
  const [color, setColor] = useState('#E24A4A')
  const [category, setCategory] = useState('Học tập')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (goalToEdit) {
      setTitle(goalToEdit.title)
      setTargetHours(goalToEdit.target_hours)
      setCurrentHours(goalToEdit.current_hours)
      setColor(goalToEdit.color || '#E24A4A')
      setCategory(goalToEdit.category || 'Học tập')
      setNotes(goalToEdit.notes || '')
    } else {
      setTitle('')
      setTargetHours(1000)
      setCurrentHours(0)
      setColor('#E24A4A')
      setCategory('Tiếng Anh')
      setNotes('')
    }
  }, [goalToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên mục tiêu')
      return
    }
    if (targetHours <= 0) {
      toast.error('Số giờ mục tiêu phải lớn hơn 0')
      return
    }

    try {
      setIsSubmitting(true)
      if (goalToEdit) {
        await focusService.updateGoal(goalToEdit.id, {
          title: title.trim(),
          target_hours: targetHours,
          current_hours: currentHours,
          color,
          category,
          notes: notes.trim(),
        })
        toast.success(`Đã cập nhật mục tiêu "${title}"`)
      } else {
        await focusService.createGoal({
          title: title.trim(),
          target_hours: targetHours,
          current_hours: currentHours,
          color,
          category,
          notes: notes.trim(),
        })
        toast.success(`Đã tạo mục tiêu "${title}" với mốc ${targetHours} giờ!`)
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu mục tiêu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!goalToEdit) return
    if (!confirm(`Bạn có chắc muốn xóa mục tiêu "${goalToEdit.title}"?`)) return
    try {
      await focusService.deleteGoal(goalToEdit.id)
      toast.success('Đã xóa mục tiêu')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa mục tiêu')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#1F232B] border border-white/10 rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {goalToEdit ? 'Chỉnh sửa mục tiêu' : 'Tạo mục tiêu học tập mới'}
              </h2>
              <p className="text-xs text-white/60">Đặt mốc số giờ cần đạt (ví dụ: 1000 giờ)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Tên mục tiêu *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: 1000 Giờ Học Tiếng Anh"
              className="w-full px-3.5 py-2.5 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Mục tiêu (Giờ) *
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={targetHours}
                onChange={(e) => setTargetHours(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Đã học (Giờ ban đầu)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={currentHours}
                onChange={(e) => setCurrentHours(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Danh mục
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Tiếng Anh, Lập trình, Kỹ năng..."
              className="w-full px-3.5 py-2.5 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Màu đại diện
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm về mục tiêu này..."
              className="w-full px-3.5 py-2 bg-[#14171E] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            {goalToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1.5 py-1.5 px-2 hover:bg-red-500/10 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa mục tiêu</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
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
                className="px-5 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-xl shadow-lg shadow-red-500/25 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Đang lưu...' : goalToEdit ? 'Lưu thay đổi' : 'Tạo mục tiêu'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
