import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  SchoolWeeklyTimetable,
  classifyItemSession,
  getMondayOfWeek,
  formatWeekRange,
} from '../components/pomodoro/SchoolWeeklyTimetable'
import { FinanceScheduleHubCard } from '../components/pomodoro/FinanceScheduleHubCard'
import { FinanceScheduleHubModal } from '../components/pomodoro/FinanceScheduleHubModal'
import { focusService } from '../services/focusService'
import type { DeadlineItem, DeadlinesResponse } from '../utils/deadlineUtils'

vi.mock('../services/focusService', () => ({
  focusService: {
    getDeadlines: vi.fn(),
    getFinancialJars: vi.fn(),
    getTetEarningPlan: vi.fn(),
    getDualCoachAdvice: vi.fn(),
    getJarTransactions: vi.fn(),
    getSchoolSchedule: vi.fn(),
    getSchoolSchedules: vi.fn().mockResolvedValue([]),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    createMatrixTask: vi.fn(),
    updateMatrixTask: vi.fn(),
    toggleMatrixTask: vi.fn(),
  },
}))

describe('SchoolWeeklyTimetable Session Classification', () => {
  it('correctly classifies Phenikaa courses and shifts into morning, afternoon, evening', () => {
    // 1. Morning course (07:00 - 09:40)
    const morningClass: DeadlineItem = {
      type: 'school_class',
      id: 'sc1',
      title: '📚 Quản trị dự án CNTT',
      date: '2026-11-19',
      days_left: 0,
      urgency: 'today',
      current_hours: 0,
      target_hours: 2.5,
      progress_percent: 0,
      category: 'Lịch Học',
      color: '#3B82F6',
      planet_type: 'school',
      time_range: '07:00 - 09:40',
      room: 'A4-502',
    }
    expect(classifyItemSession(morningClass)).toBe('morning')

    // 2. Afternoon course (15:35 - 18:15)
    const afternoonClass: DeadlineItem = {
      type: 'school_class',
      id: 'sc2',
      title: '📚 Lập trình phân tích dữ liệu với python',
      date: '2026-11-16',
      days_left: -3,
      urgency: 'past',
      current_hours: 0,
      target_hours: 2.5,
      progress_percent: 100,
      category: 'Lịch Học',
      color: '#3B82F6',
      planet_type: 'school',
      time_range: '15:35 - 18:15',
      room: 'A4-203',
    }
    expect(classifyItemSession(afternoonClass)).toBe('afternoon')

    // 3. Evening course (18:00 - 20:30)
    const eveningClass: DeadlineItem = {
      type: 'school_class',
      id: 'sc3',
      title: '📚 Quản trị dự án CNTT (E-learning)',
      date: '2026-11-19',
      days_left: 0,
      urgency: 'today',
      current_hours: 0,
      target_hours: 2.5,
      progress_percent: 0,
      category: 'Lịch Học',
      color: '#3B82F6',
      planet_type: 'school',
      time_range: '18:00 - 20:30',
      room: 'ONLINE',
    }
    expect(classifyItemSession(eveningClass)).toBe('evening')

    // 4. Gig Shift (10:00 - 14:00)
    const gigShift: DeadlineItem = {
      type: 'gig_shift',
      id: 'gig1',
      title: '🛵 Ca kiếm tiền (10:00 - 14:00)',
      date: '2026-11-19',
      days_left: 0,
      urgency: 'today',
      current_hours: 0,
      target_hours: 4,
      progress_percent: 0,
      category: 'Ca kiếm tiền',
      color: '#10B981',
      planet_type: 'gig',
      time_range: '10:00 - 14:00',
    }
    expect(classifyItemSession(gigShift)).toBe('morning')

    // 5. Daily Task Ô 1 (No specific time)
    const urgentTask: DeadlineItem = {
      type: 'task',
      id: 101,
      title: 'Chép đề cương TMDT',
      date: '2026-11-19',
      days_left: 0,
      urgency: 'today',
      current_hours: 0,
      target_hours: 0,
      progress_percent: 0,
      category: 'Ma trận Ô 1',
      color: '#F59E0B',
      planet_type: 'task',
      quadrant: 1,
    }
    expect(classifyItemSession(urgentTask)).toBe('allday')
  })

  it('calculates Monday of the week correctly', () => {
    // 2026-11-19 is Thursday
    const thursday = new Date(2026, 10, 19) // Month is 0-indexed: 10 = Nov
    const monday = getMondayOfWeek(thursday)
    expect(monday.getDate()).toBe(16)
    expect(monday.getMonth()).toBe(10)

    const formatted = formatWeekRange(monday)
    expect(formatted).toContain('16/11')
    expect(formatted).toContain('22/11/2026')
  })
})

describe('SchoolWeeklyTimetable Component', () => {
  const sampleItems: DeadlineItem[] = [
    {
      type: 'school_class',
      id: 'sc1',
      title: '📚 Quản trị dự án CNTT',
      date: '2026-11-19',
      days_left: 0,
      urgency: 'today',
      current_hours: 0,
      target_hours: 2.5,
      progress_percent: 0,
      category: 'Lịch Học - Đại học Phenikaa',
      color: '#3B82F6',
      planet_type: 'school',
      time_range: '07:00 - 09:40',
      room: 'A4-502 (TH)',
      notes: 'Phòng: A4-502 (TH) | Giờ học: 07:00 - 09:40 | GV: Thầy Nguyễn Văn Hùng',
    },
    {
      type: 'gig_shift',
      id: 'gig1',
      title: '🛵 Ca kiếm tiền (10:00 - 14:00)',
      date: '2026-11-19',
      days_left: 0,
      urgency: 'today',
      current_hours: 0,
      target_hours: 4,
      progress_percent: 0,
      category: 'Ca kiếm tiền',
      color: '#10B981',
      planet_type: 'gig',
      time_range: '10:00 - 14:00',
    },
  ]

  it('renders weekly timetable matrix with Phenikaa course and shift', () => {
    render(
      <SchoolWeeklyTimetable
        items={sampleItems}
        todayYmd="2026-11-19"
      />
    )

    // Check headings for 3 academic sessions
    expect(screen.getByText(/Buổi Sáng/i)).toBeInTheDocument()
    expect(screen.getByText(/Buổi Chiều/i)).toBeInTheDocument()
    expect(screen.getByText(/Buổi Tối/i)).toBeInTheDocument()

    // Check course details rendered
    expect(screen.getAllByText(/Quản trị dự án CNTT/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/A4-502 \(TH\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Thầy Nguyễn Văn Hùng/i)).toBeInTheDocument()

    // Check gig shift
    expect(screen.getAllByText(/Ca kiếm tiền/i).length).toBeGreaterThanOrEqual(1)
  })
})

describe('FinanceScheduleHubCard & Modal', () => {
  const sampleDeadlines: DeadlinesResponse = {
    items: [
      {
        type: 'school_class',
        id: 'sc1',
        title: '📚 Lập trình Python',
        date: '2026-11-19',
        days_left: 0,
        urgency: 'today',
        current_hours: 0,
        target_hours: 2.5,
        progress_percent: 0,
        category: 'Lịch Học',
        color: '#3B82F6',
        planet_type: 'school',
        time_range: '15:35 - 18:15',
        room: 'A4-203',
      },
    ],
    summary: {
      overdue: 0,
      today: 1,
      urgent: 0,
      soon: 0,
      future: 0,
      total_active: 1,
    },
  }

  beforeEach(() => {
    vi.mocked(focusService.getFinancialJars).mockResolvedValue([
      {
        id: 1,
        jar_type: 'TET',
        name: 'Hũ Về Quê Đón Tết',
        current_balance: 5400000,
        target_amount: 15000000,
        progress_percent: 36,
        color: '#F59E0B',
        icon: '🧧',
      },
      {
        id: 2,
        jar_type: 'LIVING',
        name: 'Hũ Sinh Hoạt',
        current_balance: 1500000,
        target_amount: 3000000,
        progress_percent: 50,
        color: '#10B981',
        icon: '🍲',
      },
    ])
    vi.mocked(focusService.getTetEarningPlan).mockResolvedValue({
      id: 1,
      plan_name: 'Kế hoạch Tết 2027',
      tet_target_amount: 15000000,
      current_savings: 5400000,
      daily_target_needed: 260000,
      today_earned: 0,
      is_target_met_today: false,
      tet_date: '2027-02-06',
      days_remaining: 78,
      daily_shift_start: '10:00',
      daily_shift_end: '14:00',
      home_arrival_time: '15:00',
      shift_name: 'Ca chạy trưa kiếm tiền',
      shift_enabled: true,
      is_active: true,
    })
  })

  it('renders compact hub card with today schedule and open button', () => {
    const onOpenHubModal = vi.fn()
    render(
      <FinanceScheduleHubCard
        isAuthenticated={true}
        deadlinesData={sampleDeadlines}
        onRefreshDeadlines={vi.fn()}
        onOpenHubModal={onOpenHubModal}
      />
    )

    expect(screen.getByText(/Tài Chính & Thời Khóa Biểu/i)).toBeInTheDocument()
    expect(screen.getByText(/Mở Trung Tâm Toàn Năng 🚀/i)).toBeInTheDocument()

    const openBtn = screen.getByRole('button', { name: /Mở Trung Tâm Toàn Năng 🚀/i })
    fireEvent.click(openBtn)
    expect(onOpenHubModal).toHaveBeenCalledWith('schedule')
  })

  it('renders hub modal and allows switching between tabs', () => {
    const onClose = vi.fn()
    render(
      <FinanceScheduleHubModal
        isOpen={true}
        onClose={onClose}
        initialTab="schedule"
        isAuthenticated={true}
        deadlinesData={sampleDeadlines}
        onRefreshDeadlines={vi.fn()}
      />
    )

    expect(screen.getByText(/Trung Tâm Quản Lý Tài Chính & Lịch Học/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thời Khóa Biểu & Lịch Thi/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hũ Tài Chính & Mục Tiêu Tết/i })).toBeInTheDocument()

    // Switch to Finance tab
    const financeTabBtn = screen.getByRole('button', { name: /Hũ Tài Chính & Mục Tiêu Tết/i })
    fireEvent.click(financeTabBtn)
  })
})
