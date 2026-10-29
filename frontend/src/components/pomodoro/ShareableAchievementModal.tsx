import React, { useRef, useState } from 'react'
import {
  X,
  Trophy,
  Flame,
  Clock,
  Sparkles,
  Download,
  Share2,
  Copy,
  Check,
  Star,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { FocusStats } from '@/services/focusService'
import { UserProfile } from '@/services/authService'

interface ShareableAchievementModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: UserProfile | null
  stats: FocusStats | null
}

const VEHICLE_EMOJIS: Record<string, string> = {
  rocket: '🚀 Phi Thuyền Không Gian',
  cyber_car: '🏎️ Siêu Xe Cyberpunk',
  quantum_saucer: '🛸 Đĩa Bay Lượng Tử',
  lightning: '⚡ Tia Chớp Siêu Tốc',
  lightcycle: '🏍️ Mô Tô Ánh Sáng',
}

export const ShareableAchievementModal: React.FC<ShareableAchievementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  stats,
}) => {
  const [copied, setCopied] = useState(false)
  const [isGeneratingImg, setIsGeneratingImg] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  if (!isOpen) return null

  const displayName = currentUser?.display_name || 'Chiến Binh Tập Trung'
  const username = currentUser?.username ? `@${currentUser.username}` : '@lifequest_user'
  const level = currentUser?.level || 1
  const streak = currentUser?.streak || 1
  const weekHours = stats?.week_hours ? Number(stats.week_hours.toFixed(1)) : 0
  const totalHours = stats?.total_hours ? Number(stats.total_hours.toFixed(1)) : 0
  const completedGoals = stats?.completed_goals || 0

  const getRacerTitle = (lvl: number) => {
    if (lvl >= 15) return '🌌 Thần Đèn Tập Trung Tối Thượng'
    if (lvl >= 10) return '🚀 Đại Cơ Trưởng Thiên Hà'
    if (lvl >= 5) return '⚡ Tay Đua Thượng Hạng'
    return '🌟 Tập Sự Vũ Trụ'
  }

  // Draw and download PNG certificate
  const handleDownloadImage = () => {
    try {
      setIsGeneratingImg(true)
      const canvas = document.createElement('canvas')
      canvas.width = 1000
      canvas.height = 1000
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Không thể khởi tạo Canvas')

      // 1. Dark Futuristic Gradient Background
      const bg = ctx.createLinearGradient(0, 0, 1000, 1000)
      bg.addColorStop(0, '#0b0f19')
      bg.addColorStop(0.5, '#161b2c')
      bg.addColorStop(1, '#080c14')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, 1000, 1000)

      // 2. Neon Border & Glow Rings
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 4
      ctx.strokeRect(30, 30, 940, 940)

      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 1
      ctx.strokeRect(40, 40, 920, 920)

      // Decorative stars
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 40; i++) {
        const x = (Math.sin(i * 99) * 450) + 500
        const y = (Math.cos(i * 77) * 450) + 500
        const r = (i % 3) + 1
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // 3. Header Title
      ctx.fillStyle = '#f59e0b'
      ctx.font = 'bold 24px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('⚡ POMODORO LIFEQUEST 3.0 FOCUS HUB ⚡', 500, 100)

      ctx.fillStyle = '#ffffff'
      ctx.font = '900 46px system-ui, sans-serif'
      ctx.fillText('BẢNG VÀNG CHIẾN TÍCH TUẦN', 500, 160)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '18px system-ui, sans-serif'
      ctx.fillText('Chứng nhận sự kiên trì & nỗ lực tập trung vượt bậc', 500, 195)

      // 4. User Avatar & Name Card Box
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(80, 230, 840, 190, 24)
      ctx.fill()
      ctx.stroke()

      // User text
      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 40px system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(displayName, 120, 300)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '20px monospace'
      ctx.fillText(`${username} • Cấp độ ${level}`, 120, 340)

      ctx.fillStyle = '#f59e0b'
      ctx.font = 'bold 20px system-ui, sans-serif'
      ctx.fillText(getRacerTitle(level), 120, 385)

      // 5. Highlight 3 Metrics Boxes
      const metrics = [
        { label: 'CHUỖI STREAK', val: `${streak} Ngày 🔥`, color: '#ef4444' },
        { label: 'GIỜ HỌC TRONG TUẦN', val: `${weekHours} Giờ ⏱️`, color: '#38bdf8' },
        { label: 'TỔNG TÍCH LŨY', val: `${totalHours} Giờ 🌟`, color: '#10b981' },
      ]

      metrics.forEach((m, idx) => {
        const x = 80 + idx * 290
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(x, 460, 260, 170, 20)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#94a3b8'
        ctx.font = 'bold 15px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(m.label, x + 130, 510)

        ctx.fillStyle = m.color
        ctx.font = '900 32px monospace'
        ctx.fillText(m.val, x + 130, 570)
      })

      // 6. Motivation Quote Banner
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)'
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)'
      ctx.beginPath()
      ctx.roundRect(80, 670, 840, 140, 20)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#fef3c7'
      ctx.font = 'italic 20px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('“Mỗi phút giây bạn tập trung hôm nay là một viên gạch', 500, 725)
      ctx.fillText('xây nên phiên bản vĩ đại nhất của chính bạn ngày mai.”', 500, 765)

      // 7. Footer & Brand CTA
      ctx.fillStyle = '#64748b'
      ctx.font = '16px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Thử thách cùng cày giờ Pomodoro tại:', 500, 875)

      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 22px monospace'
      ctx.fillText(window.location.origin || 'https://pomodoro-lifequest.com', 500, 915)

      // Trigger download
      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `lifequest-achievement-${username.replace('@', '')}.png`
      a.click()

      toast.success('Đã tải ảnh thành tích bảng vàng thành công! 📸')
    } catch (err: any) {
      toast.error('Lỗi khi xuất ảnh: ' + err.message)
    } finally {
      setIsGeneratingImg(false)
    }
  }

  // Copy share message
  const handleCopyText = async () => {
    const text = `🔥 Tuần này mình đã tập trung cày được ${weekHours} giờ Pomodoro trên LifeQuest (Chuỗi ${streak} ngày 🔥)! Bạn bè nào vào đua top học tập cùng mình nhé: ${window.location.origin}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Đã sao chép lời nhắn khoe bạn bè! 🚀')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Không thể sao chép')
    }
  }

  // Native share if supported
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bảng Vàng Thành Tích Pomodoro LifeQuest',
          text: `🔥 Tuần này mình đã tập trung cày được ${weekHours} giờ Pomodoro trên LifeQuest (Chuỗi ${streak} ngày)!`,
          url: window.location.origin,
        })
      } catch {}
    } else {
      handleCopyText()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#121829] to-[#0a0d17] border border-cyan-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Glow Effects */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                Khoe Bảng Vàng Thành Tích
              </h3>
              <p className="text-xs text-white/60">Tải thẻ ảnh Cyberpunk & lan tỏa động lực đến bạn bè</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Card Preview */}
        <div className="my-5 overflow-y-auto flex-1 pr-1 space-y-4">
          <div className="p-5 rounded-2xl bg-black/60 border border-cyan-500/30 shadow-inner relative overflow-hidden text-center">
            <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400/80 font-bold">
              ⚡ LIFEQUEST 3.0
            </div>
            <div className="text-2xl mt-1">
              {currentUser?.racer_avatar ? VEHICLE_EMOJIS[currentUser.racer_avatar]?.split(' ')[0] : '🚀'}
            </div>

            <h4 className="text-xl font-black text-white mt-1 drop-shadow">{displayName}</h4>
            <p className="text-xs text-white/50 font-mono">{username}</p>
            <div className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {getRacerTitle(level)}
            </div>

            {/* 3 Metric Pills */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-white/60 font-medium">Chuỗi Streak</div>
                <div className="text-base font-black text-rose-400 mt-0.5">{streak}d 🔥</div>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-white/60 font-medium">Tuần Này</div>
                <div className="text-base font-black text-cyan-300 mt-0.5">{weekHours}h ⏱️</div>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-white/60 font-medium">Tổng Đã Cày</div>
                <div className="text-base font-black text-emerald-300 mt-0.5">{totalHours}h 🌟</div>
              </div>
            </div>

            <div className="mt-4 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-amber-200/90 italic">
              “Mỗi phút giây bạn tập trung hôm nay là viên gạch xây nên phiên bản vĩ đại nhất của chính bạn ngày mai.”
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2 relative z-10">
          <button
            onClick={handleDownloadImage}
            disabled={isGeneratingImg}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingImg ? 'Đang xuất thẻ...' : 'Tải Thẻ Ảnh PNG (Khoe Story)'}</span>
          </button>

          <button
            onClick={handleCopyText}
            className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 border border-white/15"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-300" />}
            <span>{copied ? 'Đã sao chép!' : 'Copy Lời Nhắn'}</span>
          </button>

          {'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="py-3 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 border border-white/15"
              title="Chia sẻ nhanh"
            >
              <Share2 className="w-4 h-4 text-cyan-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
