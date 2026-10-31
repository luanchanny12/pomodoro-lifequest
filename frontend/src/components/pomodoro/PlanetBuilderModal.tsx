import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  Sparkles,
  Trophy,
  Lock,
  Unlock,
  Save,
  Trash2,
  Globe,
  Star,
  Info,
  CheckCircle2,
  ChevronRight,
  Flame,
  Award,
} from 'lucide-react'
import { toast } from 'sonner'
import { focusService } from '@/services/focusService'
import { soundManager } from '@/utils/soundEffects'

export interface BuildableItem {
  id: string
  name: string
  category: 'nature' | 'civ' | 'tech' | 'wonder'
  icon: string
  requiredHours: number
  requiresCompleted?: boolean
  description: string
  symbol: string
}

export const PLANET_ITEMS: BuildableItem[] = [
  {
    id: 'seedling',
    name: 'Mầm Cây Hy Vọng',
    category: 'nature',
    icon: '🌱',
    symbol: '🌱',
    requiredHours: 0.0,
    description: 'Vật phẩm khởi đầu: Gieo những hạt mầm tri thức đầu tiên để khai hoang hành tinh.',
  },
  {
    id: 'forest',
    name: 'Rừng Thông Xanh',
    category: 'nature',
    icon: '🌲',
    symbol: '🌲',
    requiredHours: 2.0,
    description: 'Hàng ngàn giờ nỗ lực tạo nên bầu không khí trong lành cho sự tập trung.',
  },
  {
    id: 'deer',
    name: 'Muông Thú Rừng Sâu',
    category: 'nature',
    icon: '🦌',
    symbol: '🦌',
    requiredHours: 5.0,
    description: 'Hệ sinh thái bừng tỉnh với những sinh vật sống động bước đi trên đất liền.',
  },
  {
    id: 'village',
    name: 'Làng Chài Yên Bình',
    category: 'civ',
    icon: '🏠',
    symbol: '🏠',
    requiredHours: 10.0,
    description: 'Nơi cư ngụ đầu tiên của nền văn minh học tập kỷ luật.',
  },
  {
    id: 'city',
    name: 'Đại Đô Thị Metropolis',
    category: 'civ',
    icon: '🏙️',
    symbol: '🏙️',
    requiredHours: 25.0,
    description: 'Những tòa cao ốc sáng rực ánh đèn minh chứng cho sự kiên trì bền bỉ.',
  },
  {
    id: 'power_plant',
    name: 'Trạm Năng Lượng Tinh Vân',
    category: 'tech',
    icon: '⚡',
    symbol: '⚡',
    requiredHours: 50.0,
    description: 'Cung cấp năng lượng vô tận để hành tinh tự động hóa và tăng tốc vượt bậc.',
  },
  {
    id: 'wonder',
    name: 'Kỳ Quan Thế Giới Vĩ Đại',
    category: 'wonder',
    icon: '🏛️',
    symbol: '🏛️',
    requiredHours: 100.0,
    description: 'Công trình kiến trúc vượt thời gian, đỉnh cao của 100 giờ rèn luyện phi thường.',
  },
  {
    id: 'spaceport',
    name: 'Cảng Không Gian Vũ Trụ',
    category: 'tech',
    icon: '🚀',
    symbol: '🚀',
    requiredHours: 200.0,
    description: 'Bệ phóng tàu thám hiểm vươn ra các thiên hà xa xôi bên ngoài.',
  },
  {
    id: 'crown',
    name: 'Vương Miện Khai Sáng Hoàn Thành',
    category: 'wonder',
    icon: '👑',
    symbol: '👑',
    requiredHours: 0,
    requiresCompleted: true,
    description: 'Biểu tượng tối thượng vinh danh khi hoàn thành 100% mục tiêu lớn!',
  },
]

export interface PlanetPlot {
  id: number
  itemId: string | null
}

interface PlanetBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  goal: {
    id: number
    title: string
    current_hours: number
    target_hours: number
    planet_type?: string
    planet_data?: string | null
    is_completed?: boolean
  } | null
  onSaveSuccess?: () => void
}

const TOTAL_PLOTS = 16 // 4x4 Grid

const PLANET_THEMES: Record<string, {
  name: string
  bg: string
  glow: string
  surfaceColor: string
  emptySlotBg: string
}> = {
  earth: {
    name: 'Trái Đất (Địa Cầu)',
    bg: 'from-blue-950 via-slate-900 to-emerald-950',
    glow: 'rgba(16, 185, 129, 0.4)',
    surfaceColor: 'bg-emerald-900/30 border-emerald-500/30',
    emptySlotBg: 'bg-emerald-950/40 hover:bg-emerald-800/40 border-emerald-500/20',
  },
  mars: {
    name: 'Sao Hỏa (Hành Tinh Đỏ)',
    bg: 'from-rose-950 via-neutral-900 to-amber-950',
    glow: 'rgba(239, 68, 68, 0.4)',
    surfaceColor: 'bg-rose-900/30 border-rose-500/30',
    emptySlotBg: 'bg-rose-950/40 hover:bg-rose-800/40 border-rose-500/20',
  },
  jupiter: {
    name: 'Sao Mộc (Khổng Lồ Khí)',
    bg: 'from-amber-950 via-stone-900 to-orange-950',
    glow: 'rgba(245, 158, 11, 0.4)',
    surfaceColor: 'bg-amber-900/30 border-amber-500/30',
    emptySlotBg: 'bg-amber-950/40 hover:bg-amber-800/40 border-amber-500/20',
  },
  saturn: {
    name: 'Sao Thổ (Vành Đai Huyền Ảo)',
    bg: 'from-purple-950 via-slate-900 to-indigo-950',
    glow: 'rgba(168, 85, 247, 0.4)',
    surfaceColor: 'bg-purple-900/30 border-purple-500/30',
    emptySlotBg: 'bg-purple-950/40 hover:bg-purple-800/40 border-purple-500/20',
  },
  venus: {
    name: 'Sao Kim (Hoàng Hôn Vàng)',
    bg: 'from-yellow-950 via-neutral-900 to-amber-950',
    glow: 'rgba(234, 179, 8, 0.4)',
    surfaceColor: 'bg-yellow-900/30 border-yellow-500/30',
    emptySlotBg: 'bg-yellow-950/40 hover:bg-yellow-800/40 border-yellow-500/20',
  },
  moon: {
    name: 'Mặt Trăng (Tiểu Tinh Cầu)',
    bg: 'from-slate-950 via-gray-900 to-zinc-950',
    glow: 'rgba(148, 163, 184, 0.3)',
    surfaceColor: 'bg-slate-800/30 border-slate-400/30',
    emptySlotBg: 'bg-slate-900/40 hover:bg-slate-700/40 border-slate-500/20',
  },
}

export const PlanetBuilderModal: React.FC<PlanetBuilderModalProps> = ({
  isOpen,
  onClose,
  goal,
  onSaveSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'build' | 'codex'>('build')
  const [selectedTool, setSelectedTool] = useState<string | 'remover'>('seedling')
  const [plots, setPlots] = useState<PlanetPlot[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const mountTimeRef = useRef<number>(0)

  useEffect(() => {
    if (isOpen) {
      mountTimeRef.current = Date.now()
    }
  }, [isOpen])

  // Initialize plots from goal.planet_data
  useEffect(() => {
    if (!isOpen || !goal) return

    let initialPlots: PlanetPlot[] = []
    if (goal.planet_data) {
      try {
        const parsed = JSON.parse(goal.planet_data)
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialPlots = parsed
        }
      } catch (e) {
        console.error('Failed to parse planet_data:', e)
      }
    }

    // Ensure exactly 16 plots
    if (initialPlots.length < TOTAL_PLOTS) {
      const full: PlanetPlot[] = []
      for (let i = 0; i < TOTAL_PLOTS; i++) {
        full.push(initialPlots[i] || { id: i, itemId: null })
      }
      setPlots(full)
    } else {
      setPlots(initialPlots.slice(0, TOTAL_PLOTS))
    }
  }, [isOpen, goal])

  const currentHours = goal?.current_hours || 0
  const isGoalDone = goal?.is_completed || currentHours >= (goal?.target_hours || 0)
  const planetKey = (goal?.planet_type || 'earth').toLowerCase()
  const theme = PLANET_THEMES[planetKey] || PLANET_THEMES.earth

  // Determine item unlock status
  const itemStatusMap = useMemo(() => {
    const map: Record<string, { isUnlocked: boolean; neededHours: number }> = {}
    PLANET_ITEMS.forEach((item) => {
      if (item.requiresCompleted) {
        map[item.id] = {
          isUnlocked: Boolean(isGoalDone),
          neededHours: isGoalDone ? 0 : Math.max(0, (goal?.target_hours || 0) - currentHours),
        }
      } else {
        const isUnlocked = currentHours >= item.requiredHours
        map[item.id] = {
          isUnlocked,
          neededHours: Math.max(0, item.requiredHours - currentHours),
        }
      }
    })
    return map
  }, [currentHours, isGoalDone, goal?.target_hours])

  const unlockedCount = useMemo(() => {
    return Object.values(itemStatusMap).filter((s) => s.isUnlocked).length
  }, [itemStatusMap])

  const placedItemsCount = useMemo(() => {
    return plots.filter((p) => Boolean(p.itemId)).length
  }, [plots])

  if (!isOpen || !goal) return null

  // Handle plot click
  const handlePlotClick = (plotIndex: number) => {
    const nextPlots = [...plots]
    if (selectedTool === 'remover') {
      if (nextPlots[plotIndex].itemId) {
        nextPlots[plotIndex].itemId = null
        setPlots(nextPlots)
        toast.info('Đã dọn dẹp ô đất')
      }
      return
    }

    // Check if the selected tool is unlocked
    const status = itemStatusMap[selectedTool]
    if (!status?.isUnlocked) {
      toast.error('Vật phẩm này chưa mở khóa! Hãy tích lũy thêm giờ học.')
      return
    }

    nextPlots[plotIndex].itemId = selectedTool
    setPlots(nextPlots)
    soundManager.playDing(0.6)
  }

  // Handle save
  const handleSavePlanet = async () => {
    try {
      setIsSaving(true)
      await focusService.updatePlanetBuild(goal.id, JSON.stringify(plots))
      toast.success('Đã lưu quy hoạch kiến thiết hành tinh vào vũ trụ thành công! 🌍✨')
      if (onSaveSuccess) onSaveSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu kiến thiết hành tinh')
    } finally {
      setIsSaving(false)
    }
  }

  // Clear all
  const handleClearAll = () => {
    if (!confirm('Bạn có chắc muốn dọn sạch toàn bộ công trình trên hành tinh?')) return
    setPlots(plots.map((p) => ({ ...p, itemId: null })))
    toast.info('Đã dọn sạch hành tinh')
  }

  // Chống hiện tượng ghost-click / tap-through trên điện thoại khi mở modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return
    if (Date.now() - mountTimeRef.current < 350) return
    onClose()
  }

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl bg-gradient-to-b ${theme.bg} border border-white/15 rounded-3xl p-4 sm:p-6 text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]`}
      >
        
        {/* Glow ambient circle in background */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: theme.glow }}
        />

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shadow-lg text-2xl">
              {goal.planet_type === 'mars' ? '🔴' : goal.planet_type === 'jupiter' ? '🪐' : goal.planet_type === 'saturn' ? '💫' : goal.planet_type === 'moon' ? '🌙' : '🌍'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-cyan-300">
                  {theme.name}
                </span>
                <span className="text-[11px] text-white/50">
                  {currentHours.toFixed(1)} / {goal.target_hours} giờ học
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5 line-clamp-1">
                {goal.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── TAB SELECTOR ── */}
        <div className="flex items-center gap-2 mt-4 bg-black/40 p-1 rounded-2xl border border-white/10 relative z-10">
          <button
            onClick={() => setActiveTab('build')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'build'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black shadow-lg shadow-emerald-500/20'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>🎮 Khu Vực Xây Dựng ({placedItemsCount}/16 ô)</span>
          </button>

          <button
            onClick={() => setActiveTab('codex')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'codex'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>📜 Codex Thành Tựu ({unlockedCount}/{PLANET_ITEMS.length})</span>
          </button>
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 relative z-10 custom-scrollbar">
          {activeTab === 'build' ? (
            <>
              {/* PLANET SURFACE (4x4 ISOMETRIC/GRID TILES) */}
              <div className="relative mx-auto w-full max-w-md p-4 rounded-3xl bg-black/50 border border-white/15 backdrop-blur-sm shadow-inner">
                <div className="text-center mb-3">
                  <span className="text-[11px] font-semibold text-white/60">
                    Bấm chọn vật phẩm bên dưới rồi bấm vào các ô đất để khai hoang hành tinh:
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5 sm:gap-3 p-2 bg-slate-950/60 rounded-2xl border border-white/10">
                  {plots.map((plot, index) => {
                    const item = PLANET_ITEMS.find((it) => it.id === plot.itemId)
                    return (
                      <button
                        key={plot.id}
                        type="button"
                        onClick={() => handlePlotClick(index)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200 transform active:scale-95 border ${
                          item
                            ? 'bg-gradient-to-br from-white/15 to-white/5 border-white/30 shadow-lg shadow-cyan-500/10 hover:border-cyan-400'
                            : theme.emptySlotBg
                        }`}
                        title={item ? `${item.name} (Bấm để đổi hoặc xóa)` : `Ô trống #${index + 1}`}
                      >
                        {item ? (
                          <>
                            <span className="text-2xl sm:text-3xl animate-in zoom-in duration-150 select-none drop-shadow">
                              {item.icon}
                            </span>
                            <span className="text-[8px] font-extrabold text-white/80 mt-1 line-clamp-1 px-1">
                              {item.name.split(' ')[0]}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] font-mono text-white/20">
                            #{index + 1}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between mt-3 px-1 text-[11px] text-white/50">
                  <span>Hệ sinh thái: {placedItemsCount} công trình</span>
                  <button
                    onClick={handleClearAll}
                    className="text-red-400/80 hover:text-red-300 flex items-center gap-1 hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Dọn sạch ô đất
                  </button>
                </div>
              </div>

              {/* TOOLBAR: UNLOCKED PALETTE */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Bảng Vật Phẩm Kiến Thiết
                  </h4>
                  <span className="text-[10px] text-white/50">
                    Mở khóa bằng số giờ học thực tế
                  </span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {PLANET_ITEMS.map((item) => {
                    const status = itemStatusMap[item.id]
                    const isSelected = selectedTool === item.id
                    const isUnlocked = status?.isUnlocked

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (isUnlocked) {
                            setSelectedTool(item.id)
                          } else {
                            toast.info(`🔒 "${item.name}" cần tích lũy ${item.requiresCompleted ? 'hoàn thành mục tiêu' : item.requiredHours + 'h'} (còn thiếu ${status.neededHours.toFixed(1)}h)`)
                          }
                        }}
                        className={`p-2 rounded-2xl flex flex-col items-center justify-center transition relative border ${
                          isSelected
                            ? 'bg-gradient-to-b from-cyan-500/30 to-blue-500/20 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg'
                            : isUnlocked
                            ? 'bg-black/40 hover:bg-white/10 border-white/10'
                            : 'bg-black/60 border-white/5 opacity-40 grayscale cursor-not-allowed'
                        }`}
                        title={
                          isUnlocked
                            ? `${item.name} (Đã mở khóa)`
                            : `Khóa: Cần ${item.requiresCompleted ? 'hoàn thành mục tiêu' : item.requiredHours + ' giờ'}`
                        }
                      >
                        <span className="text-xl sm:text-2xl">{item.icon}</span>
                        <span className="text-[9px] font-bold mt-1 text-white/90 line-clamp-1">
                          {item.name.split(' ')[0]}
                        </span>
                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                            <Lock className="w-3.5 h-3.5 text-white/70" />
                          </div>
                        )}
                      </button>
                    )
                  })}

                  {/* REMOVER TOOL */}
                  <button
                    type="button"
                    onClick={() => setSelectedTool('remover')}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center transition border ${
                      selectedTool === 'remover'
                        ? 'bg-red-500/30 border-red-400 ring-2 ring-red-400/50 shadow-lg'
                        : 'bg-black/40 hover:bg-white/10 border-white/10 text-white/70'
                    }`}
                    title="Dọn dẹp công trình khỏi ô đất"
                  >
                    <span className="text-xl sm:text-2xl">🧹</span>
                    <span className="text-[9px] font-bold mt-1 text-red-300">Xóa ô</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ── TAB 2: PLANET CODEX ACHIEVEMENTS ── */
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    Biên Niên Sử Khai Hoang Vũ Trụ
                  </h4>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    Cứ mỗi mốc giờ học tập trung được tích lũy, hành tinh sẽ mở khóa các kỳ quan mới!
                  </p>
                </div>
                <div className="text-xs font-black px-3 py-1 bg-amber-400 text-black rounded-xl shadow">
                  {unlockedCount} / {PLANET_ITEMS.length}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PLANET_ITEMS.map((item) => {
                  const status = itemStatusMap[item.id]
                  const isUnlocked = status?.isUnlocked
                  const reqText = item.requiresCompleted ? 'Hoàn thành 100% mục tiêu (DONE)' : `Học đủ ${item.requiredHours} giờ`

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isUnlocked
                          ? 'bg-gradient-to-br from-emerald-500/10 via-black/40 to-cyan-500/10 border-emerald-500/30 shadow-md'
                          : 'bg-black/40 border-white/10 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-1 bg-white/10 rounded-xl">{item.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-cyan-300/80">
                              Yêu cầu: {reqText}
                            </div>
                          </div>
                        </div>

                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Unlock className="w-3 h-3" /> ĐÃ MỞ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-medium bg-white/10 text-white/50">
                            <Lock className="w-3 h-3" /> Thiếu {status.neededHours.toFixed(1)}h
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-white/60 leading-relaxed mt-2 pl-1 border-l-2 border-white/10">
                        {item.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleSavePlanet}
            disabled={isSaving}
            className="px-5 py-2.5 text-xs font-black bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:opacity-95 text-black rounded-xl shadow-lg shadow-emerald-500/25 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu vào vũ trụ...' : 'Lưu Kiến Thiết Hành Tinh'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
