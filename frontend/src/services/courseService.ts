import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { Course, GoalType } from '@/types'

export function useCourses(goalType?: GoalType) {
  return useQuery<Course[]>({
    queryKey: ['courses', goalType],
    queryFn: () =>
      api.get('/courses', { params: goalType ? { goal_type: goalType } : {} }).then((r) => r.data),
  })
}

export function useCourse(id: number) {
  return useQuery<Course>({
    queryKey: ['courses', id],
    queryFn: () => api.get(`/courses/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Course>) => api.post('/courses', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

export function useUpdateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Course> & { id: number }) =>
      api.put(`/courses/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

export function useDeleteCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/courses/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}
