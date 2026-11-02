import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Flame,
  Heart,
  Trophy,
  Sparkles,
  Clock,
  Crown,
  Users,
  MessageCircle,
  Rocket,
  ShieldCheck,
} from 'lucide-react'
import { raceService, CheerItem } from '@/services/raceService'

export interface CheerHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser?: {
    id: number
    display_name: string
    cheer_count?: number
  } | null
  onOpenRaceTrack?: () => void
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} giờ trước`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Hôm qua'
    if (diffDays < 7) return `${diffDays} ngày trước`

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export const CheerHistoryModal: React.FC<CheerHistoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenRaceTrack,
}) => {
  const [cheers, setCheers] = useState<CheerItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'admin' | 'friends'>('all')

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    setLoading(true)

    raceService
      .getMyRecentCheers()
      .then((data) => {
        if (isMounted) {
          setCheers(Array.isArray(data) ? data : [])
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load cheer history:', err)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Unique senders count
  const uniqueSendersCount = useMemo(() => {
    if (cheers.length === 0) return 0
    const set = new Set(cheers.map((c) => (c.sender_id ? `id_${c.sender_id}` : c.sender_name)))
    return set.size
  }, [cheers])

  const totalCheersCount = currentUser?.cheer_count || cheers.length

  // Filtered cheers
  const filteredCheers = useMemo(() => {
    if (activeFilter === 'admin') {
      return cheers.filter((c) => c.sender_name.toLowerCase().includes('admin'))
    }
    if (activeFilter === 'friends') {
      return cheers.filter((c) => !c.sender_name.toLowerCase().includes('admin'))
    }
    return cheers
  }, [cheers, activeFilter])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-gradient-to-b from-[#1b1928] via-[#12111c] to-[#0a0910] border border-amber-500/30 rounded-3xl p-5 sm:p-6 text-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Glow ambient background circles */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Flame className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                <span>Hộp Thư Tiếp Lửa & Cổ Vũ</span>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </h3>
              <p className="text-xs text-white/60">
                Lưu giữ năng lượng & lời chúc từ bạn bè và Admin
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition active:scale-95"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── STATS SUMMARY CARDS ── */}
        <div className="grid grid-cols-2 gap-2.5 my-3 relative z-10">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 to-transparent border border-amber-500/25">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
              <Trophy className="w-4 h-4" />
              <span>Tổng Lượt Cổ Vũ</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {totalCheersCount} <span className="text-xs font-semibold text-amber-300/80">lượt</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-transparent border border-cyan-500/25">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
              <Users className="w-4 h-4" />
              <span>Người Đã Tiếp Sức</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {uniqueSendersCount} <span className="text-xs font-semibold text-cyan-300/80">bạn bè</span>
            </div>
          </div>
        </div>

        {/* ── FILTER TABS ── */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10 mb-3 relative z-10">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 ${
              activeFilter === 'all'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Tất Cả ({cheers.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('admin')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 ${
              activeFilter === 'admin'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Admin ⭐</span>
          </button>

          <button
            onClick={() => setActiveFilter('friends')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 ${
              activeFilter === 'friends'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Bạn Bè</span>
          </button>
        </div>

        {/* ── CHEER CARDS LIST ── */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 relative z-10 custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-white/50 text-xs flex flex-col items-center gap-2 animate-pulse">
              <Flame className="w-6 h-6 text-amber-400 animate-bounce" />
              <span>Đang mở hòm thư tiếp lửa...</span>
            </div>
          ) : filteredCheers.length === 0 ? (
            <div className="py-10 px-4 text-center text-white/60 text-xs rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">
                💌
              </div>
              <div>
                <p className="font-bold text-sm text-white">Chưa có lời cổ vũ nào trong mục này</p>
                <p className="text-[11px] text-white/50 mt-1 max-w-xs">
                  Hãy tham gia Đường Đua F1 hoặc giữ vững phong độ học tập để bạn bè và Admin tiếp lửa cho bạn nhé!
                </p>
              </div>
              {onOpenRaceTrack && (
                <button
                  onClick={() => {
                    onClose()
                    onOpenRaceTrack()
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:opacity-95 text-black font-extrabold text-xs transition shadow-md flex items-center gap-1.5 active:scale-95"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Đến Đường Đua F1 ngay</span>
                </button>
              )}
            </div>
          ) : (
            filteredCheers.map((cheer) => {
              const isAdmin = cheer.sender_name.toLowerCase().includes('admin')
              return (
                <div
                  key={cheer.id}
                  className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-all text-left flex items-start gap-3 group"
                >
                  {/* Emoji Avatar */}
                  <div className="w-10 h-10 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    {cheer.emoji || '🔥'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white line-clamp-1">
                          {cheer.sender_name}
                        </span>
                        {isAdmin && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" /> ADMIN
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-white/40 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(cheer.created_at)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-amber-100/90 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5 break-words">
                      "{cheer.message || 'Cố lên bạn nhé! Chúc bạn có một ngày học tập bứt phá!'}"
                    </p>

                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400/80">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Đã tiếp nhận năng lượng</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10 mt-2">
          <span className="text-[11px] text-white/40">
            Hiển thị tối đa 50 lời cổ vũ gần nhất
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
