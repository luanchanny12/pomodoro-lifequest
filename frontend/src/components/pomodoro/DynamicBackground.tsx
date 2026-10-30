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

const DynamicBackgroundComponent: React.FC<DynamicBackgroundProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // ── Canvas Overlay Effects (Rain / Embers / Stars) ──
  useEffect(() => {
    if (!config.canvasEffect || config.canvasEffect === 'none') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    let activeLoop: (() => void) | null = null

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Tự động tạm dừng animation khi người dùng ẩn tab / thu nhỏ trình duyệt để tiết kiệm 100% CPU/GPU
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = null
        }
      } else if (activeLoop && !animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(activeLoop)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // ── 1. RAINDROPS ON GLASS ──
    if (config.canvasEffect === 'rain') {
      const dropCount = 130
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
        if (document.hidden) return
        // Clear with transparent so the beautiful background image shows through clearly!
        ctx.clearRect(0, 0, width, height)

        ctx.lineWidth = 1.5
        ctx.lineCap = 'round'

        for (let i = 0; i < dropCount; i++) {
          const d = drops[i]
          ctx.strokeStyle = `rgba(220, 240, 255, ${d.opacity})`
          ctx.beginPath()
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x - 2, d.y + d.length)
          ctx.stroke()

          d.y += d.speed
          d.x -= 0.6
          if (d.y > height) {
            d.y = -20
            d.x = Math.random() * (width + 50)
          }
        }
        animFrameRef.current = requestAnimationFrame(renderRain)
      }
      activeLoop = renderRain
      renderRain()
    }

    // ── 2. FLOATING FIRE EMBERS ──
    else if (config.canvasEffect === 'embers') {
      const emberCount = 65
      const embers: { x: number; y: number; r: number; speedY: number; speedX: number; opacity: number }[] = []
      for (let i = 0; i < emberCount; i++) {
        embers.push({
          x: Math.random() * width,
          y: height + Math.random() * 60,
          r: Math.random() * 2.8 + 1,
          speedY: Math.random() * 1.6 + 0.7,
          speedX: (Math.random() - 0.5) * 1.0,
          opacity: Math.random() * 0.8 + 0.2,
        })
      }

      const renderEmbers = () => {
        if (document.hidden) return
        ctx.clearRect(0, 0, width, height)

        for (let i = 0; i < emberCount; i++) {
          const e = embers[i]
          ctx.fillStyle = `rgba(255, ${Math.floor(150 + Math.random() * 80)}, 50, ${e.opacity})`
          ctx.beginPath()
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
          ctx.fill()

          e.y -= e.speedY
          e.x += e.speedX
          e.opacity -= 0.002
          if (e.y < -10 || e.opacity <= 0) {
            e.y = height + 10
            e.x = Math.random() * width
            e.opacity = Math.random() * 0.8 + 0.2
          }
        }
        animFrameRef.current = requestAnimationFrame(renderEmbers)
      }
      activeLoop = renderEmbers
      renderEmbers()
    }

    // ── 3. TWINKLING STARS & SHOOTING STAR ──
    else if (config.canvasEffect === 'stars') {
      const starCount = 140
      const stars: { x: number; y: number; r: number; alpha: number; delta: number }[] = []
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.7,
          r: Math.random() * 1.8 + 0.6,
          alpha: Math.random(),
          delta: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        })
      }

      let shootingStar: { x: number; y: number; length: number; speed: number; opacity: number; active: boolean } = {
        x: 0,
        y: 0,
        length: 100,
        speed: 16,
        opacity: 0,
        active: false,
      }
      let frame = 0

      const renderStars = () => {
        if (document.hidden) return
        frame++
        ctx.clearRect(0, 0, width, height)

        for (let i = 0; i < starCount; i++) {
          const s = stars[i]
          s.alpha += s.delta
          if (s.alpha <= 0.1 || s.alpha >= 0.95) s.delta = -s.delta

          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.08, s.alpha)})`
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }

        // Shooting star every ~200 frames
        if (!shootingStar.active && frame % 200 === 0) {
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
          shootingStar.opacity -= 0.02
          if (shootingStar.opacity <= 0) shootingStar.active = false
        }

        animFrameRef.current = requestAnimationFrame(renderStars)
      }
      activeLoop = renderStars
      renderStars()
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [config.canvasEffect])

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* 1. Fullscreen Beautiful Local Wallpaper */}
      <img
        src={config.imageUrl}
        alt=""
        key={config.imageUrl}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-700 brightness-95"
      />

      {/* 2. Transparent Animated Canvas Overlay (Rain / Embers / Stars) */}
      {config.canvasEffect && config.canvasEffect !== 'none' && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10" />
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
