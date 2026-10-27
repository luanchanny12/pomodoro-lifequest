/**
 * Web Speech API Voice Narrator
 * Handles automated text-to-speech for Astrological Constellation interpretations in Vietnamese.
 */
class SpeechNarrator {
  private synth: SpeechSynthesis | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private voices: SpeechSynthesisVoice[] = []
  private isSupported: boolean = false

  constructor() {
    this.ensureSynth()
  }

  private ensureSynth(): SpeechSynthesis | null {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis
      this.isSupported = true
      this.loadVoices()
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices()
      }
    }
    return this.synth
  }

  private loadVoices() {
    if (!this.synth) return
    this.voices = this.synth.getVoices()
  }

  getIsSupported(): boolean {
    this.ensureSynth()
    return this.isSupported
  }

  speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ) {
    const synth = this.ensureSynth()
    if (!this.isSupported || !synth) {
      if (onEnd) onEnd()
      return
    }

    // Cancel any previous reading
    synth.cancel()

    // Clean up text
    const cleanText = text.replace(/[*#_~`]/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(cleanText)

    // Find best Vietnamese voice
    this.loadVoices()
    const viVoice = this.voices.find(
      (v) => v.lang.toLowerCase().includes('vi') || v.lang.toLowerCase().includes('vn')
    )
    if (viVoice) {
      utterance.voice = viVoice
      utterance.lang = viVoice.lang
    } else {
      utterance.lang = 'vi-VN'
    }

    utterance.rate = 0.95 // Dignified, calm storytelling cadence
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      if (onStart) onStart()
    }

    utterance.onend = () => {
      this.currentUtterance = null
      if (onEnd) onEnd()
    }

    utterance.onerror = (e) => {
      this.currentUtterance = null
      if (onError) onError(e)
      else if (onEnd) onEnd()
    }

    this.currentUtterance = utterance
    synth.speak(utterance)
  }

  stop() {
    const synth = this.ensureSynth()
    if (!synth) return
    synth.cancel()
    this.currentUtterance = null
  }

  pause() {
    const synth = this.ensureSynth()
    if (!synth) return
    synth.pause()
  }

  resume() {
    const synth = this.ensureSynth()
    if (!synth) return
    synth.resume()
  }

  isSpeaking(): boolean {
    const synth = this.ensureSynth()
    return !!(synth && (synth.speaking || synth.pending))
  }

  isPaused(): boolean {
    const synth = this.ensureSynth()
    return !!(synth && synth.paused)
  }
}

export const speechNarrator = new SpeechNarrator()
