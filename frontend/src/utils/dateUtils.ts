import { format as dateFnsFormat } from 'date-fns'

/**
 * Universal safe date parser that guarantees compatibility across:
 * - Mobile Safari / iOS WebKit (which rejects spaces instead of 'T' and >3 millisecond digits)
 * - Android Chrome
 * - Desktop browsers
 *
 * Never throws. Returns `null` if the date cannot be parsed.
 */
export function parseSafeDate(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') {
    return null
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input
  }

  if (typeof input === 'number') {
    const d = new Date(input)
    return isNaN(d.getTime()) ? null : d
  }

  let str = String(input).trim()
  if (!str) return null

  // 1. If it's a pure date "YYYY-MM-DD", construct using local year/month/date
  // to prevent UTC midnight shifts or Safari date-only quirks.
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str)
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10)
    const month = parseInt(ymdMatch[2], 10) - 1
    const day = parseInt(ymdMatch[3], 10)
    const d = new Date(year, month, day, 12, 0, 0)
    return isNaN(d.getTime()) ? null : d
  }

  // 2. Replace space with 'T' if format is "YYYY-MM-DD HH:mm:ss" (Safari iOS strictly requires 'T')
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T')
  }

  // 3. Truncate microsecond precision (>3 decimal digits) down to 3 digits (milliseconds)
  // Python datetime.utcnow().isoformat() produces 6 digits (e.g. .123456) which older WebKit rejects as Invalid Date.
  str = str.replace(/(\.\d{3})\d+/, '$1')

  // 4. Try standard parse
  let d = new Date(str)
  if (!isNaN(d.getTime())) {
    return d
  }

  // 5. Fallback for older Safari: replace '-' with '/'
  d = new Date(str.replace(/-/g, '/'))
  if (!isNaN(d.getTime())) {
    return d
  }

  return null
}

/**
 * Formats a date string or object safely.
 * If formatPattern is provided, uses date-fns format.
 * Otherwise returns toLocaleDateString('vi-VN').
 * NEVER outputs "Invalid Date".
 */
export function formatSafeDate(
  input: string | number | Date | null | undefined,
  formatPattern?: string,
  fallback = ''
): string {
  const d = parseSafeDate(input)
  if (!d) return fallback

  if (formatPattern) {
    try {
      return dateFnsFormat(d, formatPattern)
    } catch {
      return fallback
    }
  }

  try {
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return fallback
  }
}

/**
 * Formats date and time safely (e.g., "15:30 04/11/2026").
 * NEVER outputs "Invalid Date".
 */
export function formatSafeDateTime(
  input: string | number | Date | null | undefined,
  fallback = ''
): string {
  const d = parseSafeDate(input)
  if (!d) return fallback

  try {
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return fallback
  }
}

/**
 * Formats time safely (e.g., "15:30:00").
 * NEVER outputs "Invalid Date".
 */
export function formatSafeTime(
  input: string | number | Date | null | undefined,
  fallback = ''
): string {
  const d = parseSafeDate(input)
  if (!d) return fallback

  try {
    return d.toLocaleTimeString('vi-VN')
  } catch {
    return fallback
  }
}

/**
 * Formats relative time safely ("Vừa xong", "X phút trước", "Hôm qua", v.v.)
 * Mobile WebKit safe: never outputs "Invalid Date" or NaN.
 */
export function formatSafeRelativeTime(
  input: string | number | Date | null | undefined,
  fallback = 'Chưa ghi nhận'
): string {
  const d = parseSafeDate(input)
  if (!d) return fallback

  try {
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffSec < 0) return 'Vừa xong'
    if (diffSec < 45) return 'Vừa xong'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`

    const diffDays = Math.floor(diffSec / 86400)
    if (diffDays === 1) return 'Hôm qua'
    if (diffDays < 7) return `${diffDays} ngày trước`

    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fallback
  }
}
