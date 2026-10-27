import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Clock, BarChart3, Activity, Target, CheckCircle2,
  Swords, Flame, Zap, ShoppingBag, Coins,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { DashboardSkeleton } from '@/components/common/LoadingSkeleton'
import { useV2Heatmap, useV2Quests, useV2Bosses, useV2Shop, useV2Inventory, useV2Avatar, useCheckQuests, useBuyItem, useEquipItem } from '@/services/aiService'
import { useSubjects } from '@/services/scheduleService'
import { usePlayer } from '@/hooks/usePlayer'
import api from '@/services/api'

type Period = 'week' | 'month' | 'year'
const periodLabels: Record<Period, string> = { week: 'Tuần', month: 'Tháng', year: 'Năm' }

function getDateRange(period: Period) {
  const now = new Date()
  const end = now.toISOString().split('T')[0]
  const start = new Date(now)
  if (period === 'week') start.setDate(start.getDate() - 6)
  else if (period === 'month') start.setDate(start.getDate() - 29)
  else { start.setMonth(start.getMonth() - 11); start.setDate(1) }
  return { from: start.toISOString().split('T')[0], to: end }
}

// ─── Tab: Study Hours ─────────────────────────────────────────────────────────
function StudyTab() {
  const [period, setPeriod] = useState<Period>('week')
  const { data: subjects = [] } = useSubjects()
  const { data: studyHours = [], isLoading } = useQuery<any[]>({
    queryKey: ['study-hours'],
    queryFn: () => api.get('/study-hours').then(r => r.data),
  })

  // Build subject-color map from StudySubjects
  const subjectColors = useMemo(() => {
    const palette = ['#00E5FF', '#6C63FF', '#00FFC8', '#FF6B6B', '#FFD700', '#FF9F43', '#48dbfb']
    const map: Record<string, string> = {}
    subjects.forEach((s, i) => { map[s.name] = s.color || palette[i % palette.length] })
    return map
  }, [subjects])

  const subjectNames = subjects.map(s => s.name)

  interface ChartRow { date: string; total: number; [key: string]: any }
  const chartData: ChartRow[] = useMemo(() => {
    const range = getDateRange(period)
    const filtered = studyHours.filter(r => r.date >= range.from && r.date <= range.to)
    const grouped: Record<string, Record<string, number>> = {}
    for (const r of filtered) {
      const key = period === 'year' ? r.date.slice(0, 7) : r.date
      if (!grouped[key]) grouped[key] = { total: 0 }
      const matched = subjectNames.find(n => r.goal_type?.toLowerCase().includes(n.toLowerCase())) || r.goal_type || 'Chung'
      grouped[key][matched] = (grouped[key][matched] || 0) + (r.hours || 0)
      grouped[key].total = (grouped[key].total || 0) + (r.hours || 0)
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, vals]) => ({ date, total: vals.total || 0, ...vals }))
  }, [studyHours, period, subjectNames])

  const totalHours = useMemo(() => studyHours.reduce((s, r) => s + (r.hours || 0), 0), [studyHours])

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="space-y-6">
      {/* Period picker */}
      <div className="flex gap-2">
        {(Object.keys(periodLabels) as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30' : 'bg-white/[0.03] text-white/50 hover:text-white border border-white/[0.05]'}`}>
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-white/[0.07] bg-white/[0.02]">
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-1">Tổng giờ học</p>
            <p className="text-2xl font-bold text-[#00E5FF]">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        {subjects.slice(0, 3).map(s => {
          const hrs = studyHours.filter(r => r.goal_type?.toLowerCase().includes(s.name.toLowerCase())).reduce((sum, r) => sum + (r.hours || 0), 0)
          return (
            <Card key={s.id} className="border-white/[0.07] bg-white/[0.02]">
              <CardContent className="p-4">
                <p className="text-xs text-white/40 mb-1 truncate">{s.name}</p>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{hrs.toFixed(1)}h</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Bar chart */}
      {chartData.length > 0 ? (
        <Card className="border-white/[0.07] bg-white/[0.02]">
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-white/80"><BarChart3 className="h-4 w-4" />Biểu đồ giờ học</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
                <Tooltip contentStyle={{ background: '#0A0F1D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }} />
                <Bar dataKey="total" name="Tổng" fill="#00E5FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <EmptyState icon={BarChart3} title="Chưa có dữ liệu" description="Bắt đầu học và ghi nhận giờ học trong Daily Report!" />
      )}

      {/* Table */}
      {chartData.length > 0 && (
        <Card className="border-white/[0.07] bg-white/[0.02]">
          <CardHeader><CardTitle className="text-base text-white/80 flex items-center gap-2"><Clock className="h-4 w-4" />Chi tiết theo ngày</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06]">
                  <TableHead className="text-white/50">Ngày</TableHead>
                  <TableHead className="text-white/50">Tổng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.slice(-7).map(row => (
                  <TableRow key={row.date} className="border-white/[0.04]">
                    <TableCell className="text-white/70">{row.date}</TableCell>
                    <TableCell className="font-medium text-[#00E5FF]">{Number(row.total || 0).toFixed(1)}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Tab: Heatmap ─────────────────────────────────────────────────────────────
function HeatmapTab() {
  const [days, setDays] = useState(90)
  const { data: entries } = useV2Heatmap(undefined, days)

  const intensityColors = [
    'bg-white/[0.04]',
    'bg-[#00E5FF]/20',
    'bg-[#00E5FF]/40',
    'bg-[#00E5FF]/70',
    'bg-[#00E5FF]',
  ]
  const weeks: any[][] = []
  if (entries) {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
    let week: typeof sorted = []
    const firstDay = new Date(sorted[0]?.date || new Date()).getDay()
    for (let i = 0; i < firstDay; i++) week.push({ date: '', count: 0, intensity: 0 } as any)
    for (const e of sorted) {
      if (week.length >= 7) { weeks.push(week); week = [] }
      week.push(e)
    }
    if (week.length > 0) weeks.push(week)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[30, 90, 365].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${days === d ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30' : 'bg-white/[0.03] text-white/50 hover:text-white border border-white/[0.05]'}`}>
            {d} ngày
          </button>
        ))}
      </div>

      <Card className="border-white/[0.07] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-base text-white/80 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#00E5FF]" /> Hoạt động học tập
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!entries ? (
            <div className="flex items-center justify-center h-32 text-white/30 text-sm">Đang tải...</div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-white/30 text-sm">Chưa có dữ liệu</div>
          ) : (
            <div className="space-y-3 overflow-x-auto">
              <div className="flex flex-wrap gap-[3px]">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((day: any, di: number) => (
                      <div key={di}
                        title={day.date ? `${day.date}: ${day.count} tasks` : ''}
                        className={`w-3 h-3 rounded-sm transition-all ${day.date ? intensityColors[Math.min(day.intensity || 0, 4)] : 'opacity-0'}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/30">
                <span>Ít</span>
                {intensityColors.map((c, i) => <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />)}
                <span>Nhiều</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Quests ──────────────────────────────────────────────────────────────
function QuestsTab() {
  const { data: quests } = useV2Quests()
  const { data: bosses } = useV2Bosses()
  const checkMutation = useCheckQuests()

  const daily = quests?.filter(q => q.quest_type === 'daily') ?? []
  const weekly = quests?.filter(q => q.quest_type === 'weekly') ?? []
  const monthly = quests?.filter(q => q.quest_type === 'monthly') ?? []
  const activeBoss = bosses?.find(b => !b.is_defeated)

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => checkMutation.mutate()} className="gap-2 bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/20">
          <Zap className="h-3.5 w-3.5" /> Cập nhật tiến độ
        </Button>
      </div>

      {activeBoss && (
        <Card className="border-red-500/30 bg-red-500/[0.05]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 shrink-0">
              <Swords className="h-6 w-6 text-red-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white">{activeBoss.name}</p>
              <p className="text-xs text-white/40">Cấp {activeBoss.difficulty} • +{activeBoss.exp_reward}EXP</p>
              <Progress value={activeBoss.max_hp > 0 ? ((activeBoss.max_hp - activeBoss.hp) / activeBoss.max_hp) * 100 : 0} className="h-1.5 mt-2" />
              <p className="text-[10px] text-white/30 mt-1">HP: {activeBoss.hp}/{activeBoss.max_hp}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {[['Hằng ngày', daily, '#00E5FF'], ['Hàng tuần', weekly, '#6C63FF'], ['Hàng tháng', monthly, '#FFD700']].map(([label, items, color]) => (
        <section key={label as string}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: color as string }}>
            <Flame className="h-4 w-4" /> {label as string}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(items as any[]).length === 0 ? (
              <div className="text-xs text-white/30 py-3">Không có quest</div>
            ) : (items as any[]).map(q => (
              <div key={q.id} className={`rounded-xl border p-4 space-y-2 transition-all ${q.is_completed ? 'border-green-500/20 bg-green-500/[0.04] opacity-60' : 'border-white/[0.07] bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white truncate">{q.title}</p>
                  {q.is_completed
                    ? <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    : <Badge variant="outline" className="text-[10px] border-white/10 text-white/40 shrink-0">{q.quest_type}</Badge>
                  }
                </div>
                {q.description && <p className="text-xs text-white/40">{q.description}</p>}
                <Progress value={q.target > 0 ? (q.progress / q.target) * 100 : 0} className="h-1.5" />
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{q.progress}/{q.target}</span>
                  <span className="text-yellow-400">+{q.exp_reward}EXP</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// ─── Tab: Shop ────────────────────────────────────────────────────────────────
function ShopTab() {
  const { data: items } = useV2Shop()
  const { data: inventory } = useV2Inventory()
  const { data: avatar } = useV2Avatar()
  const { data: player } = usePlayer()
  const buyMutation = useBuyItem()
  const equipMutation = useEquipItem()

  const ownedIds = new Set((inventory ?? []).map(i => i.id))
  const equippedIds = new Set((inventory ?? []).filter(i => i.equipped).map(i => i.id))

  return (
    <div className="space-y-5">
      {/* Coins + Avatar */}
      <div className="flex items-center justify-between">
        {avatar && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xl">
              {['👤', '🎓', '🧭', '💼', '🏆', '👑'][avatar.evolution_stage] || '👤'}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{avatar.evolution_label}</p>
              <p className="text-xs text-white/40">Stage {avatar.evolution_stage + 1}/6</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-base font-bold text-yellow-400">
          <Coins className="h-4 w-4" /> {player?.coins ?? 0}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {!items ? Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse">
            <div className="h-12 w-12 rounded-full bg-white/[0.06] mx-auto mb-3" />
            <div className="h-3 w-20 bg-white/[0.06] rounded mx-auto" />
          </div>
        )) : items.map(item => {
          const owned = ownedIds.has(item.id)
          const equipped = equippedIds.has(item.id)
          const canBuy = (player?.coins ?? 0) >= item.price
          return (
            <div key={item.id} className={`rounded-xl border p-4 text-center space-y-2 transition-all ${owned ? 'border-[#6C63FF]/30 bg-[#6C63FF]/[0.04]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
              <div className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl mx-auto ${item.rarity === 'legendary' ? 'bg-yellow-500/20' : item.rarity === 'rare' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                {item.icon || '🎁'}
              </div>
              <p className="text-xs font-semibold text-white">{item.name}</p>
              <div className="flex items-center justify-center gap-1 text-xs text-yellow-400">
                <Coins className="h-3 w-3" />{item.price}
              </div>
              {owned ? (
                <Button size="sm" variant={equipped ? 'default' : 'outline'} className="w-full text-xs h-7"
                  onClick={() => { const inv = inventory?.find(i => i.id === item.id); if (inv) equipMutation.mutate(inv.id) }}
                  disabled={equipMutation.isPending}>
                  {equipped ? '✅ Đang trang bị' : 'Trang bị'}
                </Button>
              ) : (
                <Button size="sm" className="w-full text-xs h-7" onClick={() => buyMutation.mutate(item.id)}
                  disabled={!canBuy || buyMutation.isPending}>
                  {canBuy ? 'Mua' : 'Không đủ'}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Statistics Page ─────────────────────────────────────────────────────
export default function Statistics() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader title="Thống kê & Gamification" description="Theo dõi tiến độ học tập và phần thưởng của bạn" />

      <Tabs defaultValue="study">
        <TabsList className="bg-white/[0.04] border border-white/[0.07]">
          <TabsTrigger value="study" className="gap-2"><BarChart3 className="h-3.5 w-3.5" />Giờ học</TabsTrigger>
          <TabsTrigger value="heatmap" className="gap-2"><Activity className="h-3.5 w-3.5" />Heatmap</TabsTrigger>
          <TabsTrigger value="quests" className="gap-2"><Target className="h-3.5 w-3.5" />Quests</TabsTrigger>
          <TabsTrigger value="shop" className="gap-2"><ShoppingBag className="h-3.5 w-3.5" />Cửa hàng</TabsTrigger>
        </TabsList>

        <TabsContent value="study" className="mt-6"><StudyTab /></TabsContent>
        <TabsContent value="heatmap" className="mt-6"><HeatmapTab /></TabsContent>
        <TabsContent value="quests" className="mt-6"><QuestsTab /></TabsContent>
        <TabsContent value="shop" className="mt-6"><ShopTab /></TabsContent>
      </Tabs>
    </motion.div>
  )
}
