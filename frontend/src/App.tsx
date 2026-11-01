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

const AdminSkeletonFallback = () => (
  <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
    <header className="sticky top-0 z-40 bg-[#0e1424]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-28 h-8 rounded-xl bg-slate-800/80 animate-pulse" />
        <div className="h-4 w-px bg-slate-800" />
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 animate-pulse" />
          <div className="space-y-1.5">
            <div className="w-48 h-4 bg-slate-800 rounded animate-pulse" />
            <div className="w-32 h-3 bg-slate-800/60 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-slate-800/80 animate-pulse" />
        <div className="w-24 h-8 rounded-xl bg-slate-800/80 animate-pulse" />
      </div>
    </header>
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="h-14 bg-[#0f1523] border border-slate-800 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md min-h-[104px] animate-pulse flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-16 h-3 bg-slate-800/80 rounded" />
              <div className="w-6 h-6 bg-slate-800/80 rounded-lg" />
            </div>
            <div className="w-14 h-6 bg-slate-800/80 rounded my-1" />
            <div className="w-20 h-2.5 bg-slate-800/80 rounded" />
          </div>
        ))}
      </div>
    </main>
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            {/* Main streamlined Pomodoro & Goal Focus App */}
            <Route
              path="/"
              element={
                <Suspense fallback={<PageFallback />}>
                  <PomodoroApp />
                </Suspense>
              }
            />
            <Route
              path="/focus"
              element={
                <Suspense fallback={<PageFallback />}>
                  <PomodoroApp />
                </Suspense>
              }
            />
            <Route
              path="/admin"
              element={
                <Suspense fallback={<AdminSkeletonFallback />}>
                  <AdminDashboard />
                </Suspense>
              }
            />
            {/* Wildcard fallback để chống màn hình trắng khi gõ nhầm URL */}
            <Route
              path="*"
              element={
                <Suspense fallback={<PageFallback />}>
                  <PomodoroApp />
                </Suspense>
              }
            />
          </Routes>
          <Toaster position="top-right" richColors closeButton />
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  )
}

export default App
