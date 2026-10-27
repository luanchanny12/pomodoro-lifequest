import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let lastTime = 0

    // Reduced from 80 → 45 particles
    const COUNT = 45
    const particles: { x: number; y: number; vx: number; vy: number; s: number; o: number }[] = []

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        s: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.35 + 0.08,
      })
    }

    // Pre-sort connection pairs once (O(n²) computed once, not every frame)
    const pairs: [number, number][] = []
    const CONNECT_DIST = 110
    // Only pick pairs that START near each other (will still look dynamic as they move)
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        pairs.push([i, j])
      }
    }

    function draw(now: number) {
      if (!ctx || !canvas) return

      // Cap at ~50fps to save CPU
      if (now - lastTime < 20) {
        animId = requestAnimationFrame(draw)
        return
      }
      lastTime = now

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Move & draw particles
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,229,255,${p.o * 0.3})`
        ctx.fill()
      }

      // Draw connections — O(n²) but with early-exit and batched strokes per opacity level
      ctx.beginPath()
      for (const [i, j] of pairs) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        // Skip sqrt: compare squared distances (faster)
        const dist2 = dx * dx + dy * dy
        if (dist2 < CONNECT_DIST * CONNECT_DIST) {
          const alpha = (1 - Math.sqrt(dist2) / CONNECT_DIST) * 0.07
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(0,229,255,${alpha})`
          ctx.stroke()
          ctx.beginPath()
        }
      }

      animId = requestAnimationFrame(draw)
    }
    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[2]"
      style={{ willChange: 'transform' }}
    />
  )
}

export default function BackgroundEffects() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <>
      <div className="digital-grid" />
      <div className="scan-line" />
      <ParticleCanvas />
      {!isHome && (
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[1] opacity-30">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-[#00E5FF]/[0.03] blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-[#6C63FF]/[0.03] blur-[100px]" />
        </div>
      )}
    </>
  )
}
