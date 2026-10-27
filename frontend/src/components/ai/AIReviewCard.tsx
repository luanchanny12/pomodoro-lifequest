import { motion } from 'framer-motion'
import { Star, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { DailyReview } from '@/types'

interface AIReviewCardProps {
  review: DailyReview; loading?: boolean;
}

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 3 : 4
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.div
          key={star}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: star * 0.1 }}
        >
          <Star
            className={cn(s === 3 ? 'h-3 w-3' : 'h-4 w-4', star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30')}
          />
        </motion.div>
      ))}
    </div>
  )
}

export default function AIReviewCard({ review, loading }: AIReviewCardProps) {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="animate-pulse h-5 w-40 rounded bg-muted" /></CardHeader>
        <CardContent className="space-y-4 animate-pulse">
          <div className="h-20 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Đánh giá hôm nay
          <StarRating rating={review.rating} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
          <motion.div variants={item} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Hoàn thành</span>
              <span className="font-medium">{review.completion_percent}%</span>
            </div>
            <Progress value={review.completion_percent} className="h-2.5" />
          </motion.div>

          {review.strengths.length > 0 && (
            <motion.div variants={item} className="space-y-1.5">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Điểm mạnh
              </p>
              {review.strengths.map((s, i) => (
                <motion.p key={i} variants={item} className="text-sm text-muted-foreground pl-6">
                  {s}
                </motion.p>
              ))}
            </motion.div>
          )}

          {review.weaknesses.length > 0 && (
            <motion.div variants={item} className="space-y-1.5">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Điểm yếu
              </p>
              {review.weaknesses.map((w, i) => (
                <motion.p key={i} variants={item} className="text-sm text-muted-foreground pl-6">
                  {w}
                </motion.p>
              ))}
            </motion.div>
          )}

          {review.suggestions.length > 0 && (
            <motion.div variants={item} className="space-y-1.5">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4" /> Gợi ý cho ngày mai
              </p>
              {review.suggestions.map((sg, i) => (
                <motion.p key={i} variants={item} className="text-sm text-muted-foreground pl-6">
                  {sg}
                </motion.p>
              ))}
            </motion.div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  )
}
