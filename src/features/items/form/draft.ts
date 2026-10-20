import { joinStoreKeys } from '../../stores'
import type { Item, ItemType } from '../api'
import { isStreamingField, type TypeField } from '../types'
import { priceDraft, type PriceInput, type PriceMode } from './price'

/**
 * The form state of the item editor: the `Draft` type, its constants and the conversion from a saved
 * item. The rest of the pure form logic lives beside it: `price.ts`, `patch.ts` (typed values and the
 * PATCH body), `validate.ts`, `serverErrors.ts` and `dump.ts`.
 *
 * A `Draft` holds what the inputs hold (strings). `toFields` turns it into the typed values the API
 * takes. Both the saved item and the draft go through the same `toFields`, so "did this field
 * change?" compares like with like (`"2019"` and `2019`, padding spaces, `12.5` and `"12.50"`).
 */

/** Settings the form falls back on; empty while the settings are still loading. */
export interface Defaults {
  country: string
}

/** The currency the "Add price" control starts with (there is no workspace default since 0.3.0). */
export const INITIAL_CURRENCY = 'EUR'

export interface Draft {
  title: string
  /** The item's type, derived from its list. Read-only: no input edits it. */
  type: ItemType
  typeName: string
  fields: readonly TypeField[]
  /** Is the price control shown? A price is never there by default ("+ Add price"). */
  hasPrice: boolean
  priceMode: PriceMode
  /** The single price (`priceMode: 'single'`). */
  priceAmount: string
  /** The range bounds (`priceMode: 'range'`). */
  priceMin: string
  priceMax: string
  currency: string
  website: string
  /** Text of each type field except `streaming`, by key. Empty = unset. */
  meta: Record<string, string>
  streamingCountry: string
  /** Comma-separated. */
  streamingPlatforms: string
  /** Paid platforms (each one must also be in `streamingPlatforms`). */
  streamingPaid: string[]
}

export type Metadata = Record<string, unknown>
export type Streaming = { country: string; platforms?: string[]; paid_platforms?: string[] }

/** The typed values of a draft: what the API takes (`null` clears or omits). */
export interface FormFields {
  title: string
  price: PriceInput
  website: string | null
  metadata: Metadata
}

export const LIMITS = { title: 300, url: 2048, platform: 60 } as const

export const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)$/

const metadataOf = (item: Item) => item.metadata as Metadata

/** The fields of a type that are plain inputs. `streaming` is two inputs of its own. */
export const simpleFields = (fields: readonly TypeField[]): readonly TypeField[] =>
  fields.filter((field) => !isStreamingField(field))

export const hasStreaming = (fields: readonly TypeField[]) => fields.some(isStreamingField)

export function draftFromItem(
  item: Item,
  definition: { name: string; fields: readonly TypeField[] },
): Draft {
  const meta: Record<string, string> = {}
  const stored = metadataOf(item)
  for (const field of simpleFields(definition.fields)) {
    const value = stored[field.key]
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      meta[field.key] = String(value)
    // A `stores` field holds store keys, shown and edited as one comma-separated text (F016-W4).
    else if (field.type === 'stores' && Array.isArray(value))
      meta[field.key] = joinStoreKeys(value.filter((v): v is string => typeof v === 'string'))
  }
  const streaming = stored.streaming as Streaming | undefined
  return {
    title: item.title,
    type: item.type,
    typeName: definition.name,
    fields: definition.fields,
    ...priceDraft(item.price),
    website: item.website ?? '',
    meta,
    streamingCountry: streaming?.country ?? '',
    streamingPlatforms: streaming?.platforms?.join(', ') ?? '',
    streamingPaid: streaming?.paid_platforms ?? [],
  }
}

/** The platforms of the comma-separated input: trimmed, no empty entries, no repeats (any case). */
export function parsePlatforms(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of text.split(',')) {
    const name = part.trim()
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase())
      out.push(name)
    }
  }
  return out
}
