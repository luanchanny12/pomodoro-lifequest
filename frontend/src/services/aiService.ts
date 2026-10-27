import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type {
  AIPlannerResponse, CurrentPosition, Prediction, DailyReview,
  WeeklyReport, ChatMessage, LifeScore, SmartNotification, UserStatisticsSummary, GoalType,
  ProactiveDashboard, VirtualCoachMessage, HeatmapEntry, LifeTimelineEntry,
  FocusScoreResponse, PriorityScore, Quest, BossFight, ShopItem, AvatarInfo,
  SpacedRepetitionItem, DigitalTwinProfile, RiskScore, MonthlyReview, HabitDetection,
  StudyPlanResult,
} from '@/types'

interface ChatResponse {
  reply: string; session_id: string;
}

export function useAIPlanner(date?: string, energy?: number, sleep?: number, mood?: number) {
  return useQuery<AIPlannerResponse>({
    queryKey: ['ai', 'planner', date, energy, sleep, mood],
    queryFn: async () => {
      const { data } = await api.post('/ai/planner', { date, energy, sleep, mood })
      return data
    },
    enabled: false,
  })
}

export function useBrain(goalType: GoalType) {
  return useQuery<{ position: CurrentPosition; nextLesson: any }>({
    queryKey: ['ai', 'brain', goalType],
    queryFn: async () => {
      const { data } = await api.get(`/ai/brain/${goalType}`)
      return data
    },
  })
}

export function useTrackLearning() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { goal_type: GoalType; activity_type: string; title: string; module: string; lesson: string; duration_minutes: number; score?: number }) => {
      const { data } = await api.post('/ai/track', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai'] })
    },
  })
}

export function usePredictions() {
  return useQuery<Prediction[]>({
    queryKey: ['ai', 'predictions'],
    queryFn: async () => {
      const { data } = await api.get('/ai/predictions')
      return data
    },
  })
}

export function usePrediction(goalType: GoalType) {
  return useQuery<Prediction>({
    queryKey: ['ai', 'prediction', goalType],
    queryFn: async () => {
      const { data } = await api.get(`/ai/predictions/${goalType}`)
      return data
    },
  })
}

export function useDailyReview(date?: string) {
  return useQuery<DailyReview>({
    queryKey: ['ai', 'daily-review', date],
    queryFn: async () => {
      const params = date ? { date } : {}
      const { data } = await api.get('/ai/review/daily', { params })
      return data
    },
  })
}

export function useWeeklyReport() {
  return useQuery<WeeklyReport>({
    queryKey: ['ai', 'weekly-report'],
    queryFn: async () => {
      const { data } = await api.get('/ai/review/weekly')
      return data
    },
  })
}

export function useAIChat() {
  return useMutation({
    mutationFn: async (payload: { message: string; session_id?: string }): Promise<ChatResponse> => {
      const { data } = await api.post('/ai/chat', payload)
      return data
    },
  })
}

export function useChatHistory(sessionId: string) {
  return useQuery<ChatMessage[]>({
    queryKey: ['ai', 'chat', sessionId],
    queryFn: async () => {
      if (!sessionId) return []
      const { data } = await api.get(`/ai/chat/history/${sessionId}`)
      return data
    },
    enabled: !!sessionId,
  })
}

export function useChatSessions() {
  return useQuery<{ session_id: string; first_message: string; last_message: string; preview: string }[]>({
    queryKey: ['ai', 'chat', 'sessions'],
    queryFn: async () => {
      const { data } = await api.get('/ai/chat/sessions')
      return data
    },
  })
}

export function useLifeScore() {
  return useQuery<LifeScore>({
    queryKey: ['ai', 'life-score'],
    queryFn: async () => {
      const { data } = await api.get('/ai/life-score')
      return data
    },
  })
}

export function useNotifications() {
  return useQuery<SmartNotification[]>({
    queryKey: ['ai', 'notifications'],
    queryFn: async () => {
      const { data } = await api.get('/ai/notifications')
      return data
    },
    refetchInterval: 30000,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch(`/ai/notifications/${id}/read`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'notifications'] })
    },
  })
}

// Backward compatibility with existing pages
interface AIPrediction {
  goal_type: GoalType; predicted_completion: string; current_pace: number; improved_date: string; confidence: number;
}
interface LegacyAIReview {
  rating: number; summary: string; suggestions: string[]; life_score_delta: number;
}
interface AIPlanResult {
  tasks: any[]; summary: string;
}

export function useAIPredictions() {
  return useQuery<AIPrediction[]>({
    queryKey: ['ai', 'predictions-legacy'],
    queryFn: async () => {
      const { data } = await api.get('/ai/predictions')
      return (data ?? []).map((p: Prediction) => ({
        goal_type: p.goal_type,
        predicted_completion: p.predicted_date,
        current_pace: p.current_pace,
        improved_date: p.improved_date,
        confidence: typeof p.confidence === 'string' ? (p.confidence.includes('cao') ? 0.8 : p.confidence.includes('trung') ? 0.5 : 0.3) : p.confidence,
      }))
    },
  })
}

export function useAIReview(date: string) {
  return useQuery<LegacyAIReview | null>({
    queryKey: ['ai', 'review-legacy', date],
    queryFn: async () => {
      try {
        const r = await api.get('/ai/review/daily', { params: { date } })
        const d: DailyReview = r.data
        return d ? { rating: d.rating, summary: d.strengths?.join(', ') ?? '', suggestions: d.suggestions ?? [], life_score_delta: 0 } : null
      } catch { return null }
    },
  })
}

export function useAIPlan(date: string) {
  return useQuery<AIPlanResult | null>({
    queryKey: ['ai', 'plan-legacy', date],
    queryFn: async () => {
      try {
        const r = await api.post('/ai/planner', { date })
        return r.data ?? null
      } catch { return null }
    },
  })
}

export function useUserStats() {
  return useQuery<UserStatisticsSummary>({
    queryKey: ['ai', 'user-stats'],
    queryFn: async () => {
      const { data } = await api.get('/ai/stats')
      return data
    },
  })
}

// === V2 Hooks ===
export function useProactiveDashboard() {
  return useQuery<ProactiveDashboard>({
    queryKey: ['ai', 'v2', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v2/dashboard')
      return data
    },
    refetchInterval: 60000,
  })
}

export function useV2Predictions() {
  return useQuery<any>({
    queryKey: ['ai', 'v2', 'predict'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v2/predict-v2')
      return data
    },
  })
}

export function useV2Coach() {
  return useQuery<VirtualCoachMessage[]>({
    queryKey: ['ai', 'v2', 'coach'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v2/coach')
      return Array.isArray(data) ? data : []
    },
  })
}

export function useV2Heatmap(goalType?: string, days: number = 365) {
  return useQuery<HeatmapEntry[]>({
    queryKey: ['ai', 'v2', 'heatmap', goalType, days],
    queryFn: async () => {
      const params: any = { days }
      if (goalType) params.goal_type = goalType
      const { data } = await api.get('/ai/v2/heatmap', { params })
      return data ?? []
    },
  })
}

export function useV2Timeline(goalType?: string, limit: number = 50) {
  return useQuery<LifeTimelineEntry[]>({
    queryKey: ['ai', 'v2', 'timeline', goalType, limit],
    queryFn: async () => {
      const params: any = { limit }
      if (goalType) params.goal_type = goalType
      const { data } = await api.get('/ai/v2/timeline', { params })
      return data ?? []
    },
  })
}

export function useV2Focus() {
  return useQuery<FocusScoreResponse>({
    queryKey: ['ai', 'v2', 'focus'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v2/focus')
      return data
    },
  })
}

export function useV2Priority() {
  return useQuery<PriorityScore[]>({
    queryKey: ['ai', 'v2', 'priority'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v2/priority')
      return data ?? []
    },
  })
}

export function useV2Quests() {
  return useQuery<Quest[]>({
    queryKey: ['ai', 'v2', 'quests'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v2/quests')
      return data ?? []
    },
  })
}

export function useV2Bosses() {
  return useQuery<BossFight[]>({
    queryKey: ['ai', 'v2', 'bosses'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v2/bosses')
      return data ?? []
    },
  })
}

export function useV2Shop() {
  return useQuery<ShopItem[]>({
    queryKey: ['ai', 'v2', 'shop'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v2/shop')
      return data ?? []
    },
  })
}

export function useV2Inventory() {
  return useQuery<ShopItem[]>({
    queryKey: ['ai', 'v2', 'inventory'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v2/inventory')
      return data ?? []
    },
  })
}

export function useV2Avatar() {
  return useQuery<AvatarInfo>({
    queryKey: ['ai', 'v2', 'avatar'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v2/avatar')
      return data
    },
  })
}

export function useV2SpacedRepetition() {
  return useQuery<SpacedRepetitionItem[]>({
    queryKey: ['ai', 'v2', 'repetition', 'due'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v2/repetition/due')
      return data ?? []
    },
  })
}

export function useBuyItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: number) => {
      const { data } = await api.post(`/ai/v2/shop/buy?item_id=${itemId}`)
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai', 'v2', 'shop'] }); qc.invalidateQueries({ queryKey: ['ai', 'v2', 'inventory'] }) },
  })
}

export function useEquipItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (purchaseId: number) => {
      const { data } = await api.post(`/ai/v2/inventory/equip?purchase_id=${purchaseId}`)
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai', 'v2', 'inventory'] }) },
  })
}

export function useCheckQuests() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/ai/v2/quests/check')
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai', 'v2', 'quests'] }) },
  })
}

export function useDismissCoach() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/ai/v2/coach/dismiss?id=${id}`)
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai', 'v2', 'coach'] }) },
  })
}

// === V3 Hooks ===
export function useDigitalTwin() {
  return useQuery<DigitalTwinProfile>({
    queryKey: ['ai', 'v3', 'twin'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v3/twin')
      return data
    },
  })
}

export function useRisks() {
  return useQuery<RiskScore[]>({
    queryKey: ['ai', 'v3', 'risks'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v3/risks')
      return data ?? []
    },
  })
}

export function useMonthlyReview(month?: number, year?: number) {
  return useQuery<MonthlyReview>({
    queryKey: ['ai', 'v3', 'monthly-review', month, year],
    queryFn: async () => {
      const params: any = {}
      if (month) params.month = month
      if (year) params.year = year
      const { data } = await api.get('/ai/v3/monthly-review', { params })
      return data
    },
  })
}

export function useHabits() {
  return useQuery<HabitDetection>({
    queryKey: ['ai', 'v3', 'habits'],
    queryFn: async () => {
      const { data } = await api.get('/ai/v3/habits')
      return data
    },
  })
}

export function useUploadPlan() {
  return useMutation({
    mutationFn: async ({ file, subject, message }: { file: File; subject: string; message?: string }): Promise<StudyPlanResult> => {
      const form = new FormData()
      form.append('file', file)
      form.append('subject', subject)
      if (message) form.append('message', message)
      const { data } = await api.post('/ai/upload-plan', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })
      return data
    },
  })
}

interface FocusSessionResponse {
  success: boolean
  exp_gained: number
  coins_gained: number
  total_exp: number
  total_coins: number
}

export function useFocusSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (minutes: number): Promise<FocusSessionResponse> => {
      const { data } = await api.post('/ai/v2/focus-session', { minutes })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player'] })
    },
  })
}
