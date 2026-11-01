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
  <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
    <header className="sticky top-0 z-40 bg-[#0e1424]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700 text-xs font-semibold">
          <span>← Về Focus Hub</span>
        </span>
        <div className="h-4 w-px bg-slate-800" />
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            🛡️
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>CỔNG QUẢN TRỊ VIÊN (ADMIN PORTAL)</span>
            </h1>
            <p className="text-[11px] text-slate-400">Giám sát mục tiêu & hệ thống</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-medium px-2.5 py-1 rounded-xl bg-slate-800/60 text-slate-400 border border-slate-700/50">
          Admin
        </span>
      </div>
    </header>
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0f1523] border border-slate-800 rounded-2xl p-3 px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-md shadow-cyan-400/50" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Khung Thời Gian Thống Kê:
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/30">
            Toàn thời gian
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[
          { label: 'Người Dùng', color: 'text-cyan-400' },
          { label: 'Tổng Giờ Học', color: 'text-amber-400' },
          { label: 'Mục Tiêu', color: 'text-purple-400' },
          { label: 'Phiên Focus', color: 'text-rose-400' },
          { label: 'Lưu Lượng', color: 'text-blue-400' },
          { label: 'Góp Ý', color: 'text-emerald-400' },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md min-h-[104px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {item.label}
              </span>
            </div>
            <div className="text-xl font-black text-white">---</div>
            <span className={`text-[11px] font-semibold ${item.color}`}>Đang cập nhật...</span>
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
