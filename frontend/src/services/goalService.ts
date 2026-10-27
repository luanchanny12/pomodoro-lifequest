import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { Goal, GoalType, Priority } from '@/types'

export function useGoals(type?: GoalType) {
  return useQuery<Goal[]>({
    queryKey: ['goals', type],
    queryFn: () => api.get('/goals', { params: type ? { type } : {} }).then((r) => r.data),
  })
}

export function useGoal(id: number) {
  return useQuery<Goal>({
    queryKey: ['goals', id],
    queryFn: () => api.get(`/goals/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Goal>) => api.post('/goals', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Goal> & { id: number }) =>
      api.put(`/goals/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/goals/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
