import axios from 'axios'

// Chuẩn hóa URL: bỏ dấu "/" ở cuối để tránh thành "//notifications/..."
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
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
