import type { components } from '../../../generated/schema'
import type { FieldError } from '../../../lib/api'
import type { Item, ItemType } from '../api'
import { formatField, isStreamingField, type TypeField } from '../types'
import { IMDB_URL } from '../links'
import { joinStoreKeys, parseStoreKeys } from '../../stores/providers'

/**
 * The form state of the item editor and everything derived from it, as pure functions: validation,
 * the PATCH body, the readable dump of a draft, and the mapping of server 422 errors onto inputs.
 *
 * A `Draft` holds what the inputs hold (strings). `toFields` turns it into the typed values the API
 * takes. Both the saved item and the draft go through the same `toFields`, so "did this field
 * change?" compares like with like (`"2019"` and `2019`, padding spaces, `12.5` and `"12.50"`).
 */

type UpdateItemRequest = components['schemas']['UpdateItemRequest']

/** Settings the form falls back on; empty while the settings are still loading. */
export interface Defaults {
  country: string
}

/** The currency the "Add price" control starts with (there is no workspace default since 0.3.0). */
export const INITIAL_CURRENCY = 'EUR'

export type PriceMode = 'single' | 'range'

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

type Metadata = Record<string, unknown>
type Streaming = { country: string; platforms?: string[]; paid_platforms?: string[] }
/** A price as the API takes it (`PriceInput`): a single `amount` or a `min`/`max` range. `null` clears. */
type PriceInput =
  | { amount: string; currency: string }
  | { min: string | null; max: string | null; currency: string }
  | null
type ItemPrice = Item['price']

/** The typed values of a draft: what the API takes (`null` clears or omits). */
export interface FormFields {
  title: string
  price: PriceInput
  website: string | null
  metadata: Metadata
}

export const LIMITS = { title: 300, url: 2048, platform: 60 } as const
const MAX_PLATFORMS = 30

const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)$/
const INTEGER = /^\d+$/
const PRICE = /^\d{1,10}(\.\d{1,2})?$/

const metadataOf = (item: Item) => item.metadata as Metadata

/** The fields of a type that are plain inputs. `streaming` is two inputs of its own. */
export const simpleFields = (fields: readonly TypeField[]): readonly TypeField[] =>
  fields.filter((field) => !isStreamingField(field))

export const hasStreaming = (fields: readonly TypeField[]) => fields.some(isStreamingField)

/**
 * The price inputs for a saved price. `min == max` is a single price; anything else (including an
 * open range from before 0.3.0, with only one bound) is a range.
 */
function priceDraft(price: ItemPrice) {
  if (!price) {
    return {
      hasPrice: false,
      priceMode: 'single' as PriceMode,
      priceAmount: '',
      priceMin: '',
      priceMax: '',
      currency: '',
    }
  }
  const single = price.min !== null && price.min === price.max
  return {
    hasPrice: true,
    priceMode: (single ? 'single' : 'range') as PriceMode,
    priceAmount: single ? (price.min ?? '') : '',
    priceMin: single ? '' : (price.min ?? ''),
    priceMax: single ? '' : (price.max ?? ''),
    currency: price.currency,
  }
}

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

/** `"12.5"` becomes `"12.50"`; anything that is not a price of at most 2 decimals is `null`. */
export function normalizePrice(text: string): string | null {
  const value = text.trim()
  if (!PRICE.test(value)) return null
  const [whole = '0', cents = ''] = value.split('.')
  return `${whole}.${cents.padEnd(2, '0')}`
}

const toCents = (price: string) => Number(price.replace('.', ''))

const blank = (text: string) => (text.trim() === '' ? null : text.trim())

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

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

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

// ---------------------------------------------------------------------------------------------
// Input keys and validation

/** Error keys are the API's dotted field paths, so a 422 `errors[].field` is looked up directly. */
export type ErrorMap = Record<string, string>

/** Every input of the form for a type, in page order (also the order of "focus the first invalid"). */
export function inputKeys(fields: readonly TypeField[]): string[] {
  const keys = ['title', 'price.amount', 'price.min', 'price.max', 'price.currency', 'website']
  for (const field of fields) {
    if (isStreamingField(field)) {
      keys.push('metadata.streaming.country', 'metadata.streaming.platforms')
    } else keys.push(`metadata.${field.key}`)
  }
  return keys
}

/** The DOM id of the input of an error key. */
export const inputId = (key: string) => `item-field-${key.replaceAll('.', '-')}`

function validateField(field: TypeField, text: string): string | undefined {
  const value = text.trim()
  if (!value) return undefined
  switch (field.type) {
    case 'text':
      return undefined
    case 'number':
      return NUMBER.test(value) && Number.isFinite(Number(value)) ? undefined : 'Enter a number.'
    case 'date': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter a date.'
      const date = new Date(`${value}T00:00:00Z`)
      return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
        ? undefined
        : 'Enter a valid date.'
    }
    case 'boolean':
      return value === 'true' || value === 'false' ? undefined : 'Choose yes or no.'
    case 'link':
      if (field.key === 'imdb_url')
        return IMDB_URL.test(value)
          ? undefined
          : 'Enter an IMDb title link like https://www.imdb.com/title/tt0133093/'
      return isWebUrl(value) ? undefined : 'Enter a web address beginning with http:// or https://.'
    default:
      return undefined
  }
}

/** Is `text` an `http:` or `https:` web address? (`javascript:` and friends are not.) */
export function isWebUrl(text: string): boolean {
  try {
    const { protocol } = new URL(text)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** Client-side field rules (the server stays authoritative). Empty when the draft can be sent. */
export function validate(draft: Draft, defaults: Defaults): ErrorMap {
  const errors: ErrorMap = {}
  const title = draft.title.trim()
  if (!title) errors.title = 'Enter a title.'
  else if (title.length > LIMITS.title) errors.title = `Use at most ${LIMITS.title} characters.`

  if (draft.hasPrice) {
    const priceHint = 'Use digits and a dot, with at most 2 decimals, e.g. 1299.50.'
    if (draft.priceMode === 'single') {
      const amount = blank(draft.priceAmount)
      if (amount !== null && normalizePrice(amount) === null) errors['price.amount'] = priceHint
    } else {
      const min = blank(draft.priceMin)
      const max = blank(draft.priceMax)
      if (min !== null && normalizePrice(min) === null) errors['price.min'] = priceHint
      if (max !== null && normalizePrice(max) === null) errors['price.max'] = priceHint
      if (min !== null && max !== null && !errors['price.min'] && !errors['price.max']) {
        if (toCents(normalizePrice(min) as string) > toCents(normalizePrice(max) as string)) {
          errors['price.max'] = 'The maximum can’t be lower than the minimum.'
        }
      }
    }
    if (toFields(draft, defaults).price && !/^[A-Z]{3}$/.test(draft.currency || INITIAL_CURRENCY)) {
      errors['price.currency'] = 'Choose a currency.'
    }
  }

  const url = draft.website.trim()
  if (url) {
    if (url.length > LIMITS.url) errors.website = `Use at most ${LIMITS.url} characters.`
    else if (!isWebUrl(url)) {
      errors.website = 'Enter a web address starting with http:// or https://'
    }
  }

  for (const field of simpleFields(draft.fields)) {
    const message = validateField(field, draft.meta[field.key] ?? '')
    if (message) errors[`metadata.${field.key}`] = message
  }
  validateTypeRules(draft, errors)

  if (hasStreaming(draft.fields)) {
    const platforms = parsePlatforms(draft.streamingPlatforms)
    const country = draft.streamingCountry.trim().toUpperCase() || defaults.country.toUpperCase()
    if ((platforms.length > 0 || draft.streamingCountry.trim()) && !/^[A-Z]{2}$/.test(country)) {
      // F011-W1: the country is no longer asked on the item (it comes from Settings), so this only
      // fires when Settings has none either, and the message has to say where to fix it.
      errors['metadata.streaming.country'] = 'Pick a streaming country in Settings first.'
    }
    if (platforms.length > MAX_PLATFORMS) {
      errors['metadata.streaming.platforms'] = `List at most ${MAX_PLATFORMS} platforms.`
    } else if (platforms.some((name) => name.length > LIMITS.platform)) {
      errors['metadata.streaming.platforms'] =
        `Each platform name can have at most ${LIMITS.platform} characters.`
    }
  }
  return errors
}

/** Rules that look at two fields (DATA_MODEL §2.1). Only reported when both fields are valid alone. */
function validateTypeRules(draft: Draft, errors: ErrorMap) {
  const num = (key: string) => {
    const text = (draft.meta[key] ?? '').trim()
    return INTEGER.test(text) && !errors[`metadata.${key}`] ? Number(text) : undefined
  }
  if (draft.type === 'tv_show') {
    const first = num('first_air_year')
    const end = num('end_year')
    if (first !== undefined && end !== undefined && end < first) {
      errors['metadata.end_year'] = 'The end year can’t be before the first air year.'
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Server errors (422)

export interface MappedErrors {
  /** Messages by input key. */
  fields: ErrorMap
  /** Errors that name no input of the form (shown in a summary). */
  other: string[]
}

/** Server field paths that point at a group of inputs; we show them on the first one. */
const ALIASES: Record<string, string> = {
  'metadata.streaming': 'metadata.streaming.country',
}

/**
 * Maps `errors[].field` to the inputs of the form: `price.max` to the price field, `metadata.power_hp`
 * to the Power input, `metadata.streaming.platforms[2]` to the platforms input. Anything else
 * (or a metadata key the current type has no input for) goes to `other`.
 */
export function mapServerErrors(
  errors: readonly FieldError[],
  fields: readonly TypeField[],
  priceMode: PriceMode = 'single',
): MappedErrors {
  const known = new Set(inputKeys(fields))
  const aliases: Record<string, string> = {
    ...ALIASES,
    price: priceMode === 'single' ? 'price.amount' : 'price.min',
  }
  const result: MappedErrors = { fields: {}, other: [] }
  for (const error of errors) {
    const path = error.field.replace(/\[\d+\]/g, '')
    const key = aliases[path] ?? path
    if (known.has(key)) {
      result.fields[key] = result.fields[key]
        ? `${result.fields[key]} ${error.message}`
        : error.message
    } else {
      result.other.push(error.field ? `${error.field}: ${error.message}` : error.message)
    }
  }
  return result
}

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
