import { motion } from 'framer-motion'
import { Calendar, TrendingUp, AlertTriangle, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { GOAL_TYPES } from '@/constants'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Prediction } from '@/types'

interface PredictionCardProps {
  prediction: Prediction; loading?: boolean;
}

function getConfidenceColor(conf: string) {
  const lc = conf.toLowerCase()
  if (lc.includes('cao') || lc.includes('high')) return 'text-green-500 border-green-500'
  if (lc.includes('trung') || lc.includes('medium')) return 'text-yellow-500 border-yellow-500'
  return 'text-red-500 border-red-500'
}

export default function PredictionCard({ prediction, loading }: PredictionCardProps) {
  const gt = GOAL_TYPES.find(g => g.value === prediction.goal_type)
  const currentDate = prediction.predicted_date ? format(parseISO(prediction.predicted_date), 'dd/MM/yyyy') : 'N/A'
  const improvedDate = prediction.improved_date ? format(parseISO(prediction.improved_date), 'dd/MM/yyyy') : 'N/A'

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="animate-pulse h-5 w-40 rounded bg-muted" /></CardHeader>
        <CardContent className="space-y-4 animate-pulse">
          <div className="h-20 rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      <Card className="group hover:shadow-md transition-all">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg" style={{ color: gt?.color }}>
            <Calendar className="h-5 w-5" />
            Dự đoán {gt?.label ?? prediction.goal_type}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-lg bg-muted/50 p-3"
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" /> Nhịp độ hiện tại
              </div>
              <p className="text-lg font-bold">{prediction.current_pace.toFixed(1)}h/ngày</p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />{currentDate}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 border border-green-200 dark:border-green-800"
            >
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mb-1">
                <Zap className="h-3 w-3" /> Nếu tăng 30 phút/ngày
              </div>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{prediction.improved_pace.toFixed(1)}h/ngày</p>
              <p className="text-sm text-green-600/70 dark:text-green-400/70 mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />{improvedDate}
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Tiến độ</span>
              <span>{prediction.current_pace > 0 ? Math.min((prediction.current_pace / 4) * 100, 100).toFixed(0) : 0}%</span>
            </div>
            <Progress value={prediction.current_pace > 0 ? Math.min((prediction.current_pace / 4) * 100, 100) : 0} className="h-2" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-between"
          >
            <Badge variant="outline" className={cn('text-xs', getConfidenceColor(prediction.confidence))}>
              Độ tin cậy: {prediction.confidence}
            </Badge>
          </motion.div>

          {prediction.streak_break_impact && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{prediction.streak_break_impact}</span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
