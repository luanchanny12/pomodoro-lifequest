import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Sparkles,
  CloudRain,
  Waves,
  Timer as TimerIcon,
  Flame,
  Brain,
  Radio,
  Target,
} from 'lucide-react'
import { soundManager } from '@/utils/soundEffects'
import { toast } from 'sonner'

interface ZenDeskClockModalProps {
  isOpen: boolean
  onClose: () => void
  timeLeft: number
  isRunning: boolean
  mode: 'pomodoro' | 'shortBreak' | 'longBreak'
  onStartPause: () => void
  onReset: () => void
  onSkip: () => void
  onSwitchMode: (mode: 'pomodoro' | 'shortBreak' | 'longBreak') => void
  totalDurationSeconds: number
  topicNote?: string
  goalTitle?: string
}

export const ZenDeskClockModal: React.FC<ZenDeskClockModalProps> = ({
  isOpen,
  onClose,
  timeLeft,
  isRunning,
  mode,
  onStartPause,
  onReset,
  onSkip,
  onSwitchMode,
  totalDurationSeconds,
  topicNote,
  goalTitle,
}) => {
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'waves' | 'ticking' | 'fire' | 'binaural' | 'lofi'>('none')
  const [volume, setVolume] = useState<number>(0.6)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const wakeLockRef = useRef<any>(null)

  // Format time mm:ss
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

  const progressPercent = totalDurationSeconds > 0
    ? Math.max(0, Math.min(100, ((totalDurationSeconds - timeLeft) / totalDurationSeconds) * 100))
    : 0

  // Request WakeLock to keep screen on while in Zen Mode
  useEffect(() => {
    if (!isOpen) return

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        }
      } catch (err) {
        console.debug('WakeLock error:', err)
      }
    }

    requestWakeLock()

    return () => {
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release()
        } catch {}
        wakeLockRef.current = null
      }
    }
  }, [isOpen])

  // Fullscreen handler
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch {}
  }

  // Handle ambient sound toggle
  const toggleSound = (type: 'rain' | 'waves' | 'ticking' | 'fire' | 'binaural' | 'lofi') => {
    if (ambientSound === type) {
      soundManager.stopAmbient()
      setAmbientSound('none')
      toast.info('Đã tắt âm thanh nền')
    } else {
      soundManager.startAmbient(type, volume)
      setAmbientSound(type)
      const labels: Record<string, string> = {
        rain: 'Tiếng mưa rơi 🌧️',
        waves: 'Sóng biển đại dương 🌊',
        ticking: 'Tích tắc bàn học ⏰',
        fire: 'Lò sưởi ấm cúng 🔥',
        binaural: 'Sóng não Gamma 40Hz (Tập trung sâu) 🧠',
        lofi: 'Lo-Fi Chill Cozy Chords 🎵',
      }
      toast.success(`Đang phát: ${labels[type] || type}`)
    }
  }

  // Handle keyboard shortcuts (Space: play/pause, Esc: close)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        onStartPause()
      } else if (e.code === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onStartPause, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-[#07090f] text-white flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-300 select-none overflow-hidden font-sans">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/30 via-slate-950/70 to-[#07090f] pointer-events-none" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>ZEN DESK CLOCK</span>
          </span>
          {goalTitle && (
            <span className="hidden sm:inline-flex text-xs text-white/60 items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>{goalTitle}</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-white transition active:scale-95"
            title="Thoát chế độ Zen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Giant Timer Display */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center space-y-6">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 sm:gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <button
            onClick={() => onSwitchMode('pomodoro')}
            className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              mode === 'pomodoro'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/25'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Pomodoro
          </button>
          <button
            onClick={() => onSwitchMode('shortBreak')}
            className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              mode === 'shortBreak'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Nghỉ ngắn
          </button>
          <button
            onClick={() => onSwitchMode('longBreak')}
            className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              mode === 'longBreak'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Nghỉ dài
          </button>
        </div>

        {/* Giant Time Display with Glow */}
        <div className="relative group cursor-pointer" onClick={onStartPause}>
          <div
            className={`font-mono font-black tracking-tight transition-all duration-300 drop-shadow-[0_0_40px_rgba(6,182,212,0.3)] ${
              isRunning ? 'text-white' : 'text-amber-200'
            } text-7xl sm:text-8xl md:text-9xl lg:text-[14rem] leading-none`}
          >
            {timeFormatted}
          </div>

          {/* Pulsing indicator when running */}
          {isRunning && (
            <div className="absolute -top-4 right-1/2 translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[11px] font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>ĐANG TẬP TRUNG</span>
            </div>
          )}
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full max-w-md sm:max-w-lg bg-white/10 rounded-full h-2.5 overflow-hidden border border-white/10 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 transition-all duration-500 shadow-md shadow-cyan-400/40"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Topic / Task Note */}
        <div className="text-xs sm:text-sm text-white/70 font-medium max-w-md truncate">
          {topicNote || (mode === 'pomodoro' ? 'Tập trung sâu và không xao nhãng' : 'Nghỉ ngơi, thư giãn mắt và uống nước!')}
        </div>

        {/* Play / Pause / Reset Buttons */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={onStartPause}
            className={`px-8 sm:px-10 py-3.5 sm:py-4 rounded-3xl font-black text-sm sm:text-base flex items-center gap-2.5 shadow-2xl transition active:scale-95 ${
              isRunning
                ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                : 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:opacity-95 text-black shadow-amber-400/25'
            }`}
          >
            {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isRunning ? 'TẠM DỪNG' : 'BẮT ĐẦU'}</span>
          </button>

          <button
            onClick={onSkip}
            className="p-3.5 sm:p-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
            title="Chuyển phiên tiếp theo"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={onReset}
            className="p-3.5 sm:p-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
            title="Đặt lại thời gian"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Ambient Sound Strip */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-white/10 text-xs">
        <span className="text-white/50 text-[11px] mr-1 flex items-center gap-1 font-semibold">
          <Volume2 className="w-3.5 h-3.5 text-amber-300" /> Âm nền:
        </span>

        <button
          onClick={() => toggleSound('rain')}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
            ambientSound === 'rain'
              ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <CloudRain className="w-3.5 h-3.5" /> <span>Mưa</span>
        </button>

        <button
          onClick={() => toggleSound('waves')}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
            ambientSound === 'waves'
              ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Waves className="w-3.5 h-3.5" /> <span>Sóng biển</span>
        </button>

        <button
          onClick={() => toggleSound('fire')}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
            ambientSound === 'fire'
              ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40 font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame className="w-3.5 h-3.5" /> <span>Lò sưởi</span>
        </button>

        <button
          onClick={() => toggleSound('binaural')}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
            ambientSound === 'binaural'
              ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40 font-bold shadow-sm shadow-purple-500/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-purple-400" /> <span>Sóng Não 40Hz</span>
        </button>

        <button
          onClick={() => toggleSound('lofi')}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
            ambientSound === 'lofi'
              ? 'bg-pink-500/30 text-pink-200 border border-pink-400/40 font-bold shadow-sm shadow-pink-500/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-pink-400" /> <span>Lo-Fi Chill</span>
        </button>

        {ambientSound !== 'none' && (
          <button
            onClick={() => {
              soundManager.stopAmbient()
              setAmbientSound('none')
            }}
            className="p-1.5 text-white/50 hover:text-white ml-2"
            title="Tắt âm thanh"
          >
            <VolumeX className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
