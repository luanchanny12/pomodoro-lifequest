import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { Player, Achievement } from '@/types'

export function usePlayer() {
  return useQuery<Player>({
    queryKey: ['player'],
    queryFn: () => api.get('/player').then((r) => r.data),
  })
}

export function useAddExp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (amount: number) =>
      api.post('/player/add-exp', { amount }).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['player'] })
      qc.invalidateQueries({ queryKey: ['achievements'] })
      return data
    },
  })
}

export function useAddCoins() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (amount: number) =>
      api.post('/player/add-coins', { amount }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['player'] }),
  })
}

export function useUpdateStreak() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post('/player/update-streak').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['player'] }),
  })
}

export function useAchievements() {
  return useQuery<Achievement[]>({
    queryKey: ['achievements'],
    queryFn: () => api.get('/player/achievements').then((r) => r.data),
  })
}
