import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DailyQuoteCard } from '../components/pomodoro/DailyQuoteCard'
import { AIFloatingBuddy } from '../components/pomodoro/AIFloatingBuddy'
import { EisenhowerMatrixView } from '../components/pomodoro/EisenhowerMatrixView'
import { focusService } from '../services/focusService'

// Mock focusService
vi.mock('../services/focusService', () => ({
  focusService: {
    getGoals: vi.fn().mockResolvedValue([
      { id: 1, title: '1000h Tiếng Anh', current_hours: 10, target_hours: 1000, color: '#E24A4A', is_completed: false },
    ]),
    getMatrixTasks: vi.fn().mockResolvedValue([
      {
        id: 101,
        title: 'Nộp báo cáo môn A',
        quadrant: 1,
        date: '2026-10-27',
        is_completed: false,
        reflection_note: null,
      },
      {
        id: 102,
        title: 'Học lập trình dài hạn',
        quadrant: 2,
        date: '2026-10-27',
        is_completed: true,
        reflection_note: 'Đã hoàn thành tốt',
        goal_title: '1000h Tiếng Anh',
      },
    ]),
    getAIBuddyPrompt: vi.fn().mockResolvedValue({
      message: 'Chào bạn! Cùng làm một hiệp Pomodoro nhé!',
      action_type: 'start_pomodoro',
      action_label: 'Bắt đầu ngay',
      action_target: 'pomodoro',
      mood: 'friendly',
    }),
    toggleMatrixTask: vi.fn().mockImplementation((id) =>
      Promise.resolve({ id, title: 'Test Task', is_completed: true, quadrant: 1 })
    ),
    createMatrixTask: vi.fn().mockImplementation((data) =>
      Promise.resolve({ id: 999, ...data, is_completed: false })
    ),
    updateMatrixReflection: vi.fn().mockResolvedValue({ id: 101, reflection_note: 'Ghi chú mới' }),
    deleteMatrixTask: vi.fn().mockResolvedValue({ message: 'Deleted', id: 101 }),
    rolloverMatrixTasks: vi.fn().mockResolvedValue({ message: 'Đã chuyển việc', count: 1 }),
    getMonthlyMatrixSummary: vi.fn().mockResolvedValue({
      year: 2026,
      month: 10,
      total_tasks: 2,
      completed_tasks: 1,
      completion_rate: 50.0,
      q1_count: 1,
      q1_completed: 0,
      q2_count: 1,
      q2_completed: 1,
      q3_count: 0,
      q3_completed: 0,
      q4_count: 0,
      q4_completed: 0,
      q1_percent: 50.0,
      q2_percent: 50.0,
      q3_percent: 0,
      q4_percent: 0,
      total_big_goals_active: 1,
      total_big_goals_completed: 0,
      reflection_logs: [],
    }),
  },
}))

describe('DailyQuoteCard Component', () => {
  it('renders motivational quote card with quote text and author', () => {
    render(<DailyQuoteCard />)
    expect(screen.getByText(/Buff Động Lực Hôm Nay/i)).toBeInTheDocument()
    // Button "Khác" exists to cycle quote
    const changeBtn = screen.getByRole('button', { name: /Khác/i })
    expect(changeBtn).toBeInTheDocument()
    fireEvent.click(changeBtn)
  })
})

describe('AIFloatingBuddy Component', () => {
  it('renders mascot button and toggles prompt bubble', async () => {
    const handleAction = vi.fn()
    render(<AIFloatingBuddy onAction={handleAction} isTimerRunning={false} />)

    // Mascot button has robot emoji
    const mascotBtn = screen.getByTitle(/Bấm để nhận gợi ý từ AI Bạn Đồng Hành/i)
    expect(mascotBtn).toBeInTheDocument()

    // Click mascot button to trigger fetch & bubble
    fireEvent.click(mascotBtn)

    await waitFor(() => {
      expect(screen.getByText(/AI Bạn Đồng Hành/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Cùng làm một hiệp Pomodoro nhé!/i)).toBeInTheDocument()

    // Click action button inside bubble
    const actionBtn = screen.getByRole('button', { name: /Bắt đầu ngay/i })
    fireEvent.click(actionBtn)
    expect(handleAction).toHaveBeenCalledWith('start_pomodoro', 'pomodoro', undefined)
  })
})

describe('EisenhowerMatrixView Component', () => {
  it('renders all 4 quadrants and displays tasks', async () => {
    render(<EisenhowerMatrixView />)

    // Headers of quadrants
    expect(screen.getByText(/Ma Trận Quản Lý Công Việc 4 Ô/i)).toBeInTheDocument()
    expect(screen.getByText(/Ô 1: Quan Trọng \+ Khẩn Cấp/i)).toBeInTheDocument()
    expect(screen.getByText(/Ô 2: Quan Trọng \+ Chưa Khẩn Cấp/i)).toBeInTheDocument()
    expect(screen.getByText(/Ô 3: Không Quan Trọng \+ Khẩn Cấp/i)).toBeInTheDocument()
    expect(screen.getByText(/Ô 4: Không Quan Trọng \+ Chưa Khẩn Cấp/i)).toBeInTheDocument()

    // Tasks loaded
    await waitFor(() => {
      expect(screen.getByText(/Nộp báo cáo môn A/i)).toBeInTheDocument()
      expect(screen.getByText(/Học lập trình dài hạn/i)).toBeInTheDocument()
    })
  })

  it('switches to tomorrow for night-before planning routine', async () => {
    render(<EisenhowerMatrixView />)

    const tomorrowBtn = screen.getByRole('button', { name: /Ngày mai 🌙/i })
    fireEvent.click(tomorrowBtn)

    await waitFor(() => {
      expect(screen.getByText(/Chế độ Lập Kế Hoạch Tối Hôm Trước/i)).toBeInTheDocument()
    })
  })
})
