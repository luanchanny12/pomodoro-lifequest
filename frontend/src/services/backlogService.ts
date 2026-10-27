import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { BacklogItem } from '@/types'

export function useBacklogItems(status?: string, category?: string) {
  return useQuery<BacklogItem[]>({
    queryKey: ['backlog', status, category],
    queryFn: () =>
      api.get('/backlog', { params: { status, category } }).then((r) => r.data),
  })
}

export function useCreateBacklogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<BacklogItem>) => api.post('/backlog', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backlog'] }),
  })
}

export function useUpdateBacklogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<BacklogItem> & { id: number }) =>
      api.put(`/backlog/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backlog'] }),
  })
}

export function useDeleteBacklogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/backlog/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backlog'] }),
  })
}
