// Picture-in-Picture (PiP) Floating Timer for Desktop & Mobile
// Tối ưu hóa hiệu năng cao: Hỗ trợ Document PiP (0% GPU video encoder) và Video Canvas PiP tối ưu

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
  private streamTrack: any = null
  private pipWindow: Window | null = null
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
    if (typeof window === 'undefined') return false
    // Ưu tiên Document PiP (Chrome 116+) hoặc Standard Video PiP
    return 'documentPictureInPicture' in window || (typeof document !== 'undefined' && 'pictureInPictureEnabled' in document)
  }

  isActive(): boolean {
    if (!this.isPip) return false
    if (this.pipWindow && !this.pipWindow.closed) return true
    if (typeof document !== 'undefined' && document.pictureInPictureElement !== null) return true
    return false
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. DOCUMENT PICTURE-IN-PICTURE (Siêu nhẹ - 0% Video Encoder, 100% Native DOM)
  // ──────────────────────────────────────────────────────────────────────────
  private async openDocumentPip(
    initialData: PipTimerData,
    onPlayPause: () => void,
    onExit: () => void
  ): Promise<boolean> {
    try {
      const docPip = (window as any).documentPictureInPicture
      if (!docPip || typeof docPip.requestWindow !== 'function') return false

      const pipWin = await docPip.requestWindow({
        width: 320,
        height: 320,
      })

      this.pipWindow = pipWin
      this.isPip = true
      this.onPlayPauseCallback = onPlayPause
      this.onExitCallback = onExit
      this.lastData = initialData

      // Tạo giao diện HTML thuần túy siêu nhẹ trong cửa sổ nổi
      const doc = pipWin.document
      doc.title = `Pomodoro - ${initialData.timeStr}`
      doc.body.style.margin = '0'
      doc.body.style.padding = '0'
      doc.body.style.backgroundColor = '#0b0f19'
      doc.body.style.color = '#ffffff'
      doc.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      doc.body.style.display = 'flex'
      doc.body.style.flexDirection = 'column'
      doc.body.style.alignItems = 'center'
      doc.body.style.justifyContent = 'center'
      doc.body.style.height = '100vh'
      doc.body.style.boxSizing = 'border-box'
      doc.body.style.userSelect = 'none'

      doc.body.innerHTML = `
        <div id="pip-container" style="text-align: center; width: 100%; padding: 12px; box-sizing: border-box;">
          <div id="pip-badge" style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 8px; text-transform: uppercase;">
            ${initialData.isRunning ? '⚡' : '⏸'} ${initialData.modeLabel}
          </div>
          
          <div id="pip-time" style="font-size: 56px; font-weight: 800; font-family: 'SF Mono', Consolas, Monaco, monospace; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 6px; text-shadow: 0 0 16px rgba(6,182,212,0.4);">
            ${initialData.timeStr}
          </div>

          <div id="pip-note" style="font-size: 12px; color: rgba(255,255,255,0.7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; margin: 0 auto 12px auto;">
            ${initialData.topicNote || 'Tập trung học tập'}
          </div>

          <!-- Progress bar -->
          <div style="width: 200px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 9999px; margin: 0 auto 14px auto; overflow: hidden;">
            <div id="pip-progress" style="width: ${initialData.progressPercent}%; height: 100%; background: linear-gradient(90deg, #06b6d4, #3b82f6); border-radius: 9999px; transition: width 0.3s ease;"></div>
          </div>

          <!-- Button controls -->
          <button id="pip-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px 18px; border-radius: 12px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
            ${initialData.isRunning ? 'Tạm dừng ⏸' : 'Tiếp tục ▶'}
          </button>
        </div>
      `

      const updateDomColors = () => {
        const badge = doc.getElementById('pip-badge')
        const btn = doc.getElementById('pip-btn')
        const isFocus = !this.lastData.modeLabel.toLowerCase().includes('nghỉ')
        if (badge) {
          badge.style.background = isFocus ? 'rgba(6, 182, 212, 0.2)' : 'rgba(16, 185, 129, 0.2)'
          badge.style.color = isFocus ? '#67e8f9' : '#6ee7b7'
          badge.style.border = `1px solid ${isFocus ? 'rgba(6, 182, 212, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
        }
        if (btn) {
          btn.style.background = this.lastData.isRunning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.2)'
          btn.style.borderColor = this.lastData.isRunning ? 'rgba(239, 68, 68, 0.4)' : 'rgba(6, 182, 212, 0.4)'
        }
      }
      updateDomColors()

      const btn = doc.getElementById('pip-btn')
      if (btn) {
        btn.addEventListener('click', () => {
          if (this.onPlayPauseCallback) this.onPlayPauseCallback()
        })
      }

      pipWin.addEventListener('pagehide', () => {
        this.isPip = false
        this.pipWindow = null
        if (this.onExitCallback) this.onExitCallback()
      })

      return true
    } catch {
      return false
    }
  }

  private updateDocumentPip(data: PipTimerData) {
    if (!this.pipWindow || this.pipWindow.closed) return
    const doc = this.pipWindow.document
    doc.title = `Pomodoro - ${data.timeStr}`

    const timeEl = doc.getElementById('pip-time')
    if (timeEl && timeEl.textContent !== data.timeStr) {
      timeEl.textContent = data.timeStr
    }

    const badgeEl = doc.getElementById('pip-badge')
    if (badgeEl) {
      badgeEl.innerHTML = `${data.isRunning ? '⚡' : '⏸'} ${data.modeLabel}`
    }

    const progressEl = doc.getElementById('pip-progress')
    if (progressEl) {
      progressEl.style.width = `${Math.min(100, Math.max(0, data.progressPercent))}%`
    }

    const noteEl = doc.getElementById('pip-note')
    if (noteEl) {
      noteEl.textContent = data.topicNote || 'Tập trung học tập'
    }

    const btn = doc.getElementById('pip-btn')
    if (btn) {
      btn.textContent = data.isRunning ? 'Tạm dừng ⏸' : 'Tiếp tục ▶'
      btn.style.background = data.isRunning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.2)'
      btn.style.borderColor = data.isRunning ? 'rgba(239, 68, 68, 0.4)' : 'rgba(6, 182, 212, 0.4)'
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CANVAS / VIDEO PICTURE-IN-PICTURE (Fallback siêu tối ưu, 320px, 0 FPS Idle)
  // ──────────────────────────────────────────────────────────────────────────
  private initElements() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas')
      // Thu nhỏ kích thước từ 512 xuống 320 (giảm 61% pixel load mà vẫn siêu nét trên PiP)
      this.canvas.width = 320
      this.canvas.height = 320
    }
    if (!this.video) {
      this.video = document.createElement('video')
      this.video.muted = true
      this.video.playsInline = true
      this.video.autoplay = true

      this.video.addEventListener('leavepictureinpicture', () => {
        this.isPip = false
        this.stopStream()
        if (this.onExitCallback) {
          this.onExitCallback()
        }
      })
    }
  }

  private stopStream() {
    if (this.video) {
      try {
        if (this.video.srcObject) {
          const stream = this.video.srcObject as MediaStream
          if (stream.getTracks) {
            stream.getTracks().forEach((t) => t.stop())
          }
        }
      } catch {}
      this.video.srcObject = null
      this.video.pause()
    }
    this.streamTrack = null
  }

  private render(data: PipTimerData) {
    if (!this.canvas) return
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return

    const { timeStr, progressPercent, modeLabel, topicNote, isRunning } = data
    const size = 320
    const center = size / 2

    // 1. Dark Cyberpunk Background (Không dùng gradient bán kính lớn ngốn GPU)
    ctx.fillStyle = '#0b0f19'
    ctx.fillRect(0, 0, size, size)

    // Outer subtle ring
    ctx.beginPath()
    ctx.arc(center, center, 140, 0, Math.PI * 2)
    ctx.strokeStyle = isRunning ? 'rgba(6, 182, 212, 0.3)' : 'rgba(245, 158, 11, 0.2)'
    ctx.lineWidth = 2
    ctx.stroke()

    // 2. Circular Countdown Progress Ring
    const radius = 110
    const startAngle = -Math.PI / 2
    const sweepAngle = (Math.PI * 2 * Math.min(100, Math.max(0, progressPercent))) / 100

    // Background track
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 12
    ctx.stroke()

    // Foreground progress (màu phẳng hoặc gradient đơn giản, bỏ shadowBlur 20px)
    if (progressPercent > 0) {
      const isBreak = modeLabel.toLowerCase().includes('nghỉ')
      ctx.beginPath()
      ctx.arc(center, center, radius, startAngle, startAngle + sweepAngle)
      ctx.strokeStyle = isBreak ? '#10b981' : isRunning ? '#06b6d4' : '#f59e0b'
      ctx.lineWidth = 12
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    // 3. Top Mode Pill Badge
    const isBreak = modeLabel.toLowerCase().includes('nghỉ')
    ctx.fillStyle = isBreak ? 'rgba(16, 185, 129, 0.2)' : isRunning ? 'rgba(6, 182, 212, 0.2)' : 'rgba(245, 158, 11, 0.2)'
    ctx.strokeStyle = isBreak ? 'rgba(16, 185, 129, 0.4)' : isRunning ? 'rgba(6, 182, 212, 0.4)' : 'rgba(245, 158, 11, 0.4)'
    ctx.lineWidth = 1.5

    const pillWidth = 150
    const pillHeight = 28
    const pillX = center - pillWidth / 2
    const pillY = 64
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 14)
    } else {
      ctx.rect(pillX, pillY, pillWidth, pillHeight)
    }
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = isBreak ? '#6ee7b7' : isRunning ? '#67e8f9' : '#fcd34d'
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${isRunning ? '⚡ ' : '⏸ '}${modeLabel.toUpperCase()}`, center, pillY + pillHeight / 2)

    // 4. Large Digital Time Display
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 64px "SF Mono", Menlo, Consolas, Monaco, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(timeStr, center, center + 6)

    // 5. Bottom Topic / Goal Note
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const cleanNote = topicNote.length > 22 ? topicNote.substring(0, 20) + '...' : topicNote || 'Pomodoro LifeQuest'
    ctx.fillText(cleanNote, center, center + 68)

    // Percentage small text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(`${Math.round(progressPercent)}% • ${isRunning ? 'Đang chạy' : 'Tạm dừng'}`, center, center + 88)

    // QUAN TRỌNG: Chỉ gửi đúng 1 frame sang video track mỗi khi render, không chạy loop 15fps ngầm!
    if (this.streamTrack && typeof this.streamTrack.requestFrame === 'function') {
      try {
        this.streamTrack.requestFrame()
      } catch {}
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. PUBLIC TOGGLE & SYNC METHODS
  // ──────────────────────────────────────────────────────────────────────────
  async togglePip(
    initialData: PipTimerData,
    onPlayPause: () => void,
    onExit: () => void
  ): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Trình duyệt của bạn chưa hỗ trợ tính năng Cửa sổ nổi Picture-in-Picture!')
    }

    // Nếu đang mở thì đóng ngay và dọn dẹp sạch sẽ tài nguyên
    if (this.isActive()) {
      await this.stop()
      return false
    }

    this.onPlayPauseCallback = onPlayPause
    this.onExitCallback = onExit
    this.lastData = initialData

    // CHIẾN LƯỢC 1: Thử mở Document PiP trước (Chrome/Edge 116+ siêu mượt, 0% CPU)
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      const opened = await this.openDocumentPip(initialData, onPlayPause, onExit)
      if (opened) return true
    }

    // CHIẾN LƯỢC 2: Fallback sang Video Canvas PiP siêu tiết kiệm
    this.initElements()
    this.render(initialData)

    if (this.canvas && this.video) {
      // Dùng captureStream(0) - KHÔNG encode định kỳ 15fps! Chỉ chụp khi có requestFrame()
      let stream: MediaStream | null = null
      if ((this.canvas as any).captureStream) {
        stream = (this.canvas as any).captureStream(0)
      }

      if (!stream) {
        throw new Error('Không thể thu luồng Canvas stream')
      }

      this.streamTrack = stream.getVideoTracks()[0] || null
      // Chụp frame ban đầu
      if (this.streamTrack && typeof this.streamTrack.requestFrame === 'function') {
        try {
          this.streamTrack.requestFrame()
        } catch {}
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
    // Tránh re-render nếu các thông số cốt lõi không hề thay đổi
    if (
      data.timeStr === this.lastData.timeStr &&
      data.isRunning === this.lastData.isRunning &&
      data.modeLabel === this.lastData.modeLabel &&
      data.progressPercent === this.lastData.progressPercent &&
      data.topicNote === this.lastData.topicNote
    ) {
      return
    }

    this.lastData = { ...this.lastData, ...data }

    // Nếu đang chạy Document PiP
    if (this.pipWindow && !this.pipWindow.closed) {
      this.updateDocumentPip(this.lastData)
      return
    }

    // Nếu đang chạy Canvas PiP
    if (this.isPip && this.canvas) {
      this.render(this.lastData)
    }
  }

  async stop() {
    if (this.pipWindow && !this.pipWindow.closed) {
      try {
        this.pipWindow.close()
      } catch {}
      this.pipWindow = null
    }

    if (typeof document !== 'undefined' && document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture()
      } catch {}
    }

    this.stopStream()
    this.isPip = false
    if (this.onExitCallback) {
      this.onExitCallback()
    }
  }
}

export const pipTimerManager = new PipTimerManager()
