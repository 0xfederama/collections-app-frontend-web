import type { components } from '../../../generated/schema'
import { parseStoreKeys } from '../../stores'
import type { Item } from '../api'
import type { TypeField } from '../types'
import {
  INITIAL_CURRENCY,
  NUMBER,
  draftFromItem,
  hasStreaming,
  parsePlatforms,
  simpleFields,
  type Defaults,
  type Draft,
  type FormFields,
  type Metadata,
  type Streaming,
} from './draft'
import { normalizePrice, type PriceInput } from './price'

type UpdateItemRequest = components['schemas']['UpdateItemRequest']

export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** The trimmed text, or `null` when it is blank. */
export const blank = (text: string) => (text.trim() === '' ? null : text.trim())

/** The value a text input stands for, or the raw text when it is not valid (validation reports it). */
function fieldValue(field: TypeField, text: string): unknown {
  const value = text.trim()
  if (!value) return undefined
  switch (field.type) {
    case 'number':
      return NUMBER.test(value) && Number.isFinite(Number(value)) ? Number(value) : value
    case 'boolean':
      return value === 'true' ? true : value === 'false' ? false : value
    case 'stores': {
      const keys = parseStoreKeys(value)
      return keys.length > 0 ? keys : undefined
    }
    default:
      return value
  }
}

export function toFields(draft: Draft, defaults: Defaults): FormFields {
  const currency = draft.currency || INITIAL_CURRENCY
  let price: PriceInput = null
  if (draft.hasPrice && draft.priceMode === 'single') {
    const amount = blank(draft.priceAmount)
    if (amount !== null) price = { amount: normalizePrice(amount) ?? amount, currency }
  } else if (draft.hasPrice) {
    const min = blank(draft.priceMin)
    const max = blank(draft.priceMax)
    if (min !== null || max !== null) {
      price = {
        min: min === null ? null : (normalizePrice(min) ?? min),
        max: max === null ? null : (normalizePrice(max) ?? max),
        currency,
      }
    }
  }

  const metadata: Metadata = {}
  for (const field of simpleFields(draft.fields)) {
    const value = fieldValue(field, draft.meta[field.key] ?? '')
    if (value !== undefined) metadata[field.key] = value
  }
  if (hasStreaming(draft.fields)) {
    const platforms = parsePlatforms(draft.streamingPlatforms)
    const country = draft.streamingCountry.trim().toUpperCase()
    if (country || platforms.length > 0) {
      const streaming: Streaming = { country: country || defaults.country.toUpperCase() }
      if (platforms.length > 0) streaming.platforms = platforms
      // Each paid entry must still be one of the platforms (case-insensitive), with that casing.
      const paid = draft.streamingPaid.flatMap((name) => {
        const match = platforms.find((p) => p.toLowerCase() === name.toLowerCase())
        return match ? [match] : []
      })
      if (paid.length > 0) streaming.paid_platforms = paid
      metadata.streaming = streaming
    }
  }

  return {
    title: draft.title.trim(),
    price,
    website: blank(draft.website),
    metadata,
  }
}

const BASIC_KEYS = ['title', 'price', 'website'] as const

/**
 * The PATCH body: only the fields that differ from the saved item. `metadata` replaces the whole
 * object on the server (D-062), so it goes as the full object whenever any type field changed. The
 * type is never sent: it belongs to the list. An unchanged price sends nothing; removing it sends `null`.
 */
export function buildPatch(base: Item, draft: Draft, defaults: Defaults): UpdateItemRequest {
  const before = toFields(
    draftFromItem(base, { name: draft.typeName, fields: draft.fields }),
    defaults,
  )
  const after = toFields(draft, defaults)
  const patch: Record<string, unknown> = {}
  for (const key of BASIC_KEYS) {
    if (!same(before[key], after[key])) patch[key] = after[key]
  }
  if (!same(before.metadata, after.metadata)) {
    patch.metadata = after.metadata
  }
  return patch as UpdateItemRequest
}

export const isDirty = (base: Item, draft: Draft, defaults: Defaults) =>
  Object.keys(buildPatch(base, draft, defaults)).length > 0
