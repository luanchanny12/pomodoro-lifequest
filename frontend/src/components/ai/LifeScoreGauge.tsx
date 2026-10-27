import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Flame, Trophy, Star, BookOpen } from 'lucide-react'

type LifeScoreData = Record<string, number | undefined> & {
  score: number
  streak?: number
  achievement?: number
  level?: number
  study?: number
}

interface LifeScoreGaugeProps {
  data: LifeScoreData
  loading?: boolean
}

function AnimatedNumber({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const increment = value / (duration * 60)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(start))
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [value, duration])
  return <span>{display}</span>
}

function getScoreColor(score: number) {
  if (score >= 80) return { stroke: '#22C55E', text: 'text-green-400' }
  if (score >= 60) return { stroke: '#EAB308', text: 'text-yellow-400' }
  if (score >= 40) return { stroke: '#F97316', text: 'text-orange-400' }
  return { stroke: '#EF4444', text: 'text-red-400' }
}

const STATS = [
  { key: 'streak', label: 'Streak', icon: Flame, color: '#F97316', max: 20 },
  { key: 'level', label: 'Cấp độ', icon: Star, color: '#EAB308', max: 30 },
  { key: 'study', label: 'Hoàn thành', icon: BookOpen, color: '#00E5FF', max: 40 },
  { key: 'achievement', label: 'Thành tựu', icon: Trophy, color: '#6C63FF', max: 10 },
]

export default function LifeScoreGauge({ data, loading }: LifeScoreGaugeProps) {
  const scoreColor = getScoreColor(data?.score ?? 0)

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="animate-pulse h-5 w-32 rounded bg-muted" /></CardHeader>
        <CardContent className="space-y-4 animate-pulse">
          <div className="mx-auto h-32 w-32 rounded-full bg-muted" />
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-3 rounded bg-muted" />)}
        </CardContent>
      </Card>
    )
  }

  const score = data?.score ?? 0

  return (
    <Card className="border-white/[0.07] bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="text-base text-white/80">Life Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Circular gauge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="relative mx-auto flex h-32 w-32 items-center justify-center"
        >
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="52" fill="none"
              stroke={scoreColor.stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 326.73} 326.73`}
              initial={{ strokeDasharray: '0 326.73' }}
              animate={{ strokeDasharray: `${(score / 100) * 326.73} 326.73` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </svg>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <p className={cn('text-3xl font-bold', scoreColor.text)}>
              <AnimatedNumber value={score} />
            </p>
            <p className="text-[11px] text-white/30">/ 100</p>
          </motion.div>
        </motion.div>

        {/* Breakdown bars — dynamic, no hardcoded IELTS/GPA/DevOps */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2.5"
        >
          {STATS.map(stat => {
            const val = data?.[stat.key] ?? 0
            const pct = Math.min(100, (val / stat.max) * 100)
            const Icon = stat.icon
            return (
              <div key={stat.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-white/50">
                    <Icon className="h-3 w-3" style={{ color: stat.color }} />
                    {stat.label}
                  </span>
                  <span className="font-medium tabular-nums" style={{ color: stat.color }}>
                    {val}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: stat.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  />
                </div>
              </div>
            )
          })}
        </motion.div>
      </CardContent>
    </Card>
  )
}
