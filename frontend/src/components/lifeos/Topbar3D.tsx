import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePlayer } from '@/hooks/usePlayer'
import { Coins, Sparkles, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import NotificationBell from '@/components/notifications/NotificationBell'

const pageRules: { pattern: RegExp; title: string }[] = [
  { pattern: /^\/$/, title: 'Dashboard' },
  { pattern: /^\/today$/, title: 'Kế hoạch & Nhật ký' },
  { pattern: /^\/statistics$/, title: 'Thống kê' },
  { pattern: /^\/language$/, title: 'Ngôn ngữ' },
  { pattern: /^\/ai-coach$/, title: 'AI Coach' },
  { pattern: /^\/knowledge\/.+$/, title: 'Gói kiến thức' },
  { pattern: /^\/study\/.+$/, title: 'Học tập' },
  { pattern: /^\/quiz\/.+$/, title: 'Bài kiểm tra' },
  { pattern: /^\/focus$/, title: 'Timer học tập' },
]

export default function Topbar3D() {
  const location = useLocation()
  const { data: player } = usePlayer()
  const [time, setTime] = useState(new Date())
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const matched = pageRules.find(r => r.pattern.test(location.pathname))
  const title = matched?.title || 'LIFE OS'

  return (
    <header className="sticky top-3 z-30 mx-auto mb-4 w-full max-w-[1400px]">
      <div className="glass-strong rounded-2xl px-5 h-14 flex items-center gap-4 border border-white/[0.08]">
        <motion.h1
          key={location.pathname}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-base font-semibold font-display tracking-tight"
        >
          {title}
        </motion.h1>

        <div className="flex-1" />

        <div className={cn('relative transition-all duration-300', searchOpen ? 'w-56' : 'w-8')}>
          <Search
            className={cn(
              'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer transition-all',
              searchOpen ? 'left-3' : 'left-1/2 -translate-x-1/2'
            )}
            onClick={() => setSearchOpen(!searchOpen)}
          />
          {searchOpen && (
            <input
              autoFocus
              placeholder="Tìm kiếm..."
              className="w-full h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#00E5FF]/30 transition-all"
              onBlur={() => setSearchOpen(false)}
            />
          )}
        </div>

        <span className="text-xs text-muted-foreground tabular-nums font-mono hidden sm:inline-block">
          {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>

        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03] text-[10px] text-muted-foreground border border-white/[0.05]">
          <Sparkles className="h-3 w-3 text-[#00E5FF]" />
          <kbd className="font-mono">Ctrl+K</kbd>
        </div>

        <NotificationBell />

        {player && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium bg-white/[0.03] rounded-xl px-3 py-1.5 border border-white/[0.05]">
              <Coins className="h-3.5 w-3.5 text-[#FFD700]" />
              <span className="text-xs">{player.coins}</span>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#6C63FF] text-[9px] font-bold text-white shadow-glow">
                {player.level}
              </div>
              <div className="flex flex-col">
                <div className="h-1.5 w-20 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((player.exp / (player.exp_to_next || 1)) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-[#00FFC8]"
                  />
                </div>
                <span className="text-[9px] text-muted-foreground mt-0.5">{player.exp} EXP</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
