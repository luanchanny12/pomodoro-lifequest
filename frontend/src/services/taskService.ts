import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { Task, TaskStatus, GoalType } from '@/types'

export function useTasks(date?: string, status?: TaskStatus, goalType?: GoalType) {
  return useQuery<Task[]>({
    queryKey: ['tasks', date, status, goalType],
    queryFn: () =>
      api
        .get('/tasks', { params: { date, status, goal_type: goalType } })
        .then((r) => r.data),
  })
}

export function useTask(id: number) {
  return useQuery<Task>({
    queryKey: ['tasks', id],
    queryFn: () => api.get(`/tasks/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Task>) => api.post('/tasks', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Task> & { id: number }) =>
      api.put(`/tasks/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
