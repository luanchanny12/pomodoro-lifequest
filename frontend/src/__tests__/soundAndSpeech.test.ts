import { describe, it, expect, vi, beforeEach } from 'vitest'
import { soundManager } from '../utils/soundEffects'
import { speechNarrator } from '../utils/speechNarrator'

describe('SoundManager', () => {
  beforeEach(() => {
    // Mock Web Audio API
    const mockGainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }

    const mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }

    const mockAudioContext = {
      state: 'running',
      currentTime: 10,
      createGain: vi.fn().mockReturnValue(mockGainNode),
      createOscillator: vi.fn().mockReturnValue(mockOscillator),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
    }

    // @ts-ignore
    window.AudioContext = vi.fn().mockImplementation(() => mockAudioContext)
  })

  it('plays bell sound effect without error', async () => {
    await expect(soundManager.playBell(0.5)).resolves.not.toThrow()
  })

  it('plays cosmic chime sound effect', async () => {
    await expect(soundManager.playCosmicChime()).resolves.not.toThrow()
  })

  it('plays constellation victory fanfare', async () => {
    await expect(soundManager.playConstellationVictory()).resolves.not.toThrow()
  })

  it('plays friendly bubble pop sound', async () => {
    await expect(soundManager.playFriendlyBubble()).resolves.not.toThrow()
  })
})

describe('SpeechNarrator', () => {
  beforeEach(() => {
    // Mock window.speechSynthesis
    const mockUtterance = {
      text: '',
      lang: '',
      rate: 1,
      pitch: 1,
      volume: 1,
      voice: null,
      onstart: null,
      onend: null,
      onerror: null,
    }

    // @ts-ignore
    window.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => {
      return { ...mockUtterance, text }
    })

    const mockSpeechSynthesis = {
      speaking: false,
      paused: false,
      getVoices: vi.fn().mockReturnValue([
        { lang: 'vi-VN', name: 'Google Tiếng Việt', default: true },
        { lang: 'en-US', name: 'Google US English', default: false },
      ]),
      speak: vi.fn((u) => {
        if (u.onstart) u.onstart()
        if (u.onend) setTimeout(u.onend, 10)
      }),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    }

    // @ts-ignore
    window.speechSynthesis = mockSpeechSynthesis
  })

  it('narrates text in Vietnamese', () => {
    const onStart = vi.fn()
    const onEnd = vi.fn()
    speechNarrator.speak('Chào bạn, đây là thử nghiệm giọng đọc!', onStart, onEnd)
    expect(window.speechSynthesis.speak).toHaveBeenCalled()
    expect(onStart).toHaveBeenCalled()
  })

  it('supports pause, resume, and stop', () => {
    speechNarrator.pause()
    expect(window.speechSynthesis.pause).toHaveBeenCalled()

    speechNarrator.resume()
    expect(window.speechSynthesis.resume).toHaveBeenCalled()

    speechNarrator.stop()
    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
  })
})
