import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlanetBuilderModal } from '../components/pomodoro/PlanetBuilderModal'

vi.mock('../services/focusService', () => ({
  focusService: {
    updatePlanetBuild: vi.fn().mockResolvedValue({ id: 1, planet_data: '[]' }),
  },
}))

vi.mock('../utils/soundEffects', () => ({
  soundManager: {
    playDing: vi.fn(),
  },
}))

describe('PlanetBuilderModal Mobile Tap-Through Defense', () => {
  const mockGoal = {
    id: 1,
    title: 'Học Lập Trình 500 Giờ',
    current_hours: 12.5,
    target_hours: 500,
    planet_type: 'earth',
    planet_data: '[]',
    is_completed: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with grid and items properly', () => {
    render(
      <PlanetBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        goal={mockGoal}
      />
    )

    expect(screen.getByText('Học Lập Trình 500 Giờ')).toBeInTheDocument()
    expect(screen.getByText(/Khu Vực Xây Dựng/i)).toBeInTheDocument()
    expect(screen.getByText(/Codex Thành Tựu/i)).toBeInTheDocument()
  })

  it('prevents accidental close immediately upon mount (within 600ms safety window)', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(
      <PlanetBuilderModal
        isOpen={true}
        onClose={onClose}
        goal={mockGoal}
      />
    )

    // Attempt to click "Đóng" button immediately
    const closeButtons = screen.getAllByRole('button', { name: /Đóng/i })
    fireEvent.click(closeButtons[0])

    // Should NOT close because Date.now() - mountTime < 600ms
    expect(onClose).not.toHaveBeenCalled()

    // Advance time past 600ms window -> now clicking should close properly
    vi.advanceTimersByTime(700)
    fireEvent.click(closeButtons[0])
    expect(onClose).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('handles malformed or string-array planet_data without crashing', () => {
    const malformedGoal = {
      ...mockGoal,
      planet_data: JSON.stringify(['seedling', null, { unexpected: 123 }]),
    }

    render(
      <PlanetBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        goal={malformedGoal}
      />
    )

    expect(screen.getByText('Học Lập Trình 500 Giờ')).toBeInTheDocument()
  })
})
