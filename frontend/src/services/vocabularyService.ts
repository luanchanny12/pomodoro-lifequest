import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type { Vocabulary, VocabularyImportResult } from '@/types'

export function useVocabulary(category?: string, search?: string) {
  return useQuery<Vocabulary[]>({
    queryKey: ['vocabulary', category, search],
    queryFn: () =>
      api.get('/vocabulary', { params: { category, search } }).then((r) => r.data),
  })
}

export function useCreateVocabulary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Vocabulary>) => api.post('/vocabulary', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocabulary'] }),
  })
}

export function useUpdateVocabulary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Vocabulary> & { id: number }) =>
      api.put(`/vocabulary/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocabulary'] }),
  })
}

export function useDeleteVocabulary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/vocabulary/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocabulary'] }),
  })
}

export function useBulkCreateVocabulary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: { word: string; meaning: string; example?: string; category?: string; type?: string }[]) =>
      api.post('/vocabulary/bulk', { items }).then((r) => r.data as VocabularyImportResult),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocabulary'] }),
  })
}

export function useImportVocabularyFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post('/vocabulary/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data as VocabularyImportResult)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocabulary'] }),
  })
}
