import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Brain, CheckCircle2, XCircle, Loader2,
  Trophy, RefreshCw,
} from 'lucide-react'
import GlassCard from '@/components/lifeos/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import { useQuizQuestions, useSubmitQuiz } from '@/services/knowledgeService'
import { cn } from '@/lib/utils'

export default function QuizMode() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const id = parseInt(quizId || '0')

  const [answers, setAnswers] = useState<number[]>([])
  const [current, setCurrent] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: questions = [], isLoading } = useQuizQuestions(id)
  const submitQuiz = useSubmitQuiz()

  function handleAnswer(answerIndex: number) {
    const newAnswers = [...answers]
    newAnswers[current] = answerIndex
    setAnswers(newAnswers)
  }

  function handleNext() {
    if (current < questions.length - 1) {
      setCurrent(current + 1)
    }
  }

  function handlePrev() {
    if (current > 0) {
      setCurrent(current - 1)
    }
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await submitQuiz.mutateAsync({ quizId: id, answers })
      setResult(res)
    } catch {}
    setSubmitting(false)
  }

  if (isLoading) return <TableSkeleton rows={5} cols={1} />
  if (!questions.length) return (
    <div className="text-center py-12">
      <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-muted-foreground">Chưa có câu hỏi</p>
      <Button className="mt-4" onClick={() => navigate(-1)}>Quay lại</Button>
    </div>
  )

  const answeredCount = answers.filter(a => a !== undefined).length
  const allAnswered = answeredCount === questions.length

  if (result) {
    return (
      <GlassCard className="max-w-2xl mx-auto text-center py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            {result.passed ? (
              <Trophy className="h-16 w-16 mx-auto text-yellow-400 mb-4" />
            ) : (
              <Brain className="h-16 w-16 mx-auto text-[#00E5FF] mb-4" />
            )}
          </motion.div>

          <h2 className="text-2xl font-bold font-display mb-2">
            {result.passed ? 'Xuất sắc!' : 'Cố gắng hơn'}
          </h2>

          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <p className={cn(
                'text-3xl font-bold',
                result.passed ? 'text-[#00FFC8]' : 'text-orange-400'
              )}>
                {result.score}%
              </p>
              <p className="text-xs text-muted-foreground">Điểm số</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#00E5FF]">
                {result.correct_count}/{result.total_questions}
              </p>
              <p className="text-xs text-muted-foreground">Đúng</p>
            </div>
          </div>

          <div className="space-y-3 mb-6 text-left">
            {result.answers.map((a: any, i: number) => (
              <div key={i} className={cn(
                'flex items-start gap-3 rounded-xl p-3 border',
                a.is_correct ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'
              )}>
                {a.is_correct ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                )}
                <div className="text-sm">
                  <p>{questions[i]?.question || `Câu ${i + 1}`}</p>
                  {!a.is_correct && a.explanation && (
                    <p className="text-xs text-muted-foreground mt-1">{a.explanation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="cyber-button-outline">
              Quay lại
            </Button>
            <Button onClick={() => { setResult(null); setAnswers([]); setCurrent(0) }}>
              <RefreshCw className="mr-2 h-4 w-4" /> Làm lại
            </Button>
          </div>
        </GlassCard>
    )
  }

  const question = questions[current]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-display">Bài kiểm tra</h1>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={(answeredCount / questions.length) * 100} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground shrink-0">
              {answeredCount}/{questions.length}
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <Badge variant="outline" className="text-[10px]">
                Câu {current + 1}/{questions.length}
              </Badge>
            </div>

            <h3 className="text-base font-medium mb-6">{question.question}</h3>

            <div className="space-y-2">
              {question.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className={cn(
                    'w-full text-left rounded-xl p-3 text-sm transition-all border',
                    answers[current] === idx
                      ? 'border-[#00E5FF] bg-[#00E5FF]/5 text-[#00E5FF]'
                      : 'border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.02]'
                  )}
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-medium mr-3"
                    style={{
                      background: answers[current] === idx ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {option}
                </button>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={current === 0}
          className="cyber-button-outline"
        >
          Câu trước
        </Button>

        {current < questions.length - 1 ? (
          <Button onClick={handleNext} disabled={answers[current] === undefined}>
            Câu tiếp
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Nộp bài
          </Button>
        )}
      </div>
    </div>
  )
}
