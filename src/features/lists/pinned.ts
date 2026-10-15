import type { components } from '../../generated/schema'
import type { ItemKind } from '../items/api'
import type { PinnedFields } from './api'
import { formatField, kindFields } from '../items/kinds'
import { formatPrice } from './price'

type ItemSummary = components['schemas']['ItemSummary']

/** The two slots of a list's row layout, by field key, in display order. */
export interface PinnedSlots {
  under: string[]
  right: string[]
}

/** Most keys one slot may hold (the contract's limit). */
export const MAX_PINNED_PER_SLOT = 6

const DEFAULTS: Record<ItemKind, PinnedSlots> = {
  movie: { under: ['runtime_minutes'], right: ['streaming'] },
  tv_show: { under: ['seasons', 'episodes_per_season', 'episode_minutes'], right: ['streaming'] },
  motorcycle: { under: ['displacement_cc'], right: ['price'] },
  car: { under: ['model_year'], right: ['price'] },
  camera: { under: ['camera_type'], right: ['price'] },
  generic: { under: [], right: ['price'] },
}

/** The kind default (F-002 "Pinned fields" table). The web owns it; the API stores `null` for it. */
export function defaultPinned(kind: ItemKind): PinnedSlots {
  const slots = DEFAULTS[kind]
  return { under: [...slots.under], right: [...slots.right] }
}

/** What the list shows: its own selection, else the kind default. `{}` pins nothing. */
export function resolvePinned(list: { kind: ItemKind; pinned_fields: PinnedFields }): PinnedSlots {
  if (!list.pinned_fields) return defaultPinned(list.kind)
  return {
    under: [...(list.pinned_fields.under ?? [])],
    right: [...(list.pinned_fields.right ?? [])],
  }
}

export interface PinnableField {
  key: string
  label: string
}

/** Fields a list of this kind can pin: its kind fields (not the IMDb link), then price. */
export function pinnableFields(kind: ItemKind): PinnableField[] {
  const fields = kindFields[kind]
    .filter((field) => field.input !== 'imdb_url')
    .map(({ key, label }) => ({
      key,
      label: key === 'episode_minutes' ? 'Episode duration' : label,
    }))
  return [...fields, { key: 'price', label: 'Price' }]
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

/** The text pieces of a slot, in order, ready to join with ` · `. Streaming is left to the caller. */
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
