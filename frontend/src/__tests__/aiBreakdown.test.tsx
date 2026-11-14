import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AIBreakdownModal } from '../components/pomodoro/AIBreakdownModal'
import { DeadlineHomeSection } from '../components/pomodoro/DeadlineHomeSection'
import { focusService } from '../services/focusService'

vi.mock('../services/focusService', () => ({
  focusService: {
    getDeadlines: vi.fn(),
    previewAIBreakdown: vi.fn(),
    applyAIBreakdown: vi.fn(),
    rollbackAIBreakdown: vi.fn(),
    getAIBreakdownHistory: vi.fn(),
    parseScheduleText: vi.fn(),
    importTasksBulk: vi.fn(),
    createGoal: vi.fn(),
    createMatrixTask: vi.fn(),
  },
}))

vi.mock('../services/notificationService', () => ({
  notificationService: {
    sendDeadlineReminder: vi.fn(),
  },
}))

describe('AIBreakdownModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(focusService.getAIBreakdownHistory).mockResolvedValue([])
  })

  it('renders modal when isOpen is true and switches tabs', () => {
    render(
      <AIBreakdownModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    expect(screen.getByText(/AI Chia Nhỏ Deadline & Lên Lịch Tự Động/i)).toBeInTheDocument()
    expect(screen.getByText(/Mục Tiêu Lớn Cần Phân Rã/i)).toBeInTheDocument()

    // Switch to Import Tab
    const importTabBtn = screen.getByText(/Import CSV \/ JSON & Text/i)
    fireEvent.click(importTabBtn)
    expect(screen.getByText(/Nhập Dữ Liệu Lịch Từ Bên Ngoài/i)).toBeInTheDocument()

    // Switch to History Tab
    const historyTabBtn = screen.getByText(/Lịch Sử & Hoàn Tác/i)
    fireEvent.click(historyTabBtn)
    expect(screen.getByText(/Lịch Sử Các Lần AI Chia Lịch/i)).toBeInTheDocument()
  })

  it('handles breakdown preview and user approval flow', async () => {
    const mockProposal = {
      title: 'Ôn thi Thương mại điện tử',
      target_date: '2026-11-20',
      explanation: 'Chia làm 3 giai đoạn: ôn lý thuyết, giải đề, tổng ôn.',
      days_count: 3,
      tasks: [
        {
          date: '2026-11-17',
          title: 'Giai đoạn 1: Đọc chương 1-3 TMĐT',
          quadrant: 1,
          duration_minutes: 90,
          notes: 'Ô 1: Làm ngay',
        },
        {
          date: '2026-11-18',
          title: 'Giai đoạn 2: Luyện giải đề trắc nghiệm',
          quadrant: 1,
          duration_minutes: 90,
          notes: 'Ô 1: Làm ngay',
        },
      ],
    }

    vi.mocked(focusService.previewAIBreakdown).mockResolvedValueOnce(mockProposal)
    vi.mocked(focusService.applyAIBreakdown).mockResolvedValueOnce({
      ok: true,
      message: 'Đã thêm các nhiệm vụ vào lịch thành công!',
      batch_id: 'batch_test_123',
      created_count: 2,
    })

    const handleSuccess = vi.fn()
    const handleClose = vi.fn()

    render(
      <AIBreakdownModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    )

    // Fill title
    const input = screen.getByPlaceholderText(/VD: Ôn thi Cuối Kỳ: Thương mại điện tử/i)
    fireEvent.change(input, { target: { value: 'Ôn thi Thương mại điện tử' } })

    // Click preview button
    const previewBtn = screen.getByText(/Phân Tích & Lập Đề Xuất/i)
    fireEvent.click(previewBtn)

    await waitFor(() => {
      expect(focusService.previewAIBreakdown).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ôn thi Thương mại điện tử',
          quadrant: 1,
        })
      )
    })

    // Expect proposal explanation to show
    expect(await screen.findByText(/Chia làm 3 giai đoạn: ôn lý thuyết/i)).toBeInTheDocument()
    expect(screen.getByText(/Đồng Ý & Đẩy Lên Lịch/i)).toBeInTheDocument()

    // User approves
    const approveBtn = screen.getByText(/Đồng Ý & Đẩy Lên Lịch/i)
    fireEvent.click(approveBtn)

    await waitFor(() => {
      expect(focusService.applyAIBreakdown).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ôn thi Thương mại điện tử',
          tasks: expect.arrayContaining([
            expect.objectContaining({ title: 'Giai đoạn 1: Đọc chương 1-3 TMĐT' }),
          ]),
        })
      )
      expect(handleSuccess).toHaveBeenCalledWith('batch_test_123')
      expect(handleClose).toHaveBeenCalled()
    })
  })

  it('allows 1-click rollback in History tab', async () => {
    const mockLogs = [
      {
        batch_id: 'batch_xyz_789',
        title: 'Đề án Tốt nghiệp',
        target_date: '2026-11-30',
        task_count: 4,
        is_reverted: false,
        created_at: '2026-11-15T02:00:00Z',
      },
    ]

    vi.mocked(focusService.getAIBreakdownHistory).mockResolvedValueOnce(mockLogs)
    vi.mocked(focusService.rollbackAIBreakdown).mockResolvedValueOnce({
      ok: true,
      message: 'Đã hoàn tác thành công!',
      deleted_count: 4,
      batch_id: 'batch_xyz_789',
    })

    render(
      <AIBreakdownModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    // Switch to history tab
    fireEvent.click(screen.getByText(/Lịch Sử & Hoàn Tác/i))

    expect(await screen.findByText(/Đề án Tốt nghiệp/i)).toBeInTheDocument()
    const rollbackBtn = screen.getByText(/Hoàn tác lần này/i)
    fireEvent.click(rollbackBtn)

    await waitFor(() => {
      expect(focusService.rollbackAIBreakdown).toHaveBeenCalledWith('batch_xyz_789')
    })
  })
})

describe('DeadlineHomeSection with AI button', () => {
  it('opens AI Breakdown modal when clicking AI Chia Nhỏ button', () => {
    const mockData = {
      items: [],
      summary: {
        overdue: 0,
        today: 0,
        urgent: 0,
        soon: 0,
        future: 0,
        total_active: 0,
      },
    }

    render(
      <DeadlineHomeSection
        isAuthenticated={true}
        data={mockData}
        onRefresh={vi.fn()}
        onOpenCalendarModal={vi.fn()}
      />
    )

    const aiBtn = screen.getByText(/✨ AI Chia Nhỏ/i)
    expect(aiBtn).toBeInTheDocument()

    fireEvent.click(aiBtn)
    expect(screen.getByText(/AI Chia Nhỏ Deadline & Lên Lịch Tự Động/i)).toBeInTheDocument()
  })
})
