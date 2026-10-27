import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { StudyHour, GoalType } from '@/types'

export function useStudyHours(dateFrom?: string, dateTo?: string, goalType?: GoalType) {
  return useQuery<StudyHour[]>({
    queryKey: ['study-hours', dateFrom, dateTo, goalType],
    queryFn: () =>
      api
        .get('/study-hours', { params: { date_from: dateFrom, date_to: dateTo, goal_type: goalType } })
        .then((r) => r.data),
  })
}

export function useWeeklyStudyHours() {
  return useQuery<{ week_start: string; total_hours: number; details: StudyHour[] }>({
    queryKey: ['study-hours', 'weekly'],
    queryFn: () => api.get('/study-hours/weekly').then((r) => r.data),
  })
}

export function useCreateStudyHour() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<StudyHour>) => api.post('/study-hours', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study-hours'] }),
  })
}

export function useUpdateStudyHour() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<StudyHour> & { id: number }) =>
      api.put(`/study-hours/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study-hours'] }),
  })
}

export function useDeleteStudyHour() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/study-hours/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study-hours'] }),
  })
}
