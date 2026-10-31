import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Sparkles,
  Orbit,
  Globe,
  Pause,
  Play,
  RotateCcw,
  Zap,
  BookOpen,
  Clock,
  Award,
  Layers,
  X,
  Compass,
  Star,
  CheckCircle2,
  Trophy,
  Volume2,
  Lock,
  Unlock,
  ChevronRight,
  Flame,
  Target,
  ArrowLeft,
} from 'lucide-react'
import {
  focusService,
  TopicPlanet,
  TopicGalaxy,
  SunStats,
  ConstellationAchievement,
} from '@/services/focusService'
import { soundManager } from '@/utils/soundEffects'
import { ConstellationUnlockModal } from './ConstellationUnlockModal'
import { PlanetBuilderModal } from './PlanetBuilderModal'

interface StarParticle {
  x: number
  y: number
  radius: number
  alpha: number
  phase: number
  speed: number
  color: string
}

export interface TopicGalaxyViewProps {
  onBackToGoals?: () => void
}

export const TopicGalaxyViewComponent: React.FC<TopicGalaxyViewProps> = ({ onBackToGoals }) => {
  const [galaxy, setGalaxy] = useState<TopicGalaxy | null>(null)
  const [constellations, setConstellations] = useState<ConstellationAchievement[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'canvas' | 'cards' | 'hall'>('canvas')
  const [isPaused, setIsPaused] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0)

  // Selected planet or sun for modal details
  const [selectedPlanet, setSelectedPlanet] = useState<TopicPlanet | null>(null)
  const [buildingGoal, setBuildingGoal] = useState<{
    id: number
    title: string
    current_hours: number
    target_hours: number
    planet_type?: string
    planet_data?: string | null
    is_completed?: boolean
  } | null>(null)
  const [isSunModalOpen, setIsSunModalOpen] = useState(false)

  // Active Constellation modal (celebration / view reading)
  const [viewingConstellation, setViewingConstellation] = useState<ConstellationAchievement | null>(null)

  // Hover state on canvas
  const [hoveredPlanetIndex, setHoveredPlanetIndex] = useState<number | null>(null)
  const [isSunHovered, setIsSunHovered] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const timeRef = useRef<number>(0)

  // Load galaxy data & check constellations
  const loadData = async () => {
    try {
      const [galaxyData, constellationList, checkResult] = await Promise.all([
        focusService.getGalaxy(),
        focusService.getConstellations(),
        focusService.checkConstellations(),
      ])

      setGalaxy(galaxyData)
      setConstellations(constellationList)

      // If a new constellation was just unlocked, trigger grand fanfare and open modal!
      if (checkResult.newly_unlocked) {
        soundManager.playConstellationVictory()
        setViewingConstellation(checkResult.newly_unlocked)
        // Refresh constellations list with the new unlock state
        const refreshedList = await focusService.getConstellations()
        setConstellations(refreshedList)
      }
    } catch (err) {
      console.error('Error loading galaxy and constellations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const planets = useMemo(() => galaxy?.planets || [], [galaxy])
  const sunStats: SunStats = useMemo(() => {
    return galaxy?.sun_stats || {
      name: 'Mặt Trời Tri Thức',
      total_hours: 0,
      total_sessions: 0,
      solar_power: 'Cốt Lõi Ý Chí',
    }
  }, [galaxy])

  // Count completed constellations
  const unlockedConstellationsCount = useMemo(() => {
    return constellations.filter((c) => c.is_unlocked).length
  }, [constellations])

  // Pre-generate background stars for the celestial milky way
  const backgroundStars = useMemo<StarParticle[]>(() => {
    const stars: StarParticle[] = []
    const colors = ['#ffffff', '#fef3c7', '#e0f2fe', '#f3e8ff', '#fbcfe8']
    for (let i = 0; i < 140; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        radius: 0.6 + Math.random() * 1.6,
        alpha: 0.2 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }
    return stars
  }, [])

  // Canvas Orrery Animation Loop
  useEffect(() => {
    if (viewMode !== 'canvas') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastTimestamp = performance.now()
    let planetCoords: { x: number; y: number; r: number; planet: TopicPlanet; index: number }[] = []

    const render = (now: number) => {
      if (document.hidden) return
      const dt = (now - lastTimestamp) / 1000
      lastTimestamp = now

      if (!isPaused) {
        timeRef.current += dt * speedMultiplier
      }
      const t = timeRef.current

      // Handle Resize / High DPI
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = rect.width
      const height = rect.height

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr
        canvas.height = height * dpr
      }

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2

      // ── 1. COSMIC BACKGROUND & NEBULA DUST ──
      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.75)
      bgGrad.addColorStop(0, '#090d1a')
      bgGrad.addColorStop(0.5, '#05070e')
      bgGrad.addColorStop(1, '#020306')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Soft purple / cyan nebula haze
      const nebula1 = ctx.createRadialGradient(cx - width * 0.25, cy - height * 0.2, 10, cx - width * 0.25, cy - height * 0.2, width * 0.5)
      nebula1.addColorStop(0, 'rgba(112, 26, 117, 0.12)')
      nebula1.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = nebula1
      ctx.fillRect(0, 0, width, height)

      const nebula2 = ctx.createRadialGradient(cx + width * 0.25, cy + height * 0.2, 10, cx + width * 0.25, cy + height * 0.2, width * 0.45)
      nebula2.addColorStop(0, 'rgba(14, 116, 144, 0.10)')
      nebula2.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = nebula2
      ctx.fillRect(0, 0, width, height)

      // Twinkling Starfield
      backgroundStars.forEach((star) => {
        const starX = star.x * width
        const starY = star.y * height
        const alpha = Math.max(0.15, Math.min(1, star.alpha + Math.sin(t * star.speed * 60 + star.phase) * 0.35))
        ctx.beginPath()
        ctx.arc(starX, starY, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = star.color
        ctx.globalAlpha = alpha
        ctx.fill()
      })
      ctx.globalAlpha = 1.0

      // ── 2. CALCULATE PLANET ORBITAL POSITIONS ──
      const baseA = Math.min(width * 0.2, 95)
      const stepA = Math.min(width * 0.08, 48)
      const aspect = 0.58 // Elliptical perspective tilt

      planetCoords = []
      planets.forEach((p, idx) => {
        const a = baseA + idx * stepA
        const b = a * aspect

        const omega = (0.32 / Math.pow(idx + 1, 0.55))
        const initialPhase = (idx * 1.618033) * Math.PI * 2
        const theta = initialPhase + omega * t

        const px = cx + a * Math.cos(theta)
        const py = cy + b * Math.sin(theta)
        const pr = 10 + p.level * 2.8

        planetCoords.push({
          x: px,
          y: py,
          r: pr,
          planet: p,
          index: idx,
        })
      })

      // ── 3. ORBIT TRACKS (ELLIPSES) ──
      planets.forEach((p, idx) => {
        const a = baseA + idx * stepA
        const b = a * aspect
        const isHovered = hoveredPlanetIndex === idx

        ctx.beginPath()
        ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2)
        ctx.lineWidth = isHovered ? 1.5 : 0.8
        ctx.strokeStyle = p.is_completed
          ? 'rgba(251, 191, 36, 0.30)'
          : isHovered
          ? 'rgba(56, 189, 248, 0.45)'
          : 'rgba(255, 255, 255, 0.08)'
        ctx.setLineDash([4, 6])
        ctx.stroke()
        ctx.setLineDash([])
      })

      // If 0 goals yet, draw shimmering ghost orbits waiting for goals
      if (planets.length === 0) {
        ;[85, 145, 205].forEach((a) => {
          ctx.beginPath()
          ctx.ellipse(cx, cy, a, a * aspect, 0, 0, Math.PI * 2)
          ctx.lineWidth = 0.8
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'
          ctx.setLineDash([3, 7])
          ctx.stroke()
          ctx.setLineDash([])
        })
      }

      // ── 4. ASTROLOGICAL CONSTELLATION LINES (CHIÊM TINH KHI CÓ MỤC TIÊU HOÀN THÀNH) ──
      if (planetCoords.length >= 1) {
        const links = galaxy?.constellation_links || []

        links.forEach(([fromName, toName]) => {
          const fromNode = planetCoords.find((c) => c.planet.name === fromName)
          const toNode = planetCoords.find((c) => c.planet.name === toName)
          if (!fromNode || !toNode) return

          const isConnectedToHover =
            hoveredPlanetIndex !== null &&
            (planetCoords[hoveredPlanetIndex].planet.name === fromName ||
              planetCoords[hoveredPlanetIndex].planet.name === toName)

          ctx.beginPath()
          ctx.moveTo(fromNode.x, fromNode.y)
          ctx.lineTo(toNode.x, toNode.y)

          ctx.lineWidth = isConnectedToHover ? 2.2 : 1.4
          ctx.strokeStyle = isConnectedToHover
            ? 'rgba(251, 191, 36, 0.95)'
            : 'rgba(245, 158, 11, 0.45)'
          ctx.setLineDash([4, 4])
          ctx.stroke()
          ctx.setLineDash([])

          // Glowing diamond star node at midpoint
          const midX = (fromNode.x + toNode.x) / 2
          const midY = (fromNode.y + toNode.y) / 2
          ctx.fillStyle = '#fbbf24'
          ctx.beginPath()
          ctx.arc(midX, midY, 1.8, 0, Math.PI * 2)
          ctx.fill()
        })

        // Draw soft radial golden cords from each completed planet to the Sun
        planetCoords.filter((c) => c.planet.is_completed).forEach((p) => {
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(p.x, p.y)
          ctx.lineWidth = 1.0
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)'
          ctx.setLineDash([2, 6])
          ctx.stroke()
          ctx.setLineDash([])
        })
      }

      // ── 5. THE CENTRAL SUN (MẶT TRỜI TRI THỨC) ──
      const sunRadius = 34
      const sunPulse = Math.sin(t * 2.5) * 2.5

      // Sun Outer Corona Aura
      const sunAura = ctx.createRadialGradient(cx, cy, sunRadius * 0.5, cx, cy, (sunRadius + 30) + sunPulse)
      sunAura.addColorStop(0, 'rgba(251, 191, 36, 0.65)')
      sunAura.addColorStop(0.4, 'rgba(245, 158, 11, 0.35)')
      sunAura.addColorStop(0.8, 'rgba(217, 119, 6, 0.12)')
      sunAura.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = sunAura
      ctx.beginPath()
      ctx.arc(cx, cy, (sunRadius + 30) + sunPulse, 0, Math.PI * 2)
      ctx.fill()

      // Rotating Solar Flares
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.2)
      for (let i = 0; i < 12; i++) {
        const rayAngle = (i * Math.PI) / 6
        const rayLen = sunRadius + 15 + Math.sin(t * 4 + i) * 5
        ctx.beginPath()
        ctx.moveTo(Math.cos(rayAngle - 0.08) * (sunRadius * 0.8), Math.sin(rayAngle - 0.08) * (sunRadius * 0.8))
        ctx.lineTo(Math.cos(rayAngle) * rayLen, Math.sin(rayAngle) * rayLen)
        ctx.lineTo(Math.cos(rayAngle + 0.08) * (sunRadius * 0.8), Math.sin(rayAngle + 0.08) * (sunRadius * 0.8))
        ctx.closePath()
        ctx.fillStyle = 'rgba(252, 211, 77, 0.35)'
        ctx.fill()
      }
      ctx.restore()

      // Core Sun Sphere with 3D Radial Gradient
      const sunGrad = ctx.createRadialGradient(cx - 7, cy - 7, 3, cx, cy, sunRadius)
      sunGrad.addColorStop(0, '#ffffff')
      sunGrad.addColorStop(0.25, '#fef08a')
      sunGrad.addColorStop(0.65, '#f59e0b')
      sunGrad.addColorStop(0.9, '#d97706')
      sunGrad.addColorStop(1, '#b45309')

      ctx.beginPath()
      ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2)
      ctx.fillStyle = sunGrad
      ctx.shadowColor = '#f59e0b'
      ctx.shadowBlur = isSunHovered ? 30 : 20
      ctx.fill()
      ctx.shadowBlur = 0

      // Sun Core Text
      ctx.fillStyle = '#78350f'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('☀️ SOL', cx, cy - 5)

      ctx.fillStyle = '#451a03'
      ctx.font = 'bold 9px monospace'
      ctx.fillText(`${(sunStats.total_hours || 0).toFixed(1)}h`, cx, cy + 8)

      // ── 6. REVOLVING GOAL PLANETS ──
      planetCoords.forEach((node) => {
        const { x, y, r, planet, index } = node
        const isHovered = hoveredPlanetIndex === index

        // ASCENDED SUPERNOVA GLOW ON COMPLETED (DONE) GOALS!
        if (planet.is_completed) {
          const goldAura = ctx.createRadialGradient(x, y, r * 0.5, x, y, r + 16)
          goldAura.addColorStop(0, 'rgba(251, 191, 36, 0.65)')
          goldAura.addColorStop(0.6, 'rgba(245, 158, 11, 0.25)')
          goldAura.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.beginPath()
          ctx.arc(x, y, r + 16, 0, Math.PI * 2)
          ctx.fillStyle = goldAura
          ctx.fill()

          // Golden Crown / Trophy Sparkle above planet
          const sparkY = y - r - 12
          ctx.save()
          ctx.translate(x, sparkY)
          ctx.rotate(t * 1.5)
          ctx.fillStyle = '#fbbf24'
          ctx.beginPath()
          ctx.moveTo(0, -6)
          ctx.lineTo(2.5, 0)
          ctx.lineTo(0, 6)
          ctx.lineTo(-2.5, 0)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
        } else if (planet.is_recent) {
          // Supernova pulse on in-progress goal studied recently
          const waveRadius = r + 8 + (Math.sin(t * 3.5) * 0.5 + 0.5) * 14
          ctx.beginPath()
          ctx.arc(x, y, waveRadius, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        // Planetary Rings for Level >= 3 (like Saturn)
        if (planet.level >= 3) {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(-0.35)
          ctx.beginPath()
          ctx.ellipse(0, 0, r * 1.8, r * 0.5, 0, 0, Math.PI * 2)
          ctx.strokeStyle = planet.is_completed ? 'rgba(251, 191, 36, 0.8)' : `${planet.color}88`
          ctx.lineWidth = planet.level >= 4 ? 2.5 : 1.5
          ctx.stroke()
          ctx.restore()
        }

        // 3D Spherical Planet Body illuminated by the Central Sun
        const lightAngle = Math.atan2(cy - y, cx - x)
        const lightDist = Math.min(r * 0.45, 6)
        const lightX = x + Math.cos(lightAngle) * lightDist
        const lightY = y + Math.sin(lightAngle) * lightDist

        const planetGrad = ctx.createRadialGradient(lightX, lightY, r * 0.15, x, y, r)
        if (planet.is_completed) {
          planetGrad.addColorStop(0, '#ffffff')
          planetGrad.addColorStop(0.3, '#fde047')
          planetGrad.addColorStop(0.7, '#d97706')
          planetGrad.addColorStop(1, '#78350f')
        } else {
          planetGrad.addColorStop(0, '#ffffff')
          planetGrad.addColorStop(0.35, planet.color)
          planetGrad.addColorStop(0.8, '#1e293b')
          planetGrad.addColorStop(1, '#020617')
        }

        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = planetGrad
        ctx.shadowColor = planet.is_completed ? '#fbbf24' : planet.color
        ctx.shadowBlur = isHovered ? 18 : 8
        ctx.fill()
        ctx.shadowBlur = 0

        // Highlight ring on hover
        if (isHovered) {
          ctx.beginPath()
          ctx.arc(x, y, r + 4, 0, Math.PI * 2)
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        // Celestial Name Label (TÊN CHIÊM TINH: Polaris, Sirius, Vega...)
        ctx.font = isHovered ? 'bold 11px sans-serif' : '10px sans-serif'
        ctx.fillStyle = planet.is_completed ? '#fde047' : isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.9)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.shadowColor = '#000000'
        ctx.shadowBlur = 4

        ctx.fillText(planet.name, x, y + r + 5)

        // Status badge under name (DONE or %)
        ctx.font = 'bold 8px monospace'
        ctx.fillStyle = planet.is_completed
          ? '#fbbf24'
          : 'rgba(148, 163, 184, 0.9)'
        const statusText = planet.is_completed
          ? `🏆 DONE • ${planet.current_hours}h`
          : `${planet.progress_percent}% • ${planet.current_hours}/${planet.target_hours}h`
        ctx.fillText(statusText, x, y + r + 18)
        ctx.shadowBlur = 0
      })

      // ── 7. HOVER TOOLTIP BOX (REVEALS REAL GOAL TITLE & METRICS) ──
      if (hoveredPlanetIndex !== null && planetCoords[hoveredPlanetIndex]) {
        const hovered = planetCoords[hoveredPlanetIndex]
        const { x, y, planet } = hovered

        const boxWidth = 190
        const boxHeight = 64
        const boxX = Math.min(width - boxWidth - 10, Math.max(10, x - boxWidth / 2))
        const boxY = Math.max(12, y - boxHeight - 24)

        // Glassmorphism tooltip
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)'
        ctx.strokeStyle = planet.is_completed ? 'rgba(251, 191, 36, 0.6)' : 'rgba(56, 189, 248, 0.5)'
        ctx.lineWidth = 1

        ctx.beginPath()
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10)
        ctx.fill()
        ctx.stroke()

        // Celestial name
        ctx.fillStyle = planet.is_completed ? '#fbbf24' : '#38bdf8'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(`🌟 ${planet.name}`, boxX + 10, boxY + 15)

        // Real Goal Title
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 11px sans-serif'
        const trReal = planet.real_title.length > 22 ? planet.real_title.substring(0, 20) + '...' : planet.real_title
        ctx.fillText(`🎯 ${trReal}`, boxX + 10, boxY + 31)

        // Progress & Status
        ctx.fillStyle = planet.is_completed ? '#fde047' : '#94a3b8'
        ctx.font = '9px sans-serif'
        const statusStr = planet.is_completed
          ? `🏆 Đã hoàn thành (${planet.current_hours}/${planet.target_hours}h)`
          : `Đang học: ${planet.progress_percent}% (${planet.current_hours}/${planet.target_hours}h)`
        ctx.fillText(statusStr, boxX + 10, boxY + 47)
      }

      ctx.restore()

      animFrameRef.current = requestAnimationFrame(render)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = null
        }
      } else if (!animFrameRef.current && viewMode === 'canvas') {
        lastTimestamp = performance.now()
        animFrameRef.current = requestAnimationFrame(render)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [viewMode, isPaused, speedMultiplier, planets, galaxy, hoveredPlanetIndex, isSunHovered, backgroundStars, sunStats])

  // Hit testing for both Mouse Hover, Mouse Click, and Mobile Touch Tap
  const getHitTarget = (clientX: number, clientY: number): { type: 'sun' } | { type: 'planet'; planet: TopicPlanet; index: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mouseX = clientX - rect.left
    const mouseY = clientY - rect.top

    const cx = rect.width / 2
    const cy = rect.height / 2

    // Check Sun hit (generous 44px radius for comfortable mobile tap)
    if (Math.hypot(mouseX - cx, mouseY - cy) <= 44) {
      return { type: 'sun' }
    }

    // Check Planets hit
    const baseA = Math.min(rect.width * 0.2, 95)
    const stepA = Math.min(rect.width * 0.08, 48)
    const aspect = 0.58

    for (let idx = 0; idx < planets.length; idx++) {
      const p = planets[idx]
      const a = baseA + idx * stepA
      const b = a * aspect
      const omega = (0.32 / Math.pow(idx + 1, 0.55))
      const initialPhase = (idx * 1.618033) * Math.PI * 2
      const theta = initialPhase + omega * timeRef.current

      const px = cx + a * Math.cos(theta)
      const py = cy + b * Math.sin(theta)
      const pr = 12 + p.level * 3

      const dist = Math.hypot(mouseX - px, mouseY - py)
      // Generous hit radius for mobile touch (at least 28px radius)
      if (dist <= Math.max(28, pr + 12)) {
        return { type: 'planet', planet: p, index: idx }
      }
    }
    return null
  }

  // Canvas Mouse Move (Hit testing for hover on Desktop)
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = getHitTarget(e.clientX, e.clientY)
    const canvas = canvasRef.current
    if (!canvas) return

    if (hit?.type === 'sun') {
      setIsSunHovered(true)
      setHoveredPlanetIndex(null)
      canvas.style.cursor = 'pointer'
    } else if (hit?.type === 'planet') {
      setIsSunHovered(false)
      setHoveredPlanetIndex(hit.index)
      canvas.style.cursor = 'pointer'
    } else {
      setIsSunHovered(false)
      setHoveredPlanetIndex(null)
      canvas.style.cursor = 'default'
    }
  }

  // Canvas Click (Desktop Mouse Click)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = getHitTarget(e.clientX, e.clientY)
    if (!hit) return

    soundManager.playCosmicChime()
    if (hit.type === 'sun') {
      setIsSunModalOpen(true)
    } else if (hit.type === 'planet') {
      setSelectedPlanet(hit.planet)
    }
  }

  // Canvas Touch (Mobile Touch Tap)
  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.changedTouches.length === 0) return
    const touch = e.changedTouches[0]
    const hit = getHitTarget(touch.clientX, touch.clientY)
    if (!hit) return

    e.preventDefault()
    soundManager.playCosmicChime()
    if (hit.type === 'sun') {
      setIsSunModalOpen(true)
    } else if (hit.type === 'planet') {
      setSelectedPlanet(hit.planet)
    }
  }

  if (loading) {
    return (
      <div className="bg-black/45 backdrop-blur-xl border border-white/20 rounded-3xl p-12 text-center text-white/50 text-xs animate-pulse">
        🌌 Đang quét dải ngân hà mục tiêu & kho tàng chiêm tinh...
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="bg-black/50 backdrop-blur-xl border border-white/20 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden"
    >
      {/* ── TOP HEADER & CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          {onBackToGoals && (
            <button
              type="button"
              onClick={onBackToGoals}
              className="p-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white rounded-2xl border border-white/15 transition flex items-center gap-1.5 flex-shrink-0"
              title="Quay lại danh sách Mục tiêu lớn"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-300" />
              <span className="text-xs font-bold">Quay lại</span>
            </button>
          )}
          <div className="p-2.5 bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-cyan-500/20 text-amber-300 rounded-2xl border border-amber-400/30 flex-shrink-0">
            <Orbit className="w-5 h-5 animate-spin" style={{ animationDuration: '24s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white tracking-wide">
                Thiên Hà Tri Thức
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                {planets.length} Hành Tinh Mục Tiêu
              </span>
              {galaxy?.completed_goals !== undefined && galaxy.completed_goals > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-yellow-400" />
                  {galaxy.completed_goals} Đã Xong
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              Mỗi mục tiêu là một hành tinh chiêm tinh • Hoàn thành để kết nối chòm sao có ý nghĩa!
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
          {/* Pause / Play orbit */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition backdrop-blur-md"
            title={isPaused ? 'Tiếp tục xoay quỹ đạo' : 'Tạm dừng xoay quỹ đạo'}
          >
            {isPaused ? <Play className="w-4 h-4 fill-current text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Speed Toggle */}
          <button
            onClick={() => {
              const speeds = [1.0, 2.0, 0.5]
              const nextIndex = (speeds.indexOf(speedMultiplier) + 1) % speeds.length
              setSpeedMultiplier(speeds[nextIndex])
            }}
            className="px-2.5 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition flex items-center gap-1"
            title="Đổi vận tốc xoay quỹ đạo"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>{speedMultiplier}x</span>
          </button>

          {/* Hall of Constellations Button */}
          <button
            onClick={() => setViewMode(viewMode === 'hall' ? 'canvas' : 'hall')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 text-xs font-bold border ${
              viewMode === 'hall'
                ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-500/20'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
            }`}
            title="Mở Kho Tàng Thành Tựu Chiêm Tinh & Bản Đọc AI"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Kho Tàng Chiêm Tinh ({unlockedConstellationsCount}/6)</span>
          </button>

          {/* View Mode Toggle (Canvas vs Cards) */}
          <button
            onClick={() => setViewMode(viewMode === 'cards' ? 'canvas' : 'cards')}
            className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-medium ${
              viewMode === 'cards'
                ? 'bg-cyan-500 text-black font-bold'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Đổi chế độ xem Vũ Trụ / Thẻ danh sách"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">{viewMode === 'canvas' ? 'Thẻ' : 'Vũ Trụ'}</span>
          </button>
        </div>
      </div>

      {/* ── EMPTY STATE BANNER WHEN 0 GOALS ── */}
      {planets.length === 0 && (
        <div className="mb-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 animate-spin" style={{ animationDuration: '10s' }} />
          <span>
            <strong>Vũ trụ đang ở thuở sơ khai:</strong> Chưa có mục tiêu nào được tạo. Hiện tại chỉ có duy nhất Mặt Trời Ý Chí đang tỏa sáng tại tâm ngân hà. Hãy tạo Mục tiêu lớn đầu tiên (ví dụ 1000h Tiếng Anh) để khai sinh hành tinh mới xoay quanh Mặt Trời!
          </span>
        </div>
      )}

      {/* ── VIEW MODE 1: INTERACTIVE CELESTIAL ORRERY CANVAS ── */}
      {viewMode === 'canvas' && (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#030712] shadow-inner">
          <canvas
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => {
              setHoveredPlanetIndex(null)
              setIsSunHovered(false)
            }}
            onClick={handleCanvasClick}
            onTouchEnd={handleCanvasTouchEnd}
            className="w-full h-[440px] sm:h-[480px] block select-none cursor-pointer"
          />

          {/* Legend indicator overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-white/70">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Mặt Trời (Cốt lõi)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-sm" /> 🏆 Mục tiêu DONE
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Đang học (%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-amber-400 border-t border-dashed" /> Đường Chiêm Tinh
            </span>
          </div>

          <div className="absolute top-3 right-3 text-[11px] text-white/50 italic pointer-events-none">
            💡 Nhấp vào Hành Tinh để xem Chi Tiết Mục Tiêu Thực Tế
          </div>
        </div>
      )}

      {/* ── VIEW MODE 2: DETAILED GOALS CARD GRID ── */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 animate-in fade-in duration-200">
          {planets.map((p, idx) => (
            <button
              key={p.goal_id + '-' + idx}
              onClick={() => {
                soundManager.playCosmicChime()
                setSelectedPlanet(p)
              }}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group ${
                p.is_completed
                  ? 'bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border-amber-400/50 shadow-lg shadow-amber-500/10'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-cyan-400/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                  {p.name}
                </span>
                {p.is_completed ? (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-yellow-400 text-black rounded-full shadow">
                    🏆 DONE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[9px] font-semibold bg-white/10 text-white/70 rounded-full">
                    {p.progress_percent}%
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-white mb-2 line-clamp-1 group-hover:text-amber-200 transition">
                {p.real_title}
              </h4>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    p.is_completed
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                      : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, p.progress_percent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span>{p.current_hours} / {p.target_hours} giờ</span>
                <span>{p.session_count} buổi học</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── VIEW MODE 3: KHO TÀNG CHIÊM TINH (HALL OF CONSTELLATION ACHIEVEMENTS) ── */}
      {viewMode === 'hall' && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-indigo-500/15 border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                Kho Tàng Thành Tựu Chiêm Tinh & Bản Luận Giải AI
              </h4>
              <p className="text-xs text-white/70 mt-0.5">
                Mỗi khi bạn hoàn thành 1 mục tiêu lớn, các hành tinh sẽ nối lại tạo nên 1 Chòm Sao Huyền Thoại!
              </p>
            </div>
            <div className="text-xs font-bold text-amber-300 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 self-start sm:self-auto">
              Đã mở khóa: {unlockedConstellationsCount} / 6 Chòm Sao
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {constellations.map((c) => (
              <div
                key={c.code}
                className={`p-4.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  c.is_unlocked
                    ? 'bg-gradient-to-br from-amber-500/15 via-[#131722] to-[#0a0d17] border-amber-400/50 shadow-lg shadow-amber-500/10'
                    : 'bg-black/40 border-white/10 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl p-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30">
                        {c.icon}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {c.title}
                        </h4>
                        <span className="text-[10px] text-amber-300/80 font-medium">
                          {c.archetype} • Cần: {c.required_completed_goals} mục tiêu DONE
                        </span>
                      </div>
                    </div>

                    {c.is_unlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-400 text-black shadow">
                        <Unlock className="w-3 h-3" /> ĐÃ KHAI MỞ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-white/10 text-white/50">
                        <Lock className="w-3 h-3" /> Khóa
                      </span>
                    )}
                  </div>

                  {c.is_unlocked ? (
                    <p className="text-xs text-amber-100/90 font-serif italic line-clamp-3 bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 mb-3">
                      "{c.ai_interpretation}"
                    </p>
                  ) : (
                    <div className="text-xs text-white/50 bg-black/40 p-3 rounded-xl border border-white/5 mb-3">
                      🔒 Hãy hoàn thành thêm {Math.max(0, c.required_completed_goals - (galaxy?.completed_goals || 0))} mục tiêu nữa để các hành tinh kết nối và mở khóa chòm sao này!
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  {c.is_unlocked ? (
                    <button
                      onClick={() => setViewingConstellation(c)}
                      className="w-full py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>Nghe Đọc & Xem Ý Nghĩa Chiêm Tinh</span>
                    </button>
                  ) : (
                    <div className="w-full">
                      <div className="flex justify-between text-[10px] text-white/60 mb-1">
                        <span>Tiến độ hoàn thành</span>
                        <span>{c.progress_percent}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                          style={{ width: `${c.progress_percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL 1: REAL GOAL DETAIL MODAL (WHEN PLANET CLICKED) ── */}
      {selectedPlanet && (
        <div
          onClick={() => setSelectedPlanet(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm max-h-[92vh] flex flex-col bg-gradient-to-b from-[#181d2c] via-[#0f1422] to-[#0a0d17] border border-cyan-400/40 rounded-3xl text-white text-center shadow-2xl overflow-hidden"
          >
            <button
              onClick={() => setSelectedPlanet(null)}
              className="absolute top-3 right-3 p-2 text-white/70 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition z-20"
              title="Đóng chi tiết"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto p-5 sm:p-6 custom-scrollbar">
              {/* Planet Sphere in 3D */}
              <div
                className="w-20 h-20 rounded-full mx-auto mb-3 shadow-2xl relative"
                style={{
                  background: selectedPlanet.is_completed
                    ? 'radial-gradient(circle at 35% 35%, #ffffff, #fde047 40%, #d97706 80%, #78350f 100%)'
                    : `radial-gradient(circle at 35% 35%, #ffffff, ${selectedPlanet.color} 50%, #000000 100%)`,
                  boxShadow: selectedPlanet.is_completed
                    ? '0 0 35px #f59e0b'
                    : `0 0 25px ${selectedPlanet.color}`,
                }}
              >
                {selectedPlanet.is_completed && (
                  <div className="absolute -inset-2 rounded-full border border-amber-400/60 animate-ping pointer-events-none" />
                )}
              </div>

              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1 flex items-center justify-center gap-1">
                <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                {selectedPlanet.name} (Tên Chiêm Tinh)
              </div>

              {/* REAL GOAL TITLE */}
              <h4 className="text-xl font-bold text-white mb-2">
                {selectedPlanet.real_title}
              </h4>

              {/* Status pill */}
              <div className="mb-4">
                {selectedPlanet.is_completed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-black shadow-md">
                    <Trophy className="w-3.5 h-3.5" /> 🏆 ĐÃ HOÀN THÀNH MỤC TIÊU (DONE)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" /> Đang học tập: {selectedPlanet.progress_percent}%
                  </span>
                )}
              </div>

              {/* Goal detailed statistics */}
              <div className="bg-black/50 rounded-2xl p-4 text-xs space-y-2.5 border border-white/10 text-left mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Tiến độ tích lũy:</span>
                  <span className="font-extrabold text-white text-sm">
                    {selectedPlanet.current_hours} / {selectedPlanet.target_hours} giờ
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedPlanet.is_completed
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                        : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, selectedPlanet.progress_percent)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-white/60">Số phiên đã tập trung:</span>
                  <span className="font-bold text-white">{selectedPlanet.session_count} buổi</span>
                </div>

                {selectedPlanet.category && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Phân loại:</span>
                    <span className="font-medium text-cyan-300">{selectedPlanet.category}</span>
                  </div>
                )}

                {selectedPlanet.notes && (
                  <div className="pt-2 border-t border-white/10 text-[11px] text-white/70 italic">
                    "{selectedPlanet.notes}"
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setBuildingGoal({
                      id: selectedPlanet.goal_id,
                      title: selectedPlanet.real_title,
                      current_hours: selectedPlanet.current_hours,
                      target_hours: selectedPlanet.target_hours,
                      planet_type: selectedPlanet.planet_type || 'earth',
                      planet_data: selectedPlanet.planet_data || '[]',
                      is_completed: selectedPlanet.is_completed,
                    })
                    setSelectedPlanet(null)
                  }}
                  className="w-full py-3 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:opacity-95 text-black font-black text-xs sm:text-sm rounded-xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Globe className="w-4 h-4" />
                  <span>🌍 Vào Xây Dựng Hành Tinh</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlanet(null)}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white/80 font-bold text-xs rounded-xl transition active:scale-95"
                >
                  Đóng chi tiết
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CENTRAL SUN ENERGY MODAL ── */}
      {isSunModalOpen && (
        <div
          onClick={() => setIsSunModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm max-h-[92vh] flex flex-col bg-gradient-to-b from-[#2b1805] via-[#1a0f05] to-[#0a0502] border-2 border-amber-500/40 rounded-3xl text-white text-center shadow-2xl overflow-hidden"
          >
            <button
              onClick={() => setIsSunModalOpen(false)}
              className="absolute top-3 right-3 p-2 text-white/70 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto p-5 sm:p-6 custom-scrollbar">
              {/* Glowing Sun Emblem */}
              <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 shadow-2xl shadow-amber-500/50">
                <span className="text-3xl animate-spin" style={{ animationDuration: '30s' }}>☀️</span>
              </div>

              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                Trọng Tâm Ngân Hà • The Solar Core
              </div>

              <h4 className="text-2xl font-black text-amber-100 mb-1">
                {sunStats.name || 'Mặt Trời Tri Thức'}
              </h4>

              <p className="text-xs text-amber-200/70 mb-4">
                Nguồn năng lượng giữ vững quỹ đạo cho toàn bộ các mục tiêu bạn đặt ra
              </p>

              <div className="bg-black/50 rounded-2xl p-4 text-xs space-y-2.5 border border-amber-500/20 text-left mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-amber-200/70">Tổng thời gian chiếu sáng:</span>
                  <span className="font-extrabold text-amber-300 text-base">
                    {(sunStats.total_hours || 0).toFixed(1)} giờ
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-200/70">Tổng phiên tập trung:</span>
                  <span className="font-bold text-white">{sunStats.total_sessions || 0} phiên</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-200/70">Số hành tinh mục tiêu:</span>
                  <span className="font-bold text-cyan-300">{planets.length} mục tiêu</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-amber-500/20">
                  <span className="text-amber-200/70">Trạng thái quang năng:</span>
                  <span className="font-bold text-amber-400">🔥 {sunStats.solar_power || 'Bừng sáng'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSunModalOpen(false)}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:opacity-90 text-black font-extrabold text-xs rounded-xl transition shadow-lg shadow-amber-500/25 active:scale-95"
              >
                Hòa mình vào ánh sáng mặt trời ☀️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: CONSTELLATION ACHIEVEMENT CELEBRATION & VOICE READING ── */}
      <ConstellationUnlockModal
        constellation={viewingConstellation}
        onClose={() => setViewingConstellation(null)}
      />

      {/* ── MODAL 4: PLANET BUILDER MINI-GAME ── */}
      <PlanetBuilderModal
        isOpen={Boolean(buildingGoal)}
        onClose={() => setBuildingGoal(null)}
        goal={buildingGoal}
        onSaveSuccess={loadData}
      />
    </div>
  )

}

export const TopicGalaxyView = React.memo(TopicGalaxyViewComponent)
