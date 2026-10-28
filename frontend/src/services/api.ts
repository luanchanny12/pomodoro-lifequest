import axios from 'axios'

// Backend URL:
// 1. Ưu tiên biến môi trường VITE_API_URL (set trên Vercel: https://<render-url>/api)
// 2. Nếu không có, dùng '/api' (relative) — hoạt động khi deploy trên Vercel với vercel.json proxy
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    return envUrl
  }
  // Fallback: dùng relative '/api' (vercel.json sẽ proxy đến backend)
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
