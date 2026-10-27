import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, CheckCircle2, Circle, Target, Sparkles, Brain, AlertCircle, MessageCircle, Flame, Shield, Swords, ShoppingBag, User, BarChart3, CalendarCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { ExpBar } from '@/components/gamification/ExpBar'
import { usePlayer } from '@/hooks/usePlayer'
import { useGoals } from '@/services/goalService'
import { useTasks, useUpdateTask } from '@/services/taskService'
import { useProactiveDashboard, useV2Coach, useV2Priority, useV2Focus, useV2Quests, useV2Bosses, useV2Avatar, useV2SpacedRepetition, useDigitalTwin, useRisks, useHabits, useDismissCoach, useCheckQuests } from '@/services/aiService'
import { useTodaySchedule, useWeekSchedule, useToggleSlotDone, useMoveSlot } from '@/services/scheduleService'

type TimeOfDay = 'sang' | 'chieu' | 'toi'
const GREETINGS: Record<TimeOfDay, { text: string }> = { sang: { text: 'Chào buổi sáng' }, chieu: { text: 'Chào buổi chiều' }, toi: { text: 'Chào buổi tối' } }

function getVietnameseDate() {
  const now = new Date()
  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
  const hour = now.getHours()
  const period: TimeOfDay = hour >= 5 && hour < 12 ? 'sang' : hour >= 12 && hour < 18 ? 'chieu' : 'toi'
  return { date: `${dayNames[now.getDay()]}, ngày ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`, period }
}

function LifeScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500'
  return (
    <Card><CardContent className="p-5 flex flex-col items-center gap-1">
      <p className="text-xs text-muted-foreground">Life Score</p>
      <div className="relative flex items-center justify-center w-20 h-20">
        <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6"
            strokeDasharray={`${(score / 100) * 213.6} 213.6`} strokeLinecap="round" className={color} />
        </svg>
        <span className={`text-xl font-bold z-10 ${color}`}>{score}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{score >= 80 ? 'Tuyệt vời' : score >= 60 ? 'Khá tốt' : 'Cần cố gắng'}</span>
    </CardContent></Card>
  )
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    high: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: '🔴 High Risk' },
    medium: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: '🟡 Medium Risk' },
    low: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: '🟢 Low Risk' },
  }
  const m = map[risk] || map.low
  return <span className={`text-xs px-2 py-0.5 rounded-full ${m.color} ${m.bg}`}>{m.label}</span>
}

export default function Dashboard() {
  const todayStr = new Date().toISOString().split('T')[0]
  const now = new Date()
  const currentHour = now.getHours()
  const { data: player } = usePlayer()
  const { data: goals } = useGoals()
  const { data: todayTasks } = useTasks(todayStr)
  const updateTask = useUpdateTask()
  const { data: dashboard } = useProactiveDashboard()
  const { data: coachMessages } = useV2Coach()
  const { data: priorities } = useV2Priority()
  const { data: focusData } = useV2Focus()
  const { data: quests } = useV2Quests()
  const { data: bosses } = useV2Bosses()
  const { data: avatar } = useV2Avatar()
  const { data: reviews } = useV2SpacedRepetition()
  const { data: twin } = useDigitalTwin()
  const { data: risks } = useRisks()
  const { data: habits } = useHabits()
  const dismissCoach = useDismissCoach()
  const checkQuests = useCheckQuests()

  const [clock, setClock] = useState(() => { const n = new Date(); const { date, period } = getVietnameseDate(); return { time: n.toLocaleTimeString('vi-VN'), date, period } })
  const [toggling, setToggling] = useState<Set<number>>(new Set())

  useEffect(() => {
    const t = setInterval(() => { const n = new Date(); const { date, period } = getVietnameseDate(); setClock({ time: n.toLocaleTimeString('vi-VN'), date, period }) }, 1000)
    return () => clearInterval(t)
  }, [])

  const greeting = GREETINGS[clock.period]
  const lifeScore = dashboard?.life_score ?? (player ? Math.min(100, Math.round((player.level / 10) * 30 + (player.streak / 30) * 30 + (player.exp / (player.exp_to_next || 1)) * 20 + (player.coins / 1000) * 20)) : 0)
  const focusScore = focusData?.score ?? dashboard?.focus_score ?? 0

  const incompleteTasks = todayTasks?.filter(t => t.status !== 'hoàn thành' && t.start_time) ?? []
  const lateTasks = incompleteTasks.filter(t => t.start_time && t.start_time < `${String(currentHour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)

  async function handleToggleTask(taskId: number, currentStatus: string) {
    setToggling(p => new Set(p).add(taskId))
    try { await updateTask.mutateAsync({ id: taskId, status: currentStatus === 'hoàn thành' ? 'chưa làm' : 'hoàn thành' } as any) }
    finally { setToggling(p => { const n = new Set(p); n.delete(taskId); return n }) }
  }

  const activeQuests = quests?.filter(q => !q.is_completed) ?? []
  const activeBoss = bosses?.find(b => !b.is_defeated)
  const { data: todaySchedule } = useTodaySchedule()
  const { data: weekSchedule } = useWeekSchedule()
  const toggleSlot = useToggleSlotDone()
  const moveSlot = useMoveSlot()
  const [dragSlotId, setDragSlotId] = useState<number | null>(null)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="glass-strong rounded-3xl p-6 md:p-8 relative overflow-hidden min-h-[200px] flex items-center">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            background: 'radial-gradient(ellipse at 20% 50%, #00E5FF 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, #6C63FF 0%, transparent 60%)',
          }}
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-4xl font-bold font-display">{greeting.text}</h1>
              {avatar && (
                <Badge variant="outline" className="gap-1 border-[#00E5FF]/30 text-[#00E5FF] bg-[#00E5FF]/5 text-[10px]">
                  <User className="h-3 w-3" /> {avatar.evolution_label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono">{clock.date}</p>
            {coachMessages && coachMessages[0] && (
              <div className="flex items-start gap-2 mt-3 max-w-md">
                <Brain className="h-4 w-4 text-[#00E5FF] mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground/80 italic">{coachMessages[0].content}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <LifeScoreGauge score={lifeScore} />
            {player && (
              <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#6C63FF] text-[10px] font-bold text-white shadow-glow">
                    {player.level}
                  </div>
                  <div className="min-w-[100px]">
                    <ExpBar current={player.exp} total={player.exp_to_next} showLabel={false} />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <span className="text-[#FFD700] text-xs mr-0.5">◆</span>
                  <span>{player.coins}</span>
                </div>
                {player.streak > 0 && (
                  <div className="flex items-center gap-1 text-sm font-medium text-[#00E5FF]">
                    <Flame className="h-3.5 w-3.5" /> {player.streak}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Widget - Today */}
      {todaySchedule && todaySchedule.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#00E5FF]" /> Lịch học hôm nay
          </h2>
          <div className="grid gap-2">
            {todaySchedule.map(slot => (
              <div
                key={slot.id}
                onClick={() => toggleSlot.mutate(slot.id)}
                className={`flex items-center gap-4 rounded-xl border p-3 cursor-pointer transition-all ${slot.is_done ? 'opacity-50 border-white/[0.05] bg-white/[0.01]' : 'border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06]'}`}
              >
                <div className="h-4 w-4 rounded-full shrink-0 border-2" style={{ borderColor: slot.subject_color, backgroundColor: slot.is_done ? slot.subject_color : 'transparent' }} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium text-white ${slot.is_done ? 'line-through opacity-60' : ''}`}>{slot.subject_name}</p>
                  <p className="text-xs text-white/40">{slot.start_time} • {slot.duration_min} phút</p>
                </div>
                {slot.is_done && <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />}
              </div>
            ))}
          </div>
        </section>
      )}

          {/* Weekly Schedule Grid */}
          {weekSchedule && weekSchedule.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-[#6C63FF]" /> Lịch học tuần này
              </h2>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(); d.setDate(d.getDate() + i)
                  const dateStr = d.toISOString().split('T')[0]
                  const dayName = ['CN','T2','T3','T4','T5','T6','T7'][d.getDay()]
                  const daySlots = weekSchedule.filter(s => s.date === dateStr)
                  const isToday = i === 0
                  return (
                    <div
                      key={i}
                      className={`rounded-xl p-2 text-center border transition-all ${isToday ? 'border-[#00E5FF]/30 bg-[#00E5FF]/[0.06]' : 'border-white/[0.05] bg-white/[0.01]'} ${dragSlotId ? 'border-dashed' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); if (dragSlotId) e.currentTarget.style.borderColor = '#00E5FF' }}
                      onDragLeave={(e) => { e.currentTarget.style.borderColor = '' }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.currentTarget.style.borderColor = ''
                        const slotId = dragSlotId
                        if (slotId) {
                          const slot = weekSchedule.find(s => s.id === slotId)
                          if (slot && slot.date !== dateStr) {
                            moveSlot.mutate({ slotId, date: dateStr })
                          }
                        }
                        setDragSlotId(null)
                      }}
                    >
                      <p className={`text-[10px] font-medium mb-1 ${isToday ? 'text-[#00E5FF]' : 'text-white/40'}`}>{dayName}</p>
                      <p className={`text-[10px] mb-2 ${isToday ? 'text-white/60' : 'text-white/30'}`}>{String(d.getDate()).padStart(2,'0')}</p>
                      <div className="space-y-1">
                        {daySlots.length === 0 ? (
                          <div className="h-1 rounded-full bg-white/[0.05]" />
                        ) : daySlots.map(s => (
                          <div
                            key={s.id}
                            draggable
                            onDragStart={() => setDragSlotId(s.id)}
                            onDragEnd={() => setDragSlotId(null)}
                            className={`h-1.5 rounded-full cursor-grab active:cursor-grabbing ${dragSlotId === s.id ? 'opacity-30' : ''}`}
                            style={{ backgroundColor: s.subject_color + (s.is_done ? '60' : 'CC') }}
                            title={`${s.subject_name} - ${s.start_time} (${s.duration_min}ph)`}
                          />
                        ))}
                      </div>
                      {daySlots.length > 0 && <p className="text-[9px] text-white/30 mt-1">{daySlots.length} môn</p>}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

      {/* Prompt when no schedule */}
      {(!todaySchedule || todaySchedule.length === 0) && (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] p-6 text-center">
          <CalendarCheck className="h-8 w-8 mx-auto text-white/20 mb-2" />
          <p className="text-sm text-white/40">Chưa có lịch học nào hôm nay</p>
          <p className="text-xs text-white/25 mt-1">Nhắn với AI Coach: "tôi có môn X trong Y tuần" để tạo lịch học!</p>
        </div>
      )}

      {coachMessages && coachMessages.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex gap-3">
            <MessageCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{coachMessages[0].title}</p>
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{coachMessages[0].content}</p>
              <div className="flex gap-2 mt-2">
                {coachMessages[0].action_url && <Button size="sm" variant="outline" asChild><Link to={coachMessages[0].action_url}>{coachMessages[0].action_label || 'Xem'}</Link></Button>}
                <Button size="sm" variant="ghost" onClick={() => dismissCoach.mutate(coachMessages[0].id)}>Đã hiểu</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-red-500" /> Risk & Priority</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {risks?.map(r => (
                <Card key={r.goal_type} className={`border-l-4 ${r.risk === 'high' ? 'border-l-red-500' : r.risk === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{r.goal_type.toUpperCase()}</span>
                      <RiskBadge risk={r.risk} />
                    </div>
                    <p className="text-xs text-muted-foreground">{r.message}</p>
                    <div className="flex justify-between text-xs">
                      <span>Pace: {r.current_pace}h/ngày</span>
                      <span>Deadline: {r.deadline_days} ngày</span>
                    </div>
                    <Progress value={Math.min(100, r.score)} className="h-1.5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Brain className="h-5 w-5 text-purple-500" /> AI Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Focus Score</p>
                <p className={`text-2xl font-bold ${focusScore >= 70 ? 'text-green-500' : focusScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>{focusScore}/100</p>
                {focusData && <p className="text-xs text-muted-foreground">Ngủ: {focusData.sleep_hours}h • Học: {focusData.total_study_minutes}ph</p>}
              </CardContent></Card>
              <Card><CardContent className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Ôn tập hôm nay</p>
                <p className="text-2xl font-bold">{reviews?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">khái niệm cần ôn</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Priority</p>
                {priorities?.slice(0, 3).map((p, i) => (
                  <div key={p.goal_type} className="flex items-center justify-between text-xs">
                    <span>{['🥇', '🥈', '🥉'][i]} {p.goal_type.toUpperCase()}</span>
                    <span className="font-semibold">{p.score.toFixed(0)}</span>
                  </div>
                ))}
              </CardContent></Card>
            </div>
          </section>

          {habits && habits.habits.length > 0 && (
            <section><h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-yellow-500" /> Thói quen phát hiện</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {habits.habits.map((h: { habit: string; confidence: number }, i: number) => (
                  <Card key={i}><CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0 text-lg">{['🌅', '⏰', '📚', '🚫', '😴'][i] || '💡'}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium">{h.habit}</p><p className="text-xs text-muted-foreground">Độ tin cậy: {Math.round(h.confidence * 100)}%</p></div>
                  </CardContent></Card>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {activeBoss && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Swords className="h-4 w-4 text-red-500" /> Boss: {activeBoss.name}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>{activeBoss.goal_type}</span>
                  <Badge variant="outline">Cấp {activeBoss.difficulty}</Badge>
                </div>
                <Progress value={activeBoss.hp > 0 ? (activeBoss.max_hp - activeBoss.hp) / activeBoss.max_hp * 100 : 0} className="h-2 bg-red-200" />
                <p className="text-xs text-muted-foreground">HP: {activeBoss.hp}/{activeBoss.max_hp}</p>
                <Button size="sm" className="w-full gap-1" asChild><Link to="/today"><Swords className="h-3 w-3" /> Đánh boss</Link></Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Nhiệm vụ hôm nay</CardTitle>
              <CardDescription>{todayTasks?.filter(t => t.status === 'hoàn thành').length ?? 0}/{todayTasks?.length ?? 0} hoàn thành</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {lateTasks.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">Còn <strong>{lateTasks.length}</strong> nhiệm vụ chưa hoàn thành</p>
                </div>
              )}
              {!todayTasks ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border"><Skeleton className="h-5 w-5 rounded mt-0.5" /><div className="flex-1 space-y-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-20" /></div></div>
              )) : todayTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>Chưa có nhiệm vụ</p>
                  <Link to="/today"><Button variant="link" size="sm">Lên kế hoạch</Button></Link>
                </div>
              ) : todayTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleToggleTask(task.id, task.status)}>
                  <div className="mt-0.5">
                    {toggling.has(task.id) ? <Skeleton className="h-5 w-5 rounded" /> :
                      task.status === 'hoàn thành' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'hoàn thành' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1">{task.goal_type}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {activeQuests.length > 0 && (
            <Card><CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Target className="h-5 w-5 text-green-500" /> Quest ({activeQuests.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {activeQuests.slice(0, 3).map(q => (
                  <div key={q.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs"><span className="font-medium truncate">{q.title}</span><span className="text-muted-foreground shrink-0">+{q.exp_reward}EXP</span></div>
                    <Progress value={q.target > 0 ? (q.progress / q.target) * 100 : 0} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">{q.progress}/{q.target}</p>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => checkQuests.mutate()}>Kiểm tra quest</Button>
              </CardContent>
            </Card>
          )}

          {twin && (
            <Card><CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-blue-500" /> Digital Twin</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span>Tốc độ học</span><span className="font-semibold">{twin.learning_speed.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Focus time</span><span className="font-semibold">{twin.focus_time_minutes}ph</span></div>
                <div className="flex justify-between"><span>Năng lượng TB</span><span className="font-semibold">{'⭐'.repeat(twin.avg_daily_energy)}</span></div>
                <div className="flex justify-between"><span>Hiệu suất</span><span className="font-semibold">{Math.round(twin.absorption_rate * 100)}%</span></div>
                <div className="flex justify-between"><span>Nhất quán</span><span className="font-semibold">{Math.round(twin.consistency_score * 100)}%</span></div>
              </CardContent>
            </Card>
          )}

          <section><div className="flex items-center gap-2 mb-3"><Sparkles className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Thao tác nhanh</h2></div>
            <div className="space-y-3">
              {[{ title: 'Lên kế hoạch', link: '/today', icon: Target },
                { title: 'Ghi nhật ký', link: '/today', icon: Sparkles },
                { title: 'Cửa hàng', link: '/statistics', icon: ShoppingBag }, { title: 'Xem thống kê', link: '/statistics', icon: BarChart3 }].map(a => {
                const Icon = a.icon
                return <Link key={a.link} to={a.link}><Card className="group hover:shadow-md transition-all"><CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 group-hover:scale-110 transition-transform shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
                  <div className="flex-1 min-w-0"><p className="font-medium text-sm">{a.title}</p></div>
                </CardContent></Card></Link>
              })}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  )
}