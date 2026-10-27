import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, Unlock } from 'lucide-react'
import type { Achievement } from '@/types'

interface AchievementCardProps {
  achievement: Achievement
  index?: number
}

export default function AchievementCard({ achievement, index = 0 }: AchievementCardProps) {
  const isUnlocked = !!achievement.unlocked_at

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card
        className={cn(
          'transition-all duration-300',
          isUnlocked
            ? 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-transparent'
            : 'opacity-60'
        )}
      >
        <CardContent className="p-4 flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full text-lg',
              isUnlocked ? 'bg-yellow-500/20' : 'bg-muted'
            )}
          >
            {isUnlocked ? achievement.icon : <Lock className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{achievement.name}</span>
              {isUnlocked && <Unlock className="h-3 w-3 text-yellow-500" />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
            {isUnlocked && achievement.unlocked_at && (
              <p className="text-[10px] text-yellow-600 mt-1">
                Đạt được: {new Date(achievement.unlocked_at).toLocaleDateString('vi-VN')}
              </p>
            )}
          </div>
          {isUnlocked && (
            <Badge variant="gold" className="text-[10px] px-1.5 py-0">
              ✓
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
