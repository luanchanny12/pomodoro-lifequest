import React from 'react'
import { Target, Plus, Gift } from 'lucide-react'
import { StudyGoal } from '@/services/focusService'

export interface PomodoroQuestCardProps {
  goals: StudyGoal[]
  selectedGoalId: number | null
  activeGoal?: StudyGoal
  currentUser: any
  sessionNote: string
  availablePearls: number
  onSelectGoal: (id: number | null) => void
  onOpenManualModal: () => void
  onOpenGoalModal: () => void
  onOpenAuthModal: () => void
  onOpenRewardShop: () => void
  onChangeSessionNote: (note: string) => void
}

const PomodoroQuestCardComponent: React.FC<PomodoroQuestCardProps> = ({
  goals,
  selectedGoalId,
  activeGoal,
  currentUser,
  sessionNote,
  availablePearls,
  onSelectGoal,
  onOpenManualModal,
  onOpenGoalModal,
  onOpenAuthModal,
  onOpenRewardShop,
  onChangeSessionNote,
}) => {
  return (
    <div className="mt-5 bg-[#0b0f19]/92 backdrop-blur-md border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-all">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
        {/* Left 2 cols: Goal & Progress */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-400/20 text-amber-300 text-sm shadow-sm">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-200">
                Nhiệm Vụ Mục Tiêu
              </span>
            </div>

            <select
              value={selectedGoalId || activeGoal?.id || ''}
              onChange={(e) => onSelectGoal(e.target.value ? Number(e.target.value) : null)}
              className="bg-black/60 border border-white/20 rounded-xl px-3 py-1 text-xs text-white focus:outline-none max-w-[200px] truncate"
            >
              {goals.length === 0 && <option value="">Chưa có mục tiêu</option>}
              {goals.map((g) => (
                <option key={g.id} value={g.id} className="bg-[#1F232B] text-white">
                  {g.title} ({g.current_hours}/{g.target_hours}h)
                </option>
              ))}
            </select>
          </div>

          {activeGoal ? (
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>{activeGoal.title}</span>
                  {activeGoal.is_completed && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      DONE 🏆
                    </span>
                  )}
                </span>
                <span className="font-mono text-cyan-300 font-extrabold">
                  {activeGoal.current_hours} / {activeGoal.target_hours}h ({activeGoal.progress_percent}%)
                </span>
              </div>

              <div className="w-full bg-slate-800/80 rounded-full h-3 p-0.5 border border-white/15 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, activeGoal.progress_percent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span>
                  {activeGoal.is_completed
                    ? '🎉 Đã đạt mục tiêu đề ra!'
                    : `Còn ${activeGoal.remaining_hours} giờ nữa để về đích`}
                </span>
                <button
                  type="button"
                  onClick={onOpenManualModal}
                  className="text-cyan-300 hover:underline flex items-center gap-1.5 font-medium py-1.5 px-2 rounded-lg hover:bg-white/5 active:scale-95 transition"
                >
                  <Plus className="w-4 h-4" /> Ghi thêm giờ offline
                </button>
              </div>
            </div>
          ) : !currentUser ? (
            <div className="text-center py-4 text-xs text-white/80 bg-white/5 rounded-2xl border border-white/10">
              🔒 Đang ở chế độ Khách tập trung tự do.{' '}
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="underline font-bold text-amber-300 hover:text-amber-200"
              >
                Đăng nhập để lưu tiến độ 1000h
              </button>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-white/80 bg-white/5 rounded-2xl border border-white/10">
              Chưa có mục tiêu nào.{' '}
              <button
                type="button"
                onClick={onOpenGoalModal}
                className="underline font-semibold text-white"
              >
                Tạo mục tiêu ngay
              </button>
            </div>
          )}

          {/* Focus Topic Note */}
          <div>
            <input
              type="text"
              value={sessionNote}
              onChange={(e) => onChangeSessionNote(e.target.value)}
              placeholder="Ghi chú phiên này: ví dụ Nói tiếng Anh chủ đề Du lịch..."
              className="w-full px-3.5 py-2 text-xs bg-black/40 border border-white/15 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>
        </div>

        {/* Right col: 3D Crystal Pearl Jar */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 via-purple-500/15 to-indigo-500/15 border border-amber-400/30 text-center relative overflow-hidden flex flex-col items-center justify-center">
          <div className="text-3xl animate-bounce">💎</div>
          <div className="text-xs font-black text-amber-200 mt-1">Lọ Ngọc Dopamine</div>
          <div className="text-xl font-black font-mono text-white mt-0.5">
            {currentUser ? Number(availablePearls || 0).toFixed(1) : 0} <span className="text-xs font-normal text-amber-300">viên</span>
          </div>
          <p className="text-[10px] text-white/60 mt-1 leading-tight">
            1 giờ học = 1 ngọc • Đổi giờ xem phim, chơi game không lo tội lỗi!
          </p>
          <button
            type="button"
            onClick={onOpenRewardShop}
            className="mt-3 px-3 py-1.5 w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Đổi Thưởng {!currentUser && '🔒'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export const PomodoroQuestCard = React.memo(PomodoroQuestCardComponent)
