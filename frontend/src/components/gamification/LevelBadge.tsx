import { motion } from 'framer-motion'
import { LEVEL_THRESHOLDS } from '@/constants'
import { ExpBar } from './ExpBar'
import { Swords } from 'lucide-react'

interface LevelBadgeProps {
  level: number
  exp: number
  expToNext: number
  size?: 'sm' | 'md' | 'lg'
}

export default function LevelBadge({ level, exp, expToNext, size = 'md' }: LevelBadgeProps) {
  const rank = LEVEL_THRESHOLDS.find((t) => t.level === level)
  const sizes = {
    sm: { badge: 'h-8 w-8 text-xs', icon: 'h-4 w-4' },
    md: { badge: 'h-12 w-12 text-sm', icon: 'h-5 w-5' },
    lg: { badge: 'h-16 w-16 text-lg', icon: 'h-7 w-7' },
  }

  return (
    <div className="flex items-center gap-3">
      <motion.div
        whileHover={{ scale: 1.1, rotate: 10 }}
        className={`flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500 shadow-lg shadow-orange-500/30 ${sizes[size].badge}`}
      >
        <Swords className={`${sizes[size].icon} text-white`} />
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">Cấp {level}</span>
          {rank && (
            <span className="text-xs text-muted-foreground">- {rank.title}</span>
          )}
        </div>
        <ExpBar current={exp} total={expToNext} />
      </div>
    </div>
  )
}
