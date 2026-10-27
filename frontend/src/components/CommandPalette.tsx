import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ListTodo, BarChart3, Brain, BookOpen,
  Sparkles, MessageCircle, Sun, Moon, Search, Command,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

interface CommandItem {
  id: string
  icon: typeof Search
  label: string
  description: string
  shortcut?: string
  section: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

const SECTIONS = ['Điều hướng', 'AI', 'Hành động']
const SECTION_COLORS: Record<string, string> = {
  'Điều hướng': 'border-l-blue-500',
  'AI': 'border-l-purple-500',
  'Hành động': 'border-l-amber-500',
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands: CommandItem[] = [
    { id: 'nav-dash', icon: LayoutDashboard, label: 'Dashboard', description: 'Bảng điều khiển chính', shortcut: 'Ctrl+D', section: 'Điều hướng', action: () => navigate('/') },
    { id: 'nav-today', icon: ListTodo, label: 'Kế hoạch & Nhật ký', description: 'Kế hoạch và báo cáo hằng ngày', shortcut: 'Ctrl+P', section: 'Điều hướng', action: () => navigate('/today') },
    { id: 'nav-stats', icon: BarChart3, label: 'Thống kê', description: 'Phân tích dữ liệu', section: 'Điều hướng', action: () => navigate('/statistics') },
    { id: 'nav-ai', icon: Brain, label: 'AI Coach', description: 'Trò chuyện & Knowledge Center', section: 'Điều hướng', action: () => navigate('/ai-coach') },
    { id: 'nav-lang', icon: BookOpen, label: 'Ngôn ngữ', description: 'Từ vựng & IPA', section: 'Điều hướng', action: () => navigate('/language') },
    { id: 'ai-plan', icon: Sparkles, label: 'Hôm nay học gì', description: 'AI lập kế hoạch', section: 'AI', action: () => navigate('/today') },
    { id: 'ai-review', icon: BarChart3, label: 'Đánh giá hôm nay', description: 'AI phân tích ngày học', section: 'AI', action: () => navigate('/today') },
    { id: 'ai-predict', icon: Sparkles, label: 'AI Coach', description: 'Dự đoán và tư vấn', section: 'AI', action: () => navigate('/ai-coach') },
    { id: 'ai-chat', icon: MessageCircle, label: 'Chat với AI', description: 'Trò chuyện cùng AI Coach', section: 'AI', action: () => navigate('/ai-coach') },
    { id: 'action-theme', icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối', description: 'Đổi giao diện', section: 'Hành động', action: () => { toggleTheme(); onClose() } },
  ]

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return commands.filter((c) => {
      const label = c.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const desc = c.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return label.includes(q) || desc.includes(q)
    })
  }, [query, commands])

  useEffect(() => {
    setSelectedIdx(0)
    setQuery('')
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)); scrollToIdx(selectedIdx + 1) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); scrollToIdx(selectedIdx - 1) }
    if (e.key === 'Enter' && filtered[selectedIdx]) { filtered[selectedIdx].action(); onClose() }
  }

  function scrollToIdx(idx: number) {
    const el = listRef.current?.children[idx] as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }

  function highlightText(text: string, q: string) {
    if (!q.trim()) return text
    const normalized = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const regex = new RegExp(`(${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/40 rounded px-0.5">{part}</mark> : part
    )
  }

  const sectionItems = SECTIONS.map((s) => ({
    section: s,
    items: filtered.filter((c) => c.section === s),
  })).filter((s) => s.items.length > 0)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full max-w-lg bg-card border rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-4 border-b">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập lệnh..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>

            <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1">
              {sectionItems.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Không tìm thấy lệnh nào</div>
              ) : sectionItems.map(({ section, items }) => (
                <div key={section}>
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{section}</div>
                  {items.map((cmd, idx) => {
                    const globalIdx = filtered.indexOf(cmd)
                    const isSelected = globalIdx === selectedIdx
                    const Icon = cmd.icon
                    return (
                      <motion.button
                        key={cmd.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                          isSelected ? 'bg-accent text-accent-foreground shadow-sm' : 'hover:bg-accent/50'
                        )}
                        onClick={() => { cmd.action(); onClose() }}
                        onMouseEnter={() => setSelectedIdx(globalIdx)}
                      >
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0 border-l-2', SECTION_COLORS[cmd.section])}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{highlightText(cmd.label, query)}</div>
                          <div className="text-xs text-muted-foreground truncate">{highlightText(cmd.description, query)}</div>
                        </div>
                        {cmd.shortcut && (
                          <kbd className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5 shrink-0">{cmd.shortcut}</kbd>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 px-4 py-2.5 border-t bg-muted/30">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><kbd className="border rounded px-1">↑↓</kbd> Di chuyển</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><kbd className="border rounded px-1">Enter</kbd> Chọn</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><kbd className="border rounded px-1">Esc</kbd> Đóng</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
