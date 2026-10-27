import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, X, Loader2, User, MessageCircleQuestion } from 'lucide-react'
import { useAIChat } from '@/services/aiService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Message {
  id: string; role: 'user' | 'assistant'; content: string;
}

const GUIDE_PROMPT = `Bạn là trợ lý hướng dẫn thân thiện của ứng dụng LIFE QUEST. Nhiệm vụ của bạn là giúp người dùng hiểu cách sử dụng tất cả tính năng của ứng dụng một cách dễ dàng.

Ứng dụng LIFE QUEST có các tính năng chính sau:
- 🏠 Tổng quan: Dashboard xem tiến độ tổng thể, chỉ số, tập trung, ưu tiên
- 📋 Công việc: Sprint (kế hoạch theo sprint), Backlog (việc cần làm sau)
- 🎓 Học tập: Từ vựng (học từ vựng có spaced repetition), IPA (phát âm)
- 🎮 RPG: Nhiệm vụ (quests hệ thống game), Cửa hàng (mua trang bị)
- 🧠 Cố vấn AI: Chat với AI, đánh giá ngày, bản đồ hoạt động, dòng thời gian
- 🎯 Mục tiêu: Thiết lập mục tiêu dài hạn, lộ trình học tập
- ⚙️ Khác: Xuất dữ liệu học tập
- 📚 Knowledge Center (TÍNH NĂNG MỚI — QUAN TRỌNG): Người dùng có thể UPLOAD tài liệu học tập (PDF, DOCX, PPTX, TXT, MD, MP4, MP3, ảnh), AI sẽ tự động phân tích và tách thành chương → bài học → flashcard → quiz. Cách dùng: vào Knowledge Center ở sidebar, nhấn Upload, chọn file. Sau đó có thể:
  • Học từng bài trong Study Mode (có Focus Timer đếm ngược)
  • Ôn tập với Flashcards (SM-2 spaced repetition: nhấn 0-5 sao)
  • Làm Quiz trắc nghiệm để kiểm tra
  • Daily Coach tự động tạo kế hoạch học mỗi ngày

Luôn trả lời ngắn gọn bằng tiếng Việt, thân thiện, có thể dùng emoji. Hãy tập trung hướng dẫn cụ thể cách dùng từng tính năng khi người dùng hỏi.`

const SUGGESTIONS = [
  'Làm sao để bắt đầu?',
  'Tôi có tài liệu môn A, làm sao để học?',
  'Cách học từ vựng hiệu quả?',
  'Flashcard và Quiz hoạt động thế nào?',
]

export default function AIGuideChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [primed, setPrimed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const aiChat = useAIChat()

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      if (messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: '👋 Chào bạn! Mình là trợ lý hướng dẫn của **LIFE QUEST**.\n\nMình có thể giúp bạn khám phá và sử dụng tất cả tính năng của ứng dụng. Bạn muốn hỏi gì nào?'
        }])
      }
    }
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function primeSession() {
    try {
      const res = await aiChat.mutateAsync({ message: GUIDE_PROMPT })
      if (res.session_id) setSessionId(res.session_id)
      setPrimed(true)
      return res.session_id || ''
    } catch {
      return ''
    }
  }

  async function handleSend(suggestion?: string) {
    const text = suggestion || input.trim()
    if (!text || aiChat.isPending) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])

    try {
      let sid = sessionId
      if (!primed) {
        const newSid = await primeSession()
        if (!newSid) throw new Error('Failed to prime')
        sid = newSid
      }
      const res = await aiChat.mutateAsync({ message: text, session_id: sid || undefined })
      if (res.session_id && !sessionId) setSessionId(res.session_id)
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: res.reply }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.' }
      setMessages(prev => [...prev, errMsg])
    }
  }

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-shadow"
      >
        <motion.span
          animate={{ rotate: [0, -8, 8, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
        >
          <MessageCircleQuestion className="h-6 w-6" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-4 sm:p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="flex h-[520px] w-full max-w-md flex-col rounded-2xl border border-white/[0.08] bg-[#0A0F1D] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Hướng dẫn AI</span>
                    <p className="text-[11px] text-muted-foreground">Hỏi về cách dùng ứng dụng</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea ref={scrollRef} className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-400/30">
                          <Bot className="h-4 w-4 text-blue-300" />
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-[#00E5FF]/20 to-[#6C63FF]/20 text-white border border-[#00E5FF]/20 rounded-tr-sm'
                          : 'bg-white/[0.06] text-white/90 rounded-tl-sm'
                      )}>
                        {msg.role === 'assistant' ? (
                          <div className="space-y-1">{renderContent(msg.content)}</div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {aiChat.isPending && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-400/30">
                        <Bot className="h-4 w-4 text-blue-300" />
                      </div>
                      <div className="rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    </motion.div>
                  )}
                  {messages.length === 1 && !aiChat.isPending && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSend(s)}
                          className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="border-t border-white/[0.08] bg-white/[0.02] p-4">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend() }}
                  className="flex items-center gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Hỏi về cách dùng..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || aiChat.isPending}>
                    {aiChat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function renderContent(content: string) {
  return content.split('\n').map((l, i) => {
    if (l.startsWith('**') && l.endsWith('**')) return <p key={i} className="font-bold">{l.slice(2, -2)}</p>
    if (l.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{l.slice(2)}</li>
    return <p key={i} className="leading-relaxed">{l}</p>
  })
}
