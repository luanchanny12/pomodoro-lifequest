import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, MessageSquare, X, ArrowRight, Bot, Moon, Flame } from 'lucide-react'
import { focusService, AIBuddyPrompt } from '@/services/focusService'
import { soundManager } from '@/utils/soundEffects'

interface AIFloatingBuddyProps {
  onAction: (actionType: string, target?: string, goalId?: number) => void
  isTimerRunning?: boolean
}

export const AIFloatingBuddy: React.FC<AIFloatingBuddyProps> = ({
  onAction,
  isTimerRunning = false,
}) => {
  const [prompt, setPrompt] = useState<AIBuddyPrompt | null>(null)
  const [isBubbleVisible, setIsBubbleVisible] = useState<boolean>(false)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const hasTriggeredInitial = useRef<boolean>(false)

  const fetchPrompt = async (showBubble = true) => {
    try {
      const data = await focusService.getAIBuddyPrompt()
      setPrompt(data)
      if (showBubble && !isTimerRunning) {
        setIsBubbleVisible(true)
        soundManager.playFriendlyBubble()
      }
    } catch (err) {
      console.error('Error fetching AI buddy prompt:', err)
    }
  }

  // Initial trigger after 4 seconds of entering app
  useEffect(() => {
    if (!hasTriggeredInitial.current) {
      hasTriggeredInitial.current = true
      const timer = setTimeout(() => {
        fetchPrompt(true)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Auto-refresh prompt every 5 minutes if timer is not running
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTimerRunning) {
        fetchPrompt(true)
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [isTimerRunning])

  // Hide bubble automatically when user starts a focus session
  useEffect(() => {
    if (isTimerRunning) {
      setIsBubbleVisible(false)
    }
  }, [isTimerRunning])

  const handleBuddyClick = () => {
    if (isBubbleVisible) {
      setIsBubbleVisible(false)
    } else {
      fetchPrompt(true)
    }
  }

  const handleActionClick = () => {
    if (!prompt) return
    setIsBubbleVisible(false)
    onAction(prompt.action_type, prompt.action_target || undefined, prompt.suggested_goal_id || undefined)
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {/* Speech Bubble */}
      {isBubbleVisible && prompt && (
        <div className="mb-3 w-80 max-w-[calc(100vw-2.5rem)] p-4 rounded-3xl bg-[#141721]/95 backdrop-blur-2xl border border-indigo-500/40 shadow-2xl shadow-indigo-950/60 animate-in fade-in slide-in-from-bottom-4 duration-300 text-white relative">
          {/* Decorative tail pointing to mascot */}
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-[#141721] border-r border-b border-indigo-500/40 transform rotate-45" />

          {/* Close button */}
          <button
            onClick={() => setIsBubbleVisible(false)}
            className="absolute top-3 right-3 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
            title="Đóng lời nhắn"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* AI Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              AI Bạn Đồng Hành
            </span>
            {prompt.mood === 'cozy' && (
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-0.5">
                <Moon className="w-2.5 h-2.5" /> Chuẩn bị tối
              </span>
            )}
            {prompt.mood === 'urgent' && (
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5" /> Cần làm ngay
              </span>
            )}
          </div>

          {/* Message content */}
          <p className="text-xs text-white/90 leading-relaxed font-medium mb-3">
            {prompt.message}
          </p>

          {/* Quick Action Button */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
            <button
              onClick={handleActionClick}
              className="flex-1 py-1.5 px-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>{prompt.action_label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsBubbleVisible(false)}
              className="py-1.5 px-2.5 text-[11px] text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              Để sau
            </button>
          </div>
        </div>
      )}

      {/* Floating Mascot Button */}
      <div className="relative group">
        <button
          onClick={handleBuddyClick}
          className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-xl shadow-purple-950/60 transition-transform duration-300 hover:scale-105 active:scale-95 group-hover:rotate-3"
          title="Bấm để nhận gợi ý từ AI Bạn Đồng Hành"
        >
          <div className="w-full h-full rounded-[14px] bg-[#10131C] flex items-center justify-center text-white relative overflow-hidden">
            {/* Animated background aura */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-transparent" />

            {/* Astronaut / Bot Icon */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <span className="text-2xl filter drop-shadow">🤖</span>
            </div>

            {/* Glowing active badge */}
            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#10131C]" />
          </div>
        </button>

        {/* Hover mini-tooltip when bubble is hidden */}
        {!isBubbleVisible && (
          <div className="absolute right-16 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/80 backdrop-blur-md border border-white/15 rounded-xl text-[11px] text-white font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none shadow-lg">
            Gợi ý từ AI Bạn Đồng Hành ✨
          </div>
        )}
      </div>
    </div>
  )
}
