import { describe, expect, it } from 'vitest'
import { normalizePrice, priceDraft, toCents } from './price'

describe('F020 price helpers of the item draft', () => {
  it.each([
    ['12', '12.00'],
    ['12.5', '12.50'],
    ['12.50', '12.50'],
    [' 1299.5 ', '1299.50'],
    ['0.05', '0.05'],
  ])('normalizePrice pads %j to %j', (text, expected) => {
    expect(normalizePrice(text)).toBe(expected)
  })

  it.each(['', 'abc', '1.234', '-1', '1,50', '12345678901', '1.', '1e3'])(
    'normalizePrice rejects %j',
    (text) => {
      expect(normalizePrice(text)).toBeNull()
    },
  )

  it.each([
    ['0.00', 0],
    ['12.50', 1250],
    ['1299.99', 129999],
    ['5', 5],
  ])('toCents turns %j into %j', (price, cents) => {
    expect(toCents(price)).toBe(cents)
  })

  it('priceDraft starts with no price when the item has none', () => {
    expect(priceDraft(null)).toEqual({
      hasPrice: false,
      priceMode: 'single',
      priceAmount: '',
      priceMin: '',
      priceMax: '',
      currency: '',
    })
  })

  it.each([
    [
      { min: '9.99', max: '9.99', currency: 'EUR' },
      { priceMode: 'single', priceAmount: '9.99', priceMin: '', priceMax: '' },
    ],
    [
      { min: '10', max: '20', currency: 'USD' },
      { priceMode: 'range', priceAmount: '', priceMin: '10', priceMax: '20' },
    ],
    [
      { min: '10', max: null, currency: 'USD' },
      { priceMode: 'range', priceAmount: '', priceMin: '10', priceMax: '' },
    ],
    [
      { min: null, max: '20', currency: 'USD' },
      { priceMode: 'range', priceAmount: '', priceMin: '', priceMax: '20' },
    ],
  ])('priceDraft maps the saved price %j to the inputs', (price, expected) => {
    expect(priceDraft(price)).toEqual({ hasPrice: true, currency: price.currency, ...expected })
  })
})
