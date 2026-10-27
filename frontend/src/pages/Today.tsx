/**
 * Today.tsx — gộp DailyPlan + DailyReport + Backlog vào 3 tab
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Edit, Trash2, Clock, Circle, CircleDot, CheckCircle2,
  Sparkles, X, Calendar, Moon, Brain, Heart, FileText,
  Trophy, ListTodo, Search, Lightbulb, ArrowRight, Archive, Zap, Loader2, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import EmptyState from '@/components/common/EmptyState'
import { useAIPlanner, useAIReview } from '@/services/aiService'
import { useSubjects } from '@/services/scheduleService'
import { useBacklogItems, useCreateBacklogItem, useUpdateBacklogItem, useDeleteBacklogItem } from '@/services/backlogService'
import api from '@/services/api'
import type { Task, DailyLog, BacklogItem } from '@/types'

interface DailyMissionItem {
  type: 'study' | 'review' | 'quiz' | 'explore'
  lesson_id?: number
  quiz_id?: number
  title: string
  pack_title?: string
  duration_minutes: number
  xp: number
}

interface DailyMission {
  id: number
  date: string
  title: string
  description?: string
  items: DailyMissionItem[]
  total_xp: number
  earned_xp: number
  status: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => format(new Date(), 'yyyy-MM-dd')
const fmtDate = (s: string) => format(new Date(s + 'T00:00:00'), 'EEEE, dd/MM/yyyy', { locale: vi })
const vnDay = (d: Date) => ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][d.getDay()]

const STATUS_OPTIONS = [
  { value: 'chưa làm' as const, label: 'Chưa làm', icon: Circle, color: 'text-gray-400' },
  { value: 'đang làm' as const, label: 'Đang làm', icon: CircleDot, color: 'text-amber-500' },
  { value: 'hoàn thành' as const, label: 'Hoàn thành', icon: CheckCircle2, color: 'text-green-500' },
]

const taskSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tiêu đề'),
  goal_type: z.string().default('chung'),
  start_time: z.string().min(1, 'Vui lòng chọn giờ'),
  end_time: z.string().min(1, 'Vui lòng chọn giờ'),
  content: z.string().optional(),
})
type TaskForm = z.infer<typeof taskSchema>

const reportSchema = z.object({
  completion_percent: z.number().min(0).max(100),
  sleep_hours: z.number().min(0).max(12),
  energy_level: z.number().min(1).max(10),
  mood_level: z.number().min(1).max(10),
  note: z.string().optional(),
})
type ReportForm = z.infer<typeof reportSchema>

// ─── Rating slider ────────────────────────────────────────────────────────────
function Rating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <Label>{label}</Label>
        <span className="font-bold text-[#00E5FF]">{value}/10</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <button key={i} type="button" onClick={() => onChange(i + 1)}
            className={`flex-1 h-2 rounded-full transition-all ${i < value ? 'bg-[#00E5FF]' : 'bg-white/[0.08]'}`} />
        ))}
      </div>
    </div>
  )
}

// ─── Tab 1: Kế hoạch ─────────────────────────────────────────────────────────
function PlanTab() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showAiPlan, setShowAiPlan] = useState(false)
  const [aiEnergy, setAiEnergy] = useState(50)
  const [aiSleep, setAiSleep] = useState(7)
  const [aiMood, setAiMood] = useState(3)
  const today = new Date()
  const dateStr = todayStr()
  const { data: subjects } = useSubjects()
  const {
    data: aiPlan,
    refetch: genPlan,
    isFetching: planLoading,
  } = useAIPlanner(dateStr, aiEnergy, aiSleep, aiMood)

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', goal_type: 'chung', start_time: '', end_time: '', content: '' },
  })
  useEffect(() => { if (!dialogOpen) { form.reset(); setEditingTask(null) } }, [dialogOpen])

  const tasksQuery = useQuery<Task[]>({
    queryKey: ['tasks', dateStr],
    queryFn: () => api.get('/tasks', { params: { date: dateStr } }).then(r => r.data),
  })
  const createTask = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Đã thêm block'); setDialogOpen(false) },
  })
  const updateTask = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/tasks/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
  const deleteTask = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Đã xóa') },
  })

  function onSubmit(data: TaskForm) {
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, title: data.title, goal_type: data.goal_type, description: data.content || null, start_time: data.start_time, end_time: data.end_time })
      setDialogOpen(false)
    } else {
      createTask.mutate({ title: data.title, goal_type: data.goal_type, date: dateStr, start_time: data.start_time, end_time: data.end_time, description: data.content || null, status: 'chưa làm' })
    }
  }

  const tasks = (tasksQuery.data ?? []).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

  const missionQuery = useQuery<DailyMission>({
    queryKey: ['daily-mission'],
    queryFn: () => api.get('/v3/daily/mission').then(r => r.data),
  })

  const missionIcons: Record<string, { icon: any; color: string }> = {
    study: { icon: Brain, color: '#00E5FF' },
    review: { icon: RotateCcw, color: '#FF6B9D' },
    quiz: { icon: Zap, color: '#FFD700' },
    explore: { icon: Sparkles, color: '#00FFC8' },
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-white">{vnDay(today)}, {format(today, 'dd/MM/yyyy', { locale: vi })}</p>
          <p className="text-xs text-white/40">{tasks.length} block · {tasks.filter(t => t.status === 'hoàn thành').length} hoàn thành</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/20">
          <Plus className="h-3.5 w-3.5" /> Thêm Block
        </Button>
      </div>

      {/* Daily Mission */}
      {missionQuery.data && !missionQuery.isLoading && (
        <Card className="border-[#00FFC8]/20 bg-[#00FFC8]/[0.03]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00FFC8]/20">
                  <Sparkles className="h-3.5 w-3.5 text-[#00FFC8]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Hôm nay học gì?</p>
                  <p className="text-[10px] text-white/40">{missionQuery.data.title || 'Chưa có nhiệm vụ'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-[#00FFC8]">{missionQuery.data.total_xp} XP</p>
                <p className="text-[10px] text-white/40">{missionQuery.data.items?.length || 0} nhiệm vụ</p>
              </div>
            </div>
            {missionQuery.data.items && missionQuery.data.items.length > 0 && (
              <div className="space-y-1.5">
                {missionQuery.data.items.map((item, i) => {
                  const meta = missionIcons[item.type] || { icon: Sparkles, color: '#fff' }
                  const Icon = meta.icon
                  return (
                    <div key={i}
                      onClick={() => {
                        if (item.type === 'study' && item.lesson_id) navigate(`/study/${item.lesson_id}`)
                        else if (item.type === 'quiz' && item.quiz_id) navigate(`/quiz/${item.quiz_id}`)
                        else if (item.type === 'review' && item.lesson_id) navigate(`/study/${item.lesson_id}`)
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-colors">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: `${meta.color}20` }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.title}</p>
                        {item.pack_title && <p className="text-[10px] text-white/40 truncate">{item.pack_title}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-medium text-white/60">+{item.xp}XP</p>
                        <p className="text-[9px] text-white/30">{item.duration_minutes}ph</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Planner */}
      <Card className="border-purple-500/20 bg-purple-500/[0.03]">
        <CardContent className="p-4">
          {!showAiPlan ? (
            <button onClick={() => setShowAiPlan(true)}
              className="w-full flex items-center gap-3 text-left">
              <Sparkles className="h-5 w-5 text-purple-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-300">AI gợi ý lịch học</p>
                <p className="text-xs text-purple-400/60">Nhập năng lượng, giấc ngủ để AI đề xuất</p>
              </div>
              <ArrowRight className="h-4 w-4 text-purple-400/60" />
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />AI Planner
                </p>
                <button onClick={() => setShowAiPlan(false)} className="text-white/30 hover:text-white/60">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40">Năng lượng</label>
                  <input type="range" min={10} max={100} value={aiEnergy}
                    onChange={e => setAiEnergy(Number(e.target.value))} className="w-full" />
                  <span className="text-xs text-white/60">{aiEnergy}%</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40">Ngủ</label>
                  <input type="range" min={4} max={12} step={0.5} value={aiSleep}
                    onChange={e => setAiSleep(Number(e.target.value))} className="w-full" />
                  <span className="text-xs text-white/60">{aiSleep}h</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40">Tâm trạng</label>
                  <input type="range" min={1} max={5} value={aiMood}
                    onChange={e => setAiMood(Number(e.target.value))} className="w-full" />
                  <span className="text-xs text-white/60">{['Tệ','Không tốt','B.thường','Tốt','T.vời'][aiMood-1]}</span>
                </div>
              </div>

              <Button size="sm" onClick={() => genPlan()} disabled={planLoading}
                className="w-full gap-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30">
                {planLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang suy nghĩ...</> : <><Sparkles className="h-3.5 w-3.5" />Tạo kế hoạch AI</>}
              </Button>

              {/* Plan result */}
              {planLoading && (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              )}

              {aiPlan && !planLoading && (
                <div className="space-y-2">
                  <p className="text-xs text-purple-400/80 italic">{aiPlan.summary}</p>
                  {aiPlan.reason && (
                    <p className="text-[10px] text-purple-400/60 italic">{aiPlan.reason}</p>
                  )}
                  {aiPlan.blocks.length > 0 ? (
                    <div className="space-y-1.5">
                      {aiPlan.blocks.map((block, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                            <span className="text-[10px] font-bold text-purple-400">{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{block.title}</p>
                            <p className="text-[10px] text-white/40">{block.start_time} - {block.end_time}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-white/10 text-white/40">{block.goal_type}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 space-y-2">
                      <p className="text-xs text-white/40">Chưa có mục tiêu học tập</p>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs border-purple-500/30 text-purple-400"
                        onClick={() => navigate('/ai-coach')}>
                        <Sparkles className="h-3 w-3" />Chat với AI để tạo kế hoạch
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {tasksQuery.isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={Clock} title="Chưa có kế hoạch hôm nay" description="Thêm block học để bắt đầu!" action={{ label: 'Thêm Block', onClick: () => setDialogOpen(true) }} />
      ) : (
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {tasks.map((task, idx) => {
              const statusObj = STATUS_OPTIONS.find(s => s.value === task.status) || STATUS_OPTIONS[0]
              const StatusIcon = statusObj.icon
              return (
                <motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} layout className="flex gap-3 group">
                  <div className="w-14 pt-3 shrink-0 text-right">
                    <div className="text-xs font-bold text-white/60 tabular-nums">{task.start_time?.slice(0, 5)}</div>
                    <div className="text-[10px] text-white/30">{task.end_time?.slice(0, 5)}</div>
                  </div>
                  <div className="relative flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]/60 z-10 mt-3.5 shrink-0" />
                    {idx < tasks.length - 1 && <div className="w-px flex-1 bg-white/[0.06] mt-1" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className={`text-sm font-medium truncate ${task.status === 'hoàn thành' ? 'line-through text-white/30' : 'text-white'}`}>{task.title}</h3>
                          <Badge variant="outline" className="text-[10px] border-white/10 text-white/40 shrink-0">{task.goal_type}</Badge>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => { form.reset({ title: task.title, goal_type: task.goal_type, start_time: task.start_time || '', end_time: task.end_time || '', content: task.description || '' }); setEditingTask(task); setDialogOpen(true) }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => deleteTask.mutate(task.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {task.description && <p className="text-xs text-white/40 mb-2">{task.description}</p>}
                      <div className="flex gap-1.5">
                        {STATUS_OPTIONS.map(opt => {
                          const Icon = opt.icon
                          const active = task.status === opt.value
                          return (
                            <button key={opt.value} onClick={() => updateTask.mutate({ id: task.id, status: opt.value })}
                              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md transition-all ${active ? `${opt.color} bg-white/[0.06]` : 'text-white/30 hover:text-white/60'}`}>
                              <Icon className="h-3 w-3" />{opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingTask ? 'Chỉnh sửa Block' : 'Thêm Block mới'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input placeholder="Nhập tiêu đề..." {...form.register('title')} />
            </div>
            <div className="space-y-2">
              <Label>Môn học</Label>
              <Select value={form.watch('goal_type')} onValueChange={v => form.setValue('goal_type', v)}>
                <SelectTrigger><SelectValue placeholder="Chọn môn học" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chung">Chung</SelectItem>
                  {subjects?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Giờ bắt đầu</Label><Input type="time" {...form.register('start_time')} /></div>
              <div className="space-y-2"><Label>Giờ kết thúc</Label><Input type="time" {...form.register('end_time')} /></div>
            </div>
            <div className="space-y-2"><Label>Nội dung</Label><Textarea rows={3} {...form.register('content')} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>{editingTask ? 'Cập nhật' : 'Thêm'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Tab 2: Nhật ký ──────────────────────────────────────────────────────────
function ReportTab() {
  const qc = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [isEditing, setIsEditing] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const { data: aiReview } = useAIReview(selectedDate)

  const form = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: { completion_percent: 0, sleep_hours: 7, energy_level: 5, mood_level: 5, note: '' },
  })

  const reportQuery = useQuery({
    queryKey: ['dailyLog', selectedDate],
    queryFn: async () => {
      const logs = await api.get('/daily-logs', { params: { date: selectedDate } }).then(r => r.data as DailyLog[])
      return logs[0] ?? null
    },
  })
  const tasksQuery = useQuery({
    queryKey: ['tasks', selectedDate],
    queryFn: () => api.get('/tasks', { params: { date: selectedDate } }).then(r => r.data),
  })
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/daily-logs', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dailyLog'] }); toast.success('Đã lưu báo cáo'); setIsEditing(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/daily-logs/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dailyLog'] }); toast.success('Đã cập nhật'); setIsEditing(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/daily-logs/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dailyLog'] }); toast.success('Đã xóa') },
  })

  const report = reportQuery.data
  const tasks = (tasksQuery.data ?? []) as any[]
  const completed = tasks.filter(t => t.status === 'hoàn thành').length

  function onSubmit(data: ReportForm) {
    const payload = { date: selectedDate, ...data, note: data.note || '' }
    if (report?.id) updateMutation.mutate({ id: report.id, ...payload })
    else createMutation.mutate(payload)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-white/40" />
        <Input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setIsEditing(false) }}
          className="w-44 border-white/[0.07] bg-white/[0.02] text-white" />
        <span className="text-xs text-white/40">{fmtDate(selectedDate)}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: ListTodo, label: 'Tasks', value: tasks.length, color: '#00E5FF' },
          { icon: CheckCircle2, label: 'Hoàn thành', value: `${completed}/${tasks.length}`, color: '#00FFC8' },
          { icon: Trophy, label: 'Tỉ lệ', value: tasks.length > 0 ? `${Math.round(completed / tasks.length * 100)}%` : '—', color: '#FFD700' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0" style={{ color }} />
            <div><p className="text-[10px] text-white/40">{label}</p><p className="text-lg font-bold text-white">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Report form / view */}
      {report && !isEditing ? (
        <Card className="border-white/[0.07] bg-white/[0.02]">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <CardTitle className="text-base text-white/80 flex items-center gap-2"><FileText className="h-4 w-4" />Báo cáo</CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => { form.reset({ completion_percent: report.completion_percent, sleep_hours: report.sleep_hours ?? 7, energy_level: report.energy_level ?? 5, mood_level: report.mood_level ?? 5, note: report.note ?? '' }); setIsEditing(true) }}>
                <Edit className="h-3 w-3 mr-1" />Sửa
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => report.id && deleteMutation.mutate(report.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><div className="flex justify-between text-xs mb-1"><span className="text-white/40">Hoàn thành</span><span className="font-bold text-white">{report.completion_percent}%</span></div><Progress value={report.completion_percent} className="h-1.5" /></div>
            <div className="flex items-center gap-2 text-sm"><Moon className="h-4 w-4 text-indigo-400" /><span className="text-white/40">Ngủ:</span><span className="font-semibold text-white">{report.sleep_hours}h</span></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-2"><Brain className="h-4 w-4 text-amber-400" /><div><p className="text-[10px] text-white/40">Năng lượng</p><p className="text-lg font-bold text-white">{report.energy_level}/10</p></div></div>
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 flex items-center gap-2"><Heart className="h-4 w-4 text-rose-400" /><div><p className="text-[10px] text-white/40">Tâm trạng</p><p className="text-lg font-bold text-white">{report.mood_level}/10</p></div></div>
            </div>
            {report.note && <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-sm italic text-white/50">"{report.note}"</p></div>}
            {report.activities && (() => {
              const acts: string[] = JSON.parse(report.activities)
              return acts.length > 0 ? (
                <div className="space-y-1.5 mt-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Hoạt động</p>
                  <div className="flex flex-wrap gap-1.5">
                    {acts.map(a => <span key={a} className="px-2 py-0.5 rounded-md bg-white/[0.05] text-xs text-white/60">{a}</span>)}
                  </div>
                </div>
              ) : null
            })()}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-white/[0.07] bg-white/[0.02]">
          <CardHeader><CardTitle className="text-base text-white/80">Viết báo cáo</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div><div className="flex justify-between text-sm mb-2"><Label>Hoàn thành</Label><span className="font-bold text-[#00E5FF]">{form.watch('completion_percent')}%</span></div><input type="range" min={0} max={100} className="w-full accent-[#00E5FF]" value={form.watch('completion_percent')} onChange={e => form.setValue('completion_percent', parseInt(e.target.value))} /></div>
              <div><div className="flex justify-between text-sm mb-2"><Label className="flex items-center gap-1.5"><Moon className="h-3.5 w-3.5 text-indigo-400" />Giấc ngủ</Label><span className="font-bold text-[#00E5FF]">{form.watch('sleep_hours')}h</span></div><input type="range" min={0} max={12} step={0.5} className="w-full accent-[#00E5FF]" value={form.watch('sleep_hours')} onChange={e => form.setValue('sleep_hours', parseFloat(e.target.value))} /></div>
              <Rating label="Năng lượng" value={form.watch('energy_level')} onChange={v => form.setValue('energy_level', v)} />
              <Rating label="Tâm trạng" value={form.watch('mood_level')} onChange={v => form.setValue('mood_level', v)} />
              <div className="space-y-2"><Label>Ghi chú</Label><Textarea rows={3} {...form.register('note')} className="border-white/[0.07] bg-white/[0.02]" /></div>
              <div className="flex justify-end gap-2">
                {isEditing && <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Hủy</Button>}
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Lưu báo cáo</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* AI Review */}
      {aiReview && (
        <Card className="border-purple-500/20 bg-purple-500/[0.03]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{['😴','😐','🙂','😊','🔥'][Math.min(aiReview.rating, 4)]}</span>
              <div>
                <p className="font-semibold text-white text-sm">{aiReview.summary}</p>
                {aiReview.life_score_delta !== 0 && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${aiReview.life_score_delta > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{aiReview.life_score_delta > 0 ? '+' : ''}{aiReview.life_score_delta}</span>}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-white/40 hover:text-white text-xs" onClick={() => setShowDetail(!showDetail)}>
              {showDetail ? 'Thu gọn' : 'Xem gợi ý từ AI →'}
            </Button>
            {showDetail && (
              <ul className="space-y-1">
                {aiReview.suggestions.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <span className="text-purple-400 mt-0.5">•</span>{s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Tab 3: Backlog ──────────────────────────────────────────────────────────
function BacklogTab() {
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('trung bình')
  const { data: subjects = [] } = useSubjects()
  const [category, setCategory] = useState('Chung')

  const { data: items = [], isLoading } = useBacklogItems(statusFilter === 'all' ? undefined : statusFilter)
  const createItem = useCreateBacklogItem()
  const updateItem = useUpdateBacklogItem()
  const deleteItem = useDeleteBacklogItem()

  const filtered = items.filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()))
  const priorityColors: Record<string, string> = { cao: 'text-red-400', 'trung bình': 'text-amber-400', thấp: 'text-green-400' }
  const statusColors: Record<string, string> = { 'trong kho': 'bg-zinc-500/10 text-zinc-400', 'đang thực hiện': 'bg-amber-500/10 text-amber-400', 'đã hoàn thành': 'bg-green-500/10 text-green-400' }

  function handleAdd() {
    if (!title.trim()) { toast.error('Nhập tiêu đề!'); return }
    createItem.mutate({ title: title.trim(), description, category, priority, status: 'trong kho' } as any, {
      onSuccess: () => { toast.success('Đã thêm ý tưởng'); setAddOpen(false); setTitle(''); setDescription('') },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input placeholder="Tìm ý tưởng..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 border-white/[0.07] bg-white/[0.02]" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 border-white/[0.07] bg-white/[0.02]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="trong kho">Trong kho</SelectItem>
            <SelectItem value="đang thực hiện">Đang thực hiện</SelectItem>
            <SelectItem value="đã hoàn thành">Đã hoàn thành</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/30 hover:bg-[#6C63FF]/20">
          <Plus className="h-3.5 w-3.5" /> Thêm ý tưởng
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Lightbulb} title="Kho ý tưởng trống" description="Thêm ý tưởng mới!" action={{ label: 'Thêm', onClick: () => setAddOpen(true) }} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(item => (
            <div key={item.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2 group">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white">{item.title}</p>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {item.status !== 'đã hoàn thành' && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white"
                      onClick={() => updateItem.mutate({ id: item.id, status: item.status === 'trong kho' ? 'đang thực hiện' : 'đã hoàn thành' } as any)}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => deleteItem.mutate(item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {item.description && <p className="text-xs text-white/40 line-clamp-2">{item.description}</p>}
              <div className="flex gap-1.5 flex-wrap">
                {item.category && <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">{item.category}</Badge>}
                <Badge variant="outline" className={`text-[10px] border-white/10 ${priorityColors[item.priority] || 'text-white/40'}`}>{item.priority}</Badge>
                <Badge variant="outline" className={`text-[10px] border-white/10 ${statusColors[item.status] || ''}`}>{item.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm ý tưởng mới</DialogTitle><DialogDescription>Ghi nhanh ý tưởng, task, hoặc việc cần làm sau</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Tiêu đề *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nhập tiêu đề..." /></div>
            <div className="space-y-2"><Label>Mô tả</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Môn học</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Chung">Chung</SelectItem>
                    {subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ưu tiên</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cao">Cao</SelectItem>
                    <SelectItem value="trung bình">Trung bình</SelectItem>
                    <SelectItem value="thấp">Thấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Hủy</Button>
            <Button onClick={handleAdd} disabled={createItem.isPending}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Today() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Hôm nay</h1>
        <p className="text-sm text-white/40">Kế hoạch · Nhật ký · Backlog</p>
      </div>

      <Tabs defaultValue="plan">
        <TabsList className="bg-white/[0.04] border border-white/[0.07]">
          <TabsTrigger value="plan" className="gap-2"><Clock className="h-3.5 w-3.5" />Kế hoạch</TabsTrigger>
          <TabsTrigger value="report" className="gap-2"><FileText className="h-3.5 w-3.5" />Nhật ký</TabsTrigger>
          <TabsTrigger value="backlog" className="gap-2"><Archive className="h-3.5 w-3.5" />Backlog</TabsTrigger>
        </TabsList>
        <TabsContent value="plan" className="mt-5"><PlanTab /></TabsContent>
        <TabsContent value="report" className="mt-5"><ReportTab /></TabsContent>
        <TabsContent value="backlog" className="mt-5"><BacklogTab /></TabsContent>
      </Tabs>
    </motion.div>
  )
}
