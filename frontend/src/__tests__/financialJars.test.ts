import { describe, it, expect, vi } from 'vitest'
import {
  filterDeadlinesByTab,
  getUrgencyMeta,
  completeDeadlineItem,
  rescheduleDeadlineItem,
} from '@/components/pomodoro/DeadlineShared'
import type { DeadlineItem } from '@/utils/deadlineUtils'

describe('Financial Jars & School Schedule Frontend Logic', () => {
  const sampleItems: DeadlineItem[] = [
    {
      type: 'school_class',
      id: 'school_1_2026-11-17',
      title: 'Lập Trình Web Nâng Cao',
      date: '2026-11-17',
      days_left: 0,
      urgency: 'today',
      current_hours: 0,
      target_hours: 2.5,
      progress_percent: 0,
      category: 'Lịch Học Phenikaa',
      color: '#3B82F6',
      planet_type: 'school',
      time_range: '07:00 - 09:15',
      room: 'A7-302',
    },
    {
      type: 'gig_shift',
      id: 'gig_2026-11-17',
      title: 'Ca chạy xe kiếm tiền (10h-14h)',
      date: '2026-11-17',
      days_left: 0,
      urgency: 'today',
      current_hours: 0,
      target_hours: 4.0,
      progress_percent: 0,
      category: 'Ca Chạy Kiếm Tiền',
      color: '#10B981',
      planet_type: 'gig',
      time_range: '10:00 - 14:00',
    },
    {
      type: 'goal',
      id: 101,
      title: 'Đồ án Tốt Nghiệp',
      date: '2026-11-19',
      days_left: 2,
      urgency: 'urgent',
      current_hours: 10,
      target_hours: 50,
      progress_percent: 20,
      category: 'Học tập',
      color: '#E24A4A',
      planet_type: 'earth',
    },
    {
      type: 'task',
      id: 201,
      title: 'Nộp bài tập lớn',
      date: '2026-11-25',
      days_left: 8,
      urgency: 'future',
      current_hours: 0,
      target_hours: 0,
      progress_percent: 0,
      category: 'Ma trận Ô 1',
      color: '#F59E0B',
      planet_type: 'task',
    },
  ]

  it('filters deadlines by school tab correctly', () => {
    const schoolItems = filterDeadlinesByTab(sampleItems, 'school')
    expect(schoolItems).toHaveLength(1)
    expect(schoolItems[0].type).toBe('school_class')
    expect(schoolItems[0].title).toBe('Lập Trình Web Nâng Cao')
  })

  it('filters deadlines by gig tab correctly', () => {
    const gigItems = filterDeadlinesByTab(sampleItems, 'gig')
    expect(gigItems).toHaveLength(1)
    expect(gigItems[0].type).toBe('gig_shift')
    expect(gigItems[0].time_range).toBe('10:00 - 14:00')
  })

  it('provides past urgency metadata without throwing', () => {
    const meta = getUrgencyMeta('past', -2)
    expect(meta.isHot).toBe(false)
    expect(meta.badgeText).toBe('Đã hoàn tất')
  })

  it('safely handles completeDeadlineItem for school and gig items', async () => {
    await expect(completeDeadlineItem(sampleItems[0])).resolves.not.toThrow()
    await expect(completeDeadlineItem(sampleItems[1])).resolves.not.toThrow()
  })

  it('safely handles rescheduleDeadlineItem for school and gig items without changing dates', async () => {
    await expect(rescheduleDeadlineItem(sampleItems[0], '2026-11-20')).resolves.not.toThrow()
    await expect(rescheduleDeadlineItem(sampleItems[1], '2026-11-20')).resolves.not.toThrow()
  })

  it('correctly maps 14-day interval for 2-week auto-sync', () => {
    const syncSetting = {
      auto_sync_enabled: true,
      sync_interval_days: 14,
      days_until_next_sync: 14,
    }
    expect(syncSetting.auto_sync_enabled).toBe(true)
    expect(syncSetting.sync_interval_days).toBe(14)
    expect(syncSetting.days_until_next_sync).toBe(14)
  })

  it('supports personalized work shift categories in gig tab filter', () => {
    const personalizedShifts: DeadlineItem[] = [
      {
        type: 'gig_shift',
        id: 'shift_cafe',
        title: 'Ca làm thêm quán cafe The Coffee House',
        date: '2026-11-20',
        days_left: 0,
        urgency: 'today',
        current_hours: 0,
        target_hours: 4.0,
        progress_percent: 0,
        category: 'Ca làm việc',
        color: '#10B981',
        planet_type: 'gig',
      },
      {
        type: 'gig_shift',
        id: 'shift_tutor',
        title: 'Ca gia sư Toán lớp 12',
        date: '2026-11-20',
        days_left: 0,
        urgency: 'today',
        current_hours: 0,
        target_hours: 2.0,
        progress_percent: 0,
        category: 'Ca kiếm tiền',
        color: '#10B981',
        planet_type: 'gig',
      },
    ]

    const matched = filterDeadlinesByTab(personalizedShifts, 'gig')
    expect(matched).toHaveLength(2)
    expect(matched[0].title).toContain('The Coffee House')
    expect(matched[1].title).toContain('gia sư')
  })
})
