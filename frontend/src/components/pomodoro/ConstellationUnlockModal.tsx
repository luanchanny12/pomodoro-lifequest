import React, { useState, useEffect } from 'react'
import {
  X,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  BookOpen,
  Star,
  CheckCircle2,
  Share2
} from 'lucide-react'
import { ConstellationAchievement } from '@/services/focusService'
import { speechNarrator } from '@/utils/speechNarrator'
import { soundManager } from '@/utils/soundEffects'

interface ConstellationUnlockModalProps {
  constellation: ConstellationAchievement | null
  onClose: () => void
  autoPlayVoice?: boolean
}

export const ConstellationUnlockModal: React.FC<ConstellationUnlockModalProps> = ({
  constellation,
  onClose,
  autoPlayVoice = true,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (constellation) {
      if (autoPlayVoice) {
        handleStartSpeech()
      }
    }

    return () => {
      speechNarrator.stop()
      setIsSpeaking(false)
      setIsPaused(false)
    }
  }, [constellation])

  if (!constellation) return null

  const handleStartSpeech = () => {
    if (!constellation) return
    const textToRead = `${constellation.title}. ${constellation.narration_script || constellation.ai_interpretation}`
    speechNarrator.speak(
      textToRead,
      () => {
        setIsSpeaking(true)
        setIsPaused(false)
      },
      () => {
        setIsSpeaking(false)
        setIsPaused(false)
      }
    )
  }

  const handleTogglePause = () => {
    if (isPaused) {
      speechNarrator.resume()
      setIsPaused(false)
      setIsSpeaking(true)
    } else if (isSpeaking) {
      speechNarrator.pause()
      setIsPaused(true)
    } else {
      handleStartSpeech()
    }
  }

  const handleStopSpeech = () => {
    speechNarrator.stop()
    setIsSpeaking(false)
    setIsPaused(false)
  }

  const handleReplay = () => {
    soundManager.playCosmicChime()
    handleStartSpeech()
  }

  const handleClose = () => {
    speechNarrator.stop()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fadeIn">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#241708] via-[#140e06] to-[#080503] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 text-white text-center shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Golden cosmic ambient rays */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Archetype Icon & Sacred Star Emblem */}
        <div className="relative my-2 inline-flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 flex items-center justify-center text-4xl shadow-2xl shadow-amber-500/50 relative z-10 border-2 border-amber-300">
            <span>{constellation.icon}</span>
          </div>

          {/* Pulsing halo */}
          <div className="absolute -inset-3 rounded-full border border-amber-400/40 animate-ping pointer-events-none" />
          <div className="absolute -inset-6 rounded-full border border-dashed border-amber-500/30 animate-spin pointer-events-none" style={{ animationDuration: '30s' }} />
        </div>

        {/* Milestone Badge */}
        <div className="mt-2 text-[11px] font-bold uppercase tracking-widest text-amber-300 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-current animate-pulse" />
          <span>Khai Mở Chòm Sao Thành Tựu Chiêm Tinh</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-current animate-pulse" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black text-amber-100 tracking-wide mt-1 mb-1">
          {constellation.title}
        </h3>

        {/* Associated goals tag */}
        {constellation.associated_goal_titles && (
          <p className="text-xs text-amber-200/80 mb-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 inline-block max-w-full truncate">
            🏆 Gắn liền với: <strong>{constellation.associated_goal_titles}</strong>
          </p>
        )}

        {/* AI Astrological Interpretation Card */}
        <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-4.5 text-left text-xs space-y-2.5 my-3.5 max-h-56 overflow-y-auto shadow-inner">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-amber-400 tracking-wider pb-1.5 border-b border-amber-500/20">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-current" />
              Lời Giải Nghĩa Triết Lý Chiêm Tinh
            </span>
            <span className="text-[10px] text-amber-300/70 font-mono">
              Yêu cầu: {constellation.required_completed_goals} mục tiêu DONE
            </span>
          </div>

          <p className="text-amber-100/90 leading-relaxed font-serif italic text-[13px] whitespace-pre-wrap">
            "{constellation.ai_interpretation}"
          </p>
        </div>

        {/* ── SPEECH SYNTHESIS VOICE NARRATION CONTROL BAR ── */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Volume2 className={`w-4 h-4 ${isSpeaking && !isPaused ? 'animate-pulse text-amber-300' : 'text-slate-400'}`} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                <span>{isSpeaking ? (isPaused ? 'Đã tạm dừng đọc' : 'Đang thuyết minh giọng nói...') : 'Bản đọc giọng nói AI'}</span>
                {isSpeaking && !isPaused && (
                  <span className="flex gap-0.5">
                    <span className="w-1 h-3 bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-3 bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-3 bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
              <div className="text-[10px] text-white/60">
                Thuyết minh triết lý biểu tượng tiếng Việt
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleTogglePause}
              className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold transition shadow"
              title={isPaused ? 'Tiếp tục đọc' : isSpeaking ? 'Tạm dừng đọc' : 'Nghe đọc ý nghĩa'}
            >
              {isSpeaking && !isPaused ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={handleReplay}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Nghe lại từ đầu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {isSpeaking && (
              <button
                onClick={handleStopSpeech}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
                title="Dừng đọc"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Footer Button */}
        <button
          onClick={handleClose}
          className="w-full py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:opacity-95 text-black font-extrabold text-sm rounded-2xl shadow-xl shadow-amber-500/25 transition active:scale-98"
        >
          Lưu vào Kho Tàng Chiêm Tinh ✨
        </button>
      </div>
    </div>
  )
}
