import React, { useState, useEffect } from 'react'
import { X, Target, Check, Trash2, Calendar, Clock, Sparkles, Layers, Info } from 'lucide-react'
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

const PLANET_OPTIONS = [
  { id: 'earth', name: 'Trái Đất', icon: '🌍', desc: 'Đại dương & sự sống' },
  { id: 'mars', name: 'Sao Hỏa', icon: '🔴', desc: 'Nhiệt huyết & sa mạc đỏ' },
  { id: 'jupiter', name: 'Sao Mộc', icon: '🪐', desc: 'Khổng lồ khí & vươn tầm' },
  { id: 'saturn', name: 'Sao Thổ', icon: '💫', desc: 'Vành đai huyền ảo tím' },
  { id: 'venus', name: 'Sao Kim', icon: '🌕', desc: 'Ánh hoàng kim kiêu hãnh' },
  { id: 'moon', name: 'Mặt Trăng', icon: '🌙', desc: 'Tiểu tinh cầu yên tĩnh' },
]

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  goalToEdit,
  onSuccess,
}) => {
  const [title, setTitle] = useState('')
  const [goalType, setGoalType] = useState<'hours' | 'deadline'>('hours')
  const [targetHours, setTargetHours] = useState(100)
  const [currentHours, setCurrentHours] = useState(0)
  const [targetDate, setTargetDate] = useState('')
  const [parentId, setParentId] = useState<number | null>(null)
  const [planetType, setPlanetType] = useState('earth')
  const [color, setColor] = useState('#E24A4A')
  const [category, setCategory] = useState('Học tập')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableParents, setAvailableParents] = useState<StudyGoal[]>([])

  // Load existing parent goals for hierarchy dropdown
  useEffect(() => {
    if (!isOpen) return
    const fetchParents = async () => {
      try {
        const goals = await focusService.getGoals()
        // Parent goals can only be top-level goals and not the current goal being edited
        const validParents = goals.filter(
          (g) => !g.parent_id && (!goalToEdit || g.id !== goalToEdit.id)
        )
        setAvailableParents(validParents)
      } catch (e) {
        console.error('Failed to load parent goals:', e)
      }
    }
    fetchParents()
  }, [isOpen, goalToEdit])

  useEffect(() => {
    if (goalToEdit) {
      setTitle(goalToEdit.title)
      setGoalType(goalToEdit.goal_type || 'hours')
      setTargetHours(goalToEdit.target_hours)
      setCurrentHours(goalToEdit.current_hours)
      setTargetDate(goalToEdit.target_date || '')
      setParentId(goalToEdit.parent_id || null)
      setPlanetType(goalToEdit.planet_type || 'earth')
      setColor(goalToEdit.color || '#E24A4A')
      setCategory(goalToEdit.category || 'Học tập')
      setNotes(goalToEdit.notes || '')
    } else {
      setTitle('')
      setGoalType('hours')
      setTargetHours(1000)
      setCurrentHours(0)
      setTargetDate('')
      setParentId(null)
      setPlanetType('earth')
      setColor('#E24A4A')
      setCategory('Tiếng Anh')
      setNotes('')
    }
  }, [goalToEdit, isOpen])

  if (!isOpen) return null

  // Real-time calculation of days left & required daily hours for deadline mode
  const daysLeft = targetDate
    ? Math.max(1, Math.ceil((new Date(targetDate).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)))
    : null

  const neededHours = Math.max(0, targetHours - currentHours)
  const dailyHoursNeeded = daysLeft && neededHours > 0
    ? (neededHours / daysLeft).toFixed(1)
    : null

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
    if (goalType === 'deadline' && !targetDate) {
      toast.error('Vui lòng chọn ngày thi / deadline cụ thể')
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        title: title.trim(),
        goal_type: goalType,
        target_hours: targetHours,
        current_hours: currentHours,
        target_date: goalType === 'deadline' && targetDate ? targetDate : null,
        parent_id: parentId,
        planet_type: planetType,
        color,
        category,
        notes: notes.trim(),
      }

      if (goalToEdit) {
        await focusService.updateGoal(goalToEdit.id, payload)
        toast.success(`Đã cập nhật mục tiêu "${title}"`)
      } else {
        await focusService.createGoal(payload)
        toast.success(`Đã tạo mục tiêu "${title}" với hành tinh ${planetType}! 🌍`)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#181B22] border border-white/10 rounded-3xl shadow-2xl p-5 sm:p-6 text-white max-h-[92vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/30">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {goalToEdit ? 'Chỉnh sửa mục tiêu & Hành tinh' : 'Tạo mục tiêu học tập mới'}
              </h2>
              <p className="text-xs text-white/60">
                Tích lũy giờ học hoặc ấn định hạn chót ngày thi cử
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* LOẠI MỤC TIÊU: THEO GIỜ VS THEO NGÀY THI / DEADLINE */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
              Hình thức đặt mục tiêu *
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#101217] p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setGoalType('hours')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  goalType === 'hours'
                    ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>⏱️ Tích Lũy Theo Giờ</span>
              </button>
              <button
                type="button"
                onClick={() => setGoalType('deadline')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  goalType === 'deadline'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>📅 Đặt Ngày Thi / Deadline</span>
              </button>
            </div>
          </div>

          {/* Tên mục tiêu */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Tên mục tiêu *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: 1000 Giờ Học Tiếng Anh, Thi IELTS 8.0..."
              className="w-full px-3.5 py-2.5 bg-[#101217] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60 transition"
            />
          </div>

          {/* Nếu chọn DEADLINE: Date Picker & Thẻ tính toán thông minh */}
          {goalType === 'deadline' && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-2 animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Ngày thi cử hoặc hạn chót hoàn thành *
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3.5 py-2 bg-[#0c1017] border border-cyan-500/40 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-400 transition"
              />
              {daysLeft && (
                <div className="text-[11px] text-cyan-200/90 bg-cyan-500/10 p-2.5 rounded-xl border border-cyan-500/20 leading-relaxed">
                  ⏳ <strong>Còn {daysLeft} ngày nữa đến hạn!</strong> Bạn cần tích lũy thêm <strong>{neededHours} giờ</strong>, tương đương trung bình <strong>~{dailyHoursNeeded} giờ/ngày</strong> để đạt đúng mục tiêu đề ra.
                </div>
              )}
            </div>
          )}

          {/* Số giờ mục tiêu & Số giờ đã học ban đầu */}
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
                className="w-full px-3.5 py-2.5 bg-[#101217] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60 transition"
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
                className="w-full px-3.5 py-2.5 bg-[#101217] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60 transition"
              />
            </div>
          </div>

          {/* MỤC TIÊU CHA (MỤC TIÊU LỚN CHỨA MỤC TIÊU CON) */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Mục tiêu lớn cấp trên (Phân cấp cha - con)
            </label>
            <select
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full px-3.5 py-2.5 bg-[#101217] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400/60 transition"
            >
              <option value="">👑 Không (Đây là Mục tiêu lớn độc lập - Đại Hành Tinh)</option>
              {availableParents.map((p) => (
                <option key={p.id} value={p.id}>
                  🪐 Trực thuộc mục tiêu lớn: {p.title} ({p.target_hours}h)
                </option>
              ))}
            </select>
          </div>

          {/* CHỌN HÀNH TINH ĐẠI DIỆN TRONG THIÊN HÀ */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Hình dạng hành tinh đại diện (Trong Thiên hà Tri thức)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PLANET_OPTIONS.map((p) => {
                const isSelected = planetType === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanetType(p.id)}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center transition border ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400/40 text-cyan-200 shadow-lg'
                        : 'bg-[#101217] border-white/10 text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="text-[10px] font-bold mt-1 text-center line-clamp-1">
                      {p.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Danh mục & Màu sắc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Danh mục
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Tiếng Anh, Đại học, Lập trình..."
                className="w-full px-3.5 py-2.5 bg-[#101217] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Màu sắc quỹ đạo
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Ghi chú thêm & Động lực phấn đấu
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Viết lời nhắn gửi đến bản thân tương lai..."
              className="w-full px-3.5 py-2 bg-[#101217] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/60 resize-none transition"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            {goalToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1.5 py-2 px-3 hover:bg-red-500/10 rounded-xl transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa mục tiêu</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-black bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 hover:opacity-90 active:scale-95 text-white rounded-xl shadow-lg shadow-red-500/25 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Đang lưu...' : goalToEdit ? 'Lưu thay đổi' : 'Tạo mục tiêu & Hành tinh'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
