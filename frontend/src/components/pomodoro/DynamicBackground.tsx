import React, { useEffect, useRef } from 'react'

export interface BackgroundConfig {
  id: string
  name: string
  imageUrl: string
  canvasEffect?: 'rain' | 'embers' | 'stars' | 'none'
  overlayOpacity: number // 0.1 to 0.4 (subtle, keep image bright and vibrant!)
}

export const PRESET_THEMES: BackgroundConfig[] = [
  {
    id: 'rain',
    name: '🌧️ Mưa rơi bên khung cửa',
    imageUrl: '/backgrounds/rain.jpg',
    canvasEffect: 'rain',
    overlayOpacity: 0.18,
  },
  {
    id: 'waves',
    name: '🌊 Sóng biển hoàng hôn',
    imageUrl: '/backgrounds/waves.jpg',
    canvasEffect: 'none',
    overlayOpacity: 0.15,
  },
  {
    id: 'ticking',
    name: '⏰ Góc bàn học & Đồng hồ',
    imageUrl: '/backgrounds/study.jpg',
    canvasEffect: 'none',
    overlayOpacity: 0.22,
  },
  {
    id: 'fire',
    name: '🔥 Lò sưởi nhà gỗ ấm cúng',
    imageUrl: '/backgrounds/fire.jpg',
    canvasEffect: 'embers',
    overlayOpacity: 0.18,
  },
  {
    id: 'space',
    name: '🌌 Vũ trụ ngàn sao & Sao băng',
    imageUrl: '/backgrounds/space.jpg',
    canvasEffect: 'stars',
    overlayOpacity: 0.15,
  },
  {
    id: 'coffee',
    name: '☕ Quán cà phê yên tĩnh',
    imageUrl: '/backgrounds/coffee.jpg',
    canvasEffect: 'none',
    overlayOpacity: 0.2,
  },
]

interface DynamicBackgroundProps {
  config: BackgroundConfig
  fallbackColor?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Giới hạn FPS để giảm tải GPU. Canvas effects không cần 60fps. */
function createThrottledRAF(targetFPS: number, callback: () => void) {
  const interval = 1000 / targetFPS
  let lastTime = 0
  let rafId: number

  const loop = (now: number) => {
    rafId = requestAnimationFrame(loop)
    if (now - lastTime < interval) return
    lastTime = now
    callback()
  }

  rafId = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(rafId)
}

// ── Component ─────────────────────────────────────────────────────────────────

const DynamicBackgroundComponent: React.FC<DynamicBackgroundProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // ── Canvas Overlay Effects (Rain / Embers / Stars) ──
  useEffect(() => {
    if (!config.canvasEffect || config.canvasEffect === 'none') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    const isMobile = window.innerWidth < 768

    // Dùng devicePixelRatio thấp hơn trên mobile để giảm pixel fill rate
    const dpr = isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    ctx.scale(dpr, dpr)

    let cancelLoop: (() => void) | null = null

    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (!canvas) return
        width = window.innerWidth
        height = window.innerHeight
        canvas.width = width * dpr
        canvas.height = height * dpr
        canvas.style.width = width + 'px'
        canvas.style.height = height + 'px'
        ctx.scale(dpr, dpr)
      }, 200)
    }
    window.addEventListener('resize', handleResize)

    // Tự động tạm dừng animation khi người dùng ẩn tab — tiết kiệm 100% CPU/GPU
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelLoop?.()
        cancelLoop = null
      } else if (!cancelLoop) {
        startCurrentEffect()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    let startCurrentEffect: () => void = () => {}

    // ── 1. RAINDROPS ON GLASS ──
    if (config.canvasEffect === 'rain') {
      // Mobile: 35 drops ở 24fps — desktop: 90 drops ở 30fps → đủ mượt, giảm ~50% tải
      const dropCount = isMobile ? 35 : 90
      const targetFPS = isMobile ? 24 : 30
      const drops: { x: number; y: number; length: number; speed: number; opacity: number }[] = []
      for (let i = 0; i < dropCount; i++) {
        drops.push({
          x: Math.random() * width,
          y: Math.random() * height,
          length: Math.random() * 24 + 12,
          speed: Math.random() * 8 + 14,
          opacity: Math.random() * 0.45 + 0.2,
        })
      }

      const renderRain = () => {
        ctx.clearRect(0, 0, width, height)
        ctx.lineWidth = 1.5
        ctx.lineCap = 'round'

        // Batch tất cả drops vào 1 beginPath duy nhất → giảm draw calls từ N xuống 1
        ctx.strokeStyle = 'rgba(220, 240, 255, 0.35)'
        ctx.beginPath()
        for (let i = 0; i < dropCount; i++) {
          const d = drops[i]
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x - 2, d.y + d.length)
          d.y += d.speed
          d.x -= 0.6
          if (d.y > height) {
            d.y = -20
            d.x = Math.random() * (width + 50)
          }
        }
        ctx.stroke()
      }

      startCurrentEffect = () => {
        cancelLoop?.()
        cancelLoop = createThrottledRAF(targetFPS, renderRain)
      }
    }

    // ── 2. FLOATING FIRE EMBERS ──
    else if (config.canvasEffect === 'embers') {
      const emberCount = isMobile ? 20 : 50
      const targetFPS = isMobile ? 20 : 28
      const embers: { x: number; y: number; r: number; speedY: number; speedX: number; opacity: number; hue: number }[] = []
      for (let i = 0; i < emberCount; i++) {
        embers.push({
          x: Math.random() * width,
          y: height + Math.random() * 60,
          r: Math.random() * 2.8 + 1,
          speedY: Math.random() * 1.6 + 0.7,
          speedX: (Math.random() - 0.5) * 1.0,
          opacity: Math.random() * 0.8 + 0.2,
          // Pre-compute random hue thay vì gọi Math.random() trong render loop
          hue: Math.floor(150 + Math.random() * 80),
        })
      }

      const renderEmbers = () => {
        ctx.clearRect(0, 0, width, height)

        for (let i = 0; i < emberCount; i++) {
          const e = embers[i]
          ctx.fillStyle = `rgba(255, ${e.hue}, 50, ${e.opacity})`
          ctx.beginPath()
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
          ctx.fill()

          e.y -= e.speedY
          e.x += e.speedX
          e.opacity -= 0.0015
          if (e.y < -10 || e.opacity <= 0) {
            e.y = height + 10
            e.x = Math.random() * width
            e.opacity = Math.random() * 0.8 + 0.2
            // Re-randomize hue chỉ khi reset hạt — không phải mỗi frame
            e.hue = Math.floor(150 + Math.random() * 80)
          }
        }
      }

      startCurrentEffect = () => {
        cancelLoop?.()
        cancelLoop = createThrottledRAF(targetFPS, renderEmbers)
      }
    }

    // ── 3. TWINKLING STARS & SHOOTING STAR ──
    else if (config.canvasEffect === 'stars') {
      const starCount = isMobile ? 40 : 110
      // Stars thay đổi rất chậm → 20fps là đủ mượt mà tiết kiệm pin
      const targetFPS = isMobile ? 16 : 22
      const stars: { x: number; y: number; r: number; alpha: number; delta: number }[] = []
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.7,
          r: Math.random() * 1.8 + 0.6,
          alpha: Math.random(),
          delta: (Math.random() * 0.015 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        })
      }

      let shootingStar = { x: 0, y: 0, length: 100, speed: 16, opacity: 0, active: false }
      let frame = 0

      const renderStars = () => {
        frame++
        ctx.clearRect(0, 0, width, height)

        // Batch tất cả sao tĩnh vào 1 pass theo alpha để giảm fillStyle changes
        for (let i = 0; i < starCount; i++) {
          const s = stars[i]
          s.alpha += s.delta
          if (s.alpha <= 0.08 || s.alpha >= 0.95) s.delta = -s.delta

          ctx.globalAlpha = Math.max(0.08, s.alpha)
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1

        // Shooting star every ~240 frames (ít thường hơn = ít tải hơn)
        if (!shootingStar.active && frame % 240 === 0) {
          shootingStar.active = true
          shootingStar.x = Math.random() * width * 0.6
          shootingStar.y = Math.random() * height * 0.25
          shootingStar.opacity = 0.9
        }

        if (shootingStar.active) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${shootingStar.opacity})`
          ctx.lineWidth = 1.8
          ctx.beginPath()
          ctx.moveTo(shootingStar.x, shootingStar.y)
          ctx.lineTo(shootingStar.x + shootingStar.length, shootingStar.y + shootingStar.length * 0.4)
          ctx.stroke()

          shootingStar.x += shootingStar.speed
          shootingStar.y += shootingStar.speed * 0.4
          shootingStar.opacity -= 0.025
          if (shootingStar.opacity <= 0) shootingStar.active = false
        }
      }

      startCurrentEffect = () => {
        cancelLoop?.()
        cancelLoop = createThrottledRAF(targetFPS, renderStars)
      }
    }

    startCurrentEffect()

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cancelLoop?.()
    }
  }, [config.canvasEffect])

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none"
      style={{ contain: 'paint layout' }}
    >
      {/* 1. Fullscreen Beautiful Local Wallpaper */}
      <img
        src={config.imageUrl}
        alt=""
        key={config.imageUrl}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover transition-all duration-700 brightness-95"
      />

      {/* 2. Transparent Animated Canvas Overlay (Rain / Embers / Stars) */}
      {config.canvasEffect && config.canvasEffect !== 'none' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-10 pointer-events-none"
          style={{ willChange: 'transform', transform: 'translateZ(0)', contain: 'strict' }}
        />
      )}

      {/* 3. Subtle darkening overlay so text is readable while keeping wallpaper bright and vivid */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-500 z-20"
        style={{ opacity: config.overlayOpacity ?? 0.18 }}
      />

      {/* 4. Soft subtle vignette for focus */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25 z-20 pointer-events-none" />
    </div>
  )
}

export const DynamicBackground = React.memo(DynamicBackgroundComponent)
