import { describe, expect, it } from 'vitest'
import { byteLength, formatBytes, isTooLarge, MAX_CONTENT_BYTES, relativeTime } from './limits'

describe('AT-08 web: description limits', () => {
  it('byteLength counts UTF-8 bytes, not characters', () => {
    expect(byteLength('')).toBe(0)
    expect(byteLength('abc')).toBe(3)
    expect(byteLength('é')).toBe(2)
    expect(byteLength('€')).toBe(3)
    expect(byteLength('😀')).toBe(4)
  })

  it('isTooLarge is false at exactly 1 MiB and true one byte over', () => {
    expect(MAX_CONTENT_BYTES).toBe(1_048_576)
    expect(isTooLarge('a'.repeat(MAX_CONTENT_BYTES))).toBe(false)
    expect(isTooLarge('a'.repeat(MAX_CONTENT_BYTES + 1))).toBe(true)
    expect(isTooLarge('')).toBe(false)
  })

  it('isTooLarge checks bytes: 524289 two-byte characters exceed 1 MiB', () => {
    expect(isTooLarge('é'.repeat(MAX_CONTENT_BYTES / 2))).toBe(false)
    expect(isTooLarge('é'.repeat(MAX_CONTENT_BYTES / 2 + 1))).toBe(true)
  })

  it('formatBytes picks B, KB and MB with the boundaries', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1023)).toBe('1023 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1024 * 1024 - 1)).toBe('1024.0 KB')
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB')
    expect(formatBytes(MAX_CONTENT_BYTES * 2.5)).toBe('2.50 MB')
  })
})

describe('relativeTime', () => {
  const now = Date.parse('2026-10-14T12:00:00Z')
  const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString()

  it('is "just now" under a minute', () => {
    expect(relativeTime(ago(0), now)).toBe('just now')
    expect(relativeTime(ago(59), now)).toBe('just now')
  })

  it('uses minutes, hours, days, months and years', () => {
    expect(relativeTime(ago(60), now)).toBe('1 minute ago')
    expect(relativeTime(ago(5 * 60), now)).toBe('5 minutes ago')
    expect(relativeTime(ago(3 * 3600), now)).toBe('3 hours ago')
    expect(relativeTime(ago(2 * 86400), now)).toBe('2 days ago')
    expect(relativeTime(ago(60 * 86400), now)).toBe('2 months ago')
    expect(relativeTime(ago(2 * 365 * 86400), now)).toBe('2 years ago')
  })

  it('uses numeric "auto" wording for yesterday', () => {
    expect(relativeTime(ago(86400), now)).toBe('yesterday')
  })

  it('handles future timestamps', () => {
    expect(relativeTime(new Date(now + 2 * 3600 * 1000).toISOString(), now)).toBe('in 2 hours')
  })
})
