import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider } from '@/contexts/ThemeContext'
import App from './App'
import './index.css'
import { setupGlobalAudioUnlocker } from '@/utils/soundEffects'

// Khởi tạo Sentry error tracking (chỉ bật khi có VITE_SENTRY_DSN và không phải môi trường test)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn && import.meta.env.MODE !== 'test') {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  })
}

// Kích hoạt bộ giải phóng âm thanh toàn cục cho Mobile (iOS & Android)
setupGlobalAudioUnlocker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)

// Register Service Worker for PWA & Background Notifications
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err)
    })
  })
}

