import type { components } from '../../generated/schema'
import type { ItemKind } from '../items/api'
import type { PinnedFields } from './api'
import { formatField, hasPrice, kindFields } from '../items/kinds'
import { formatPrice } from './price'

type ItemSummary = components['schemas']['ItemSummary']

/**
 * The fields a list pins, by key, in order: the first reads next to the title, the second in the
 * right corner. At most {@link MAX_PINNED} keys (the contract's limit, D-085).
 */
export type PinnedKeys = readonly string[]

/** Most keys a list may pin, in order (the contract's limit). */
export const MAX_PINNED = 2

const DEFAULTS: Record<ItemKind, PinnedKeys> = {
  // Streaming in the corner on both streaming kinds, so the service icons stay in every movie and
  // TV row (F-002). Pinning `seasons` and `episodes_per_season` together still reads `5×7`.
  movie: ['runtime_minutes', 'streaming'],
  tv_show: ['seasons', 'streaming'],
  motorcycle: ['displacement_cc', 'price'],
  car: ['model_year', 'price'],
  camera: ['camera_type', 'price'],
  generic: [],
}

/** The kind default (F-002 "Pinned fields" table, capped at two in F009-W3). The web owns it; the API stores `null` for it. */
export function defaultPinned(kind: ItemKind): PinnedKeys {
  return [...DEFAULTS[kind]]
}

/** What the list shows: its own selection, else the kind default. `[]` pins nothing. */
export function resolvePinned(list: { kind: ItemKind; pinned_fields: PinnedFields }): PinnedKeys {
  // A generic list has no fields at all (F008-W14): nothing is pinned, whatever was stored.
  if (list.kind === 'generic') return []
  if (!list.pinned_fields) return defaultPinned(list.kind)
  return [...list.pinned_fields]
}

export interface PinnableField {
  key: string
  label: string
}

/**
 * Fields a list of this kind can pin: its kind fields (not the IMDb link), then price when the
 * kind defines one (D-085).
 */
export function pinnableFields(kind: ItemKind): PinnableField[] {
  if (kind === 'generic') return []
  const fields = kindFields[kind]
    .filter((field) => field.input !== 'imdb_url')
    .map(({ key, label }) => ({
      key,
      label: key === 'episode_minutes' ? 'Episode duration' : label,
    }))
  return hasPrice(kind) ? [...fields, { key: 'price', label: 'Price' }] : fields
}

const num = (value: unknown) => (typeof value === 'number' ? value : null)

/**
 * The plain text of one pinned field, or `null` when the item has no value for it. `streaming` is
 * not text (the row draws icons) and returns `null` here.
 */
export function formatPinnedValue(key: string, item: ItemSummary, kind: ItemKind): string | null {
  if (key === 'price') return formatPrice(item.price)
  if (key === 'streaming') return null
  const value = item.metadata[key]
  if (kind === 'tv_show') {
    if (key === 'seasons') return num(value) === null ? null : `${value} seasons`
    if (key === 'episodes_per_season') {
      return num(value) === null ? null : `${value} episodes per season`
    }
    if (key === 'episode_minutes') return num(value) === null ? null : `${value} min`
  }
  const field = kindFields[kind].find((f) => f.key === key)
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
export function pinnedTexts(keys: readonly string[], item: ItemSummary, kind: ItemKind): string[] {
  const texts: string[] = []
  const meta = item.metadata
  let combined = false
  for (const key of keys) {
    // Seasons and episodes together read `5×7`, once, where the first of them sits.
    if (kind === 'tv_show' && (key === 'seasons' || key === 'episodes_per_season')) {
      if (keys.includes('seasons') && keys.includes('episodes_per_season')) {
        const seasons = num(meta.seasons)
        const episodes = num(meta.episodes_per_season)
        if (!combined && seasons !== null && episodes !== null) texts.push(`${seasons}×${episodes}`)
        combined = true
        continue
      }
    }
    const text = formatPinnedValue(key, item, kind)
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
