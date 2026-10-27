import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Clock, Brain,
  CheckCircle2, ChevronRight, Star, Play, Pause,
  Zap, HelpCircle,
} from 'lucide-react'
import GlassCard from '@/components/lifeos/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import {
  useLesson, useLessonFlashcards, useLessonQuizzes,
  useStartStudy, useUpdateStudy, useReviewFlashcard,
} from '@/services/knowledgeService'
import { cn } from '@/lib/utils'
import type { Flashcard } from '@/types'

type StudyPhase = 'focus' | 'flashcards' | 'complete'

function FocusTimer({ minutes, onComplete }: { minutes: number; onComplete: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60)
  const [isRunning, setIsRunning] = useState(true)

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(timer); onComplete(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning, secondsLeft])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <div className="text-center py-12">
      <div className="relative inline-flex mb-8">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <motion.circle
            cx="50" cy="50" r="45" fill="none" stroke="#00E5FF"
            strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${(secondsLeft / (minutes * 60)) * 283} 283`}
            initial={false}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold font-display text-[#00E5FF]">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="flex justify-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRunning(!isRunning)}
          className="cyber-button-outline"
        >
          {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          {isRunning ? 'Tạm dừng' : 'Tiếp tục'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">Tập trung học trong {minutes} phút</p>
    </div>
  )
}

function FlashcardReview({ flashcards, onComplete }: { flashcards: Flashcard[]; onComplete: () => void }) {
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<Record<number, number>>({})

  const reviewCard = useReviewFlashcard()

  async function handleQuality(q: number) {
    const fc = flashcards[current]
    await reviewCard.mutateAsync({ flashcardId: fc.id, quality: q })
    setResults(prev => ({ ...prev, [fc.id]: q }))
    setFlipped(false)
    if (current < flashcards.length - 1) {
      setCurrent(current + 1)
    } else {
      onComplete()
    }
  }

  if (flashcards.length === 0) {
    return (
      <div className="text-center py-12">
        <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Chưa có flashcard cho bài này</p>
        <Button className="mt-4" onClick={onComplete}>Tiếp tục</Button>
      </div>
    )
  }

  const fc = flashcards[current]

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-4">
        <span className="text-sm text-muted-foreground">
          Flashcard {current + 1}/{flashcards.length}
        </span>
        <div className="flex justify-center gap-1 mt-2">
          {flashcards.map((_, i) => (
            <div key={i} className={cn(
              'w-2 h-2 rounded-full transition-all',
              i === current ? 'bg-[#00E5FF] w-4' :
              results[flashcards[i].id] !== undefined ? 'bg-green-500' : 'bg-white/[0.1]'
            )} />
          ))}
        </div>
      </div>

      <motion.div
        key={current}
        initial={{ opacity: 0, rotateY: -10 }}
        animate={{ opacity: 1, rotateY: 0 }}
        className="relative cursor-pointer"
        onClick={() => setFlipped(!flipped)}
      >
        <GlassCard className={cn(
          'min-h-[200px] flex items-center justify-center text-center p-8 transition-all',
          flipped && 'border-[#00E5FF]/30'
        )}>
          {flipped ? (
            <p className="text-lg font-medium mb-2">{fc.answer}</p>
          ) : (
            <>
              <HelpCircle className="h-6 w-6 mx-auto text-[#00E5FF] mb-3" />
              <p className="text-lg font-medium">{fc.question}</p>
              <p className="text-xs text-muted-foreground mt-4">Nhấn để xem đáp án</p>
            </>
          )}
        </GlassCard>
      </motion.div>

      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-2 mt-4"
          >
            {[
              { label: 'Quên', value: 0, color: 'text-red-400 border-red-400/30' },
              { label: 'Khó', value: 2, color: 'text-orange-400 border-orange-400/30' },
              { label: 'Bình thường', value: 3, color: 'text-yellow-400 border-yellow-400/30' },
              { label: 'Dễ', value: 4, color: 'text-green-400 border-green-400/30' },
              { label: 'Hoàn hảo', value: 5, color: 'text-[#00E5FF] border-[#00E5FF]/30' },
            ].map((btn) => (
              <Button
                key={btn.value}
                variant="outline"
                size="sm"
                onClick={() => handleQuality(btn.value)}
                className={cn('text-xs', btn.color)}
              >
                {btn.label}
              </Button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function StudyMode() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const id = parseInt(lessonId || '0')

  const [phase, setPhase] = useState<StudyPhase>('focus')
  const [studySessionId, setStudySessionId] = useState<number | null>(null)
  const [focusMinutes, setFocusMinutes] = useState(25)
  const startStudy = useStartStudy()
  const updateStudy = useUpdateStudy()
  const { data: lesson, isLoading } = useLesson(id)
  const { data: flashcards = [] } = useLessonFlashcards(id)
  const { data: quizzes = [] } = useLessonQuizzes(id)

  useEffect(() => {
    if (lesson?.duration_minutes) {
      setFocusMinutes(lesson.duration_minutes)
    }
  }, [lesson])

  async function handleStartFocus() {
    try {
      const session = await startStudy.mutateAsync(id)
      setStudySessionId(session.id)
    } catch {}
  }

  async function handleFocusComplete() {
    if (studySessionId) {
      await updateStudy.mutateAsync({
        sessionId: studySessionId,
        duration_minutes: focusMinutes,
        status: 'completed',
      })
    }
    if (flashcards.length > 0) {
      setPhase('flashcards')
    } else {
      setPhase('complete')
    }
  }

  async function handleFlashcardsComplete() {
    setPhase('complete')
  }

  if (isLoading) return <TableSkeleton rows={5} cols={1} />
  if (!lesson) return <div className="text-center py-12 text-muted-foreground">Không tìm thấy bài học</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold font-display">{lesson.title}</h1>
          <p className="text-xs text-muted-foreground">{lesson.description}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            <Clock className="h-3 w-3 mr-1" /> {lesson.duration_minutes} phút
          </Badge>
          <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400/30">
            <Star className="h-3 w-3 mr-1" /> {lesson.xp_reward} XP
          </Badge>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'focus' && (
          <motion.div
            key="focus"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard>
              <FocusTimer minutes={focusMinutes} onComplete={handleFocusComplete} />
            </GlassCard>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <GlassCard>
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-[#00E5FF]" />
                  <div>
                    <p className="text-xs font-medium">{flashcards.length} Flashcard</p>
                    <p className="text-[10px] text-muted-foreground">Ôn tập sau khi học</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-xs font-medium">{quizzes.length} Bài kiểm tra</p>
                    <p className="text-[10px] text-muted-foreground">Kiểm tra kiến thức</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {phase === 'flashcards' && (
          <motion.div
            key="flashcards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard>
              <FlashcardReview flashcards={flashcards} onComplete={handleFlashcardsComplete} />
            </GlassCard>
          </motion.div>
        )}

        {phase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <GlassCard className="text-center py-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                <CheckCircle2 className="h-16 w-16 mx-auto text-[#00FFC8] mb-4" />
              </motion.div>
              <h2 className="text-xl font-bold font-display mb-2">Hoàn thành!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Bạn đã học xong bài <strong>{lesson.title}</strong>
              </p>

              <div className="flex justify-center gap-3 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#00E5FF]">+{lesson.xp_reward}XP</p>
                  <p className="text-xs text-muted-foreground">Kinh nghiệm</p>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                {quizzes.length > 0 && (
                  <Button onClick={() => navigate(`/quiz/${quizzes[0].id}`)}>
                    <Brain className="mr-2 h-4 w-4" /> Làm bài kiểm tra
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate(-1)} className="cyber-button-outline">
                  Quay lại
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
