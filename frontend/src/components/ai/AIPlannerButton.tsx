import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Clock, Zap, Trophy, X, Loader2 } from 'lucide-react'
import { useAIPlanner } from '@/services/aiService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DIFFICULTY_MAP, GOAL_TYPES } from '@/constants'
import { format } from 'date-fns'
import type { AIPlannerBlock } from '@/types'

const SHOW_PAGES = ['/', '/today', '/ai-coach']

function PlannerBlock({ block, index }: { block: AIPlannerBlock; index: number }) {
  const gt = GOAL_TYPES.find(g => g.value === block.goal_type)
  const diff = DIFFICULTY_MAP[block.difficulty as keyof typeof DIFFICULTY_MAP] ?? DIFFICULTY_MAP[3]
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: gt?.color ?? '#6B7280' + '20' }}>
        <span className="text-xs font-bold" style={{ color: gt?.color }}>{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{block.title}</p>
          <Badge variant="outline" className="text-[10px] px-1 py-0" style={{ color: gt?.color, borderColor: gt?.color }}>
            {gt?.label ?? block.goal_type}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{block.description}</p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{block.start_time} - {block.end_time}</span>
          <span className="flex items-center gap-1" style={{ color: diff.color }}><Zap className="h-3 w-3" />{diff.label}</span>
          <span className="flex items-center gap-1 text-amber-500"><Trophy className="h-3 w-3" />+{block.exp_reward} EXP</span>
        </div>
      </div>
    </motion.div>
  )
}

export default function AIPlannerButton() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [energy, setEnergy] = useState(50)
  const [sleep, setSleep] = useState(7)
  const [mood, setMood] = useState(3)
  const [showConfig, setShowConfig] = useState(true)

  const { data: plan, refetch, isFetching } = useAIPlanner(
    new Date().toISOString().split('T')[0],
    energy, sleep, mood
  )

  const shouldShow = SHOW_PAGES.includes(location.pathname)
  if (!shouldShow) return null

  function handleGenerate() {
    setShowConfig(false)
    refetch()
  }

  function handleApply() {
    setOpen(false)
    setShowConfig(true)
  }

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-shadow"
      >
        <motion.span
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Sparkles className="h-6 w-6" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => { setOpen(false); setShowConfig(true) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      AI Planner
                    </CardTitle>
                    <CardDescription>Kế hoạch học tập thông minh cho hôm nay</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setOpen(false); setShowConfig(true) }}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {showConfig && !plan && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Năng lượng: {energy}%</label>
                        <input type="range" min={10} max={100} value={energy} onChange={e => setEnergy(Number(e.target.value))} className="w-full" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Giấc ngủ: {sleep}h</label>
                        <input type="range" min={4} max={12} step={0.5} value={sleep} onChange={e => setSleep(Number(e.target.value))} className="w-full" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tâm trạng: {['Tệ', 'Không tốt', 'Bình thường', 'Tốt', 'Tuyệt vời'][mood - 1]}</label>
                        <input type="range" min={1} max={5} value={mood} onChange={e => setMood(Number(e.target.value))} className="w-full" />
                      </div>
                      <Button className="w-full" onClick={handleGenerate} disabled={isFetching}>
                        {isFetching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang suy nghĩ...</> : 'Tạo kế hoạch AI'}
                      </Button>
                    </motion.div>
                  )}

                  {isFetching && (
                    <div className="space-y-3 py-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3 animate-pulse">
                          <div className="h-8 w-8 rounded-full bg-muted" />
                          <div className="flex-1 space-y-2"><div className="h-4 w-3/4 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" /></div>
                        </div>
                      ))}
                    </div>
                  )}

                  {plan && !isFetching && (
                    <ScrollArea className="max-h-96 pr-2">
                      <div className="space-y-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg bg-muted p-3">
                          <p className="text-sm font-medium">Tóm tắt</p>
                          <p className="text-sm text-muted-foreground mt-1">{plan.summary}</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">Lý do: {plan.reason}</p>
                        </motion.div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Zap className="h-4 w-4" />Năng lượng cần: {plan.energy}%
                          <span className="ml-auto">Dự kiến: {plan.predicted_completion ? format(new Date(plan.predicted_completion), 'dd/MM') : 'N/A'}</span>
                        </div>

                        <Separator />

                        <div className="flex flex-wrap gap-1.5">
                          {plan.priority.map((p) => {
                            const g = GOAL_TYPES.find(x => x.value === p)
                            return <Badge key={p} style={{ backgroundColor: g?.color + '20', color: g?.color, borderColor: g?.color }} variant="outline">{g?.label}</Badge>
                          })}
                        </div>

                        <div className="space-y-2">
                          {plan.blocks.map((block, i) => (
                            <PlannerBlock key={i} block={block} index={i} />
                          ))}
                        </div>

                        <Button className="w-full" onClick={handleApply}>
                          Áp dụng kế hoạch
                        </Button>
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
