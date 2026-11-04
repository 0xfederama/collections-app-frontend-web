import type { components } from '../../generated/schema'
import { formatField, hasPrice, type TypeDefinition } from '../items'
import { formatPrice } from './price'

type ItemSummary = components['schemas']['ItemSummary']

/**
 * The fields a list row shows, by key, in order: the first reads next to the title, the second in
 * the right corner (with three, the first two next to the title and the third in the corner).
 */
export type PinnedKeys = readonly string[]

/**
 * The pins of each built-in type (F-022 W2): the web owns them, the API no longer stores a choice.
 * A type not listed here, including "No type", pins nothing.
 */
const FIXED_PINS = new Map<string, PinnedKeys>([
  ['movie', ['runtime_minutes', 'director', 'streaming']],
  ['tv_show', ['seasons', 'streaming']],
  ['book', ['pages', 'author', 'stores']],
  ['vehicle', ['model_year', 'power_hp']],
  ['wishlist', ['price']],
])

/**
 * The pinned fields of a type: its fixed pins, minus any whose field the definition does not have.
 * `price` is not a field: it counts only where the type allows a price.
 */
export function fixedPinned(definition: TypeDefinition): PinnedKeys {
  return (FIXED_PINS.get(definition.key) ?? []).filter((key) =>
    key === 'price' ? hasPrice(definition) : definition.fields.some((field) => field.key === key),
  )
}

/**
 * The metadata pins that give way first when a row runs out of room (F-025 W9): a movie's director and
 * a book's page count truncate. Streaming, the author and the other pins are never truncated.
 */
const LOW_PRIORITY_PINS = new Set(['director', 'pages'])

export const isLowPriorityPin = (key: string): boolean => LOW_PRIORITY_PINS.has(key)

const num = (value: unknown) => (typeof value === 'number' ? value : null)

/**
 * The plain text of one pinned field, or `null` when the item has no value for it. `streaming` is
 * not text (the row draws icons) and returns `null` here.
 */
export function formatPinnedValue(
  key: string,
  item: ItemSummary,
  definition: TypeDefinition,
): string | null {
  if (key === 'price') return formatPrice(item.price)
  if (key === 'streaming') return null
  if (definition.fields.find((f) => f.key === key)?.type === 'stores') return null
  const value = item.metadata[key]
  if (definition.key === 'tv_show' && key === 'seasons') {
    return num(value) === null ? null : `${value} seasons`
  }
  const field = definition.fields.find((f) => f.key === key)
  return field ? formatField(field, value) : null
}

/**
 * The keys each placement of a row reads (F009-W3, F016-W3). One pin sits next to the title. Two:
 * the first next to the title, the second in the right corner. Three: `first` and `second` both sit
 * next to the title and `third` is in the right corner. So the corner is `third` when it is set,
 * else `second`.
 */
export function pinnedPlacements(pinned: PinnedKeys): {
  first: string[]
  second: string[]
  third: string[]
} {
  const [lead, second, third] = pinned
  if (!lead) return { first: [], second: [], third: [] }
  return {
    first: [lead],
    second: second ? [second] : [],
    third: third ? [third] : [],
  }
}

/** The store provider keys an item has selected in a `stores` field. */
export function storesOf(item: ItemSummary, key: string): string[] {
  const value = item.metadata[key]
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

/** The text pieces of a run of fields, in order, each with its key. Streaming is left to the caller. */
export function pinnedPieces(
  keys: readonly string[],
  item: ItemSummary,
  definition: TypeDefinition,
): { key: string; text: string }[] {
  const pieces: { key: string; text: string }[] = []
  for (const key of keys) {
    const text = formatPinnedValue(key, item, definition)
    if (text) pieces.push({ key, text })
  }
  return pieces
}

/** The streaming platforms of an item, with whether each is paid. */
export function streamingOf(item: ItemSummary): { name: string; paid: boolean }[] {
  const streaming = item.metadata.streaming as
    { platforms?: string[]; paid_platforms?: string[] } | null | undefined
  const paid = new Set((streaming?.paid_platforms ?? []).map((name) => name.toLowerCase()))
  return (streaming?.platforms ?? []).map((name) => ({ name, paid: paid.has(name.toLowerCase()) }))
}
