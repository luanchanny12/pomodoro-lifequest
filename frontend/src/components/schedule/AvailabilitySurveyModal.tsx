import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Clock, Check, X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import api from '@/services/api'

interface DaySlot {
  date: string
  label: string
  available_hours: number
  preferred_start: string
}

interface AvailabilitySurveyModalProps {
  goal: string
  onClose: () => void
  onSaved: () => void
}

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
      preferred_start: '19:00',
    })
  }
  return days
}

export default function AvailabilitySurveyModal({ goal, onClose, onSaved }: AvailabilitySurveyModalProps) {
  const [days, setDays] = useState<DaySlot[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Try to load existing availability first
    api.get('/schedule/availability/next-14').then(res => {
      const existing = res.data
      if (existing && existing.length > 0) {
        const filled = generateNext14Days().map(d => {
          const match = existing.find((e: any) => e.date === d.date)
          return match ? { ...d, available_hours: match.available_hours, preferred_start: match.preferred_start } : d
        })
        setDays(filled)
      } else {
        setDays(generateNext14Days())
      }
    }).catch(() => setDays(generateNext14Days()))
  }, [])

  function setHours(idx: number, h: number) {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, available_hours: Math.max(0, Math.min(10, h)) } : d))
  }

  function setStart(idx: number, t: string) {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, preferred_start: t } : d))
  }

  async function handleSave() {
    setLoading(true)
    try {
      await api.post('/schedule/availability/next-14', {
        availability: days.map(d => ({
          date: d.date,
          available_hours: d.available_hours,
          preferred_start: d.preferred_start,
        })),
      })
      toast.success('Đã lưu lịch rảnh 14 ngày!')
      onSaved()
      onClose()
    } catch {
      toast.error('Lưu thất bại, thử lại!')
    } finally {
      setLoading(false)
    }
  }

  const totalHours = days.reduce((s, d) => s + d.available_hours, 0)
  const activeDays = days.filter(d => d.available_hours > 0).length

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
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00E5FF]">
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Lịch rảnh 14 ngày</h2>
              <p className="text-xs text-white/40">Mục tiêu: <span className="text-[#00E5FF] font-medium">{goal}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-cyber">
          <p className="text-sm text-white/50">
            Điền số giờ rảnh mỗi ngày trong <strong className="text-white/80">14 ngày tới</strong>.
            Sau khi lưu, AI sẽ dùng lịch này để xếp lịch học cho tất cả các môn sau này.
            Hết 14 ngày, bạn chỉ cần cập nhật lại một lần!
          </p>

          <div className="grid gap-2">
            {days.map((day, i) => (
              <div key={day.date} className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-2.5 border transition-colors',
                day.available_hours > 0 ? 'border-white/[0.12] bg-white/[0.04]' : 'border-white/[0.05] bg-white/[0.01]'
              )}>
                <div className="w-14 text-xs font-medium text-white/50">{day.label}</div>

                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4, 6, 8].map(h => (
                    <button key={h} onClick={() => setHours(i, h)}
                      className={cn(
                        'rounded-lg px-2 py-1 text-xs font-medium transition-all',
                        day.available_hours === h
                          ? 'text-white border'
                          : 'text-white/30 hover:text-white/60 bg-white/[0.02] hover:bg-white/[0.05]'
                      )}
                      style={day.available_hours === h ? { backgroundColor: '#00E5FF33', borderColor: '#00E5FF80', color: '#00E5FF' } : {}}
                    >
                      {h === 0 ? 'Bận' : `${h}h`}
                    </button>
                  ))}
                </div>

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

        <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.02] px-6 py-4">
          <div className="text-sm text-white/50">
            <span className="text-white font-medium">{totalHours.toFixed(1)}h</span>
            {totalHours > 0 && <span className="ml-2 text-white/30">• {activeDays} ngày • TB {activeDays > 0 ? (totalHours / activeDays).toFixed(1) : 0}h/ngày</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="text-white/60">Để sau</Button>
            <Button
              onClick={handleSave}
              disabled={loading || totalHours === 0}
              className="gap-2 bg-gradient-to-r from-[#00E5FF] to-[#6C63FF] text-white hover:opacity-90"
            >
              {loading ? 'Đang lưu...' : 'Lưu lịch rảnh'}
              {!loading && <Check className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
