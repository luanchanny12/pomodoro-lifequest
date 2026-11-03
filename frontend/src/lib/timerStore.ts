import { useSyncExternalStore } from 'react'

/**
 * External countdown store (P2 performance fix).
 *
 * The Pomodoro tick used to live in `useState` inside PomodoroApp — a ~1900-line
 * component. Every tick re-rendered the entire page. With this store, only
 * components that actually DISPLAY the time (TimerPanel, Zen clock, title/PiP
 * sync) subscribe via `useTimeLeft()`; the page itself never re-renders on tick.
 */

let timeLeftSeconds = 0
const listeners = new Set<() => void>()

/** Set the countdown without notifying (used once per mount to seed from settings). */
export function setTimeLeft(seconds: number): void {
  if (seconds === timeLeftSeconds) return
  timeLeftSeconds = seconds
  listeners.forEach((listener) => listener())
}

/** Non-reactive read for callbacks/refs (start, finish-early, PiP toggle…). */
export function getTimeLeft(): number {
  return timeLeftSeconds
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Reactive read — re-renders ONLY the calling component when the countdown changes. */
export function useTimeLeft(): number {
  return useSyncExternalStore(subscribe, getTimeLeft, getTimeLeft)
}
