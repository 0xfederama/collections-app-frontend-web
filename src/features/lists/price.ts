import type { components } from '../../generated/schema'

type Price = components['schemas']['Price']

/** Between the currency symbol and the amount: a narrow no-break space, so "€ 1,200" never splits. */
const GAP = '\u202F'

/**
 * Display text for an item price, the one formatter for the item view, list rows and pinned fields
 * (F008-W12, no cents): `€ 1,299`, `€ 1,000–1,400` (the symbol once, then the amounts), `from € 1,200`
 * or `up to € 1,500`. Digit grouping and the symbol come from the browser's locale via `Intl`;
 * amounts are rounded to whole units. Prices travel as decimal strings (D-015); `Number` is fine
 * here because this is display only.
 */
export function formatPrice(price: Price): string | null {
  if (!price) return null
  const min = price.min === null ? null : Number(price.min)
  const max = price.max === null ? null : Number(price.max)
  if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) return null
  if (min === null && max === null) return null

  const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
  let symbol: string
  try {
    symbol =
      new Intl.NumberFormat(undefined, { style: 'currency', currency: price.currency })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value ?? price.currency
  } catch {
    // Unknown currency code: show the code instead of failing the whole row.
    symbol = price.currency
  }
  const amounts =
    min !== null && max !== null
      ? min === max
        ? number.format(min)
        : `${number.format(min)}–${number.format(max)}`
      : min !== null
        ? `from ${symbol}${GAP}${number.format(min)}`
        : `up to ${symbol}${GAP}${number.format(max as number)}`
  return min !== null && max !== null ? `${symbol}${GAP}${amounts}` : amounts
}
