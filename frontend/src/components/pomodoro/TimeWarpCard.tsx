import React, { useState, useEffect } from 'react'
import { FastForward, Calendar, Zap, Sparkles, Compass } from 'lucide-react'
import { focusService, TimeWarpOracle } from '@/services/focusService'

export const TimeWarpCard: React.FC = () => {
  const [oracle, setOracle] = useState<TimeWarpOracle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOracle = async () => {
      try {
        const data = await focusService.getOracle()
        setOracle(data)
      } catch (err) {
        console.error('Error loading oracle:', err)
      } finally {
        setLoading(false)
      }
    }
    loadOracle()
  }, [])

  if (loading || !oracle) return null

  return (
    <div className="bg-gradient-to-r from-purple-950/60 via-indigo-950/60 to-purple-950/60 backdrop-blur-xl border border-purple-400/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background glow orb */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/25 text-purple-300 rounded-xl">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              Cỗ Máy Tiên Tri Thời Gian
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-purple-400/20 text-purple-300 rounded-full">
                Tương Lai 1000H
              </span>
            </h3>
            <p className="text-xs text-white/60">
              Dự báo chính xác ngày bạn đạt mục tiêu dựa trên vận tốc học thực tế
            </p>
          </div>
        </div>

        <div className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-xl text-right hidden sm:block">
          <span className="text-[10px] text-purple-300/80 block">Vận tốc hiện tại:</span>
          <span className="font-bold text-xs text-white">{oracle.average_daily_hours} giờ / ngày</span>
        </div>
      </div>

      {/* Destiny Ticket Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Box 1: Projected Date */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-purple-400/20 text-center sm:text-left flex flex-col justify-between">
          <div className="text-[11px] text-purple-200/70 flex items-center gap-1 justify-center sm:justify-start">
            <Calendar className="w-3.5 h-3.5" /> Ngày chạm mốc 1000h:
          </div>
          <div className="text-xl font-black text-amber-300 mt-1">
            {oracle.projected_finish_date || 'Đang tính toán...'}
          </div>
          <div className="text-[10px] text-white/50 mt-1">
            Còn khoảng {oracle.days_remaining} ngày nữa
          </div>
        </div>

        {/* Box 2: Time Warp Gain */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-purple-400/20 text-center sm:text-left flex flex-col justify-between">
          <div className="text-[11px] text-purple-200/70 flex items-center gap-1 justify-center sm:justify-start">
            <FastForward className="w-3.5 h-3.5 text-cyan-400" /> Bứt phá gần nhất:
          </div>
          <div className="text-xl font-black text-cyan-300 mt-1">
            -{oracle.hours_warped_recent} Tiếng
          </div>
          <div className="text-[10px] text-white/50 mt-1">
            Bạn vừa kéo ngày về đích lại gần hơn!
          </div>
        </div>

        {/* Box 3: Remaining distance */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-purple-400/20 text-center sm:text-left flex flex-col justify-between">
          <div className="text-[11px] text-purple-200/70 flex items-center gap-1 justify-center sm:justify-start">
            <Zap className="w-3.5 h-3.5 text-yellow-400" /> Quãng đường còn lại:
          </div>
          <div className="text-xl font-black text-white mt-1">
            {oracle.remaining_hours} <span className="text-xs font-normal">giờ</span>
          </div>
          <div className="text-[10px] text-white/50 mt-1">
            Đã hoàn thành {oracle.current_hours} / {oracle.target_hours}h
          </div>
        </div>
      </div>
    </div>
  )
}
