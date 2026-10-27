import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Coffee, Brain, Timer, Settings2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader'
import GlassCard from '@/components/lifeos/GlassCard'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFocusSession } from '@/services/aiService'

const PRESETS = [
  { label: 'Cổ điển', focus: 25, break: 5 },
  { label: 'Sâu', focus: 50, break: 10 },
  { label: 'Siêu tập trung', focus: 90, break: 20 },
]

type TimerMode = 'focus' | 'break'
type TimerStatus = 'idle' | 'running' | 'paused'

const LS_KEY = 'lifequest_timer'

function playBeep() {
  try {
    const ctx = new AudioContext()
    ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function saveState(state: Record<string, any>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  } catch {}
}

function clearSavedState() {
  try { localStorage.removeItem(LS_KEY) } catch {}
}

export default function StudyTimer() {
  const saved = loadSavedState()
  const [focusMinutes, setFocusMinutes] = useState(saved?.focusMinutes ?? 25)
  const [breakMinutes, setBreakMinutes] = useState(saved?.breakMinutes ?? 5)
  const [mode, setMode] = useState<TimerMode>(saved?.mode ?? 'focus')
  const [status, setStatus] = useState<TimerStatus>(saved?.status ?? 'idle')
  const [timeLeft, setTimeLeft] = useState(saved?.timeLeft ?? 25 * 60)
  const [sessions, setSessions] = useState(saved?.sessions ?? 0)
  const [totalFocusSeconds, setTotalFocusSeconds] = useState(saved?.totalFocusSeconds ?? 0)
  const [activePreset, setActivePreset] = useState(saved?.activePreset ?? 0)
  const [showSettings, setShowSettings] = useState(false)

  const intervalRef = useRef<number | null>(null)
  const endTimeRef = useRef<number | null>(null)
  const modeRef = useRef<TimerMode>(mode)
  const onCompleteRef = useRef<() => void>(() => {})
  const focusSession = useFocusSession()

  modeRef.current = mode

  // ── Restore running timer on mount ──
  useEffect(() => {
    if (saved?.status === 'running' && saved?.endTime) {
      const remaining = Math.max(0, Math.round((saved.endTime - Date.now()) / 1000))
      if (remaining > 0) {
        setTimeLeft(remaining)
        endTimeRef.current = saved.endTime
        setStatus('running')
        intervalRef.current = window.setInterval(() => {
          if (endTimeRef.current === null) return
          const r = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
          setTimeLeft(r)
          if (r <= 0) {
            stopTimer()
            onCompleteRef.current()
          }
        }, 200)
      } else {
        setStatus('idle')
        setTimeLeft(saved.mode === 'focus' ? saved.focusMinutes * 60 : saved.breakMinutes * 60)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Persist state on changes ──
  useEffect(() => {
    saveState({
      focusMinutes,
      breakMinutes,
      mode,
      status,
      timeLeft,
      sessions,
      totalFocusSeconds,
      activePreset,
      endTime: endTimeRef.current,
    })
  }, [focusMinutes, breakMinutes, mode, status, timeLeft, sessions, totalFocusSeconds, activePreset])

  // ── Warn before navigation/close when running ──
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (status === 'running') {
        const remaining = endTimeRef.current ? Math.round((endTimeRef.current - Date.now()) / 1000) : 0
        if (remaining > 0) {
          e.preventDefault()
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [status])

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    endTimeRef.current = null
  }, [])

  const startTimer = useCallback((durationSeconds: number) => {
    stopTimer()
    endTimeRef.current = Date.now() + durationSeconds * 1000
    setStatus('running')

    intervalRef.current = window.setInterval(() => {
      if (endTimeRef.current === null) return
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
      setTimeLeft(remaining)

      if (remaining <= 0) {
        stopTimer()
        onCompleteRef.current()
      }
    }, 200)
  }, [stopTimer])

  const handleComplete = useCallback(() => {
    playBeep()
    if (modeRef.current === 'focus') {
      const mins = focusMinutes
      focusSession.mutate(mins, {
        onSuccess: (res) => {
          toast.success(`+${res.exp_gained} EXP, +${res.coins_gained} coins`, {
            description: `${mins} phút tập trung — tiếp tục nghỉ ngơi nhé!`,
            icon: <Sparkles className="h-4 w-4 text-[#FFD700]" />,
          })
        },
        onError: () => {
          toast.error('Không thể lưu phiên học')
        },
      })
      setSessions((s: number) => s + 1)
      setTotalFocusSeconds((s: number) => s + mins * 60)
      setMode('break')
      setTimeLeft(breakMinutes * 60)
      setStatus('idle')
      clearSavedState()
    } else {
      setMode('focus')
      setTimeLeft(focusMinutes * 60)
      setStatus('idle')
    }
  }, [focusMinutes, breakMinutes, focusSession])

  onCompleteRef.current = handleComplete

  function handleStart() {
    const duration = mode === 'focus' ? focusMinutes * 60 : breakMinutes * 60
    setTimeLeft(duration)
    startTimer(duration)
  }

  function handlePause() {
    stopTimer()
    setStatus('paused')
  }

  function handleResume() {
    if (timeLeft > 0) {
      startTimer(timeLeft)
    }
  }

  function handleReset() {
    stopTimer()
    setStatus('idle')
    const duration = mode === 'focus' ? focusMinutes * 60 : breakMinutes * 60
    setTimeLeft(duration)
    clearSavedState()
  }

  function applyPreset(index: number) {
    stopTimer()
    setStatus('idle')
    setActivePreset(index)
    const p = PRESETS[index]
    setFocusMinutes(p.focus)
    setBreakMinutes(p.break)
    setMode('focus')
    setTimeLeft(p.focus * 60)
  }

  const totalDuration = (mode === 'focus' ? focusMinutes : breakMinutes) * 60
  const progress = 1 - timeLeft / totalDuration
  const radius = 140
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  const isRunning = status === 'running'
  const isPaused = status === 'paused'

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader title="Timer Học tập" description="Kỹ thuật Pomodoro — tập trung cao độ, nghỉ ngơi đúng lúc">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
          className={cn(showSettings && 'bg-white/[0.06]')}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </PageHeader>

      {/* Presets */}
      <div className="flex items-center gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => applyPreset(i)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-medium transition-all border',
              activePreset === i
                ? 'bg-gradient-to-br from-[#00E5FF]/20 to-[#6C63FF]/20 border-[#00E5FF]/40 text-white shadow-glow'
                : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white/80'
            )}
          >
            {p.label}
            <span className="ml-1.5 opacity-60">{p.focus}/{p.break}</span>
          </button>
        ))}
      </div>

      {/* Custom settings */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
        >
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-[#00E5FF]" />
            <label className="text-xs text-white/60">Học</label>
            <input
              type="number"
              min={1}
              max={180}
              value={focusMinutes}
              onChange={e => { setFocusMinutes(Number(e.target.value)); if (mode === 'focus') setTimeLeft(Number(e.target.value) * 60) }}
              className="w-16 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white text-center"
            />
            <span className="text-xs text-white/40">phút</span>
          </div>
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-[#FF6B9D]" />
            <label className="text-xs text-white/60">Nghỉ</label>
            <input
              type="number"
              min={1}
              max={60}
              value={breakMinutes}
              onChange={e => { setBreakMinutes(Number(e.target.value)); if (mode === 'break') setTimeLeft(Number(e.target.value) * 60) }}
              className="w-16 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white text-center"
            />
            <span className="text-xs text-white/40">phút</span>
          </div>
        </motion.div>
      )}

      {/* Timer Card */}
      <GlassCard className="text-center">
        {/* Mode badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border',
            mode === 'focus'
              ? 'bg-[#00E5FF]/10 border-[#00E5FF]/30 text-[#00E5FF]'
              : 'bg-[#FF6B9D]/10 border-[#FF6B9D]/30 text-[#FF6B9D]'
          )}>
            {mode === 'focus' ? <Brain className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
            {mode === 'focus' ? 'Tập trung' : 'Nghỉ ngơi'}
          </span>
          {sessions > 0 && (
            <span className="text-xs text-white/40">
              #{sessions}
            </span>
          )}
        </div>

        {/* Circular progress */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <svg width={320} height={320} className="-rotate-90">
            <circle cx={160} cy={160} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={6} />
            <circle
              cx={160} cy={160} r={radius}
              fill="none"
              stroke={mode === 'focus' ? 'url(#focusGrad)' : 'url(#breakGrad)'}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-300 ease-linear"
            />
            <defs>
              <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00E5FF" />
                <stop offset="100%" stopColor="#6C63FF" />
              </linearGradient>
              <linearGradient id="breakGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF6B9D" />
                <stop offset="100%" stopColor="#FFA94D" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(
              'text-6xl font-bold font-mono tracking-wider tabular-nums',
              mode === 'focus' ? 'text-white' : 'text-white/90'
            )}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-white/40 mt-1">
              {isRunning ? 'Đang chạy...' : isPaused ? 'Đã tạm dừng' : 'Sẵn sàng'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {isRunning ? (
            <Button onClick={handlePause} size="lg" className="rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08]">
              <Pause className="h-5 w-5 mr-2" /> Tạm dừng
            </Button>
          ) : (
            <Button
              onClick={isPaused ? handleResume : handleStart}
              size="lg"
              className={cn(
                'rounded-xl shadow-glow',
                mode === 'focus'
                  ? 'bg-gradient-to-br from-[#00E5FF] to-[#6C63FF] text-white hover:opacity-90'
                  : 'bg-gradient-to-br from-[#FF6B9D] to-[#FFA94D] text-white hover:opacity-90'
              )}
            >
              <Play className="h-5 w-5 mr-2" />
              {isPaused ? 'Tiếp tục' : 'Bắt đầu'}
            </Button>
          )}
          <Button onClick={handleReset} variant="ghost" size="icon" className="rounded-xl text-white/40 hover:text-white/80">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="text-center">
          <Timer className="h-5 w-5 mx-auto mb-2 text-[#00E5FF]" />
          <div className="text-2xl font-bold">{sessions}</div>
          <div className="text-xs text-white/40">Phiên hoàn thành</div>
        </GlassCard>
        <GlassCard className="text-center">
          <Brain className="h-5 w-5 mx-auto mb-2 text-[#6C63FF]" />
          <div className="text-2xl font-bold">{Math.floor(totalFocusSeconds / 60)}</div>
          <div className="text-xs text-white/40">Phút tập trung</div>
        </GlassCard>
        <GlassCard className="text-center">
          <Coffee className="h-5 w-5 mx-auto mb-2 text-[#FF6B9D]" />
          <div className="text-2xl font-bold">{Math.max(0, Math.floor(sessions * breakMinutes - (mode === 'break' ? Math.ceil(timeLeft / 60) : 0)))}</div>
          <div className="text-xs text-white/40">Phút nghỉ</div>
        </GlassCard>
      </div>
    </motion.div>
  )
}