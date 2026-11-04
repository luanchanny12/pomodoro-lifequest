import { describe, it, expect } from 'vitest'
import {
  parseSafeDate,
  formatSafeDate,
  formatSafeDateTime,
  formatSafeTime,
  formatSafeRelativeTime,
} from '../utils/dateUtils'

describe('dateUtils - Mobile & Cross-Browser Date Normalization', () => {
  it('parses space-separated datetime strings (iOS Safari fix)', () => {
    const d = parseSafeDate('2026-11-04 15:30:00')
    expect(d).not.toBeNull()
    expect(d?.getFullYear()).toBe(2026)
  })

  it('parses microsecond precision (>3 decimal digits) from Python ISO strings', () => {
    const d = parseSafeDate('2026-11-04T15:30:00.123456Z')
    expect(d).not.toBeNull()
    expect(d?.toISOString()).toBe('2026-11-04T15:30:00.123Z')
  })

  it('parses YYYY-MM-DD date-only strings without timezone drift', () => {
    const d = parseSafeDate('2026-11-04')
    expect(d).not.toBeNull()
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(10) // 10 is November (0-indexed)
    expect(d?.getDate()).toBe(4)
  })

  it('returns null safely on null, undefined, or invalid inputs', () => {
    expect(parseSafeDate(null)).toBeNull()
    expect(parseSafeDate(undefined)).toBeNull()
    expect(parseSafeDate('')).toBeNull()
    expect(parseSafeDate('invalid-gibberish')).toBeNull()
  })

  it('never outputs "Invalid Date" in formatSafeDate', () => {
    expect(formatSafeDate(null)).toBe('')
    expect(formatSafeDate('invalid-junk', undefined, 'Chưa rõ')).toBe('Chưa rõ')
    expect(formatSafeDate('2026-11-04 15:30:00', 'dd/MM/yyyy')).toBe('04/11/2026')
  })

  it('never outputs "Invalid Date" in formatSafeDateTime', () => {
    expect(formatSafeDateTime(null)).toBe('')
    expect(formatSafeDateTime('invalid-junk', 'Không xác định')).toBe('Không xác định')
    const formatted = formatSafeDateTime('2026-11-04 15:30:00')
    expect(formatted).not.toContain('Invalid Date')
    expect(formatted).toContain('2026')
  })

  it('never outputs "Invalid Date" in formatSafeRelativeTime', () => {
    expect(formatSafeRelativeTime(null)).toBe('Chưa ghi nhận')
    expect(formatSafeRelativeTime('invalid-string')).toBe('Chưa ghi nhận')
    expect(formatSafeRelativeTime(new Date().toISOString())).toBe('Vừa xong')
  })
})
