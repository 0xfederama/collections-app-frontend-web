import type { Item } from '../api'
import { formatField, type TypeField } from '../types'
import { draftFromItem, type Defaults, type Draft, type Streaming } from './draft'
import { same, toFields } from './patch'
import type { PriceInput } from './price'

// ---------------------------------------------------------------------------------------------
// Copy my draft

const priceText = (price: PriceInput) => {
  if (!price) return null
  if ('amount' in price) return `${price.amount} ${price.currency}`
  const { min, max, currency } = price
  if (min !== null && max !== null)
    return min === max ? `${min} ${currency}` : `${min}–${max} ${currency}`
  return min !== null ? `from ${min} ${currency}` : `up to ${max} ${currency}`
}

function metadataText(fields: readonly TypeField[], key: string, value: unknown): string {
  if (value === undefined) return '(cleared)'
  if (key === 'streaming') {
    const streaming = value as Streaming
    return [streaming.country, streaming.platforms?.join(', ')].filter(Boolean).join(': ')
  }
  if (Array.isArray(value)) return value.join(', ')
  const field = fields.find((candidate) => candidate.key === key)
  return (field && formatField(field, value)) || String(value)
}

/**
 * A readable text dump of the fields the user changed, for the clipboard when a save conflicts
 * (UI_SPEC §9). Cleared fields say so.
 */
export function draftDump(base: Item, draft: Draft, defaults: Defaults): string {
  const before = toFields(
    draftFromItem(base, { name: draft.typeName, fields: draft.fields }),
    defaults,
  )
  const after = toFields(draft, defaults)
  const lines: string[] = []
  const line = (label: string, value: string | null) =>
    lines.push(`${label}: ${value ?? '(cleared)'}`)

  if (!same(before.title, after.title)) line('Title', after.title)
  if (!same(before.price, after.price)) line('Price', priceText(after.price))
  if (!same(before.website, after.website)) line('Website', after.website)
  const keys = new Set([...Object.keys(before.metadata), ...Object.keys(after.metadata)])
  const details: string[] = []
  for (const key of keys) {
    if (same(before.metadata[key], after.metadata[key])) continue
    const label = draft.fields.find((field) => field.key === key)?.label ?? key
    details.push(`  ${label}: ${metadataText(draft.fields, key, after.metadata[key])}`)
  }
  if (details.length > 0) lines.push(`${draft.typeName} details:`, ...details)
  return lines.join('\n')
}
