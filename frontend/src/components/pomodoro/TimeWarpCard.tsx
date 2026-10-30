import React, { useState, useEffect } from 'react'
import { FastForward, Calendar, Zap, Sparkles, Compass, Target, Clock, ArrowRight, ShieldCheck } from 'lucide-react'
import { focusService, TimeWarpOracle, StudyGoal } from '@/services/focusService'

export const TimeWarpCard: React.FC = () => {
  const [oracle, setOracle] = useState<TimeWarpOracle | null>(null)
  const [goals, setGoals] = useState<StudyGoal[]>([])
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Load goals list
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const goalsData = await focusService.getGoals()
        setGoals(goalsData)
        if (goalsData.length > 0 && selectedGoalId === null) {
          setSelectedGoalId(goalsData[0].id)
        }
      } catch (err) {
        console.error('Error fetching goals for oracle:', err)
      }
    }
    fetchGoals()
  }, [])

  // Load oracle for selected goal
  useEffect(() => {
    const loadOracle = async () => {
      try {
        setLoading(true)
        const data = await focusService.getOracle(selectedGoalId || undefined)
        setOracle(data)
      } catch (err) {
        console.error('Error loading oracle:', err)
      } finally {
        setLoading(false)
      }
    }
    loadOracle()
  }, [selectedGoalId])

  if (!oracle) return null

  return (
    <div className="bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-purple-950/70 backdrop-blur-xl border border-purple-400/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden text-white">
      {/* Background glow orb */}
      <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-purple-500/25 text-purple-300 rounded-2xl shadow-inner border border-purple-400/30">
            <Compass className="w-5 h-5 animate-pulse text-amber-300" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center gap-2 flex-wrap">
              <span>Cỗ Máy Tiên Tri Thời Gian</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-purple-400/20 text-purple-300 rounded-full border border-purple-400/30">
                100% Data Thật
              </span>
            </h3>
            <p className="text-xs text-white/60">
              Dự báo khoa học ngày về đích dựa trên số liệu học tập thực tế của bạn
            </p>
          </div>
        </div>

        {/* Goal selector dropdown */}
        {goals.length > 0 && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedGoalId || ''}
              onChange={(e) => setSelectedGoalId(Number(e.target.value))}
              className="bg-black/60 border border-purple-400/40 rounded-xl px-2.5 py-1 text-xs text-purple-200 focus:outline-none max-w-[200px] truncate"
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id} className="bg-[#121422] text-white">
                  🎯 {g.title} ({g.current_hours}/{g.target_hours}h)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Goal specific info header */}
      <div className="mb-4 p-3 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-white/60">Mục tiêu đang soi:</span>
          <span className="font-bold text-amber-300">{oracle.goal_title}</span>
          {oracle.goal_type === 'deadline' && (
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md text-[10px] font-bold">
              Kỳ thi / Deadline
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-white/70 text-[11px]">
          <span>⚡ Vận tốc hiện tại: <strong className="text-white font-mono">{oracle.average_daily_hours}h/ngày</strong></span>
          <span>📊 Tổng phiên đã học: <strong className="text-cyan-300 font-mono">{oracle.total_user_sessions} buổi</strong></span>
        </div>
      </div>

      {/* Main Prediction Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Box 1: Projected Finish Date */}
        <div className="p-4 rounded-2xl bg-black/50 border border-purple-400/30 flex flex-col justify-between">
          <div className="text-[11px] text-purple-200/80 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-400" /> Ngày dự kiến về đích:
          </div>
          <div className="text-xl font-black text-amber-300 mt-2">
            {oracle.projected_finish_date || 'Chưa đủ dữ liệu'}
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            {oracle.days_remaining ? `Còn khoảng ${oracle.days_remaining} ngày nữa` : 'Hãy học thêm để máy phân tích'}
          </div>
        </div>

        {/* Box 2: Time Warp Gain or Deadline Countdown */}
        <div className="p-4 rounded-2xl bg-black/50 border border-purple-400/30 flex flex-col justify-between">
          <div className="text-[11px] text-purple-200/80 flex items-center gap-1">
            {oracle.target_date ? (
              <Clock className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <FastForward className="w-3.5 h-3.5 text-cyan-400" />
            )}
            {oracle.target_date ? 'Hạn chót ngày thi:' : 'Bứt phá phiên gần nhất:'}
          </div>
          <div className={`text-xl font-black mt-2 ${oracle.target_date ? 'text-rose-300' : 'text-cyan-300'}`}>
            {oracle.target_date ? oracle.target_date : `-${oracle.hours_warped_recent} Tiếng`}
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            {oracle.target_date ? (
              oracle.days_until_deadline !== null ? (
                `Còn ${oracle.days_until_deadline} ngày (cần ${oracle.hours_per_day_needed || 0}h/ngày)`
              ) : 'Đang đếm ngược'
            ) : (
              'Bạn đã kéo ngày về đích lại gần hơn!'
            )}
          </div>
        </div>

        {/* Box 3: Remaining distance */}
        <div className="p-4 rounded-2xl bg-black/50 border border-purple-400/30 flex flex-col justify-between">
          <div className="text-[11px] text-purple-200/80 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-yellow-400" /> Quãng đường còn lại:
          </div>
          <div className="text-xl font-black text-white mt-2">
            {oracle.remaining_hours} <span className="text-xs font-normal text-white/60">giờ</span>
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            Đã hoàn thành {oracle.current_hours} / {oracle.target_hours}h
          </div>
        </div>
      </div>

      {/* 3 Real Scenarios (Minh bạch khoa học) */}
      {oracle.scenarios && (
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
          <div className="font-bold text-white/90 mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>3 Kịch bản thực tế dựa trên năng suất của bạn:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
              <div className="text-[11px] text-white/60">🐢 {oracle.scenarios.relaxed.label}</div>
              <div className="font-mono text-xs text-white">{oracle.scenarios.relaxed.hours_per_day}h / ngày</div>
              <div className="text-amber-200/90 font-bold">{oracle.scenarios.relaxed.finish_date}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-400/30 space-y-1">
              <div className="text-[11px] text-purple-300 font-bold">⚡ {oracle.scenarios.current.label}</div>
              <div className="font-mono text-xs text-white">{oracle.scenarios.current.hours_per_day}h / ngày</div>
              <div className="text-cyan-300 font-bold">{oracle.scenarios.current.finish_date}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 space-y-1">
              <div className="text-[11px] text-emerald-300 font-bold">🚀 {oracle.scenarios.speedup.label}</div>
              <div className="font-mono text-xs text-white">{oracle.scenarios.speedup.hours_per_day}h / ngày</div>
              <div className="text-emerald-300 font-bold">
                {oracle.scenarios.speedup.finish_date}
                {oracle.scenarios.speedup.saved_days > 0 && (
                  <span className="text-[10px] text-emerald-400 block">Sớm hơn {oracle.scenarios.speedup.saved_days} ngày</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2.5 text-[11px] text-white/40 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Thuật toán tính toán dựa trên dữ liệu nhật ký học thật của riêng bạn, không tạo số ảo.</span>
          </div>
        </div>
      )}
    </div>
  )
}
