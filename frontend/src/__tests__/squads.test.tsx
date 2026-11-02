import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StudySquadModal } from '../components/squads/StudySquadModal'
import { squadService } from '../services/squadService'

vi.mock('../services/squadService', () => ({
  squadService: {
    getMySquads: vi.fn(),
    getPublicSquads: vi.fn(),
    getSquadDetail: vi.fn(),
    getSquadMessages: vi.fn(),
    createSquad: vi.fn(),
    joinSquad: vi.fn(),
    leaveSquad: vi.fn(),
    sendSquadMessage: vi.fn(),
  },
}))

describe('StudySquadModal (Hội Nhóm Học Cùng & Đường Đua F1 Thu Nhỏ)', () => {
  const mockUserGoals = [
    {
      id: 1,
      title: '1000h Tiếng Anh',
      target_hours: 1000,
      current_hours: 150,
      color: '#06b6d4',
      category: 'Tiếng Anh',
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      progress_percent: 15.0,
      remaining_hours: 850,
    },
  ]

  const mockMySquads = [
    {
      id: 101,
      name: 'Chiến Dịch 1000h Tiếng Anh F1',
      target_title: '1000h Tiếng Anh',
      target_hours: 1000,
      category: 'Tiếng Anh',
      icon: '🏎️',
      color: '#06b6d4',
      invite_code: 'SQUAD-EN1000',
      members_count: 2,
      my_progress_percent: 15.0,
      my_current_hours: 150.0,
      user_role: 'leader',
    },
  ]

  const mockSquadDetail = {
    id: 101,
    name: 'Chiến Dịch 1000h Tiếng Anh F1',
    target_title: '1000h Tiếng Anh',
    target_hours: 1000,
    category: 'Tiếng Anh',
    icon: '🏎️',
    color: '#06b6d4',
    description: 'Cùng đua 1000h tiếng anh!',
    invite_code: 'SQUAD-EN1000',
    creator_id: 1,
    created_at: new Date().toISOString(),
    members_count: 2,
    is_member: true,
    user_role: 'leader',
    members: [
      {
        user_id: 2,
        display_name: 'Khánh Ngọc',
        role: 'member',
        vehicle_icon: '🚀',
        goal_id: 2,
        goal_title: '1000h Tiếng Anh',
        current_hours: 230.0,
        target_hours: 1000.0,
        progress_percent: 23.0,
        streak: 5,
        is_current_user: false,
        is_studying: true,
        joined_at: new Date().toISOString(),
      },
      {
        user_id: 1,
        display_name: 'Luân',
        role: 'leader',
        vehicle_icon: '🏎️',
        goal_id: 1,
        goal_title: '1000h Tiếng Anh',
        current_hours: 150.0,
        target_hours: 1000.0,
        progress_percent: 15.0,
        streak: 7,
        is_current_user: true,
        is_studying: false,
        joined_at: new Date().toISOString(),
      },
    ],
  }

  const mockMessages = [
    {
      id: 1,
      squad_id: 101,
      user_id: null,
      sender_name: 'Đường Đua F1 🏁',
      message_type: 'system_join' as const,
      content: 'Chào mừng nhóm được thành lập!',
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      squad_id: 101,
      user_id: 2,
      sender_name: 'Khánh Ngọc',
      message_type: 'text' as const,
      content: 'Chào Luân nhé, tui đang dẫn đầu nè! 🔥',
      created_at: new Date().toISOString(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(squadService.getMySquads).mockResolvedValue(mockMySquads)
    vi.mocked(squadService.getPublicSquads).mockResolvedValue([])
    vi.mocked(squadService.getSquadDetail).mockResolvedValue(mockSquadDetail)
    vi.mocked(squadService.getSquadMessages).mockResolvedValue(mockMessages)
  })

  it('renders squad list and displays my squads with progress', async () => {
    render(
      <StudySquadModal
        isOpen={true}
        onClose={vi.fn()}
        userGoals={mockUserGoals}
        currentUser={{ id: 1, display_name: 'Luân' }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Hội Nhóm Học Cùng & Đua F1')).toBeInTheDocument()
      expect(screen.getByText('Chiến Dịch 1000h Tiếng Anh F1')).toBeInTheDocument()
      expect(screen.getByText(/150.0 \/ 1000h/i)).toBeInTheDocument()
    })
  })

  it('enters squad room and shows Mini-F1 race track with distinct individual progress lanes', async () => {
    render(
      <StudySquadModal
        isOpen={true}
        onClose={vi.fn()}
        userGoals={mockUserGoals}
        currentUser={{ id: 1, display_name: 'Luân' }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Vào Đường Đua & Chat Nhóm/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Vào Đường Đua & Chat Nhóm/i))

    await waitFor(() => {
      expect(screen.getByText(/Đường Đua Mini F1/i)).toBeInTheDocument()
      // Member 1: Khanh Ngoc (23%) appears in track & chat
      expect(screen.getAllByText('Khánh Ngọc').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/230.0/)).toBeInTheDocument()
      // Member 2: Luan (15%)
      expect(screen.getByText(/Luân \(Bạn\)/)).toBeInTheDocument()
      expect(screen.getByText(/150.0/)).toBeInTheDocument()
    })
  })

  it('displays chat messages and allows sending a message', async () => {
    vi.mocked(squadService.sendSquadMessage).mockResolvedValue({
      id: 3,
      squad_id: 101,
      user_id: 1,
      sender_name: 'Luân',
      message_type: 'text',
      content: 'Tui sẽ đuổi kịp sớm thôi! 🏎️',
      created_at: new Date().toISOString(),
    })

    render(
      <StudySquadModal
        isOpen={true}
        onClose={vi.fn()}
        userGoals={mockUserGoals}
        currentUser={{ id: 1, display_name: 'Luân' }}
      />
    )

    await waitFor(() => {
      fireEvent.click(screen.getByText(/Vào Đường Đua & Chat Nhóm/i))
    })

    await waitFor(() => {
      expect(screen.getByText('Chào Luân nhé, tui đang dẫn đầu nè! 🔥')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/Nhập tin nhắn trò chuyện với nhóm học/i)
    fireEvent.change(input, { target: { value: 'Tui sẽ đuổi kịp sớm thôi! 🏎️' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(squadService.sendSquadMessage).toHaveBeenCalledWith(101, 'Tui sẽ đuổi kịp sớm thôi! 🏎️')
    })
  })
})
