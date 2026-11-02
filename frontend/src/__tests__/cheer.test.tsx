import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CheerCelebrationModal } from '../components/race/CheerCelebrationModal'
import { CheerHistoryModal } from '../components/race/CheerHistoryModal'
import { raceService, CheerItem } from '../services/raceService'

vi.mock('../services/raceService', () => ({
  raceService: {
    getMyRecentCheers: vi.fn(),
    markAllCheersAsRead: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.mock('../utils/soundEffects', () => ({
  soundManager: {
    playConstellationVictory: vi.fn(),
  },
}))

describe('Cheer System (Celebration & History)', () => {
  const mockCheers: CheerItem[] = [
    {
      id: 1,
      sender_id: 2,
      sender_name: 'Admin Luân 👑',
      target_user_id: 1,
      emoji: '🔥',
      message: 'Chúc bạn tập trung bứt phá nhé!',
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      sender_id: 3,
      sender_name: 'Khánh Ngọc',
      target_user_id: 1,
      emoji: '❤️',
      message: 'Cố lên bạn ơi!',
      is_read: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CheerCelebrationModal (When Unread Cheers Exist)', () => {
    it('renders celebration modal with sender, emoji, and message', () => {
      render(
        <CheerCelebrationModal
          isOpen={true}
          cheers={mockCheers}
          onClose={vi.fn()}
          onAcknowledgeAll={vi.fn()}
        />
      )

      expect(screen.getByText('Bạn Được Tiếp Lửa Cổ Vũ!')).toBeInTheDocument()
      expect(screen.getByText('Admin Luân 👑')).toBeInTheDocument()
      expect(screen.getByText(/"Chúc bạn tập trung bứt phá nhé!"/)).toBeInTheDocument()
      expect(screen.getByText(/Nhận năng lượng & Bứt phá ngay!/i)).toBeInTheDocument()
    })

    it('triggers onAcknowledgeAll when accept button is clicked', () => {
      const onAcknowledgeAll = vi.fn()
      render(
        <CheerCelebrationModal
          isOpen={true}
          cheers={mockCheers}
          onClose={vi.fn()}
          onAcknowledgeAll={onAcknowledgeAll}
        />
      )

      fireEvent.click(screen.getByText(/Nhận năng lượng & Bứt phá ngay!/i))
      expect(onAcknowledgeAll).toHaveBeenCalledTimes(1)
    })

    it('triggers onOpenHistory when history link is clicked', () => {
      const onOpenHistory = vi.fn()
      const onAcknowledgeAll = vi.fn()
      render(
        <CheerCelebrationModal
          isOpen={true}
          cheers={mockCheers}
          onClose={vi.fn()}
          onAcknowledgeAll={onAcknowledgeAll}
          onOpenHistory={onOpenHistory}
        />
      )

      const historyBtn = screen.getByText(/Xem Hộp Thư & Toàn Bộ Lời Cổ Vũ/i)
      fireEvent.click(historyBtn)
      expect(onAcknowledgeAll).toHaveBeenCalledTimes(1)
      expect(onOpenHistory).toHaveBeenCalledTimes(1)
    })
  })

  describe('CheerHistoryModal (When Reviewing Past Cheers)', () => {
    it('fetches and displays cheer history, statistics, and filters', async () => {
      vi.mocked(raceService.getMyRecentCheers).mockResolvedValue(mockCheers)

      render(
        <CheerHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          currentUser={{ id: 1, display_name: 'Luân', cheer_count: 10 }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Hộp Thư Tiếp Lửa & Cổ Vũ')).toBeInTheDocument()
      })

      // Check stats
      expect(screen.getByText(/Tổng Lượt Cổ Vũ/i)).toBeInTheDocument()
      expect(screen.getByText(/Người Đã Tiếp Sức/i)).toBeInTheDocument()

      // Check list contains both senders
      expect(screen.getByText('Admin Luân 👑')).toBeInTheDocument()
      expect(screen.getByText('Khánh Ngọc')).toBeInTheDocument()

      // Check filtering: Click "Admin ⭐" filter
      fireEvent.click(screen.getByRole('button', { name: /Admin ⭐/i }))
      expect(screen.getByText('Admin Luân 👑')).toBeInTheDocument()
      expect(screen.queryByText('Khánh Ngọc')).not.toBeInTheDocument()

      // Click "Bạn Bè" filter
      fireEvent.click(screen.getByRole('button', { name: /Bạn Bè/i }))
      expect(screen.getByText('Khánh Ngọc')).toBeInTheDocument()
      expect(screen.queryByText('Admin Luân 👑')).not.toBeInTheDocument()
    })

    it('renders encouraging empty state when there are no cheers', async () => {
      vi.mocked(raceService.getMyRecentCheers).mockResolvedValue([])

      render(
        <CheerHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          currentUser={{ id: 1, display_name: 'Luân', cheer_count: 0 }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Chưa có lời cổ vũ nào trong mục này')).toBeInTheDocument()
      })
    })
  })
})
