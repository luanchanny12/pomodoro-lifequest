import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

const PomodoroApp = lazy(() => import('@/pages/PomodoroApp'))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))

const PageFallback = () => (
  <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center text-slate-400 gap-3">
    <div className="w-9 h-9 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    <span className="text-xs text-slate-500 font-medium tracking-wide">Đang tải trang...</span>
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Main streamlined Pomodoro & Goal Focus App */}
              <Route path="/" element={<PomodoroApp />} />
              <Route path="/focus" element={<PomodoroApp />} />
              <Route path="/admin" element={<AdminDashboard />} />
              {/* Wildcard fallback để chống màn hình trắng khi gõ nhầm URL */}
              <Route path="*" element={<PomodoroApp />} />
            </Routes>
          </Suspense>
          <Toaster position="top-right" richColors closeButton />
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  )
}

export default App
