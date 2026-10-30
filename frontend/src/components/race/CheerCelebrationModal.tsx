import React from 'react'
import { Sparkles, Flame, X, Trophy, Heart, Send } from 'lucide-react'
import { CheerItem } from '@/services/raceService'
import { soundManager } from '@/utils/soundEffects'

interface CheerCelebrationModalProps {
  isOpen: boolean
  cheers: CheerItem[]
  onClose: () => void
  onAcknowledgeAll: () => void
}

export const CheerCelebrationModal: React.FC<CheerCelebrationModalProps> = ({
  isOpen,
  cheers,
  onClose,
  onAcknowledgeAll,
}) => {
  if (!isOpen || cheers.length === 0) return null

  const latestCheer = cheers[0]
  const isFromAdmin = latestCheer.sender_name.toLowerCase().includes('admin')

  const handleAccept = () => {
    soundManager.playConstellationVictory()
    onAcknowledgeAll()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#1c1829] via-[#13111c] to-black border-2 border-amber-400/50 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center text-white overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow ambient background circles */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition active:scale-95"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Animated Main Icon Badge */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
            <span className="text-4xl select-none">{latestCheer.emoji || '🔥'}</span>
          </div>
          <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 to-rose-400 rounded-3xl blur-md opacity-40 animate-pulse -z-10" />
        </div>

        {/* Header Title */}
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-rose-300">
          Bạn Được Tiếp Lửa Cổ Vũ!
        </h2>
        <p className="text-xs sm:text-sm text-white/70 mt-1">
          {isFromAdmin ? 'Quản trị viên hệ thống đã gửi nguồn năng lượng tới bạn' : 'Một người bạn trên đường đua đã tiếp lửa cho bạn'}
        </p>

        {/* Latest Cheer Highlight Card */}
        <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/15 text-left relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-gradient-to-r from-amber-400 to-rose-500 text-black shadow-sm">
                {latestCheer.sender_name}
              </span>
              {isFromAdmin && (
                <span className="text-[10px] text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-400/40 bg-amber-400/10">
                  ADMIN ⭐
                </span>
              )}
            </div>
            <span className="text-[10px] text-white/40">Mới nhận</span>
          </div>

          <div className="text-sm font-medium text-amber-100 bg-black/40 p-3 rounded-xl border border-white/10 mt-1 break-words">
            "{latestCheer.message || 'Cố lên bạn nhé! Chúc bạn có một ngày học tập và tập trung bứt phá!'}"
          </div>
        </div>

        {/* Multiple cheers indicator if > 1 */}
        {cheers.length > 1 && (
          <div className="mt-3 text-xs text-white/60">
            Và còn <span className="font-bold text-amber-300">+{cheers.length - 1}</span> lời cổ vũ khác đang chờ bạn!
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleAccept}
          className="mt-6 w-full py-3.5 px-6 rounded-2xl font-extrabold text-sm sm:text-base text-black bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 active:scale-95 transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 min-h-[48px]"
        >
          <Sparkles className="w-5 h-5 fill-black" />
          <span>Nhận năng lượng & Bứt phá ngay! 🚀</span>
        </button>
      </div>
    </div>
  )
}
