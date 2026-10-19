import type { components } from '../../generated/schema'
import type { PinnedFields } from './api'
import { formatField, hasPrice, type TypeDefinition } from '../items/types'
import { formatPrice } from './price'

type ItemSummary = components['schemas']['ItemSummary']

/**
 * The fields a list pins, by key, in order: the first reads next to the title, the second in the
 * right corner. At most {@link MAX_PINNED} keys (the contract's limit, D-085).
 */
export type PinnedKeys = readonly string[]

/** Most keys a list may pin, in order (the contract's limit). */
export const MAX_PINNED = 2

/** The type default supplied by the definition API, capped defensively at the contract limit. */
export function defaultPinned(definition: TypeDefinition): PinnedKeys {
  return [...(definition.default_pinned_fields ?? [])].slice(0, MAX_PINNED)
}

/** What the list shows: its own selection, else the type default. `[]` pins nothing. */
export function resolvePinned(
  list: { pinned_fields: PinnedFields },
  definition: TypeDefinition,
): PinnedKeys {
  if (!list.pinned_fields) return defaultPinned(definition)
  return [...list.pinned_fields]
}

export interface PinnableField {
  key: string
  label: string
}

/**
 * Fields a list of this type can pin, followed by price when the type allows it.
 */
export function pinnableFields(definition: TypeDefinition): PinnableField[] {
  const fields = definition.fields.map(({ key, label }) => ({
    key,
    label: key === 'episode_minutes' ? 'Episode duration' : label,
  }))
  return hasPrice(definition) ? [...fields, { key: 'price', label: 'Price' }] : fields
}

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
  const value = item.metadata[key]
  if (definition.key === 'tv_show') {
    if (key === 'seasons') return num(value) === null ? null : `${value} seasons`
    if (key === 'episodes_per_season') {
      return num(value) === null ? null : `${value} episodes per season`
    }
    if (key === 'episode_minutes') return num(value) === null ? null : `${value} min`
  }
  const field = definition.fields.find((f) => f.key === key)
  return field ? formatField(field, value) : null
}

/**
 * The keys each placement of a row reads (F009-W3): the first pinned field next to the title, the
 * second in the right corner. A TV show's seasons and episodes read as one `5×7`, so they stay
 * together in the first placement and leave the corner empty.
 */
export function pinnedPlacements(pinned: PinnedKeys): { first: string[]; second: string[] } {
  const [lead, second] = pinned
  if (!lead) return { first: [], second: [] }
  if (lead === 'seasons' && second === 'episodes_per_season') {
    return { first: [lead, second], second: [] }
  }
  return { first: [lead], second: second ? [second] : [] }
}

/** The text pieces of a run of fields, in order, ready to join with ` · `. Streaming is left to the caller. */
export function pinnedTexts(
  keys: readonly string[],
  item: ItemSummary,
  definition: TypeDefinition,
): string[] {
  const texts: string[] = []
  const meta = item.metadata
  let combined = false
  for (const key of keys) {
    // Seasons and episodes together read `5×7`, once, where the first of them sits.
    if (definition.key === 'tv_show' && (key === 'seasons' || key === 'episodes_per_season')) {
      if (keys.includes('seasons') && keys.includes('episodes_per_season')) {
        const seasons = num(meta.seasons)
        const episodes = num(meta.episodes_per_season)
        if (!combined && seasons !== null && episodes !== null) texts.push(`${seasons}×${episodes}`)
        combined = true
        continue
      }
    }
    const text = formatPinnedValue(key, item, definition)
    if (text) texts.push(text)
  }
  return texts
}

/** The streaming platforms of an item, with whether each is paid. */
export function streamingOf(item: ItemSummary): { name: string; paid: boolean }[] {
  const streaming = item.metadata.streaming as
    { platforms?: string[]; paid_platforms?: string[] } | null | undefined
  const paid = new Set((streaming?.paid_platforms ?? []).map((name) => name.toLowerCase()))
  return (streaming?.platforms ?? []).map((name) => ({ name, paid: paid.has(name.toLowerCase()) }))
}
