import { describe, expect, it } from 'vitest'
import { formatPrice } from './price'

const price = (min: string | null, max: string | null, currency = 'EUR') => ({
  min,
  max,
  currency,
})

describe('W-06 price formatting', () => {
  it('shows a single amount with its currency and no cents', () => {
    const text = formatPrice(price('1299.00', '1299.00'))
    expect(text).toContain('1,299')
    expect(text).toContain('€')
    expect(text).not.toContain('.00')
  })

  it('shows an equal min and max once, not as a range', () => {
    const text = formatPrice(price('500', '500'))
    expect(text).not.toContain('–')
    expect(text).toContain('500')
  })

  it('shows a range with the currency on both amounts', () => {
    const text = formatPrice(price('1200', '1500')) ?? ''
    expect(text).toContain('1,200')
    expect(text).toContain('–')
    expect(text).toContain('1,500')
    expect(text).toBe('€1,200–€1,500')
  })

  it('writes "from" for a min-only price', () => {
    const text = formatPrice(price('1200', null)) ?? ''
    expect(text).toMatch(/^from /)
    expect(text).toContain('1,200')
    expect(text).not.toContain('–')
  })

  it('writes "up to" for a max-only price', () => {
    const text = formatPrice(price(null, '1500')) ?? ''
    expect(text).toMatch(/^up to /)
    expect(text).toContain('1,500')
  })

  it('F002 never shows cents: amounts are rounded to whole units', () => {
    expect(formatPrice(price('12.50', '15.00'))).toBe('€13–€15')
    expect(formatPrice(price('1299.40', '1299.40'))).toBe('€1,299')
  })

  it('returns null for no price or no amounts', () => {
    expect(formatPrice(null)).toBeNull()
    expect(formatPrice(price(null, null))).toBeNull()
  })

  it('does not throw on an unknown currency code and still shows the amount', () => {
    let text: string | null = null
    expect(() => {
      text = formatPrice(price('10', '20', 'ZZZZ'))
    }).not.toThrow()
    expect(text).toContain('10')
    expect(text).toContain('20')
  })
})
