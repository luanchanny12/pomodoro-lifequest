import axios from 'axios'

// Tự động phát hiện Backend URL:
// 1. Ưu tiên biến môi trường VITE_API_URL
// 2. Nếu đang chạy trên Vercel (*.vercel.app), tự động kết nối trực tiếp đến Render Backend
// 3. Nếu chạy cục bộ (localhost), dùng '/api' để proxy qua Vite dev server
const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return 'https://pomodoro-lifequest.onrender.com/api'
  }
  return '/api'
}

const API_BASE_URL = getBaseUrl().replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pomodoro_access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      (error.response?.data as { detail?: string })?.detail ||
      error.message ||
      'Đã xảy ra lỗi'
    return Promise.reject(new Error(message))
  }
)

export default api
