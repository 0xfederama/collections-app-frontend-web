import type { Item } from '../api'

/** The price control's mode: one amount or a range. */
export type PriceMode = 'single' | 'range'

/** A price as the API takes it (`PriceInput`): a single `amount` or a `min`/`max` range. `null` clears. */
export type PriceInput =
  | { amount: string; currency: string }
  | { min: string | null; max: string | null; currency: string }
  | null

type ItemPrice = Item['price']

const PRICE = /^\d{1,10}(\.\d{1,2})?$/

/**
 * The price inputs for a saved price. `min == max` is a single price; anything else (including an
 * open range from before 0.3.0, with only one bound) is a range.
 */
export function priceDraft(price: ItemPrice) {
  if (!price) {
    return {
      hasPrice: false,
      priceMode: 'single' as PriceMode,
      priceAmount: '',
      priceMin: '',
      priceMax: '',
      currency: '',
    }
  }
  const single = price.min !== null && price.min === price.max
  return {
    hasPrice: true,
    priceMode: (single ? 'single' : 'range') as PriceMode,
    priceAmount: single ? (price.min ?? '') : '',
    priceMin: single ? '' : (price.min ?? ''),
    priceMax: single ? '' : (price.max ?? ''),
    currency: price.currency,
  }
}

/** `"12.5"` becomes `"12.50"`; anything that is not a price of at most 2 decimals is `null`. */
export function normalizePrice(text: string): string | null {
  const value = text.trim()
  if (!PRICE.test(value)) return null
  const [whole = '0', cents = ''] = value.split('.')
  return `${whole}.${cents.padEnd(2, '0')}`
}

export const toCents = (price: string) => Number(price.replace('.', ''))
