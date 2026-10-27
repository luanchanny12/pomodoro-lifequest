import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface ExpBarProps {
  current: number
  total: number
  showLabel?: boolean
  className?: string
}

export function ExpBar({ current, total, showLabel = true, className }: ExpBarProps) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Kinh nghiệm</span>
          <span>{current} / {total} EXP</span>
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500"
        />
      </div>
    </div>
  )
}
