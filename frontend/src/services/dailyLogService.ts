import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { DailyLog } from '@/types'

export function useDailyLogs(date?: string) {
  return useQuery<DailyLog[]>({
    queryKey: ['daily-logs', date],
    queryFn: () =>
      api
        .get('/daily-logs', { params: { date } })
        .then((r) => r.data),
    enabled: !!date,
  })
}

export function useLatestDailyLog() {
  return useQuery<DailyLog>({
    queryKey: ['daily-logs', 'latest'],
    queryFn: () => api.get('/daily-logs/latest').then((r) => r.data),
  })
}

export function useCreateDailyLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<DailyLog>) => api.post('/daily-logs', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-logs'] })
      qc.invalidateQueries({ queryKey: ['player'] })
    },
  })
}

export function useUpdateDailyLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<DailyLog> & { id: number }) =>
      api.put(`/daily-logs/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-logs'] }),
  })
}
