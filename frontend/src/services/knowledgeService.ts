import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import type {
  KnowledgePack, Chapter, Lesson, Flashcard, Quiz, QuizQuestion, QuizResult,
  StudySession, DailyMission, PackProgress, UploadResult, DailyCoachMessage,
} from '@/types'

// ===== Knowledge Packs =====
export function useKnowledgePacks(search?: string) {
  return useQuery<{ items: KnowledgePack[]; total: number }>({
    queryKey: ['knowledge-packs', search],
    queryFn: () => api.get('/v3/knowledge', { params: { search } }).then(r => r.data),
  })
}

export function useKnowledgePack(id: number) {
  return useQuery<KnowledgePack>({
    queryKey: ['knowledge-pack', id],
    queryFn: () => api.get(`/v3/knowledge/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post('/v3/knowledge/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }).then(r => r.data as UploadResult)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-packs'] }),
  })
}

export function useDeleteKnowledgePack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/v3/knowledge/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-packs'] }),
  })
}

// ===== Chapters & Lessons =====
export function usePackChapters(packId: number) {
  return useQuery<Chapter[]>({
    queryKey: ['pack-chapters', packId],
    queryFn: () => api.get(`/v3/knowledge/${packId}/chapters`).then(r => r.data),
    enabled: !!packId,
  })
}

export function usePackLessons(packId: number) {
  return useQuery<Lesson[]>({
    queryKey: ['pack-lessons', packId],
    queryFn: () => api.get(`/v3/knowledge/${packId}/lessons`).then(r => r.data),
    enabled: !!packId,
  })
}

export function usePackProgress(packId: number) {
  return useQuery<PackProgress>({
    queryKey: ['pack-progress', packId],
    queryFn: () => api.get(`/v3/knowledge/${packId}/progress`).then(r => r.data),
    enabled: !!packId,
  })
}

export function useLesson(lessonId: number) {
  return useQuery<Lesson>({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.get(`/v3/learning/lessons/${lessonId}`).then(r => r.data),
    enabled: !!lessonId,
  })
}

// ===== Study Sessions =====
export function useStartStudy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lessonId: number) =>
      api.post('/v3/learning/study/start', { lesson_id: lessonId }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson-progress'] }),
  })
}

export function useUpdateStudy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, ...data }: { sessionId: number; duration_minutes: number; pages_read?: number; status: string }) =>
      api.put(`/v3/learning/study/${sessionId}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-progress'] })
      qc.invalidateQueries({ queryKey: ['daily-mission'] })
    },
  })
}

// ===== Flashcards =====
export function useLessonFlashcards(lessonId: number) {
  return useQuery<Flashcard[]>({
    queryKey: ['flashcards', lessonId],
    queryFn: () => api.get(`/v3/learning/flashcards/${lessonId}`).then(r => r.data),
    enabled: !!lessonId,
  })
}

export function useDueFlashcards(lessonId?: number) {
  return useQuery<Flashcard[]>({
    queryKey: ['flashcards-due', lessonId],
    queryFn: () => api.get('/v3/learning/flashcards/due', { params: { lesson_id: lessonId, limit: 20 } }).then(r => r.data),
  })
}

export function useReviewFlashcard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ flashcardId, quality }: { flashcardId: number; quality: number }) =>
      api.post(`/v3/learning/flashcards/${flashcardId}/review`, { quality }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcards-due'] }),
  })
}

// ===== Quizzes =====
export function useLessonQuizzes(lessonId: number) {
  return useQuery<Quiz[]>({
    queryKey: ['quizzes', lessonId],
    queryFn: () => api.get(`/v3/learning/quizzes/${lessonId}`).then(r => r.data),
    enabled: !!lessonId,
  })
}

export function useQuizQuestions(quizId: number) {
  return useQuery<QuizQuestion[]>({
    queryKey: ['quiz-questions', quizId],
    queryFn: () => api.get(`/v3/learning/quizzes/${quizId}/questions`).then(r => r.data),
    enabled: !!quizId,
  })
}

export function useSubmitQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ quizId, answers }: { quizId: number; answers: number[] }) =>
      api.post(`/v3/learning/quizzes/${quizId}/submit`, { answers }).then(r => r.data as QuizResult),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quizzes'] })
      qc.invalidateQueries({ queryKey: ['lesson-progress'] })
    },
  })
}

// ===== Daily Mission =====
export function useDailyMission() {
  return useQuery<DailyMission>({
    queryKey: ['daily-mission'],
    queryFn: () => api.get('/v3/daily/mission').then(r => r.data),
    refetchInterval: 60000,
  })
}

export function useCompleteMission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ missionId, earnedXp }: { missionId: number; earnedXp: number }) =>
      api.post(`/v3/daily/mission/${missionId}/complete`, { earned_xp: earnedXp }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-mission'] })
      qc.invalidateQueries({ queryKey: ['learning-stats'] })
    },
  })
}

export function useSkipMission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (missionId: number) =>
      api.post(`/v3/daily/mission/${missionId}/skip`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-mission'] }),
  })
}

// ===== Statistics =====
export function useLearningStats() {
  return useQuery({
    queryKey: ['learning-stats'],
    queryFn: () => api.get('/v3/daily/stats').then(r => r.data),
    refetchInterval: 30000,
  })
}

export function useCoachMessage() {
  return useQuery<DailyCoachMessage>({
    queryKey: ['coach-message'],
    queryFn: () => api.get('/v3/daily/coach').then(r => r.data),
    refetchInterval: 120000,
  })
}

export function useLearningHistory(days: number = 7) {
  return useQuery({
    queryKey: ['learning-history', days],
    queryFn: () => api.get('/v3/daily/history', { params: { days } }).then(r => r.data),
  })
}
