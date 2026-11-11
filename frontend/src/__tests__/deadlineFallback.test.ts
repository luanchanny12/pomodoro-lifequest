import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../services/api'
import { focusService, type DailyMatrixTask, type StudyGoal } from '../services/focusService'
import { buildDeadlinesPayload, computeDaysLeft } from '../utils/deadlineUtils'

describe('deadlineUtils', () => {
  it('computes days_left safely on YYYY-MM-DD without UTC/Safari Invalid Date shifts', () => {
    const fixedNow = new Date(2026, 10, 11, 23, 45, 0) // 2026-11-11 23:45 local
    expect(computeDaysLeft('2026-11-11', fixedNow)).toBe(0)
    expect(computeDaysLeft('2026-11-10', fixedNow)).toBe(-1)
    expect(computeDaysLeft('2026-11-12', fixedNow)).toBe(1)
    expect(computeDaysLeft('not-a-date', fixedNow)).toBeNull()
  })

  it('builds sorted deadlines payload with summary and filters completed items', () => {
    const fixedNow = new Date(2026, 10, 11, 10, 0, 0)
    const goals: StudyGoal[] = [
      {
        id: 1,
        title: 'Goal đã xong',
        target_hours: 10,
        current_hours: 10,
        target_date: '2026-11-11',
        color: '#10b981',
        category: 'Học tập',
        is_completed: true,
        created_at: '2026-11-01',
        updated_at: '2026-11-11',
        progress_percent: 100,
        remaining_hours: 0,
      },
      {
        id: 2,
        title: 'Thi Giải Tích',
        target_hours: 20,
        current_hours: 5,
        target_date: '2026-11-14',
        color: '#f59e0b',
        category: 'Deadline',
        is_completed: false,
        created_at: '2026-11-01',
        updated_at: '2026-11-11',
        progress_percent: 25,
        remaining_hours: 15,
      },
    ]
    const tasks: DailyMatrixTask[] = [
      {
        id: 10,
        title: 'Nộp báo cáo trễ',
        date: '2026-11-09',
        quadrant: 1,
        is_completed: false,
        order_index: 0,
        created_at: '2026-11-09',
        updated_at: '2026-11-09',
      },
      {
        id: 11,
        title: 'Làm bài tập hôm nay',
        date: '2026-11-11',
        quadrant: 1,
        is_completed: false,
        order_index: 1,
        created_at: '2026-11-11',
        updated_at: '2026-11-11',
      },
    ]

    const payload = buildDeadlinesPayload(goals, tasks, fixedNow)
    expect(payload.summary.total_active).toBe(3)
    expect(payload.summary.overdue).toBe(1)
    expect(payload.summary.today).toBe(1)
    expect(payload.summary.urgent).toBe(1)
    expect(payload.items.map((i) => i.title)).toEqual([
      'Nộp báo cáo trễ',
      'Làm bài tập hôm nay',
      'Thi Giải Tích',
    ])
    expect(payload.items[0].urgency).toBe('overdue')
    expect(payload.items[1].urgency).toBe('today')
    expect(payload.items[2].urgency).toBe('urgent')
  })
})

describe('focusService.getDeadlines 404 fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to /focus/goals + /focus/matrix without throwing when /focus/deadlines returns 404 Not Found', async () => {
    vi.spyOn(api, 'get').mockImplementation((url: string) => {
      if (url === '/focus/deadlines') {
        return Promise.reject(new Error('Not Found'))
      }
      if (url === '/focus/goals') {
        return Promise.resolve({
          data: [
            {
              id: 99,
              title: 'Nộp Khóa Luận',
              target_hours: 40,
              current_hours: 10,
              target_date: '2099-12-31',
              color: '#f97316',
              category: 'Deadline',
              is_completed: false,
              created_at: '2026-11-01',
              updated_at: '2026-11-01',
              progress_percent: 25,
              remaining_hours: 30,
            },
          ],
        })
      }
      if (url === '/focus/matrix') {
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })

    const res = await focusService.getDeadlines()
    expect(res.fallback).toBe(true)
    expect(res.items).toHaveLength(1)
    expect(res.items[0].title).toBe('Nộp Khóa Luận')
    expect(res.summary.total_active).toBe(1)
  })
})
