import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { RoadmapItem, GoalType } from '@/types'

export function useRoadmapItems(goalType?: GoalType) {
  return useQuery<RoadmapItem[]>({
    queryKey: ['roadmap', goalType],
    queryFn: () =>
      api
        .get('/roadmaps', { params: goalType ? { goal_type: goalType } : {} })
        .then((r) => r.data),
  })
}

export function useCreateRoadmapItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<RoadmapItem>) => api.post('/roadmaps', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap'] }),
  })
}

export function useUpdateRoadmapItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<RoadmapItem> & { id: number }) =>
      api.put(`/roadmaps/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap'] }),
  })
}

export function useDeleteRoadmapItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/roadmaps/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap'] }),
  })
}
