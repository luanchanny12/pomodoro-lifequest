import api from './api'

export interface CreateFeedbackPayload {
  rating: number
  category: 'feature' | 'bug' | 'ui' | 'praise' | 'other' | string
  content: string
  sender_name?: string
  sender_contact?: string
}

export const feedbackService = {
  submitFeedback: async (data: CreateFeedbackPayload): Promise<{ status: string; message: string; id: number }> => {
    const res = await api.post('/feedback', data)
    return res.data
  },
}
