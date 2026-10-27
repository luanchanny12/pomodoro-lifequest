import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Clock, BarChart3, Star,
  CheckCircle2, Circle, Play,
} from 'lucide-react'
import GlassCard from '@/components/lifeos/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TableSkeleton } from '@/components/common/LoadingSkeleton'
import {
  useKnowledgePack, usePackChapters, usePackLessons, usePackProgress,
} from '@/services/knowledgeService'
import { cn } from '@/lib/utils'

const difficultyLabels = ['', 'Dễ', 'Dễ', 'Trung bình', 'Khó', 'Rất khó']
const difficultyColors = [
  '', 'text-green-400', 'text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400',
]

export default function KnowledgePackDetail() {
  const { packId } = useParams<{ packId: string }>()
  const navigate = useNavigate()
  const id = parseInt(packId || '0')

  const { data: pack, isLoading: packLoading } = useKnowledgePack(id)
  const { data: chapters = [] } = usePackChapters(id)
  const { data: lessons = [] } = usePackLessons(id)
  const { data: progress } = usePackProgress(id)

  if (packLoading) return <TableSkeleton rows={6} cols={2} />
  if (!pack) return <div className="text-center py-12 text-muted-foreground">Không tìm thấy</div>

  const completedCount = lessons.filter(l => l.progress?.status === 'completed').length
  const inProgressCount = lessons.filter(l => l.progress?.status === 'studying').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ai-coach')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold font-display">{pack.title}</h1>
          <p className="text-sm text-muted-foreground">{pack.source_filename}</p>
        </div>
      </div>

      <GlassCard className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, #00E5FF 0%, transparent 60%)' }}
        />
        <div className="relative z-10 grid gap-4 sm:grid-cols-4">
          <div className="text-center">
            <p className="text-2xl font-bold font-display text-[#00E5FF]">{progress?.progress_percent || 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">Hoàn thành</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-display text-[#00FFC8]">
              {completedCount}/{pack.total_lessons}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Bài học</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-display text-[#6C63FF]">
              {Math.round((progress?.total_study_minutes || 0) / 60)}h
            </p>
            <p className="text-xs text-muted-foreground mt-1">Đã học</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-display text-[#FFD700]">{progress?.mastery_average || 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">Thông thạo</p>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-4">
        {chapters.map((chapter) => {
          const chapterLessons = lessons.filter(l => l.chapter_id === chapter.id)
          if (chapterLessons.length === 0) return null

          return (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard>
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="h-5 w-5 text-[#00E5FF]" />
                  <div>
                    <h3 className="font-semibold text-sm">{chapter.title}</h3>
                    {chapter.description && (
                      <p className="text-xs text-muted-foreground">{chapter.description}</p>
                    )}
                  </div>
                  {chapter.start_page && (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      Trang {chapter.start_page}{chapter.end_page ? `-${chapter.end_page}` : ''}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {chapterLessons.map((lesson) => {
                    const isCompleted = lesson.progress?.status === 'completed'
                    const isInProgress = lesson.progress?.status === 'studying'
                    const progressPct = lesson.progress?.progress_percent || 0

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => navigate(`/study/${lesson.id}`)}
                        className={cn(
                          'flex items-center gap-4 rounded-xl p-3 cursor-pointer transition-all',
                          'hover:bg-white/[0.03] border border-white/[0.05]',
                          isCompleted && 'border-green-500/20 bg-green-500/5',
                          isInProgress && 'border-[#00E5FF]/20 bg-[#00E5FF]/5',
                        )}
                      >
                        <div className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          isCompleted ? 'bg-green-500/20 text-green-400' :
                          isInProgress ? 'bg-[#00E5FF]/20 text-[#00E5FF]' :
                          'bg-white/[0.05] text-muted-foreground'
                        )}>
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> :
                           isInProgress ? <Play className="h-4 w-4" /> :
                           <Circle className="h-4 w-4" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-sm font-medium',
                              isCompleted && 'text-green-400'
                            )}>
                              {lesson.title}
                            </span>
                            <span className={cn('text-[10px] font-medium', difficultyColors[lesson.difficulty])}>
                              {difficultyLabels[lesson.difficulty]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {lesson.duration_minutes} phút
                            </span>
                            {lesson.start_page && (
                              <span>Trang {lesson.start_page}{lesson.end_page ? `-${lesson.end_page}` : ''}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" /> {lesson.xp_reward} XP
                            </span>
                          </div>
                        </div>

                        <div className="w-20">
                          <Progress value={progressPct} className="h-1.5" />
                        </div>

                        {isCompleted && lesson.progress?.mastery_level && (
                          <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
                            {lesson.progress.mastery_level}%
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
