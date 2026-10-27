import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'

import PomodoroApp from '@/pages/PomodoroApp'

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          {/* Main streamlined Pomodoro & Goal Focus App */}
          <Route path="/" element={<PomodoroApp />} />
          <Route path="/focus" element={<PomodoroApp />} />
        </Routes>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </TooltipProvider>
  )
}

export default App
