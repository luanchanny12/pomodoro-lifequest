import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { Sprint, SprintDay } from '@/types'

export function useSprints() {
  return useQuery<Sprint[]>({
    queryKey: ['sprints'],
    queryFn: () => api.get('/sprints').then((r) => r.data),
  })
}

export function useSprint(id: number) {
  return useQuery<Sprint>({
    queryKey: ['sprints', id],
    queryFn: () => api.get(`/sprints/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Sprint>) => api.post('/sprints', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints'] }),
  })
}

export function useUpdateSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Sprint> & { id: number }) =>
      api.put(`/sprints/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints'] }),
  })
}

export function useDeleteSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/sprints/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints'] }),
  })
}

export function useSprintDays(sprintId: number) {
  return useQuery<SprintDay[]>({
    queryKey: ['sprint-days', sprintId],
    queryFn: () => api.get(`/sprints/${sprintId}/days`).then((r) => r.data),
    enabled: !!sprintId,
  })
}

export function useCreateSprintDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SprintDay>) => api.post('/sprints/sprint-days', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprint-days'] }),
  })
}

export function useUpdateSprintDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<SprintDay> & { id: number }) =>
      api.patch(`/sprints/sprint-days/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprint-days'] }),
  })
}

export function useDeleteSprintDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/sprints/sprint-days/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprint-days'] }),
  })
}
