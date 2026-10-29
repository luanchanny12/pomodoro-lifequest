// Picture-in-Picture (PiP) Floating Timer for Desktop & Mobile

export interface PipTimerData {
  timeStr: string
  progressPercent: number
  modeLabel: string
  topicNote: string
  isRunning: boolean
}

class PipTimerManager {
  private canvas: HTMLCanvasElement | null = null
  private video: HTMLVideoElement | null = null
  private isPip: boolean = false
  private onPlayPauseCallback: (() => void) | null = null
  private onExitCallback: (() => void) | null = null
  private lastData: PipTimerData = {
    timeStr: '25:00',
    progressPercent: 0,
    modeLabel: 'Pomodoro',
    topicNote: 'Tập trung học tập',
    isRunning: false,
  }

  isSupported(): boolean {
    return typeof document !== 'undefined' && 'pictureInPictureEnabled' in document
  }

  isActive(): boolean {
    return this.isPip && typeof document !== 'undefined' && document.pictureInPictureElement !== null
  }

  private initElements() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas')
      this.canvas.width = 512
      this.canvas.height = 512
    }
    if (!this.video) {
      this.video = document.createElement('video')
      this.video.muted = true
      this.video.playsInline = true
      this.video.autoplay = true

      this.video.addEventListener('leavepictureinpicture', () => {
        this.isPip = false
        if (this.onExitCallback) {
          this.onExitCallback()
        }
      })
    }
  }

  private render(data: PipTimerData) {
    if (!this.canvas) return
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return

    const { timeStr, progressPercent, modeLabel, topicNote, isRunning } = data
    const size = 512
    const center = size / 2

    // 1. Dark Cyberpunk Background
    const bgGradient = ctx.createRadialGradient(center, center, 40, center, center, center)
    bgGradient.addColorStop(0, '#101626')
    bgGradient.addColorStop(1, '#07090f')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, size, size)

    // Outer subtle glow ring
    ctx.save()
    ctx.beginPath()
    ctx.arc(center, center, 230, 0, Math.PI * 2)
    ctx.strokeStyle = isRunning ? 'rgba(6, 182, 212, 0.25)' : 'rgba(245, 158, 11, 0.2)'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.restore()

    // 2. Circular Countdown Progress Ring
    const radius = 180
    const startAngle = -Math.PI / 2
    const sweepAngle = (Math.PI * 2 * Math.min(100, Math.max(0, progressPercent))) / 100

    // Background track
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 18
    ctx.lineCap = 'round'
    ctx.stroke()

    // Foreground progress
    if (progressPercent > 0) {
      ctx.save()
      const ringGrad = ctx.createLinearGradient(center - radius, center, center + radius, center)
      if (modeLabel.toLowerCase().includes('nghỉ')) {
        ringGrad.addColorStop(0, '#10b981')
        ringGrad.addColorStop(1, '#06b6d4')
      } else {
        ringGrad.addColorStop(0, '#f59e0b')
        ringGrad.addColorStop(0.5, '#f43f5e')
        ringGrad.addColorStop(1, '#06b6d4')
      }
      ctx.beginPath()
      ctx.arc(center, center, radius, startAngle, startAngle + sweepAngle)
      ctx.strokeStyle = ringGrad
      ctx.lineWidth = 18
      ctx.lineCap = 'round'
      ctx.shadowColor = modeLabel.toLowerCase().includes('nghỉ') ? '#10b981' : '#06b6d4'
      ctx.shadowBlur = 15
      ctx.stroke()
      ctx.restore()
    }

    // 3. Top Mode Pill Badge
    ctx.save()
    ctx.fillStyle = isRunning ? 'rgba(6, 182, 212, 0.2)' : 'rgba(245, 158, 11, 0.2)'
    ctx.strokeStyle = isRunning ? 'rgba(6, 182, 212, 0.4)' : 'rgba(245, 158, 11, 0.4)'
    ctx.lineWidth = 2
    const pillWidth = 220
    const pillHeight = 44
    const pillX = center - pillWidth / 2
    const pillY = 110
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 22)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = isRunning ? '#67e8f9' : '#fcd34d'
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${isRunning ? '⚡ ' : '⏸ '}${modeLabel.toUpperCase()}`, center, pillY + pillHeight / 2)
    ctx.restore()

    // 4. Large Digital Time Display
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 96px "SF Mono", Menlo, Consolas, Monaco, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)'
    ctx.shadowBlur = 20
    ctx.fillText(timeStr, center, center + 10)
    ctx.restore()

    // 5. Bottom Topic / Goal Note
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const cleanNote = topicNote.length > 28 ? topicNote.substring(0, 26) + '...' : topicNote || 'Pomodoro LifeQuest'
    ctx.fillText(cleanNote, center, center + 100)

    // Percentage small text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(`${Math.round(progressPercent)}% • ${isRunning ? 'Đang chạy' : 'Tạm dừng'}`, center, center + 130)
    ctx.restore()
  }

  async togglePip(
    initialData: PipTimerData,
    onPlayPause: () => void,
    onExit: () => void
  ): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Trình duyệt của bạn chưa hỗ trợ tính năng Cửa sổ nổi Picture-in-Picture!')
    }

    this.initElements()
    this.onPlayPauseCallback = onPlayPause
    this.onExitCallback = onExit
    this.lastData = initialData

    if (this.isActive()) {
      await document.exitPictureInPicture()
      this.isPip = false
      return false
    }

    this.render(initialData)

    if (this.canvas && this.video) {
      const stream = (this.canvas as any).captureStream ? (this.canvas as any).captureStream(15) : null
      if (!stream) {
        throw new Error('Không thể thu luồng Canvas stream')
      }
      this.video.srcObject = stream
      await this.video.play()
      await this.video.requestPictureInPicture()
      this.isPip = true

      // Setup Media Session actions for PiP controls
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `Pomodoro ${initialData.timeStr}`,
          artist: initialData.topicNote || 'LifeQuest Focus Hub',
          album: initialData.modeLabel,
        })
        navigator.mediaSession.setActionHandler('play', () => {
          if (this.onPlayPauseCallback) this.onPlayPauseCallback()
        })
        navigator.mediaSession.setActionHandler('pause', () => {
          if (this.onPlayPauseCallback) this.onPlayPauseCallback()
        })
      }

      return true
    }

    return false
  }

  update(data: Partial<PipTimerData>) {
    this.lastData = { ...this.lastData, ...data }
    if (this.canvas) {
      this.render(this.lastData)
    }
  }

  async stop() {
    if (this.isActive()) {
      try {
        await document.exitPictureInPicture()
      } catch {}
    }
    this.isPip = false
  }
}

export const pipTimerManager = new PipTimerManager()
