import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'

export interface SlotOut {
  id: number
  date: string
  start_time: string
  duration_min: number
  is_done: boolean
  subject_name: string
  subject_color: string
}

export interface SubjectOut {
  id: number
  name: string
  total_weeks: number
  hours_per_week: number
  color: string
  is_active: boolean
  created_at: string
}

export function useTodaySchedule() {
  return useQuery<SlotOut[]>({
    queryKey: ['schedule', 'today'],
    queryFn: () => api.get('/schedule/today').then(r => r.data),
    refetchInterval: 60000,
  })
}

export function useWeekSchedule() {
  return useQuery<SlotOut[]>({
    queryKey: ['schedule', 'week'],
    queryFn: () => api.get('/schedule/week').then(r => r.data),
    refetchInterval: 60000,
  })
}

export function useSubjects() {
  return useQuery<SubjectOut[]>({
    queryKey: ['schedule', 'subjects'],
    queryFn: () => api.get('/schedule/subjects').then(r => r.data),
  })
}

export function useToggleSlotDone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (slotId: number) => api.patch(`/schedule/slot/${slotId}/done`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] })
    },
  })
}

export function useMoveSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ slotId, date, start_time, duration_min }: { slotId: number; date?: string; start_time?: string; duration_min?: number }) =>
      api.patch(`/schedule/slot/${slotId}/move`, { date, start_time, duration_min }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] })
    },
  })
}

export function useDeleteSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (subjectId: number) => api.delete(`/schedule/subject/${subjectId}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] })
    },
  })
}
