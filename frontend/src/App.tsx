import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'

import PomodoroApp from '@/pages/PomodoroApp'

const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          {/* Main streamlined Pomodoro & Goal Focus App */}
          <Route path="/" element={<PomodoroApp />} />
          <Route path="/focus" element={<PomodoroApp />} />
          <Route
            path="/admin"
            element={
              <Suspense
                fallback={
                  <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-slate-400">
                    Đang tải Admin Dashboard...
                  </div>
                }
              >
                <AdminDashboard />
              </Suspense>
            }
          />
        </Routes>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </TooltipProvider>
  )
}

export default App
