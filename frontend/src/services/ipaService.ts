import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { IPASymbol } from '@/types'

export function useIPASymbols(search?: string) {
  return useQuery<IPASymbol[]>({
    queryKey: ['ipa', search],
    queryFn: () =>
      api.get('/ipa', { params: { search } }).then((r) => r.data),
  })
}

export function useCreateIPASymbol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<IPASymbol>) => api.post('/ipa', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipa'] }),
  })
}

export function useUpdateIPASymbol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<IPASymbol> & { id: number }) =>
      api.put(`/ipa/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipa'] }),
  })
}

export function useDeleteIPASymbol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/ipa/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipa'] }),
  })
}
