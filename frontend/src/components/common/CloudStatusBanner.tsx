import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, CheckCircle2, Loader2 } from 'lucide-react'
import api from '@/services/api'

export const CloudStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'waking' | 'ready' | 'error'>('idle')

  useEffect(() => {
    let timer: NodeJS.Timeout
    let isMounted = true

    // Only show "waking up" banner if connection takes > 1.8 seconds (Render cold start)
    timer = setTimeout(() => {
      if (isMounted && status === 'idle') {
        setStatus('waking')
      }
    }, 1800)

    api.get('/goals')
      .then(() => {
        if (!isMounted) return
        clearTimeout(timer)
        if (status === 'waking') {
          setStatus('ready')
          setTimeout(() => {
            if (isMounted) setStatus('idle')
          }, 3000)
        } else {
          setStatus('idle')
        }
      })
      .catch(() => {
        if (!isMounted) return
        clearTimeout(timer)
        // If error, show waking or idle
        setStatus('idle')
      })

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [])

  if (status === 'idle') return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300 pointer-events-none">
      {status === 'waking' && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-950/90 border border-cyan-400/40 text-cyan-200 text-xs font-bold shadow-xl shadow-cyan-950/60 backdrop-blur-md">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          <span>🛰️ Đang kết nối & đánh thức vệ tinh Cloud LifeQuest...</span>
        </div>
      )}

      {status === 'ready' && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/90 border border-emerald-400/40 text-emerald-200 text-xs font-bold shadow-xl shadow-emerald-950/60 backdrop-blur-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>🟢 Vệ tinh Cloud đã sẵn sàng hoạt động!</span>
        </div>
      )}
    </div>
  )
}
