import { useState, useRef, useEffect, useCallback, type ReactNode, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, X, Loader2, User, CalendarPlus, History as HistoryIcon, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAIChat, useChatHistory, useChatSessions } from '@/services/aiService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const ScheduleSetupModal = lazy(() => import('@/components/schedule/ScheduleSetupModal'))
const AvailabilitySurveyModal = lazy(() => import('@/components/schedule/AvailabilitySurveyModal'))

function Markdown({ content }: { content: string }): ReactNode {
  const lines = content.split('\n').map((l, i) => {
    if (l.startsWith('**') && l.endsWith('**')) return <p key={i} className="font-bold text-white">{l.slice(2, -2)}</p>
    if (l.startsWith('- ')) return <li key={i} className="text-sm ml-4 list-disc text-white/80">{l.slice(2)}</li>
    return <p key={i} className="text-sm leading-relaxed text-white/80">{l}</p>
  })
  return <div className="space-y-1">{lines}</div>
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  action?: { type: 'schedule'; subject: string; weeks: number }
}

interface AIChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Detect scheduling intent from user message
function detectScheduleIntent(text: string): { subject: string; weeks: number } | null {
  const lower = text.toLowerCase()
  // Patterns: "tôi có môn X trong Y tuần", "môn X Y tuần", "học X trong Y tuần"
  const weekMatch = lower.match(/(\d+)\s*tu[aầ]n/)
  const subjectMatch =
    text.match(/môn\s+([^\s,!.?]+(?:\s+[^\s,!.?]+){0,3})/i) ||
    text.match(/học\s+([^\s,!.?]+(?:\s+[^\s,!.?]+){0,3})\s+trong/i) ||
    text.match(/([^\s,!.?]+(?:\s+[^\s,!.?]+){0,2})\s+trong\s+\d+\s*tu[aầ]n/i)

  if (weekMatch && subjectMatch) {
    return {
      subject: subjectMatch[1].trim(),
      weeks: parseInt(weekMatch[1]),
    }
  }
  return null
}

export default function AIChatDialog({ open, onOpenChange }: AIChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('ai_chat_session') || '')
  const [showHistory, setShowHistory] = useState(false)
  const [scheduleModal, setScheduleModal] = useState<{ subject: string; weeks: number } | null>(null)
  const [availSurvey, setAvailSurvey] = useState<{ goal: string } | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const accumulatedRef = useRef('')
  const qc = useQueryClient()
  const aiChat = useAIChat()
  const { data: savedMessages } = useChatHistory(sessionId)
  const { data: sessions } = useChatSessions()

  // Load chat history from backend on mount
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    if (savedMessages && savedMessages.length > 0 && messages.length === 0) {
      const history = savedMessages.map(m => ({
        id: `hist-${m.id}`,
        role: m.role as 'user' | 'assistant',
        content: m.message,
      }))
      setMessages(history)
    } else if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '👋 Xin chào! Tôi là AI Coach của bạn.\n\nBạn có thể hỏi tôi bất cứ điều gì, hoặc nhắn kiểu:\n**"Tôi có môn Toán trong 3 tuần"** để tôi lập lịch học chi tiết cho bạn! 📅'
      }])
    }
  }, [open, savedMessages])

  // Save sessionId to localStorage
  useEffect(() => {
    if (sessionId) localStorage.setItem('ai_chat_session', sessionId)
  }, [sessionId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'c') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onOpenChange])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming || aiChat.isPending) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])

    // Detect scheduling intent
    const scheduleIntent = detectScheduleIntent(text)
    if (scheduleIntent) {
      setTimeout(() => {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `📅 Tuyệt! Tôi sẽ lên lịch học cho môn **${scheduleIntent.subject}** trong **${scheduleIntent.weeks} tuần**.\n\nĐể tạo lịch phù hợp nhất, hãy cho tôi biết bạn rảnh mấy tiếng mỗi ngày trong 2 tuần tới nhé!`,
          action: { type: 'schedule', ...scheduleIntent },
        }
        setMessages(prev => [...prev, aiMsg])
        setScheduleModal(scheduleIntent)
      }, 600)
      return
    }

    // Try streaming
    const msgId = (Date.now() + 1).toString()
    const streamAbort = new AbortController()
    setIsStreaming(true)
    accumulatedRef.current = ''
    setMessages(prev => [...prev, { id: msgId, role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId || '' }),
        signal: streamAbort.signal,
      })
      if (!res.ok) throw new Error('Stream unavailable')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.chunk) {
                accumulatedRef.current += data.chunk
                const content = accumulatedRef.current
                // Check if content starts with __NEED_AVAILABILITY__
                if (content.startsWith('__NEED_AVAILABILITY__')) {
                  try {
                    const payload = JSON.parse(content.slice('__NEED_AVAILABILITY__'.length))
                    setAvailSurvey(payload)
                  } catch {}
                  setMessages(prev => prev.filter(m => m.id !== msgId))
                  setIsStreaming(false)
                  return
                }
                setMessages(prev => {
                  const updated = [...prev]
                  if (updated.length > 0) {
                    updated[updated.length - 1] = { ...updated[updated.length - 1], content }
                  }
                  return updated
                })
              }
              if (data.done && data.session_id) {
                setSessionId(data.session_id)
                if (data.plan_created) {
                  qc.invalidateQueries({ queryKey: ['tasks'] })
                  qc.invalidateQueries({ queryKey: ['daily-mission'] })
                  qc.invalidateQueries({ queryKey: ['schedule'] })
                }
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch {
      // Fallback to non-streaming
      try {
        const fallbackRes = await aiChat.mutateAsync({ message: text, session_id: sessionId || undefined })
        if (!sessionId && fallbackRes.session_id) setSessionId(fallbackRes.session_id)
        const reply = fallbackRes.reply
        // Check for __NEED_AVAILABILITY__
        if (reply.startsWith('__NEED_AVAILABILITY__')) {
          try {
            const payload = JSON.parse(reply.slice('__NEED_AVAILABILITY__'.length))
            setAvailSurvey(payload)
          } catch {}
          setMessages(prev => prev.filter(m => m.id !== msgId))
          setIsStreaming(false)
          return
        }
        if (reply.includes('✅') && reply.includes('tạo kế hoạch')) {
          qc.invalidateQueries({ queryKey: ['tasks'] })
          qc.invalidateQueries({ queryKey: ['daily-mission'] })
          qc.invalidateQueries({ queryKey: ['schedule'] })
        }
        setMessages(prev => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: reply }
          }
          return updated
        })
      } catch {
        setMessages(prev => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.' }
          }
          return updated
        })
      }
    } finally {
      setIsStreaming(false)
    }
  }, [input, sessionId, isStreaming, aiChat])

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => onOpenChange(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="flex h-[600px] w-full max-w-2xl flex-col rounded-2xl border border-white/[0.08] bg-[#0A0F1D] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">AI Coach</span>
                    <p className="text-[11px] text-white/40">Nhắn "tôi có môn X trong Y tuần" để lên lịch 📅</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setShowHistory(!showHistory)}
                    className={showHistory ? 'bg-white/[0.08]' : ''}>
                    <HistoryIcon className="h-4 w-4 text-white/60" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                    <X className="h-4 w-4 text-white/60" />
                  </Button>
                </div>
              </div>

              {/* Main content area */}
              <div className="flex flex-1 overflow-hidden">
                {/* History sidebar */}
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 240, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="border-r border-white/[0.08] bg-white/[0.02] overflow-hidden shrink-0"
                    >
                      <div className="p-3 space-y-1.5 w-[240px]">
                        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Lịch sử hội thoại</p>
                        {!sessions || sessions.length === 0 ? (
                          <p className="text-xs text-white/30 text-center py-4">Chưa có hội thoại nào</p>
                        ) : sessions.map(s => (
                          <button
                            key={s.session_id}
                            onClick={() => {
                              localStorage.setItem('ai_chat_session', s.session_id)
                              setSessionId(s.session_id)
                              setMessages([])
                              setShowHistory(false)
                            }}
                            className={`w-full text-left rounded-lg px-2.5 py-2 text-xs transition-colors ${
                              s.session_id === sessionId ? 'bg-[#00E5FF]/10 border border-[#00E5FF]/20' : 'hover:bg-white/[0.04] border border-transparent'
                            }`}
                          >
                            <p className="text-white/80 truncate">{s.preview || '(trống)'}</p>
                            <p className="text-[10px] text-white/30 mt-0.5">
                              {s.last_message ? new Date(s.last_message).toLocaleDateString('vi-VN') : ''}
                            </p>
                          </button>
                        ))}
                        {sessionId && (
                          <button
                            onClick={() => {
                              setSessionId('')
                              setMessages([])
                              localStorage.removeItem('ai_chat_session')
                            }}
                            className="w-full text-left rounded-lg px-2.5 py-2 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 mt-2"
                          >
                            <Trash2 className="h-3 w-3" /> Bắt đầu hội thoại mới
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Messages + Input */}
                <div className="flex flex-1 flex-col min-w-0">
                  <ScrollArea ref={scrollRef} className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                        >
                          {msg.role === 'assistant' && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30">
                              <Bot className="h-4 w-4 text-purple-300" />
                            </div>
                          )}
                          <div className="space-y-2 max-w-[75%]">
                            <div className={cn(
                              'rounded-2xl px-4 py-2.5 text-sm',
                              msg.role === 'user'
                                ? 'bg-gradient-to-br from-[#00E5FF]/20 to-[#6C63FF]/20 text-white border border-[#00E5FF]/20 rounded-tr-sm'
                                : 'bg-white/[0.06] text-white/90 rounded-tl-sm'
                            )}>
                              {msg.role === 'assistant' ? <Markdown content={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                            </div>
                            {msg.action?.type === 'schedule' && (
                              <button
                                onClick={() => setScheduleModal(msg.action!)}
                                className="flex items-center gap-2 rounded-xl border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-3 py-2 text-xs text-[#00E5FF] hover:bg-[#00E5FF]/20 transition-colors"
                              >
                                <CalendarPlus className="h-3.5 w-3.5" />
                                Điền lịch bận 2 tuần để tạo lịch học
                              </button>
                            )}
                          </div>
                          {msg.role === 'user' && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00E5FF] to-[#6C63FF]">
                              <User className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {(aiChat.isPending || isStreaming) && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30">
                            <Bot className="h-4 w-4 text-purple-300" />
                          </div>
                          <div className="rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3">
                            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="border-t border-white/[0.08] bg-white/[0.02] p-4">
                    <form onSubmit={e => { e.preventDefault(); handleSend() }} className="flex items-center gap-2">
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder='Hỏi AI... hoặc "tôi có môn X trong Y tuần"'
                        className="flex-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#00E5FF]/40"
                      />
                       <Button type="submit" size="icon" disabled={!input.trim() || aiChat.isPending || isStreaming}
                         className="bg-gradient-to-br from-[#00E5FF] to-[#6C63FF] text-white hover:opacity-90">
                         {(aiChat.isPending || isStreaming) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                       </Button>
                    </form>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Availability Survey Modal */}
      <AnimatePresence>
        {availSurvey && (
          <Suspense fallback={null}>
            <AvailabilitySurveyModal
              goal={availSurvey.goal}
              onClose={() => setAvailSurvey(null)}
              onSaved={() => {
                // After availability saved, tell AI to continue with plan
                setAvailSurvey(null)
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: '✅ Đã lưu lịch rảnh 14 ngày! Bây giờ nói **"đồng ý"** để mình tạo kế hoạch học nhé! 🚀',
                }])
                qc.invalidateQueries({ queryKey: ['ai', 'chat', 'sessions'] })
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Schedule Setup Modal */}
      <AnimatePresence>
        {scheduleModal && (
          <Suspense fallback={null}>
            <ScheduleSetupModal
              subjectName={scheduleModal.subject}
              totalWeeks={scheduleModal.weeks}
              onClose={() => setScheduleModal(null)}
              onCreated={(subject) => {
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: `✅ Đã tạo lịch học cho môn **${subject.name}**!\n\nLịch học đã được thêm vào Dashboard. Vào trang chủ để xem lịch hôm nay và tuần này nhé! 🎯`,
                }])
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  )
}
