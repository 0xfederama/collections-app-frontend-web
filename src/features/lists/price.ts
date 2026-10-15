import type { components } from '../../generated/schema'

type Price = components['schemas']['Price']

/**
 * Display text for an item price (F-002, no cents): `€1,299`, `€1,200–€1,500`, `from €1,200` or
 * `up to €1,500`. The locale is the browser's; amounts are rounded to whole units. Prices travel
 * as decimal strings (D-015); `Number` is fine here because this is display only.
 */
export function formatPrice(price: Price): string | null {
  if (!price) return null
  const min = price.min === null ? null : Number(price.min)
  const max = price.max === null ? null : Number(price.max)
  if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) return null
  if (min === null && max === null) return null

  let full: (n: number) => string
  try {
    const format = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: price.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    full = (n) => format.format(n)
  } catch {
    // Unknown currency code: show the code instead of failing the whole row.
    full = (n) => `${price.currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }
  if (min !== null && max !== null) {
    return min === max ? full(min) : `${full(min)}–${full(max)}`
  }
  if (min !== null) return `from ${full(min)}`
  return `up to ${full(max as number)}`
}
