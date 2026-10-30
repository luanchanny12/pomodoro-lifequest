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
    if (error.response?.status === 401) {
      const url = String(error.config?.url || '')
      // Chỉ kích hoạt xóa phiên nếu không phải đang thử login hoặc register
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('pomodoro_access_token')
        localStorage.removeItem('pomodoro_user_profile')
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pomodoro_auth_expired'))
        }
      }
    }

    const message =
      (error.response?.data as { detail?: string })?.detail ||
      error.message ||
      'Đã xảy ra lỗi'
    const customError = new Error(message) as any
    customError.response = error.response
    customError.status = error.response?.status
    customError.code = error.code
    return Promise.reject(customError)
  }
)

export default api
