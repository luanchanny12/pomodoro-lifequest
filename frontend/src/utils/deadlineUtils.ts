import type { DailyMatrixTask, StudyGoal } from '@/services/focusService'
import { parseSafeDate } from '@/utils/dateUtils'

export type DeadlineUrgency = 'overdue' | 'today' | 'urgent' | 'soon' | 'future'

export interface DeadlineItem {
  type: 'goal' | 'task'
  id: number
  title: string
  date: string
  days_left: number
  urgency: DeadlineUrgency
  current_hours: number
  target_hours: number
  progress_percent: number
  category: string
  color: string
  planet_type: string
  notes?: string | null
  quadrant?: number | null
}

export interface DeadlineSummary {
  overdue: number
  today: number
  urgent: number
  soon: number
  future: number
  total_active: number
}

export interface DeadlinesResponse {
  items: DeadlineItem[]
  summary: DeadlineSummary
  fallback?: boolean
}

export function getLocalTodayYmd(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function computeDaysLeft(
  dateInput: string | null | undefined,
  now: Date = new Date()
): number | null {
  const parsed = parseSafeDate(dateInput)
  if (!parsed) return null
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)
  const targetNoon = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0)
  return Math.round((targetNoon.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24))
}

export function classifyUrgency(daysLeft: number): DeadlineUrgency {
  if (daysLeft < 0) return 'overdue'
  if (daysLeft === 0) return 'today'
  if (daysLeft <= 3) return 'urgent'
  if (daysLeft <= 7) return 'soon'
  return 'future'
}

export function buildDeadlinesPayload(
  goals: StudyGoal[] = [],
  matrixTasks: DailyMatrixTask[] = [],
  now: Date = new Date()
): DeadlinesResponse {
  const items: DeadlineItem[] = []

  for (const g of goals) {
    if (g.is_completed || !g.target_date) continue
    const daysLeft = computeDaysLeft(g.target_date, now)
    if (daysLeft === null) continue
    const targetHours = g.target_hours > 0 ? g.target_hours : 1
    const rawPct = Math.round(((g.current_hours || 0) / targetHours) * 100)
    const progressPercent = Math.max(0, Math.min(100, Number.isFinite(rawPct) ? rawPct : 0))

    items.push({
      type: 'goal',
      id: g.id,
      title: g.title,
      date: g.target_date,
      days_left: daysLeft,
      urgency: classifyUrgency(daysLeft),
      current_hours: g.current_hours || 0,
      target_hours: g.target_hours || 1,
      progress_percent: g.progress_percent ?? progressPercent,
      category: g.category || 'Học tập',
      color: g.color || '#f59e0b',
      planet_type: g.planet_type || 'earth',
      notes: g.notes || null,
      quadrant: null,
    })
  }

  for (const t of matrixTasks) {
    if (t.is_completed || !t.date) continue
    // CHỈ HIỂN THỊ Ô 1 (Làm ngay: Quan trọng & Khẩn cấp) theo yêu cầu người dùng
    if (t.quadrant !== 1) continue
    const daysLeft = computeDaysLeft(t.date, now)
    if (daysLeft === null || daysLeft < -30 || daysLeft > 365) continue

    items.push({
      type: 'task',
      id: t.id,
      title: t.title,
      date: t.date,
      days_left: daysLeft,
      urgency: classifyUrgency(daysLeft),
      current_hours: 0,
      target_hours: 1,
      progress_percent: 0,
      category: 'Ma trận Ô 1 (Làm ngay)',
      color: t.goal_color || '#f59e0b',
      planet_type: 'task',
      notes: t.description || null,
      quadrant: 1,
    })
  }

  items.sort((a, b) => {
    if (a.days_left !== b.days_left) return a.days_left - b.days_left
    if (a.type !== b.type) return a.type === 'goal' ? -1 : 1
    return a.id - b.id
  })

  const summary: DeadlineSummary = {
    overdue: items.filter((i) => i.urgency === 'overdue').length,
    today: items.filter((i) => i.urgency === 'today').length,
    urgent: items.filter((i) => i.urgency === 'urgent').length,
    soon: items.filter((i) => i.urgency === 'soon').length,
    future: items.filter((i) => i.urgency === 'future').length,
    total_active: items.length,
  }

  return {
    items,
    summary,
    fallback: true,
  }
}

export interface ParsedScheduleDetails {
  timeRange?: string
  room?: string
  format?: string
  cleanNotes: string
}

export function parseScheduleDetails(notes?: string | null): ParsedScheduleDetails {
  if (!notes || !notes.trim()) {
    return { cleanNotes: '' }
  }

  const raw = notes.trim()
  let timeRange: string | undefined
  let room: string | undefined
  let format: string | undefined

  // Regex time: e.g. "18:50 - 20:20 (Ca 6)" or "07:30 - 09:00"
  const timeMatch = raw.match(/\b(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}(?:\s*\([^\)]+\))?)/i)
  if (timeMatch) {
    timeRange = timeMatch[1].trim()
  }

  // Regex room: e.g. "Phòng A4-201.202" or "A4-201.202" or "Phòng 302"
  const roomMatch = raw.match(/(?:phòng|room|p\.)\s*([A-Za-z0-9\.\-]+)|\b([A-Z]\d{1,2}\s*[-–]\s*[0-9\.]+)\b/i)
  if (roomMatch) {
    room = (roomMatch[1] || roomMatch[2] || '').trim()
    if (room && !room.toLowerCase().startsWith('phòng') && !room.toLowerCase().startsWith('p.')) {
      room = `Phòng ${room}`
    }
  }

  // Regex format: e.g. "Trắc nghiệm kết hợp Tự luận 90p"
  const formatMatch = raw.match(/(trắc nghiệm[^\n|]*|tự luận[^\n|]*|thi viết[^\n|]*|vấn đáp[^\n|]*|\d+\s*phút|\d+p\b)/i)
  if (formatMatch) {
    format = formatMatch[1].trim()
  }

  return {
    timeRange,
    room,
    format,
    cleanNotes: raw,
  }
}

export function groupDeadlinesByDate(items: DeadlineItem[]): Record<string, DeadlineItem[]> {
  const map: Record<string, DeadlineItem[]> = {}
  for (const item of items) {
    if (!item.date) continue
    // Normalize date string YYYY-MM-DD
    const ymd = item.date.slice(0, 10)
    if (!map[ymd]) {
      map[ymd] = []
    }
    map[ymd].push(item)
  }
  return map
}
