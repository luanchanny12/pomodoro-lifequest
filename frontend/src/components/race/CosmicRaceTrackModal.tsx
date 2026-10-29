import React, { useState, useEffect } from 'react'
import {
  X,
  Trophy,
  Flame,
  Zap,
  Coffee,
  Sparkles,
  Users,
  Clock,
  Send,
  Flag,
  Share2,
  Medal,
} from 'lucide-react'
import { toast } from 'sonner'
import { raceService, RaceTrackResponse, RacerCard } from '@/services/raceService'

interface CosmicRaceTrackModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenAuth: () => void
  currentUser: any
}

const VEHICLE_ICONS: Record<string, string> = {
  rocket: '🚀',
  cyber_car: '🏎️',
  quantum_saucer: '🛸',
  lightning: '⚡',
  lightcycle: '🏍️',
}

export const CosmicRaceTrackModal: React.FC<CosmicRaceTrackModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  currentUser,
}) => {
  const [data, setData] = useState<RaceTrackResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [cheeringId, setCheeringId] = useState<number | null>(null)
  const [filterMode, setFilterMode] = useState<'today' | 'weekly'>('today')

  const fetchTrack = async () => {
    try {
      setLoading(true)
      const res = await raceService.getTrackStatus()
      setData(res)
    } catch (err: any) {
      toast.error('Không thể tải dữ liệu đường đua: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchTrack()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCheer = async (racer: RacerCard, emoji: string) => {
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để gửi cổ vũ cho bạn bè! 🔥')
      onOpenAuth()
      return
    }
    setCheeringId(racer.user_id)
    try {
      const res = await raceService.cheer(racer.user_id, emoji)
      toast.success(res.message || `Đã cổ vũ ${emoji} cho ${racer.display_name}!`)
      // Optimistic update
      if (data) {
        setData({
          ...data,
          racers: data.racers.map((r) =>
            r.user_id === racer.user_id
              ? { ...r, cheer_count: r.cheer_count + 1 }
              : r
          ),
        })
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi cổ vũ')
    } finally {
      setCheeringId(null)
    }
  }

  const handleCopyShareLink = () => {
    const url = window.location.origin
    navigator.clipboard.writeText(url)
    toast.success('Đã sao chép link website! Hãy gửi cho bạn bè cùng vào đua nhé! 🚀')
  }

  const sortedRacers = data
    ? [...data.racers].sort((a, b) =>
        filterMode === 'today'
          ? b.today_hours - a.today_hours
          : b.weekly_hours - a.weekly_hours
      )
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#10131d] border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/80 via-purple-950/60 to-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-black font-extrabold shadow-lg">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-cyan-300 to-white">
                  ĐƯỜNG ĐUA THIÊN HÀ POMODORO
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-bold">
                  LIVE F1
                </span>
              </div>
              <p className="text-xs text-white/60">
                Thi đua số giờ học tập cùng bạn bè • Bứt tốc vượt mặt & Cổ vũ tinh thần
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyShareLink}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-300" />
              <span>Mời Bạn Bè</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="px-6 py-2.5 bg-black/40 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-white/70">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>{data?.total_racers || 0} Tay đua trên sàn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Tổng cả nhóm: <b className="text-white">{data?.community_hours_today || 0}h</b> hôm nay</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('today')}
              className={`px-3 py-1 rounded-xl font-bold transition text-xs ${
                filterMode === 'today'
                  ? 'bg-amber-400 text-black shadow'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              Chặng Đua Hôm Nay
            </button>
            <button
              onClick={() => setFilterMode('weekly')}
              className={`px-3 py-1 rounded-xl font-bold transition text-xs ${
                filterMode === 'weekly'
                  ? 'bg-cyan-400 text-black shadow'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              Bảng Vàng Tuần
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* ── TOP 3 PODIUM (BỤC VINH QUANG DẪN ĐẦU) ── */}
          {sortedRacers.length >= 2 && !loading && (
            <div className="p-4 sm:p-5 rounded-3xl bg-black/50 border border-amber-500/30 text-center relative overflow-hidden shadow-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold mb-3 shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>BỤC VINH QUANG DẪN ĐẦU {filterMode === 'today' ? 'HÔM NAY' : 'TUẦN NÀY'}</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto items-end pt-3 pb-1">
                {/* #2 Rank: Silver */}
                {sortedRacers[1] && (
                  <div className="p-3 rounded-2xl bg-white/5 border border-slate-400/30 flex flex-col items-center space-y-1">
                    <span className="text-base font-bold text-slate-300">🥈 #2</span>
                    <span className="text-2xl">{VEHICLE_ICONS[sortedRacers[1].racer_avatar] || '🛸'}</span>
                    <span className="text-xs font-bold text-white truncate max-w-[90px]">{sortedRacers[1].display_name}</span>
                    <span className="text-xs font-mono font-black text-slate-300">
                      {filterMode === 'today' ? sortedRacers[1].today_hours : sortedRacers[1].weekly_hours}h
                    </span>
                    <span className="text-[10px] text-amber-300 font-semibold">🔥 {sortedRacers[1].streak}d</span>
                  </div>
                )}

                {/* #1 Rank: Gold (Tallest) */}
                {sortedRacers[0] && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-400/20 via-yellow-500/15 to-transparent border-2 border-amber-400 shadow-lg shadow-amber-400/20 flex flex-col items-center space-y-1 -translate-y-2">
                    <span className="text-lg font-black text-amber-300">👑 🥇 #1</span>
                    <span className="text-3xl animate-bounce">{VEHICLE_ICONS[sortedRacers[0].racer_avatar] || '🏎️'}</span>
                    <span className="text-xs font-black text-amber-200 truncate max-w-[100px]">{sortedRacers[0].display_name}</span>
                    <span className="text-sm font-mono font-black text-amber-400">
                      {filterMode === 'today' ? sortedRacers[0].today_hours : sortedRacers[0].weekly_hours}h
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold">🔥 {sortedRacers[0].streak}d streak</span>
                  </div>
                )}

                {/* #3 Rank: Bronze */}
                {sortedRacers[2] ? (
                  <div className="p-3 rounded-2xl bg-white/5 border border-amber-700/40 flex flex-col items-center space-y-1">
                    <span className="text-base font-bold text-amber-600">🥉 #3</span>
                    <span className="text-2xl">{VEHICLE_ICONS[sortedRacers[2].racer_avatar] || '⚡'}</span>
                    <span className="text-xs font-bold text-white truncate max-w-[90px]">{sortedRacers[2].display_name}</span>
                    <span className="text-xs font-mono font-black text-amber-500">
                      {filterMode === 'today' ? sortedRacers[2].today_hours : sortedRacers[2].weekly_hours}h
                    </span>
                    <span className="text-[10px] text-amber-300 font-semibold">🔥 {sortedRacers[2].streak}d</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-white/30 text-xs">
                    <span>Đang chờ #3</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 1. THE VISUAL HORIZONTAL RACE CIRCUIT ── */}
          <div className="relative p-5 rounded-3xl bg-gradient-to-b from-black/80 via-[#0d101a] to-black/90 border border-white/15 shadow-2xl overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none" />

            {/* Checkpoints Legend */}
            <div className="flex items-center justify-between text-[11px] text-white/50 border-b border-white/10 pb-2 mb-8 relative z-10 font-mono">
              <div className="flex items-center gap-1 text-white/70">
                <Flag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Xuất Phát (0h)</span>
              </div>
              <div>Trạm 1: 1h 🚀</div>
              <div>Trạm 2: 2.5h ⚡</div>
              <div>Trạm 3: 4h 🔥</div>
              <div className="flex items-center gap-1 text-amber-300 font-bold">
                <Medal className="w-3.5 h-3.5 text-amber-400" />
                <span>Đích 5h+ 👑</span>
              </div>
            </div>

            {/* The Race Track Lanes */}
            <div className="space-y-6 relative z-10 py-2">
              {loading ? (
                <div className="py-12 text-center text-white/50">Đang khởi động động cơ đường đua...</div>
              ) : (
                sortedRacers.map((racer, index) => {
                  const icon = VEHICLE_ICONS[racer.racer_avatar] || '🚀'
                  const isGold = index === 0
                  const isSilver = index === 1
                  const isBronze = index === 2

                  return (
                    <div key={racer.user_id} className="relative group">
                      {/* Lane Track Line */}
                      <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-amber-400 transition-all duration-1000 ease-out"
                          style={{ width: `${racer.track_progress_percent}%` }}
                        />
                      </div>

                      {/* Moving Racer Vehicle */}
                      <div
                        className="absolute -top-4 transition-all duration-1000 ease-out flex flex-col items-center cursor-pointer"
                        style={{
                          left: `calc(${racer.track_progress_percent}% - 20px)`,
                        }}
                      >
                        {/* Racer Avatar & Bubble */}
                        <div className="relative">
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xl shadow-lg transition transform group-hover:scale-125 ${
                              racer.is_current_user
                                ? 'bg-amber-400 border-2 border-white ring-4 ring-amber-400/30'
                                : isGold
                                ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 border border-amber-300'
                                : 'bg-black/80 border border-white/20'
                            }`}
                          >
                            <span>{icon}</span>
                          </div>

                          {/* Rank badge */}
                          <div
                            className={`absolute -top-2 -right-2 w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center ${
                              isGold
                                ? 'bg-amber-400 text-black'
                                : isSilver
                                ? 'bg-slate-300 text-black'
                                : isBronze
                                ? 'bg-amber-700 text-white'
                                : 'bg-white/20 text-white'
                            }`}
                          >
                            {index + 1}
                          </div>
                        </div>

                        {/* Name tag */}
                        <div className="mt-1 px-1.5 py-0.5 rounded-md bg-black/80 border border-white/10 text-[10px] font-bold text-white whitespace-nowrap shadow">
                          {racer.display_name} {racer.is_current_user && '(Bạn)'}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ── 2. LEADERBOARD LIST & CHEERING ACTIONS ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Bảng Vàng Xếp Hạng & Cổ Vũ Bạn Bè</span>
              </h4>
              {!currentUser && (
                <button
                  onClick={onOpenAuth}
                  className="text-cyan-400 hover:underline text-xs font-bold"
                >
                  Đăng nhập để lưu tiến trình & đua cùng bạn bè →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedRacers.map((racer, index) => {
                const icon = VEHICLE_ICONS[racer.racer_avatar] || '🚀'
                const isTop3 = index < 3

                return (
                  <div
                    key={racer.user_id}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                      racer.is_current_user
                        ? 'bg-amber-500/10 border-amber-400/40 shadow-lg'
                        : isTop3
                        ? 'bg-white/5 border-white/20'
                        : 'bg-black/30 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank Position */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs ${
                          index === 0
                            ? 'bg-amber-400 text-black shadow-md'
                            : index === 1
                            ? 'bg-slate-300 text-black'
                            : index === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>

                      {/* Avatar */}
                      <div className="text-2xl">{icon}</div>

                      {/* Info */}
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{racer.display_name}</span>
                          {racer.is_current_user && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px]">
                              Bạn
                            </span>
                          )}
                          <span className="text-[10px] text-cyan-300 font-mono">Lv.{racer.level}</span>
                        </div>
                        <div className="text-[11px] text-white/50 flex items-center gap-2 mt-0.5">
                          <span>
                            Hôm nay: <b className="text-amber-300">{racer.today_hours}h</b>
                          </span>
                          <span>•</span>
                          <span>
                            Tuần: <b className="text-white/80">{racer.weekly_hours}h</b>
                          </span>
                          <span>•</span>
                          <span>🔥 {racer.streak} ngày</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions / Cheer */}
                    <div className="flex items-center gap-1.5">
                      <div className="text-[10px] text-white/40 mr-1 flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-rose-400" />
                        <span>{racer.cheer_count}</span>
                      </div>

                      <button
                        onClick={() => handleCheer(racer, '🔥')}
                        disabled={cheeringId === racer.user_id}
                        title="Bắn tim cổ vũ!"
                        className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:border-rose-500/40 border border-transparent transition text-xs active:scale-90"
                      >
                        🔥
                      </button>

                      <button
                        onClick={() => handleCheer(racer, '☕')}
                        disabled={cheeringId === racer.user_id}
                        title="Mời ly cafe tập trung!"
                        className="p-1.5 rounded-xl bg-white/10 hover:bg-amber-500/20 hover:border-amber-500/40 border border-transparent transition text-xs active:scale-90"
                      >
                        ☕
                      </button>

                      <button
                        onClick={() => handleCheer(racer, '🚀')}
                        disabled={cheeringId === racer.user_id}
                        title="Bứt tốc về đích!"
                        className="p-1.5 rounded-xl bg-white/10 hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-transparent transition text-xs active:scale-90"
                      >
                        🚀
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs">
          {!currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-amber-300 font-medium">Bạn chưa xuất hiện trên đường đua!</span>
              <button
                onClick={() => {
                  onClose()
                  onOpenAuth()
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-bold text-xs shadow-md transition active:scale-95"
              >
                Đăng nhập tham gia đua ngay 🏎️
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-white/60">
              💡 Mỗi khi hoàn thành một phiên Pomodoro 25 phút, xe đua của bạn sẽ tự động tiến lên trên đường đua!
            </div>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
