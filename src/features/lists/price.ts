import type { components } from '../../generated/schema'

type Price = components['schemas']['Price']

/**
 * Display text for an item price (UI_SPEC §3): `€1,299`, `€1,200–1,500`, `from €1,200` or
 * `up to €1,500`. The locale is the browser's. Decimals only appear when some amount has cents.
 * Prices travel as decimal strings (D-015); `Number` is fine here because this is display only.
 */
export function formatPrice(price: Price): string | null {
  if (!price) return null
  const min = price.min === null ? null : Number(price.min)
  const max = price.max === null ? null : Number(price.max)
  if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) return null
  if (min === null && max === null) return null

  const hasCents = [min, max].some((n) => n !== null && !Number.isInteger(n))
  const digits = hasCents ? 2 : 0
  let format: Intl.NumberFormat
  try {
    format = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: price.currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  } catch {
    // Unknown currency code: show the code instead of failing the whole row.
    const plain = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: digits })
    return rangeText(
      min,
      max,
      (n) => `${price.currency} ${plain(n)}`,
      (n) => plain(n),
      true,
    )
  }
  const bare = (n: number) =>
    format
      .formatToParts(n)
      .filter((part) => part.type !== 'currency')
      .map((part) => part.value)
      .join('')
      .trim()
  const currencyFirst = format.formatToParts(0)[0]?.type === 'currency'
  return rangeText(min, max, (n) => format.format(n), bare, currencyFirst)
}

function rangeText(
  min: number | null,
  max: number | null,
  full: (n: number) => string,
  bare: (n: number) => string,
  currencyFirst: boolean,
): string {
  if (min !== null && max !== null) {
    if (min === max) return full(min)
    // The currency is written once, on the side the locale puts it: `€1,200–1,500`, `1.200–1.500 €`.
    return currencyFirst ? `${full(min)}–${bare(max)}` : `${bare(min)}–${full(max)}`
  }
  if (min !== null) return `from ${full(min)}`
  return `up to ${full(max as number)}`
}
