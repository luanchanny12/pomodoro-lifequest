import { useState, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { usePlayer } from '@/hooks/usePlayer'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  LayoutDashboard, ListTodo, Brain, BookOpen, BarChart3,
  Swords, ChevronRight, Pin, PinOff, Flame, Timer,
} from 'lucide-react'

interface NavItem { label: string; path: string; end?: boolean }
interface NavGroup { label: string; icon: any; color: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Tổng quan', icon: LayoutDashboard, color: '#00E5FF',
    items: [
      { label: 'Dashboard', path: '/', end: true },
    ],
  },
  {
    label: 'Hôm nay', icon: ListTodo, color: '#6C63FF',
    items: [
      { label: 'Kế hoạch & Nhật ký', path: '/today' },
      { label: 'Thống kê', path: '/statistics' },
    ],
  },
  {
    label: 'AI Coach', icon: Brain, color: '#FF6B9D',
    items: [
      { label: 'Chat & Tài liệu', path: '/ai-coach' },
    ],
  },
  {
    label: 'Học tập', icon: BookOpen, color: '#00FFC8',
    items: [
      { label: 'Ngôn ngữ', path: '/language' },
      { label: 'Timer học tập', path: '/focus' },
    ],
  },
]

export default function Sidebar3D() {
  const [hovered, setHovered] = useState(false)
  const [isPinned, setIsPinned] = useState(() => {
    try { return localStorage.getItem('sidebar_pinned') === 'true' } catch { return false }
  })
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map(g => [g.label, true]))
  )
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const location = useLocation()
  const navigate = useNavigate()
  const { data: player } = usePlayer()

  const expanded = hovered || isPinned

  function handleMouseEnter() {
    clearTimeout(timeoutRef.current)
    setHovered(true)
  }

  function handleMouseLeave() {
    if (isPinned) return
    timeoutRef.current = setTimeout(() => setHovered(false), 150)
  }

  function togglePin() {
    const next = !isPinned
    setIsPinned(next)
    localStorage.setItem('sidebar_pinned', String(next))
  }

  function toggleGroup(label: string) {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: expanded ? 220 : 64,
        transition: 'width 0.2s cubic-bezier(0.4,0,0.2,1)',
        willChange: 'width',
      }}
      className="fixed left-3 top-3 bottom-3 z-50 flex flex-col rounded-2xl glass-strong overflow-hidden border border-white/[0.08] shadow-2xl"
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-3.5 h-14 shrink-0 border-b border-white/[0.05]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#6C63FF] shadow-glow">
            <Swords className="h-4 w-4 text-white" />
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.12 }}
                className="text-sm font-bold bg-gradient-to-r from-[#00E5FF] to-[#00FFC8] bg-clip-text text-transparent whitespace-nowrap"
              >
                LIFE OS
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {expanded && (
          <button
            onClick={togglePin}
            className="p-1 rounded-md text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
            title={isPinned ? 'Bỏ ghim' : 'Ghim sidebar'}
          >
            {isPinned
              ? <PinOff className="h-3.5 w-3.5 text-[#00E5FF]" />
              : <Pin className="h-3.5 w-3.5" />
            }
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-cyber py-2 px-2 space-y-0.5">
        {NAV_GROUPS.map((group) => {
          const isGroupActive = group.items.some(
            i => i.end ? location.pathname === i.path : location.pathname.startsWith(i.path)
          )
          const isExpanded = expandedGroups[group.label]

          const groupBtn = (
            <button
              onClick={() => {
                if (expanded) {
                  toggleGroup(group.label)
                } else {
                  setHovered(true)
                  navigate(group.items[0].path)
                }
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150',
                expanded ? 'justify-between' : 'justify-center',
                isGroupActive
                  ? 'bg-white/[0.08] text-[#00E5FF]'
                  : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <group.icon className="h-4 w-4 shrink-0" style={{ color: group.color }} />
                {expanded && <span className="truncate">{group.label}</span>}
              </div>
              {expanded && group.items.length > 1 && (
                <ChevronRight className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-transform duration-150 text-muted-foreground',
                  isExpanded && 'rotate-90'
                )} />
              )}
            </button>
          )

          return (
            <div key={group.label}>
              {!expanded ? (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>{groupBtn}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#0A0F1D] border-white/10 text-white p-3 shadow-xl">
                    <p className="font-bold text-[#00E5FF] mb-1 text-xs">{group.label}</p>
                    <div className="space-y-1">
                      {group.items.map(item => (
                        <div key={item.path} className="text-[11px] text-white/50 flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-[#00E5FF]" />
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : groupBtn}

              <AnimatePresence initial={false}>
                {expanded && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 pl-3 border-l border-white/[0.08] mb-1 space-y-0.5">
                      {group.items.map(item => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.end}
                          className={({ isActive }) => cn(
                            'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-100',
                            isActive
                              ? 'text-[#00E5FF] bg-white/[0.06] font-semibold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
                          )}
                        >
                          <div className="h-1 w-1 rounded-full bg-current shrink-0" />
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Player footer */}
      {player && (
        <div className="shrink-0 border-t border-white/[0.05] p-3">
          <div className={cn('flex items-center gap-3', expanded ? '' : 'justify-center')}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF] to-[#6C63FF] text-[10px] font-bold text-white shadow-glow">
              {player.level}
            </div>
            {expanded && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-xs font-medium text-white">
                  Cấp {player.level}
                  {player.streak > 0 && (
                    <span className="flex items-center gap-0.5 text-[#00E5FF] ml-1">
                      <Flame className="h-2.5 w-2.5" />{player.streak}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">{player.exp} EXP</div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
