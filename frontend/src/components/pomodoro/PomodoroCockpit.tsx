import React, { useState } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  CheckCircle,
  Clock,
  Tv,
  Maximize2,
  Target,
  Volume2,
  VolumeX,
  CloudRain,
  Waves,
  Timer as TimerIcon,
  Brain,
  Radio,
} from 'lucide-react'

export interface PomodoroCockpitProps {
  mode: 'pomodoro' | 'shortBreak' | 'longBreak'
  timeLeft: number
  isRunning: boolean
  sessionCount: number
  isPipActive: boolean
  currentMinutesSetting: number
  currentPresets: number[]
  activeGoalTitle?: string
  isSavingEarly: boolean
  focusMinutesSetting: number
  defaultMinutesForMode: number
  ambientSound: 'none' | 'rain' | 'waves' | 'ticking' | 'fire' | 'binaural' | 'lofi'
  ambientVolume: number
  onTogglePip: () => void
  onOpenZenClock: () => void
  onSwitchMode: (mode: 'pomodoro' | 'shortBreak' | 'longBreak') => void
  onSetStudyTime: (minutes: number) => void
  onStartPause: () => void
  onSkip: () => void
  onReset: () => void
  onFinishEarly: () => void
  onToggleAmbientSound: (sound: 'rain' | 'waves' | 'ticking' | 'fire' | 'binaural' | 'lofi') => void
  onAmbientVolumeChange: (vol: number) => void
  onStopAmbient: () => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const PomodoroCockpitComponent: React.FC<PomodoroCockpitProps> = ({
  mode,
  timeLeft,
  isRunning,
  sessionCount,
  isPipActive,
  currentMinutesSetting,
  currentPresets,
  activeGoalTitle,
  isSavingEarly,
  focusMinutesSetting,
  defaultMinutesForMode,
  ambientSound,
  ambientVolume,
  onTogglePip,
  onOpenZenClock,
  onSwitchMode,
  onSetStudyTime,
  onStartPause,
  onSkip,
  onReset,
  onFinishEarly,
  onToggleAmbientSound,
  onAmbientVolumeChange,
  onStopAmbient,
}) => {
  const [showCustomTimeInput, setShowCustomTimeInput] = useState<boolean>(false)
  const [customTimeMinutes, setCustomTimeMinutes] = useState<number>(currentMinutesSetting)

  const elapsedMinutes = Math.floor((focusMinutesSetting * 60 - timeLeft) / 60)

  return (
    <div
      className="max-w-xl mx-auto bg-[#0b0f19]/92 backdrop-blur-md border border-white/20 hover:border-cyan-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden transition-all duration-300"
      style={{ transform: 'translateZ(0)', willChange: 'contents' }}
    >
      {/* Top Bar inside Card: Session Info on Left, PiP & Zen on Right */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
          {/* animate-ping chỉ khi đang tập trung — tránh animation vô ích lúc nghỉ */}
          {mode === 'pomodoro' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
          <span>#{sessionCount} {mode === 'pomodoro' ? 'Phiên tập trung' : 'Phiên nghỉ ngơi'}</span>
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onTogglePip}
            className={`p-2 rounded-xl transition backdrop-blur-md border flex items-center gap-1 text-xs active:scale-95 ${
              isPipActive
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400'
                : 'bg-white/10 hover:bg-white/20 border-white/10 text-white/80 hover:text-white'
            }`}
            title="Cửa sổ nổi ghim trên mọi ứng dụng khi lướt web / code (Picture-in-Picture)"
          >
            <Tv className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline text-[11px] font-bold">Nổi</span>
          </button>
          <button
            onClick={onOpenZenClock}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition backdrop-blur-md border border-white/10 flex items-center gap-1 text-xs active:scale-95"
            title="Chế độ toàn màn hình đồng hồ để bàn (Zen Desk Clock - giữ màn hình luôn sáng)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline text-[11px] font-bold">Zen</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher: Segmented Sliding Pill */}
      <div className="inline-flex items-center p-1 rounded-2xl bg-black/50 border border-white/15 mb-4 shadow-inner">
        <button
          onClick={() => onSwitchMode('pomodoro')}
          className={`px-4 py-1.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-200 ${
            mode === 'pomodoro'
              ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/25'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          Pomodoro
        </button>
        <button
          onClick={() => onSwitchMode('shortBreak')}
          className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
            mode === 'shortBreak'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          Nghỉ ngắn
        </button>
        <button
          onClick={() => onSwitchMode('longBreak')}
          className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
            mode === 'longBreak'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          Nghỉ dài
        </button>
      </div>

      {/* ── QUICK STUDY TIME SELECTOR ROW ── */}
      <div className="flex items-center justify-center gap-1.5 mb-5 flex-wrap">
        <span className="text-[11px] text-white/50 mr-1 flex items-center gap-1 font-mono">
          <Clock className="w-3 h-3 text-cyan-400" /> Thời gian:
        </span>
        {currentPresets.map((m) => {
          const isActive = currentMinutesSetting === m
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSetStudyTime(m)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition border ${
                isActive
                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
              {m}p
            </button>
          )
        })}

        {/* Custom Time Button */}
        <button
          type="button"
          onClick={() => {
            setCustomTimeMinutes(currentMinutesSetting)
            setShowCustomTimeInput(!showCustomTimeInput)
          }}
          className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 transition"
          title="Nhập số phút tùy chỉnh"
        >
          Tùy chỉnh ✏️
        </button>
      </div>

      {/* Custom Time Input Popup */}
      {showCustomTimeInput && (
        <div className="mb-4 p-3 bg-black/60 border border-white/20 rounded-2xl max-w-xs mx-auto animate-in fade-in duration-150">
          <div className="text-xs text-white/80 mb-2">Nhập số phút muốn học:</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="180"
              value={customTimeMinutes}
              onChange={(e) => setCustomTimeMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-1.5 bg-black/40 border border-white/20 rounded-xl text-center text-sm font-bold text-white focus:outline-none focus:border-white"
            />
            <button
              onClick={() => {
                onSetStudyTime(customTimeMinutes)
                setShowCustomTimeInput(false)
              }}
              className="px-3 py-1.5 bg-white text-black font-bold text-xs rounded-xl shadow hover:bg-white/90"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}

      {/* Big Digital Countdown */}
      <div className="my-4 sm:my-5 relative select-none">
        <h2 className="text-7xl sm:text-8xl font-black tracking-tighter font-mono drop-shadow-[0_0_35px_rgba(255,255,255,0.4)] text-white">
          {formatTime(timeLeft)}
        </h2>
        {activeGoalTitle && (
          <div className="text-xs text-cyan-300 font-semibold mt-1 flex items-center justify-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            <span className="text-white/90 truncate max-w-xs">{activeGoalTitle}</span>
          </div>
        )}
      </div>

      {/* Main Controls: START / PAUSE + SKIP + RESET + FINISH EARLY */}
      <div className="flex items-center justify-center gap-3 my-2">
        <button
          onClick={onStartPause}
          className="w-44 sm:w-52 py-3.5 sm:py-4 bg-gradient-to-r from-white via-slate-100 to-slate-200 hover:from-white hover:to-white text-black text-lg sm:text-xl font-black uppercase rounded-2xl shadow-2xl hover:shadow-cyan-500/25 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <Pause className="w-6 h-6 fill-current text-rose-600" />
              <span>TẠM DỪNG</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current text-cyan-600" />
              <span>BẮT ĐẦU</span>
            </>
          )}
        </button>

        {mode === 'pomodoro' && elapsedMinutes >= 1 && (
          <button
            onClick={onFinishEarly}
            disabled={isSavingEarly}
            className={`px-3.5 sm:px-4 py-3.5 sm:py-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-2xl transition active:scale-95 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/30 ${
              isSavingEarly ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={`Lưu và kết thúc sớm ${elapsedMinutes} phút đã học`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">
              {isSavingEarly ? 'Đang lưu...' : `Lưu sớm (${elapsedMinutes}p)`}
            </span>
            <span className="sm:hidden">
              {isSavingEarly ? 'Lưu...' : `Lưu ${elapsedMinutes}p`}
            </span>
          </button>
        )}

        {isRunning && (
          <button
            onClick={onSkip}
            className="p-3.5 sm:p-4 bg-white/15 hover:bg-white/25 text-white rounded-2xl transition active:scale-95 border border-white/15 shadow-sm"
            title="Bỏ qua phiên này"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        )}

        {!isRunning && timeLeft !== defaultMinutesForMode * 60 && (
          <button
            onClick={onReset}
            className="p-3.5 sm:p-4 bg-white/15 hover:bg-white/25 text-white rounded-2xl transition active:scale-95 border border-white/15 shadow-sm"
            title="Đặt lại thời gian"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Session count info */}
      <div className="mt-4 text-xs text-white/70 font-medium">
        {mode === 'pomodoro'
          ? `#${sessionCount} - Phiên tập trung hiện tại (${focusMinutesSetting} phút)`
          : 'Thời gian nghỉ ngơi, hãy thư giãn mắt và uống nước!'}
      </div>

      {/* Ambient sound quick toggles */}
      <div className="mt-4 pt-3.5 border-t border-white/15 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-white/70 text-[11px] mr-1 flex items-center gap-1 font-medium">
          <Volume2 className="w-3.5 h-3.5 text-amber-300" /> Âm nền:
        </span>
        <button
          onClick={() => onToggleAmbientSound('rain')}
          className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
            ambientSound === 'rain'
              ? 'bg-amber-400 text-black font-bold shadow'
              : 'text-white/70 hover:bg-white/15'
          }`}
        >
          <CloudRain className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Mưa
        </button>
        <button
          onClick={() => onToggleAmbientSound('waves')}
          className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
            ambientSound === 'waves'
              ? 'bg-amber-400 text-black font-bold shadow'
              : 'text-white/70 hover:bg-white/15'
          }`}
        >
          <Waves className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Sóng
        </button>
        <button
          onClick={() => onToggleAmbientSound('ticking')}
          className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
            ambientSound === 'ticking'
              ? 'bg-amber-400 text-black font-bold shadow'
              : 'text-white/70 hover:bg-white/15'
          }`}
        >
          <TimerIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Tích tắc
        </button>
        <button
          onClick={() => onToggleAmbientSound('fire')}
          className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
            ambientSound === 'fire'
              ? 'bg-amber-400 text-black font-bold shadow'
              : 'text-white/70 hover:bg-white/15'
          }`}
        >
          🔥 Lò sưởi
        </button>
        <button
          onClick={() => onToggleAmbientSound('binaural')}
          className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
            ambientSound === 'binaural'
              ? 'bg-cyan-400 text-black font-bold shadow'
              : 'text-white/70 hover:bg-white/15'
          }`}
          title="Sóng não Gamma 40Hz kích hoạt tập trung sâu & trí nhớ"
        >
          <Brain className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-cyan-300" /> Sóng 40Hz
        </button>
        <button
          onClick={() => onToggleAmbientSound('lofi')}
          className={`px-3 py-2 sm:py-1 min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition text-xs font-semibold ${
            ambientSound === 'lofi'
              ? 'bg-amber-400 text-black font-bold shadow'
              : 'text-white/70 hover:bg-white/15'
          }`}
          title="Lo-Fi Chill Cozy thư giãn với tiếng đĩa than"
        >
          <Radio className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-300" /> Lo-Fi Chill
        </button>

        {ambientSound !== 'none' && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/20">
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={ambientVolume}
              onChange={(e) => onAmbientVolumeChange(parseFloat(e.target.value))}
              className="w-16 accent-amber-400 h-1 cursor-pointer"
              title="Âm lượng âm nền"
            />
            <button
              onClick={onStopAmbient}
              className="p-1 text-white/50 hover:text-white"
              title="Tắt âm nền"
            >
              <VolumeX className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export const PomodoroCockpit = React.memo(PomodoroCockpitComponent)
export const TimerPanel = PomodoroCockpit
