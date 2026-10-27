import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakDisplayProps {
  streak: number
  className?: string
}

export function StreakDisplay({ streak, className }: StreakDisplayProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      className={cn('flex items-center gap-1 text-sm font-medium', className)}
    >
      <motion.div
        animate={streak > 0 ? { scale: [1, 1.2, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <Flame
          className={cn(
            'h-5 w-5',
            streak >= 30
              ? 'text-red-500 drop-[0_0_3px_rgba(239,68,68,0.5)]'
              : streak >= 7
              ? 'text-orange-400'
              : streak > 0
              ? 'text-yellow-400'
              : 'text-muted-foreground'
          )}
        />
      </motion.div>
      <span
        className={cn(
          'tabular-nums',
          streak >= 30 && 'text-red-400',
          streak >= 7 && 'text-orange-400',
          streak > 0 && 'text-yellow-400',
          streak === 0 && 'text-muted-foreground'
        )}
      >
        {streak}
      </span>
    </motion.div>
  )
}
