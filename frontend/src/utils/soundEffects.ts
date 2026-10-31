// Web Audio API Sound System (100% Offline & Instant)

class SoundManager {
  private ctx: AudioContext | null = null
  private ambientSource: AudioNode | null = null
  private ambientGain: GainNode | null = null
  private ambientInterval: number | null = null
  private lfoOsc: OscillatorNode | null = null
  private currentAmbientType: string | null = null
  private extraOscs: OscillatorNode[] = []
  private isUnlocked: boolean = false

  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      this.ctx = new AudioCtx()
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume()
      } catch (err) {
        // Ignored if user hasn't interacted yet
      }
    }
    return this.ctx
  }

  // Mobile WebKit / Android Audio Unlocker
  async unlockAudio(): Promise<boolean> {
    if (this.isUnlocked && this.ctx && this.ctx.state === 'running') {
      return true
    }
    try {
      const ctx = await this.ensureContext()
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      // Play 1-frame silent buffer to satisfy iOS WebKit restriction
      if (typeof ctx.createBuffer === 'function' && typeof ctx.createBufferSource === 'function') {
        const buffer = ctx.createBuffer(1, 1, 22050)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(ctx.destination)
        source.start(0)
      }

      if (ctx.state === 'running') {
        this.isUnlocked = true
        return true
      }
    } catch (e) {
      console.warn('[SoundManager] Audio unlock attempt failed:', e)
    }
    return false
  }

  // Play gentle bell sound for session finish
  async playBell(volume = 0.6) {
    if (volume <= 0.001) return
    try {
      await this.unlockAudio()
      const ctx = await this.ensureContext()
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume()
        } catch {}
      }
      const now = ctx.currentTime

      const frequencies = [523.25, 659.25, 783.99, 1046.5] // C major chime
      const safeVol = Math.max(0.01, Math.min(1.0, volume))

      frequencies.forEach((freq, idx) => {
        const startTime = now + idx * 0.09
        const duration = 2.2

        // Main sine oscillator
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)

        const peakGain = (safeVol * 0.7) / (1 + idx * 0.2)
        gain.gain.setValueAtTime(0.0001, startTime)
        gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(startTime)
        osc.stop(startTime + duration)

        // Resonant harmonic overtone (triangle)
        const overtone = ctx.createOscillator()
        const overGain = ctx.createGain()
        overtone.type = 'triangle'
        overtone.frequency.setValueAtTime(freq * 2, startTime)

        const overPeak = peakGain * 0.25
        overGain.gain.setValueAtTime(0.0001, startTime)
        overGain.gain.exponentialRampToValueAtTime(overPeak, startTime + 0.015)
        overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.6)

        overtone.connect(overGain)
        overGain.connect(ctx.destination)
        overtone.start(startTime)
        overtone.stop(startTime + duration * 0.6)
      })
    } catch (e) {
      console.warn('Audio bell error:', e)
    }
  }

  // Play crisp ding sound
  async playDing(volume = 0.6) {
    if (volume <= 0.001) return
    try {
      await this.unlockAudio()
      const ctx = await this.ensureContext()
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume()
        } catch {}
      }
      const now = ctx.currentTime
      const safeVol = Math.max(0.01, Math.min(1.0, volume))

      // 2-tone "Kính Koong": First tone 1046.5Hz (C6), second tone 783.99Hz (G5)
      const tones = [
        { freq: 1046.5, delay: 0, duration: 1.2, weight: 0.85 },
        { freq: 783.99, delay: 0.26, duration: 1.8, weight: 1.0 },
      ]

      tones.forEach((tone) => {
        const startTime = now + tone.delay
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(tone.freq, startTime)

        const peak = safeVol * 0.7 * tone.weight
        gain.gain.setValueAtTime(0.0001, startTime)
        gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + tone.duration)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(startTime)
        osc.stop(startTime + tone.duration)

        // Harmonic overtone
        const overtone = ctx.createOscillator()
        const overGain = ctx.createGain()
        overtone.type = 'triangle'
        overtone.frequency.setValueAtTime(tone.freq * 2, startTime)

        const overPeak = peak * 0.3
        overGain.gain.setValueAtTime(0.0001, startTime)
        overGain.gain.exponentialRampToValueAtTime(overPeak, startTime + 0.01)
        overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + tone.duration * 0.5)

        overtone.connect(overGain)
        overGain.connect(ctx.destination)
        overtone.start(startTime)
        overtone.stop(startTime + tone.duration * 0.5)
      })
    } catch (e) {
      console.warn('Audio ding error:', e)
    }
  }

  // Play subtle tactile click
  async playClick() {
    try {
      const ctx = await this.ensureContext()
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(450, now)
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.04)

      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.05)
    } catch {}
  }

  // ── AMBIENT NOISE GENERATOR ──
  async startAmbient(type: 'rain' | 'waves' | 'ticking' | 'fire' | 'binaural' | 'lofi', volume = 0.5) {
    this.stopAmbient()
    try {
      const ctx = await this.ensureContext()
      this.currentAmbientType = type

      // 1. TICKING CLOCK
      if (type === 'ticking') {
        let isTick = true
        const tick = () => {
          if (this.currentAmbientType !== 'ticking') return
          const now = ctx.currentTime
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'sine'
          osc.frequency.setValueAtTime(isTick ? 1600 : 1100, now)
          gain.gain.setValueAtTime(volume * 0.4, now)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(now)
          osc.stop(now + 0.04)
          isTick = !isTick
        }
        tick()
        this.ambientInterval = window.setInterval(tick, 1000)
        return
      }

      // Generate 2 seconds of high quality pink / brown noise
      const bufferSize = ctx.sampleRate * 2
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.35
        b6 = white * 0.115926
      }

      const noiseSource = ctx.createBufferSource()
      noiseSource.buffer = noiseBuffer
      noiseSource.loop = true

      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(Math.max(0.05, volume), ctx.currentTime)

      // 2. RAIN SOUND
      if (type === 'rain') {
        const lowpass = ctx.createBiquadFilter()
        lowpass.type = 'lowpass'
        lowpass.frequency.setValueAtTime(1400, ctx.currentTime)

        const highpass = ctx.createBiquadFilter()
        highpass.type = 'highpass'
        highpass.frequency.setValueAtTime(250, ctx.currentTime)

        noiseSource.connect(highpass)
        highpass.connect(lowpass)
        lowpass.connect(masterGain)
        masterGain.connect(ctx.destination)

        noiseSource.start()
        this.ambientSource = noiseSource
        this.ambientGain = masterGain

        // Occasional light raindrops
        this.ambientInterval = window.setInterval(() => {
          if (this.currentAmbientType !== 'rain') return
          try {
            const dropTime = ctx.currentTime
            const dropOsc = ctx.createOscillator()
            const dropGain = ctx.createGain()
            dropOsc.type = 'sine'
            dropOsc.frequency.setValueAtTime(2000 + Math.random() * 1500, dropTime)
            dropGain.gain.setValueAtTime(volume * 0.08, dropTime)
            dropGain.gain.exponentialRampToValueAtTime(0.0001, dropTime + 0.03)
            dropOsc.connect(dropGain)
            dropGain.connect(ctx.destination)
            dropOsc.start(dropTime)
            dropOsc.stop(dropTime + 0.035)
          } catch {}
        }, 180)
        return
      }

      // 3. OCEAN WAVES SOUND (With LFO Modulation!)
      if (type === 'waves') {
        const bandpass = ctx.createBiquadFilter()
        bandpass.type = 'bandpass'
        bandpass.frequency.setValueAtTime(450, ctx.currentTime)
        bandpass.Q.setValueAtTime(1.5, ctx.currentTime)

        // LFO (Low Frequency Oscillator) to make the waves swell in and out
        const lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.setValueAtTime(0.12, ctx.currentTime) // ~8.3 second cycle

        const lfoGain = ctx.createGain()
        lfoGain.gain.setValueAtTime(300, ctx.currentTime)
        lfo.connect(lfoGain)
        lfoGain.connect(bandpass.frequency)

        // Wave volume swell
        const waveGain = ctx.createGain()
        const waveLfoGain = ctx.createGain()
        waveLfoGain.gain.setValueAtTime(0.35, ctx.currentTime)
        lfo.connect(waveLfoGain)
        waveLfoGain.connect(waveGain.gain)
        waveGain.gain.setValueAtTime(0.5, ctx.currentTime)

        noiseSource.connect(bandpass)
        bandpass.connect(waveGain)
        waveGain.connect(masterGain)
        masterGain.connect(ctx.destination)

        lfo.start()
        noiseSource.start()

        this.lfoOsc = lfo
        this.ambientSource = noiseSource
        this.ambientGain = masterGain
        return
      }

      // 4. COZY FIREPLACE / CRACKLE
      if (type === 'fire') {
        const fireFilter = ctx.createBiquadFilter()
        fireFilter.type = 'lowpass'
        fireFilter.frequency.setValueAtTime(700, ctx.currentTime)

        noiseSource.connect(fireFilter)
        fireFilter.connect(masterGain)
        masterGain.connect(ctx.destination)
        noiseSource.start()

        this.ambientSource = noiseSource
        this.ambientGain = masterGain

        // Fire crackle pops
        this.ambientInterval = window.setInterval(() => {
          if (this.currentAmbientType !== 'fire') return
          if (Math.random() > 0.4) {
            try {
              const popTime = ctx.currentTime
              const popOsc = ctx.createOscillator()
              const popGain = ctx.createGain()
              popOsc.type = 'triangle'
              popOsc.frequency.setValueAtTime(120 + Math.random() * 250, popTime)
              popGain.gain.setValueAtTime(volume * 0.25, popTime)
              popGain.gain.exponentialRampToValueAtTime(0.0001, popTime + 0.04)
              popOsc.connect(popGain)
              popGain.connect(ctx.destination)
              popOsc.start(popTime)
              popOsc.stop(popTime + 0.045)
            } catch {}
          }
        }, 120)
        return
      }

      // 5. BINAURAL BEATS 40Hz (GAMMA DEEP FOCUS)
      if (type === 'binaural') {
        const merger = ctx.createChannelMerger(2)

        // Left ear 200 Hz
        const oscLeft = ctx.createOscillator()
        oscLeft.type = 'sine'
        oscLeft.frequency.setValueAtTime(200, ctx.currentTime)

        const gainLeft = ctx.createGain()
        gainLeft.gain.setValueAtTime(0.35, ctx.currentTime)
        oscLeft.connect(gainLeft)
        gainLeft.connect(merger, 0, 0) // left channel

        // Right ear 240 Hz (Difference = 40 Hz Gamma Focus)
        const oscRight = ctx.createOscillator()
        oscRight.type = 'sine'
        oscRight.frequency.setValueAtTime(240, ctx.currentTime)

        const gainRight = ctx.createGain()
        gainRight.gain.setValueAtTime(0.35, ctx.currentTime)
        oscRight.connect(gainRight)
        gainRight.connect(merger, 0, 1) // right channel

        // Soft pink noise background warmth
        const warmFilter = ctx.createBiquadFilter()
        warmFilter.type = 'lowpass'
        warmFilter.frequency.setValueAtTime(250, ctx.currentTime)
        const noiseGain = ctx.createGain()
        noiseGain.gain.setValueAtTime(0.15, ctx.currentTime)
        noiseSource.connect(warmFilter)
        warmFilter.connect(noiseGain)
        noiseGain.connect(masterGain)

        merger.connect(masterGain)
        masterGain.connect(ctx.destination)

        oscLeft.start()
        oscRight.start()
        noiseSource.start()

        this.extraOscs = [oscLeft, oscRight]
        this.ambientSource = noiseSource
        this.ambientGain = masterGain
        return
      }

      // 6. LO-FI CHILL COZY SYNTH & VINYL CRACKLE
      if (type === 'lofi') {
        // Vinyl noise crackle
        const vinylFilter = ctx.createBiquadFilter()
        vinylFilter.type = 'bandpass'
        vinylFilter.frequency.setValueAtTime(1200, ctx.currentTime)
        vinylFilter.Q.setValueAtTime(1.0, ctx.currentTime)

        const vinylGain = ctx.createGain()
        vinylGain.gain.setValueAtTime(0.18, ctx.currentTime)
        noiseSource.connect(vinylFilter)
        vinylFilter.connect(vinylGain)
        vinylGain.connect(masterGain)
        noiseSource.start()

        // Cozy lo-fi chords progression: Cmaj7 -> Am7 -> Dm7 -> G7
        const chords = [
          [261.63, 329.63, 392.00, 493.88], // Cmaj7: C4, E4, G4, B4
          [220.00, 261.63, 329.63, 392.00], // Am7: A3, C4, E4, G4
          [146.83, 174.61, 220.00, 261.63], // Dm7: D3, F3, A3, C4
          [196.00, 246.94, 293.66, 349.23], // G7: G3, B3, D4, F4
        ]
        let chordIdx = 0

        const playLofiChord = () => {
          if (this.currentAmbientType !== 'lofi') return
          try {
            const chord = chords[chordIdx % chords.length]
            chordIdx++
            const now = ctx.currentTime

            chord.forEach((freq) => {
              const osc = ctx.createOscillator()
              const chordGain = ctx.createGain()
              const filter = ctx.createBiquadFilter()

              osc.type = 'triangle'
              osc.frequency.setValueAtTime(freq, now)

              // Lowpass for warm vintage vinyl feel
              filter.type = 'lowpass'
              filter.frequency.setValueAtTime(650, now)

              chordGain.gain.setValueAtTime(0, now)
              chordGain.gain.linearRampToValueAtTime(volume * 0.12, now + 0.8)
              chordGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8)

              osc.connect(filter)
              filter.connect(chordGain)
              chordGain.connect(masterGain)

              osc.start(now)
              osc.stop(now + 3.9)
            })
          } catch {}
        }

        playLofiChord()
        this.ambientInterval = window.setInterval(playLofiChord, 4000)

        masterGain.connect(ctx.destination)
        this.ambientSource = noiseSource
        this.ambientGain = masterGain
        return
      }
    } catch (e) {
      console.warn('Ambient sound error:', e)
    }
  }

  setAmbientVolume(volume: number) {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(Math.max(0.05, volume), this.ctx.currentTime)
    }
  }

  stopAmbient() {
    if (this.ambientInterval !== null) {
      clearInterval(this.ambientInterval)
      this.ambientInterval = null
    }
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop()
        this.lfoOsc.disconnect()
      } catch {}
      this.lfoOsc = null
    }
    if (this.extraOscs.length > 0) {
      this.extraOscs.forEach((o) => {
        try {
          o.stop()
          o.disconnect()
        } catch {}
      })
      this.extraOscs = []
    }
    if (this.ambientSource) {
      try {
        ;(this.ambientSource as AudioScheduledSourceNode).stop()
        this.ambientSource.disconnect()
      } catch {}
      this.ambientSource = null
    }
    if (this.ambientGain) {
      try {
        this.ambientGain.disconnect()
      } catch {}
      this.ambientGain = null
    }
    this.currentAmbientType = null
  }

  getCurrentType(): string | null {
    return this.currentAmbientType
  }

  // ── DOPAMINE SOUND EFFECTS ──

  // Crystal pearl drop ("Ting~" into glass jar)
  async playPearlDrop() {
    try {
      const ctx = await this.ensureContext()
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1760, now) // A6
      osc.frequency.exponentialRampToValueAtTime(2637, now + 0.08) // E7

      gain.gain.setValueAtTime(0.4, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 1.2)
    } catch {}
  }

  // Joyful reward redemption fanfare
  async playRedeemSuccess() {
    try {
      const ctx = await this.ensureContext()
      const now = ctx.currentTime

      // Arpeggio chord (C5 - E5 - G5 - C6)
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + i * 0.07)

        gain.gain.setValueAtTime(0, now + i * 0.07)
        gain.gain.linearRampToValueAtTime(0.35, now + i * 0.07 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.8)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + i * 0.07)
        osc.stop(now + i * 0.07 + 0.8)
      })
    } catch {}
  }

  // Time warp / cosmic rush sound
  async playWarpSpeed() {
    try {
      const ctx = await this.ensureContext()
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.6)

      gain.gain.setValueAtTime(0.01, now)
      gain.gain.linearRampToValueAtTime(0.25, now + 0.3)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.8)
    } catch {}
  }

  // Time capsule unlock sound
  async playCapsuleUnlock() {
    try {
      const ctx = await this.ensureContext()
      const now = ctx.currentTime

      // Metallic click then grand bell
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(800, now)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.08)

      setTimeout(() => this.playBell(0.6), 120)
    } catch {}
  }

  // Celestial / Cosmic chime when interacting with planets or constellation lines
  async playCosmicChime() {
    try {
      const ctx = await this.ensureContext()
      const now = ctx.currentTime

      // Shimmering celestial pentatonic chord (E5, B5, E6, G#6)
      const freqs = [659.25, 987.77, 1318.51, 1661.22]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + i * 0.04)

        gain.gain.setValueAtTime(0, now + i * 0.04)
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.04 + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 1.4)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + i * 0.04)
        osc.stop(now + i * 0.04 + 1.4)
      })
    } catch {}
  }

  // Triumphant orchestral fanfare when an Astrological Constellation is unlocked
  async playConstellationVictory() {
    try {
      const ctx = await this.ensureContext()
      const now = ctx.currentTime

      // Soaring brass fanfare notes (C4, G4, C5, E5, G5, C6)
      const fanfare = [
        { f: 261.63, t: 0.0, d: 0.25 },
        { f: 392.00, t: 0.18, d: 0.25 },
        { f: 523.25, t: 0.36, d: 0.35 },
        { f: 659.25, t: 0.55, d: 0.35 },
        { f: 783.99, t: 0.75, d: 0.45 },
        { f: 1046.50, t: 1.0, d: 1.8 }, // Grand sustained chord note
        { f: 1318.51, t: 1.0, d: 1.8 }, // Harmonics
      ]

      fanfare.forEach((n) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(n.f, now + n.t)

        gain.gain.setValueAtTime(0, now + n.t)
        gain.gain.linearRampToValueAtTime(0.3, now + n.t + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + n.t)
        osc.stop(now + n.t + n.d)
      })

      // Delayed silver chime bell
      setTimeout(() => this.playBell(0.7), 1100)
    } catch {}
  }

  // Gentle pop-in sound for AI Companion message bubble
  async playFriendlyBubble() {
    try {
      const ctx = await this.ensureContext()
      const now = ctx.currentTime
      const freqs = [587.33, 880.0] // D5 -> A5 cheerful upward pop
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.06)
        gain.gain.setValueAtTime(0, now + idx * 0.06)
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.06 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.06)
        osc.stop(now + idx * 0.06 + 0.4)
      })
    } catch {}
  }
}

export const soundManager = new SoundManager()

/**
 * Tự động mở khóa Web Audio API trên thiết bị di động (iOS Safari, Android Chrome, Cốc Cốc)
 * Lắng nghe một lần cử chỉ chạm đầu tiên của người dùng để kích hoạt AudioContext sang trạng thái running.
 */
export function setupGlobalAudioUnlocker() {
  if (typeof window === 'undefined') return

  let unlocked = false
  const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown']

  const handleUnlock = async () => {
    if (unlocked) return
    const ok = await soundManager.unlockAudio()
    if (ok) {
      unlocked = true
      unlockEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUnlock, true)
      })
    }
  }

  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, handleUnlock, { capture: true, passive: true })
  })
}
