import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Moon, Briefcase, Zap, Heart, Brain, Sparkles,
  Dumbbell, Footprints, ChefHat, Coffee, Music, BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useCreateDailyLog, useUpdateDailyLog, useLatestDailyLog } from '@/services/dailyLogService'
import type { DailyLog } from '@/types'

interface StepProps {
  onNext: () => void
  onBack?: () => void
  data: any
  setData: (d: any) => void
}

const ACTIVITIES = [
  { id: 'work', label: 'Đi làm', icon: Briefcase },
  { id: 'sports', label: 'Đá bóng', icon: Footprints },
  { id: 'gym', label: 'Tập gym', icon: Dumbbell },
  { id: 'cook', label: 'Nấu ăn', icon: ChefHat },
  { id: 'coffee', label: 'Cà phê', icon: Coffee },
  { id: 'music', label: 'Học nhạc', icon: Music },
  { id: 'read', label: 'Đọc sách', icon: BookOpen },
  { id: 'rest', label: 'Nghỉ ngơi', icon: Heart },
]

const MOODS = [
  { value: 1, emoji: '😫', label: 'Kiệt sức' },
  { value: 2, emoji: '😩', label: 'Rất mệt' },
  { value: 3, emoji: '😐', label: 'Hơi mệt' },
  { value: 4, emoji: '🙂', label: 'Ổn' },
  { value: 5, emoji: '😊', label: 'Tốt' },
  { value: 6, emoji: '🔥', label: 'Tràn đầy NL' },
]

function SleepStep({ onNext, data, setData }: StepProps) {
  const [hours, setHours] = useState(data.sleep_hours ?? 7)
  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <Moon className="h-10 w-10 mx-auto text-indigo-400 mb-3" />
        <h3 className="text-lg font-bold">Đêm qua ngủ thế nào?</h3>
        <p className="text-sm text-muted-foreground mt-1">Số giờ ngủ ảnh hưởng lớn đến khả năng tập trung</p>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setHours(Math.max(0, hours - 0.5))}
          className="h-10 w-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-lg flex items-center justify-center">−</button>
        <div className="text-center">
          <span className="text-5xl font-bold text-indigo-400">{hours}</span>
          <p className="text-xs text-muted-foreground mt-1">tiếng</p>
        </div>
        <button onClick={() => setHours(Math.min(12, hours + 0.5))}
          className="h-10 w-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-lg flex items-center justify-center">+</button>
      </div>
      <div className="flex gap-2 justify-center">
        {[4,5,6,7,8,9,10].map(h => (
          <button key={h} onClick={() => setHours(h)}
            className={cn('h-8 w-8 rounded-lg text-xs font-medium transition-all',
              Math.round(hours) === h ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]'
            )}>
            {h}
          </button>
        ))}
      </div>
      <Button className="w-full mt-4" onClick={() => { setData({ ...data, sleep_hours: hours }); onNext() }}>
        Tiếp theo
      </Button>
    </div>
  )
}

function ActivitiesStep({ onNext, onBack, data, setData }: StepProps) {
  const [selected, setSelected] = useState<string[]>(data.activities ?? [])
  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <Briefcase className="h-10 w-10 mx-auto text-amber-400 mb-3" />
        <h3 className="text-lg font-bold">Hôm nay đã làm gì?</h3>
        <p className="text-sm text-muted-foreground mt-1">Các hoạt động tốn năng lượng trong ngày</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ACTIVITIES.map(a => {
          const Icon = a.icon
          const active = selected.includes(a.id)
          return (
            <button key={a.id} onClick={() => toggle(a.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl p-3 text-sm transition-all border',
                active ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.12]'
              )}>
              <Icon className="h-4 w-4" />
              {a.label}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Quay lại</Button>
        <Button className="flex-1" onClick={() => { setData({ ...data, activities: selected }); onNext() }}>
          Tiếp theo
        </Button>
      </div>
    </div>
  )
}

function EnergyStep({ onNext, onBack, data, setData }: StepProps) {
  const [energy, setEnergy] = useState(data.energy_level ?? 5)
  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <Zap className="h-10 w-10 mx-auto text-yellow-400 mb-3" />
        <h3 className="text-lg font-bold">Năng lượng hiện tại?</h3>
        <p className="text-sm text-muted-foreground mt-1">Đánh giá mức năng lượng để AI điều chỉnh lịch học</p>
      </div>
      <div className="flex gap-2 justify-center">
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} onClick={() => setEnergy(n)}
            className={cn('h-10 w-10 rounded-xl text-sm font-bold transition-all',
              energy === n ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 scale-110' : 'bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]'
            )}>
            {n}
          </button>
        ))}
      </div>
      <div className="text-center">
        {energy <= 3 ? '😫 Cần nghỉ ngơi, học nhẹ thôi' :
         energy <= 5 ? '🙂 Ổn định, có thể học bình thường' :
         energy <= 7 ? '💪 Tốt, học được nhiều' :
         '🔥 Tràn đầy năng lượng, học thôi!'}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Quay lại</Button>
        <Button className="flex-1" onClick={() => { setData({ ...data, energy_level: energy }); onNext() }}>
          Tiếp theo
        </Button>
      </div>
    </div>
  )
}

function MoodStep({ onNext, onBack, data, setData }: StepProps) {
  const [mood, setMood] = useState(data.mood_level ?? 4)
  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <Heart className="h-10 w-10 mx-auto text-rose-400 mb-3" />
        <h3 className="text-lg font-bold">Tâm trạng hôm nay thế nào?</h3>
        <p className="text-sm text-muted-foreground mt-1">Tâm trạng tốt → học hiệu quả hơn</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {MOODS.map(m => (
          <button key={m.value} onClick={() => setMood(m.value)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl p-4 transition-all border',
              mood === m.value ? 'border-rose-500/30 bg-rose-500/10' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
            )}>
            <span className="text-3xl">{m.emoji}</span>
            <span className="text-xs text-muted-foreground">{m.label}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Quay lại</Button>
        <Button className="flex-1" onClick={() => { setData({ ...data, mood_level: mood }); onNext() }}>
          Xem kết quả
        </Button>
      </div>
    </div>
  )
}

function generateAdvice(data: any): { title: string; message: string; tips: string[]; energy_pct: number } {
  const tips: string[] = []
  const sleep = data.sleep_hours ?? 7
  const energy = data.energy_level ?? 5
  const activities = data.activities ?? []
  const mood = data.mood_level ?? 4

  if (sleep < 6) {
    tips.push('Ngủ ít hơn 6 tiếng — nên chọn bài học nhẹ, tránh học kiến thức mới khó')
  } else if (sleep >= 8) {
    tips.push('Ngủ đủ giấc — sẵn sàng cho ngày học tập hiệu quả!')
  }

  if (activities.includes('work')) {
    tips.push('Hôm nay đi làm — năng lượng còn lại có hạn, tập trung vào việc chính')
  }
  if (activities.includes('sports') || activities.includes('gym')) {
    tips.push('Đã vận động thể thao — cơ thể cần nghỉ, giảm 30% khối lượng học')
  }

  if (energy <= 3) {
    tips.push('Năng lượng thấp — ưu tiên ôn tập thay vì học mới')
  } else if (energy >= 8) {
    tips.push('Năng lượng cao — thời điểm vàng để học kiến thức mới!')
  }

  if (mood <= 2) {
    tips.push('Tâm trạng không tốt — hãy bắt đầu với việc nhỏ, 5 phút là đủ')
  }

  const energyScore = Math.round(
    (energy / 10) * 40 +
    (sleep / 8) * 30 +
    (mood / 6) * 20 +
    (activities.length === 0 ? 10 : Math.max(0, 10 - activities.length * 3))
  )
  const energyPct = Math.min(100, energyScore)

  let title = ''
  let message = ''
  if (energyPct >= 80) {
    title = '🔥 Sung sức!'
    message = 'Hôm nay bạn có đủ năng lượng để học. Đây là cơ hội tốt để giải quyết những bài khó!'
  } else if (energyPct >= 60) {
    title = '💪 Ổn định!'
    message = 'Năng lượng ở mức khá. Tập trung vào những việc quan trọng nhất, đừng tham lam.'
  } else if (energyPct >= 40) {
    title = '😐 Hơi mệt!'
    message = 'Năng lượng hạn chế. Hãy chọn bài ôn tập nhẹ nhàng, chia nhỏ thời gian học.'
  } else {
    title = '😴 Cần nghỉ ngơi!'
    message = 'Hôm nay bạn cần nghỉ nhiều hơn. Chỉ làm những việc tối thiểu, đừng ép bản thân.'
  }

  return { title, message, tips, energy_pct: energyPct }
}

function ResultStep({ data, setData, onClose, onBack }: { data: any; setData: (d: any) => void; onClose: () => void; onBack: () => void }) {
  const advice = generateAdvice(data)
  const createLog = useCreateDailyLog()
  const updateLog = useUpdateDailyLog()

  async function handleSave() {
    const today = new Date().toISOString().split('T')[0]
    const payload = {
      date: today,
      sleep_hours: data.sleep_hours,
      energy_level: data.energy_level,
      mood_level: data.mood_level,
      note: data.note ?? '',
      activities: JSON.stringify(data.activities ?? []),
    }
    try {
      if (data.logId) {
        await updateLog.mutateAsync({ id: data.logId, ...payload })
      } else {
        await createLog.mutateAsync(payload)
      }
      toast.success('Đã lưu thông tin!')
      onClose()
    } catch { toast.error('Không thể lưu') }
  }

  return (
    <div className="space-y-5 py-4">
      <div className="text-center">
        <div className={cn(
          'inline-flex h-16 w-16 items-center justify-center rounded-full mb-3',
          advice.energy_pct >= 80 ? 'bg-green-500/20' : advice.energy_pct >= 60 ? 'bg-yellow-500/20' : advice.energy_pct >= 40 ? 'bg-orange-500/20' : 'bg-red-500/20'
        )}>
          <Brain className={cn(
            'h-8 w-8',
            advice.energy_pct >= 80 ? 'text-green-400' : advice.energy_pct >= 60 ? 'text-yellow-400' : advice.energy_pct >= 40 ? 'text-orange-400' : 'text-red-400'
          )} />
        </div>
        <h3 className="text-lg font-bold">{advice.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{advice.message}</p>
      </div>

      <div className="text-center">
        <div className="inline-flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
          <Zap className={cn('h-5 w-5', advice.energy_pct >= 60 ? 'text-yellow-400' : 'text-orange-400')} />
          <div>
            <div className="text-2xl font-bold">{advice.energy_pct}%</div>
            <p className="text-xs text-muted-foreground">Năng lượng học tập</p>
          </div>
        </div>
      </div>

      {advice.tips.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gợi ý:</p>
          {advice.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-[#00E5FF] mt-0.5 shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Sửa lại</Button>
        <Button className="flex-1" onClick={handleSave} disabled={createLog.isPending || updateLog.isPending}>
          {createLog.isPending || updateLog.isPending ? 'Đang lưu...' : 'Bắt đầu ngày mới!'}
        </Button>
      </div>
    </div>
  )
}

type Step = 'sleep' | 'activities' | 'energy' | 'mood' | 'result'

export default function MorningCheckin() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('sleep')
  const [data, setData] = useState<any>({})
  const { data: latestLog } = useLatestDailyLog()

  const today = new Date().toISOString().split('T')[0]
  const doneKey = `checkin_${today}`

  useEffect(() => {
    if (localStorage.getItem(doneKey) === 'done') return
    if (!latestLog) {
      const timer = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(timer)
    } else {
      const logDate = new Date(latestLog.date + 'T00:00:00').toISOString().split('T')[0]
      if (logDate !== today) {
        const timer = setTimeout(() => setOpen(true), 800)
        return () => clearTimeout(timer)
      }
    }
  }, [latestLog, today, doneKey])

  if (!open) return null

  function handleClose() {
    localStorage.setItem(doneKey, 'done')
    setOpen(false)
    setStep('sleep')
    setData({})
  }

  function handleDone() {
    handleClose()
  }

  const steps: { key: Step; label: string }[] = [
    { key: 'sleep', label: 'Giấc ngủ' },
    { key: 'activities', label: 'Hoạt động' },
    { key: 'energy', label: 'Năng lượng' },
    { key: 'mood', label: 'Tâm trạng' },
    { key: 'result', label: 'Kết quả' },
  ]
  const currentIdx = steps.findIndex(s => s.key === step)

  function next() {
    if (step === 'sleep') setStep('activities')
    else if (step === 'activities') setStep('energy')
    else if (step === 'energy') setStep('mood')
    else if (step === 'mood') setStep('result')
  }
  function back() {
    if (step === 'activities') setStep('sleep')
    else if (step === 'energy') setStep('activities')
    else if (step === 'mood') setStep('energy')
    else if (step === 'result') setStep('mood')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0A0F1D] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-2">
          <div className="flex gap-1.5 mb-4">
            {steps.map((s, i) => (
              <div key={s.key} className={cn(
                'flex-1 h-1 rounded-full transition-all duration-300',
                i <= currentIdx ? 'bg-[#00E5FF]' : 'bg-white/[0.08]'
              )} />
            ))}
          </div>
        </div>

        <div className="px-5 pb-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 'sleep' && <SleepStep onNext={next} data={data} setData={setData} />}
              {step === 'activities' && <ActivitiesStep onNext={next} onBack={back} data={data} setData={setData} />}
              {step === 'energy' && <EnergyStep onNext={next} onBack={back} data={data} setData={setData} />}
              {step === 'mood' && <MoodStep onNext={next} onBack={back} data={data} setData={setData} />}
              {step === 'result' && <ResultStep data={data} setData={setData} onClose={handleDone} onBack={back} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
