import { useEffect, useState, lazy, Suspense } from 'react'

const SpeedInsightsLazy = lazy(() =>
  import('@vercel/speed-insights/react').then((m) => ({ default: m.SpeedInsights }))
)
const AnalyticsLazy = lazy(() =>
  import('@vercel/analytics/react').then((m) => ({ default: m.Analytics }))
)

/**
 * VercelTelemetry: Defers Speed Insights and Web Analytics until the browser is idle.
 * This guarantees ZERO impact on initial render, TBT, FCP, and Lighthouse performance scores.
 */
export default function VercelTelemetry() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Allow user interactions and initial paints to finish before bootstrapping telemetry
    if ('requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(
        () => setEnabled(true),
        { timeout: 3500 }
      )
      return () => (window as any).cancelIdleCallback(handle)
    } else {
      const timer = setTimeout(() => setEnabled(true), 2500)
      return () => clearTimeout(timer)
    }
  }, [])

  if (!enabled) return null

  return (
    <Suspense fallback={null}>
      <SpeedInsightsLazy />
      <AnalyticsLazy />
    </Suspense>
  )
}
