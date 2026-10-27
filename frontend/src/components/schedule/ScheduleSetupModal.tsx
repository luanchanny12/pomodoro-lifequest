import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Clock, Check, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import api from '@/services/api'

interface DaySlot {
  date: string       // YYYY-MM-DD
  label: string      // "Thứ 2, 22/7"
  available_hours: number
  preferred_start: string
}

interface Props {
  subjectName: string
  totalWeeks: number
  onClose: () => void
  onCreated: (subject: any) => void
}

const COLORS = ['#00E5FF', '#6C63FF', '#00FFC8', '#FF6B6B', '#FFD700', '#FF9F43', '#48dbfb', '#ff6b81']

function generateNext14Days(): DaySlot[] {
  const days = []
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  for (let i = 0; i < 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    days.push({
      date: `${yyyy}-${mm}-${dd}`,
      label: `${dayNames[d.getDay()]} ${dd}/${mm}`,
      available_hours: 0,
      preferred_start: '08:00',
    })
  }
  return days
}

export default function ScheduleSetupModal({ subjectName, totalWeeks, onClose, onCreated }: Props) {
  const [step, setStep] = useState<'availability' | 'confirm'>('availability')
  const [days, setDays] = useState<DaySlot[]>(generateNext14Days)
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)

  const totalHours = days.reduce((s, d) => s + d.available_hours, 0)
  const avgPerDay = totalHours > 0 ? (totalHours / days.filter(d => d.available_hours > 0).length).toFixed(1) : '0'

  function setHours(idx: number, h: number) {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, available_hours: Math.max(0, Math.min(10, h)) } : d))
  }

  function setStart(idx: number, t: string) {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, preferred_start: t } : d))
  }

  async function handleCreate() {
    setLoading(true)
    try {
      const payload = {
        name: subjectName,
        total_weeks: totalWeeks,
        color,
        availability: days.map(d => ({
          date: d.date,
          available_hours: d.available_hours,
          preferred_start: d.preferred_start,
        })),
      }
      const { data } = await api.post('/schedule/subject', payload)
      toast.success(`✅ Đã tạo lịch học cho "${subjectName}"!`)
      onCreated(data)
      onClose()
    } catch {
      toast.error('Không tạo được lịch, thử lại!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[#0A0F1D] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#6C63FF]">
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Lên lịch học AI</h2>
              <p className="text-xs text-white/40">Môn: <span className="text-[#00E5FF] font-medium">{subjectName}</span> • {totalWeeks} tuần</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'availability' ? (
          <>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-cyber">
              <p className="text-sm text-white/50">
                Điền số giờ rảnh mỗi ngày trong 2 tuần tới. AI sẽ tự phân bổ lịch học hợp lý! 🤖
              </p>

              {/* Color picker */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 shrink-0">Màu môn học:</span>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className={cn('h-6 w-6 rounded-full border-2 transition-all', color === c ? 'border-white scale-110' : 'border-transparent')}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* 14-day grid */}
              <div className="grid gap-2">
                {days.map((day, i) => (
                  <div key={day.date} className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-2.5 border transition-colors',
                    day.available_hours > 0 ? 'border-white/[0.12] bg-white/[0.04]' : 'border-white/[0.05] bg-white/[0.01]'
                  )}>
                    <div className="w-14 text-xs font-medium text-white/50">{day.label}</div>

                    {/* Hours */}
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2, 3, 4, 6, 8].map(h => (
                        <button key={h} onClick={() => setHours(i, h)}
                          className={cn(
                            'rounded-lg px-2 py-1 text-xs font-medium transition-all',
                            day.available_hours === h
                              ? 'text-white border'
                              : 'text-white/30 hover:text-white/60 bg-white/[0.02] hover:bg-white/[0.05]'
                          )}
                          style={day.available_hours === h ? { backgroundColor: color + '33', borderColor: color + '80', color } : {}}
                        >
                          {h === 0 ? 'Bận' : `${h}h`}
                        </button>
                      ))}
                    </div>

                    {/* Preferred start time (only shown if hours > 0) */}
                    {day.available_hours > 0 && (
                      <div className="ml-auto flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-white/30" />
                        <select
                          value={day.preferred_start}
                          onChange={e => setStart(i, e.target.value)}
                          className="text-xs bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1 text-white/70 focus:outline-none"
                        >
                          {['06:00','07:00','08:00','09:00','10:00','14:00','15:00','18:00','19:00','20:00'].map(t => (
                            <option key={t} value={t} className="bg-[#0A0F1D]">{t}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.02] px-6 py-4">
              <div className="text-sm text-white/50">
                Tổng: <span className="text-white font-medium">{totalHours.toFixed(1)}h</span>
                {totalHours > 0 && <span className="ml-2 text-white/30">• TB {avgPerDay}h/ngày</span>}
              </div>
              <Button
                onClick={() => setStep('confirm')}
                disabled={totalHours === 0}
                className="gap-2 bg-gradient-to-r from-[#00E5FF] to-[#6C63FF] text-white hover:opacity-90"
              >
                Xem trước lịch <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-cyber">
              <p className="text-sm text-white/50">AI sẽ tạo lịch học dựa trên thời gian rảnh của bạn. Xác nhận để bắt đầu!</p>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-bold text-white text-lg">{subjectName}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-white/[0.04] p-3">
                    <div className="text-xl font-bold" style={{ color }}>{totalWeeks}</div>
                    <div className="text-[11px] text-white/40">tuần học</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] p-3">
                    <div className="text-xl font-bold" style={{ color }}>{totalHours.toFixed(0)}h</div>
                    <div className="text-[11px] text-white/40">tổng giờ</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] p-3">
                    <div className="text-xl font-bold" style={{ color }}>{days.filter(d => d.available_hours > 0).length}</div>
                    <div className="text-[11px] text-white/40">ngày học</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {days.filter(d => d.available_hours > 0).map(day => (
                    <div key={day.date} className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{day.label}</span>
                      <span className="text-white/80">{day.preferred_start} • {day.available_hours}h rảnh</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-white/[0.08] bg-white/[0.02] px-6 py-4">
              <Button variant="ghost" onClick={() => setStep('availability')} className="gap-2 text-white/60">
                <ChevronLeft className="h-4 w-4" /> Sửa lại
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 gap-2 bg-gradient-to-r from-[#00E5FF] to-[#6C63FF] text-white hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                {loading ? 'Đang tạo lịch...' : 'Tạo lịch học AI 🚀'}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
