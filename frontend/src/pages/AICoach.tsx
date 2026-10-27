/**
 * AICoach.tsx — gộp AI Coach + Knowledge Center vào 2 tab
 */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bot, Sparkles, Star, BarChart3, TrendingUp, Target, Zap,
  Brain, Upload, FileText, Clock, BookOpen, Search,
  Loader2, Trash2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import {
  useAIPlanner, useDailyReview, usePredictions,
  useLifeScore, useWeeklyReport, useUploadPlan,
} from '@/services/aiService'
import {
  useKnowledgePacks, useUploadDocument, useDeleteKnowledgePack,
} from '@/services/knowledgeService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import GlassCard from '@/components/lifeos/GlassCard'
import AIPlannerButton from '@/components/ai/AIPlannerButton'
import AIChatDialog from '@/components/ai/AIChatDialog'
import AIReviewCard from '@/components/ai/AIReviewCard'
import LifeScoreGauge from '@/components/ai/LifeScoreGauge'
import PredictionCard from '@/components/ai/PredictionCard'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { StudyPlanResult } from '@/types'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Chờ xử lý', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10', icon: Clock },
  processing: { label: 'Đang xử lý', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10', icon: Loader2 },
  ready: { label: 'Sẵn sàng', color: 'border-green-500/30 text-green-400 bg-green-500/10', icon: CheckCircle2 },
  error: { label: 'Lỗi', color: 'border-red-500/30 text-red-400 bg-red-500/10', icon: AlertCircle },
}

// ─── Tab 1: AI Coach ──────────────────────────────────────────────────────────
function CoachTab() {
  const navigate = useNavigate()
  const [chatOpen, setChatOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [subject, setSubject] = useState('')
  const [userMsg, setUserMsg] = useState('')
  const [plan, setPlan] = useState<StudyPlanResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadPlan = useUploadPlan()

  const today = new Date().toISOString().split('T')[0]
  const { data: plannerData, refetch: refetchPlanner } = useAIPlanner(today)
  const { data: review, isLoading: reviewLoading } = useDailyReview(today)
  const { data: predictions, isLoading: predsLoading } = usePredictions()
  const { data: lifeScore, isLoading: lifeLoading } = useLifeScore()

  const quickActions = [
    { icon: Sparkles, title: 'Hôm nay học gì?', desc: 'AI đề xuất kế hoạch', color: 'from-purple-500 to-pink-500', action: () => refetchPlanner() },
    { icon: Upload, title: 'Gửi tài liệu', desc: 'AI phân tích & lên lịch', color: 'from-blue-500 to-cyan-500', action: () => setUploadOpen(true) },
    { icon: Star, title: 'Review cuối ngày', desc: 'Xem đánh giá từ AI', color: 'from-amber-500 to-orange-500', action: () => window.scrollTo({ top: 9999, behavior: 'smooth' }) },
    { icon: TrendingUp, title: 'Dự đoán tiến độ', desc: 'Khi nào hoàn thành?', color: 'from-emerald-500 to-teal-500', action: () => document.getElementById('predictions')?.scrollIntoView({ behavior: 'smooth' }) },
    { icon: Bot, title: 'Chat với AI', desc: 'Đặt câu hỏi & lên lịch', color: 'from-indigo-500 to-purple-500', action: () => setChatOpen(true) },
  ]

  async function handleUpload() {
    if (!file || !subject.trim()) { toast.error('Vui lòng chọn file và nhập tên môn học'); return }
    try {
      const result = await uploadPlan.mutateAsync({ file, subject, message: userMsg })
      setPlan(result); setUploadOpen(false)
      toast.success('Phân tích tài liệu thành công!')
    } catch { toast.error('Không thể phân tích tài liệu') }
  }

  return (
    <div className="space-y-6">
      {/* Upload panel */}
      {uploadOpen && (
        <Card className="border-dashed border-white/[0.1] bg-white/[0.02]">
          <CardContent className="pt-5 space-y-3">
            <div className="border-2 border-dashed border-white/[0.1] rounded-xl p-6 text-center cursor-pointer hover:border-[#00E5FF]/40 transition-colors"
              onClick={() => fileRef.current?.click()}>
              <Upload className="w-7 h-7 mx-auto mb-2 text-white/30" />
              <p className="text-sm text-white/40">{file ? file.name : 'Kéo thả hoặc nhấn để chọn (PDF, DOCX, TXT)'}</p>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <Input placeholder="Tên môn học (vd: Toán cao cấp...)" value={subject} onChange={e => setSubject(e.target.value)} className="border-white/[0.07] bg-white/[0.02]" />
            <Input placeholder="Lời nhắn thêm (tuỳ chọn)" value={userMsg} onChange={e => setUserMsg(e.target.value)} className="border-white/[0.07] bg-white/[0.02]" />
            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={uploadPlan.isPending}>{uploadPlan.isPending ? 'Đang phân tích...' : 'Phân tích & Lên lịch'}</Button>
              <Button variant="ghost" onClick={() => { setUploadOpen(false); setFile(null); setPlan(null) }}>Huỷ</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis result */}
      {plan && (
        <Card className="border-emerald-500/20 bg-emerald-500/[0.04]">
          <CardHeader className="flex flex-row items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div className="flex-1">
              <CardTitle className="text-base">{plan.subject}</CardTitle>
              <CardDescription>Độ khó: {plan.difficulty} · Ước tính: {plan.total_hours_estimate}h</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPlan(null)}>Đóng</Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/60 mb-3">{plan.summary}</p>
            {plan.tasks.length > 0 && (
              <div className="space-y-2">
                {plan.tasks.sort((a, b) => a.order - b.order).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03]">
                    <Badge variant="outline" className="shrink-0 text-[10px]">{t.order}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-white/40 line-clamp-1">{t.description}</p>
                    </div>
                    <span className="text-xs text-white/30 shrink-0"><Clock className="h-3 w-3 inline mr-1" />{t.estimated_minutes}ph</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {quickActions.map((q, i) => (
          <motion.div key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Card className="cursor-pointer hover:shadow-lg transition-all overflow-hidden border-white/[0.07]" onClick={q.action}>
              <CardContent className={`p-4 bg-gradient-to-br ${q.color} text-white`}>
                <q.icon className="w-6 h-6 mb-2 opacity-80" />
                <p className="font-semibold text-xs leading-tight">{q.title}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{q.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* AI Plan result */}
      {plannerData && (
        <Card className="border-purple-500/20 bg-purple-500/[0.04]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Kế hoạch hôm nay
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetchPlanner()}>
              Làm mới
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-white/60">{plannerData.summary}</p>
            {plannerData.reason && (
              <p className="text-xs text-white/40 italic">Lý do: {plannerData.reason}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Zap className="h-3 w-3" />Năng lượng: {plannerData.energy}%
            </div>
            {plannerData.blocks.length > 0 ? (
              <div className="space-y-2">
                {plannerData.blocks.map((block, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03]">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                      <span className="text-xs font-bold text-purple-400">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{block.title}</p>
                      <p className="text-xs text-white/40">{block.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/30">
                        <span><Clock className="h-3 w-3 inline mr-1" />{block.start_time} - {block.end_time}</span>
                        {block.exp_reward > 0 && <span>Trophy+{block.exp_reward} EXP</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40 text-center py-4">Chưa có đề xuất. Hãy tạo mục tiêu học tập trước!</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Life Score + Review */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LifeScoreGauge data={lifeScore ?? { score: 0, streak: 0, achievement: 0, level: 0, study: 0 }} loading={lifeLoading} />
        {review && <AIReviewCard review={review} loading={reviewLoading} />}
      </div>

      {/* Predictions */}
      {predictions && predictions.length > 0 ? (
        <div id="predictions" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {predictions.map((p, i) => <PredictionCard key={i} prediction={p} loading={predsLoading} />)}
        </div>
      ) : (
        <EmptyState icon={Target} title="Chưa có mục tiêu nào" description="Tạo mục tiêu học tập để AI dự đoán tiến độ hoàn thành" action={{
          label: 'Tạo mục tiêu',
          onClick: () => navigate('/today')
        }} />
      )}

      <AIPlannerButton />
      <AIChatDialog open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  )
}

// ─── Tab 2: Knowledge Center ──────────────────────────────────────────────────
function KnowledgeTab() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useKnowledgePacks(search || undefined)
  const uploadDoc = useUploadDocument()
  const deletePack = useDeleteKnowledgePack()
  const packs = data?.items || []

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const result = await uploadDoc.mutateAsync(file)
      if (result.status === 'ready') toast.success(`Đã xử lý: ${result.title}`)
      else if (result.status === 'error') toast.error(result.message)
      else toast.info('Đang xử lý tài liệu...')
    } catch { toast.error('Lỗi khi tải lên') }
    setUploading(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input placeholder="Tìm knowledge pack..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 border-white/[0.07] bg-white/[0.02]" />
        </div>
        <input type="file" accept=".pdf,.docx,.pptx,.txt,.md,.mp4,.mp3,.png,.jpg,.jpeg" className="hidden" id="know-upload"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />
        <Button onClick={() => document.getElementById('know-upload')?.click()} disabled={uploading || uploadDoc.isPending}
          className="gap-1.5 bg-[#00FFC8]/10 text-[#00FFC8] border border-[#00FFC8]/30 hover:bg-[#00FFC8]/20">
          {uploading || uploadDoc.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Tải tài liệu
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:4}).map((_,i) => <div key={i} className="h-36 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
      ) : packs.length === 0 ? (
        <EmptyState icon={BookOpen} title="Chưa có knowledge pack" description="Tải lên PDF, Word, PowerPoint để bắt đầu học" action={{ label: 'Tải tài liệu', onClick: () => document.getElementById('know-upload')?.click() }} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map(pack => {
            const cfg = statusConfig[pack.status]
            const Icon = cfg?.icon || FileText
            return (
              <motion.div key={pack.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} layout>
                <GlassCard hover glow className="h-full cursor-pointer">
                  <div onClick={() => navigate(`/knowledge/${pack.id}`)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E5FF]/20 to-[#6C63FF]/20">
                        <FileText className="h-5 w-5 text-[#00E5FF]" />
                      </div>
                      <Badge variant="outline" className={cn('text-[10px]', cfg?.color)}>{cfg?.label}</Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{pack.title}</h3>
                    <p className="text-xs text-white/30 mb-3">{pack.source_filename}</p>
                    {pack.status === 'ready' && (
                      <div className="flex items-center gap-3 text-xs text-white/30">
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{pack.total_lessons} bài</span>
                        <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{pack.total_pages} trang</span>
                      </div>
                    )}
                    {pack.status === 'processing' && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-400">
                        <Loader2 className="h-3 w-3 animate-spin" />AI đang xử lý...
                      </div>
                    )}
                    {pack.status === 'error' && <p className="text-xs text-red-400">{pack.error_message || 'Lỗi xử lý'}</p>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/[0.05] flex justify-end">
                    <button onClick={e => { e.stopPropagation(); if (confirm(`Xóa "${pack.title}"?`)) deletePack.mutateAsync(pack.id).then(() => toast.success('Đã xóa')) }}
                      className="text-xs text-white/30 hover:text-red-400 transition-colors flex items-center gap-1">
                      <Trash2 className="h-3 w-3" />Xóa
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AICoach() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="AI Coach" description="Trợ lý học tập & quản lý tài liệu" />

      <Tabs defaultValue="coach">
        <TabsList className="bg-white/[0.04] border border-white/[0.07]">
          <TabsTrigger value="coach" className="gap-2"><Brain className="h-3.5 w-3.5" />AI Coach</TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2"><BookOpen className="h-3.5 w-3.5" />Tài liệu</TabsTrigger>
        </TabsList>
        <TabsContent value="coach" className="mt-5"><CoachTab /></TabsContent>
        <TabsContent value="knowledge" className="mt-5"><KnowledgeTab /></TabsContent>
      </Tabs>
    </motion.div>
  )
}