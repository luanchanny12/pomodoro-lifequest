import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeadlineAlertBanner } from '../components/pomodoro/DeadlineAlertBanner'
import { DeadlineCalendarModal } from '../components/pomodoro/DeadlineCalendarModal'
import { focusService } from '../services/focusService'

vi.mock('../services/focusService', () => ({
  focusService: {
    getDeadlines: vi.fn(),
  },
}))

describe('DeadlineAlertBanner', () => {
  it('renders correctly when count > 0', () => {
    const handleOpen = vi.fn()
    render(<DeadlineAlertBanner count={3} onOpen={handleOpen} />)

    expect(screen.getByText(/Bạn có 3 hạn chót khẩn cấp/i)).toBeInTheDocument()
    const btn = screen.getByText(/Xem lịch/i)
    fireEvent.click(btn)
    expect(handleOpen).toHaveBeenCalledTimes(1)
  })

  it('does not render when count = 0', () => {
    const { container } = render(<DeadlineAlertBanner count={0} onOpen={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('can be dismissed with close button', () => {
    render(<DeadlineAlertBanner count={2} onOpen={vi.fn()} />)
    expect(screen.getByText(/Bạn có 2 hạn chót khẩn cấp/i)).toBeInTheDocument()
    const closeBtn = screen.getByTitle('Đóng thông báo')
    fireEvent.click(closeBtn)
    expect(screen.queryByText(/Bạn có 2 hạn chót khẩn cấp/i)).not.toBeInTheDocument()
  })
})

describe('DeadlineCalendarModal', () => {
  const mockDeadlines = {
    items: [
      {
        type: 'goal' as const,
        id: 1,
        title: 'Thi Giữa Kỳ Giải Tích',
        date: '2026-11-11',
        days_left: 0,
        urgency: 'today' as const,
        current_hours: 10,
        target_hours: 20,
        progress_percent: 50,
        category: 'Học tập',
        color: '#E24A4A',
        planet_type: 'mars',
      },
      {
        type: 'task' as const,
        id: 2,
        title: 'Nộp Bài Tập Lớn AI',
        date: '2026-11-10',
        days_left: -1,
        urgency: 'overdue' as const,
        current_hours: 0,
        target_hours: 0,
        progress_percent: 0,
        category: 'Ma trận Ô 1',
        color: '#F59E0B',
        planet_type: 'task',
      },
      {
        type: 'goal' as const,
        id: 3,
        title: 'Thi Chứng Chỉ IELTS',
        date: '2026-11-20',
        days_left: 9,
        urgency: 'future' as const,
        current_hours: 30,
        target_hours: 100,
        progress_percent: 30,
        category: 'Ngoại ngữ',
        color: '#3B82F6',
        planet_type: 'earth',
      },
    ],
    summary: {
      overdue: 1,
      today: 1,
      urgent: 2,
      soon: 0,
      future: 1,
      total_active: 3,
    },
  }

  beforeEach(() => {
    vi.mocked(focusService.getDeadlines).mockResolvedValue(mockDeadlines)
  })

  it('renders modal with deadlines items and countdown', async () => {
    const handleClose = vi.fn()
    const handleStartPomodoro = vi.fn()

    render(
      <DeadlineCalendarModal
        isOpen={true}
        onClose={handleClose}
        onStartPomodoro={handleStartPomodoro}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Thi Giữa Kỳ Giải Tích')).toBeInTheDocument()
      expect(screen.getByText('Nộp Bài Tập Lớn AI')).toBeInTheDocument()
      expect(screen.getByText('Thi Chứng Chỉ IELTS')).toBeInTheDocument()
    })

    // Check countdown badges
    expect(screen.getByText('HÔM NAY HẾT HẠN!')).toBeInTheDocument()
    expect(screen.getByText('Quá hạn 1 ngày')).toBeInTheDocument()
    expect(screen.getByText('Còn 9 ngày')).toBeInTheDocument()

    // Test start pomodoro action
    const startBtn = screen.getAllByText('Bắt đầu Pomodoro')[0]
    fireEvent.click(startBtn)
    expect(handleStartPomodoro).toHaveBeenCalledWith(1)
    expect(handleClose).toHaveBeenCalled()
  })

  it('filters items when switching tabs', async () => {
    render(
      <DeadlineCalendarModal
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Thi Giữa Kỳ Giải Tích')).toBeInTheDocument()
    })

    // Click Urgent tab (days_left <= 3)
    const urgentTab = screen.getByRole('button', { name: /Khẩn cấp/i })
    fireEvent.click(urgentTab)

    expect(screen.getByText('Thi Giữa Kỳ Giải Tích')).toBeInTheDocument()
    expect(screen.getByText('Nộp Bài Tập Lớn AI')).toBeInTheDocument()
    expect(screen.queryByText('Thi Chứng Chỉ IELTS')).not.toBeInTheDocument()

    // Click Future tab (> 7 days)
    const futureTab = screen.getByRole('button', { name: /Xa hơn/i })
    fireEvent.click(futureTab)

    expect(screen.queryByText('Thi Giữa Kỳ Giải Tích')).not.toBeInTheDocument()
    expect(screen.getByText('Thi Chứng Chỉ IELTS')).toBeInTheDocument()
  })
})
