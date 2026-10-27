import { describe, it, expect, vi, beforeEach } from 'vitest'
import { focusService } from '../services/focusService'
import api from '../services/api'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('focusService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Goals
  it('calls getGoals with proper params', async () => {
    const mockGoals = [{ id: 1, title: '1000h Tiếng Anh', target_hours: 1000 }]
    ;(api.get as any).mockResolvedValueOnce({ data: mockGoals })

    const res = await focusService.getGoals(true)
    expect(api.get).toHaveBeenCalledWith('/focus/goals', { params: { is_completed: true } })
    expect(res).toEqual(mockGoals)
  })

  it('calls createGoal and returns data', async () => {
    const payload = { title: 'Lập trình Web', target_hours: 500 }
    ;(api.post as any).mockResolvedValueOnce({ data: { id: 2, ...payload } })

    const res = await focusService.createGoal(payload)
    expect(api.post).toHaveBeenCalledWith('/focus/goals', payload)
    expect(res.id).toBe(2)
  })

  // Topic Galaxy & Constellations
  it('fetches topic galaxy system data', async () => {
    const mockGalaxy = { planets: [], total_goals: 0, completed_goals: 0 }
    ;(api.get as any).mockResolvedValueOnce({ data: mockGalaxy })

    const res = await focusService.getGalaxy()
    expect(api.get).toHaveBeenCalledWith('/focus/galaxy')
    expect(res.total_goals).toBe(0)
  })

  it('checks constellation achievements', async () => {
    const mockCheck = { newly_unlocked: null, total_unlocked: 0, total_constellations: 6 }
    ;(api.post as any).mockResolvedValueOnce({ data: mockCheck })

    const res = await focusService.checkConstellations()
    expect(api.post).toHaveBeenCalledWith('/focus/constellations/check')
    expect(res.total_constellations).toBe(6)
  })

  // Dopamine Rewards
  it('fetches rewards and pearl balance', async () => {
    const mockRewards = { catalog: [], balance: { available_pearls: 5 } }
    ;(api.get as any).mockResolvedValueOnce({ data: mockRewards })

    const res = await focusService.getRewards()
    expect(api.get).toHaveBeenCalledWith('/focus/rewards')
    expect(res.balance.available_pearls).toBe(5)
  })

  it('redeems a reward with pearls', async () => {
    ;(api.post as any).mockResolvedValueOnce({ data: { id: 1, reward_title: 'Vé xem phim', pearls_spent: 2 } })
    const res = await focusService.redeemReward(1, 'Xem phim tối nay')
    expect(api.post).toHaveBeenCalledWith('/focus/rewards/redeem', { reward_id: 1, note: 'Xem phim tối nay' })
    expect(res.id).toBe(1)
  })

  // 4-Quadrant Eisenhower Matrix
  it('fetches daily matrix tasks by date', async () => {
    const mockTasks = [{ id: 1, title: 'Báo cáo môn A', quadrant: 1, date: '2026-10-27' }]
    ;(api.get as any).mockResolvedValueOnce({ data: mockTasks })

    const res = await focusService.getMatrixTasks('2026-10-27')
    expect(api.get).toHaveBeenCalledWith('/focus/matrix', { params: { date: '2026-10-27' } })
    expect(res).toEqual(mockTasks)
  })

  it('creates task in a matrix quadrant', async () => {
    const newTask = { title: 'Luyện thanh', quadrant: 2, date: '2026-10-27' }
    ;(api.post as any).mockResolvedValueOnce({ data: { id: 10, ...newTask } })

    const res = await focusService.createMatrixTask(newTask)
    expect(api.post).toHaveBeenCalledWith('/focus/matrix', newTask)
    expect(res.id).toBe(10)
  })

  it('toggles task completion status', async () => {
    ;(api.patch as any).mockResolvedValueOnce({ data: { id: 10, is_completed: true } })
    const res = await focusService.toggleMatrixTask(10)
    expect(api.patch).toHaveBeenCalledWith('/focus/matrix/10/toggle')
    expect(res.is_completed).toBe(true)
  })

  it('updates task reflection note', async () => {
    ;(api.patch as any).mockResolvedValueOnce({ data: { id: 10, reflection_note: 'Đã hoàn thành tốt!' } })
    const res = await focusService.updateMatrixReflection(10, 'Đã hoàn thành tốt!')
    expect(api.patch).toHaveBeenCalledWith('/focus/matrix/10/reflection', { reflection_note: 'Đã hoàn thành tốt!' })
    expect(res.reflection_note).toBe('Đã hoàn thành tốt!')
  })

  it('performs uncompleted task rollover to next day', async () => {
    ;(api.post as any).mockResolvedValueOnce({ data: { message: 'Đã chuyển 2 việc', count: 2 } })
    const res = await focusService.rolloverMatrixTasks('2026-10-27', '2026-10-28')
    expect(api.post).toHaveBeenCalledWith('/focus/matrix/rollover', null, {
      params: { from_date: '2026-10-27', to_date: '2026-10-28' },
    })
    expect(res.count).toBe(2)
  })

  it('fetches monthly matrix summary report', async () => {
    const mockSummary = { year: 2026, month: 10, total_tasks: 25, completed_tasks: 20 }
    ;(api.get as any).mockResolvedValueOnce({ data: mockSummary })

    const res = await focusService.getMonthlyMatrixSummary(2026, 10)
    expect(api.get).toHaveBeenCalledWith('/focus/matrix/monthly-summary', {
      params: { year: 2026, month: 10 },
    })
    expect(res.total_tasks).toBe(25)
  })

  it('fetches AI buddy prompt', async () => {
    const mockPrompt = {
      message: 'Chào bạn! Cùng bắt đầu 25p Pomodoro nào!',
      action_type: 'start_pomodoro',
      action_label: 'Bắt đầu',
      mood: 'friendly',
    }
    ;(api.get as any).mockResolvedValueOnce({ data: mockPrompt })

    const res = await focusService.getAIBuddyPrompt()
    expect(api.get).toHaveBeenCalledWith('/focus/ai-buddy/prompt')
    expect(res.mood).toBe('friendly')
  })
})
