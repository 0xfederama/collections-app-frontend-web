import type { components } from '../../../generated/schema'
import type { FieldError } from '../../../lib/api'
import { kindLabels } from '../../../components/ui'
import type { Item, ItemKind } from '../api'
import { formatField, kindFields, type Field } from '../kinds'
import { IMDB_URL } from '../links'

/**
 * The form state of the item editor and everything derived from it, as pure functions: validation,
 * the PATCH body, the readable dump of a draft, and the mapping of server 422 errors onto inputs.
 *
 * A `Draft` holds what the inputs hold (strings). `toFields` turns it into the typed values the API
 * takes. Both the saved item and the draft go through the same `toFields`, so "did this field
 * change?" compares like with like (`"2019"` and `2019`, padding spaces, `12.5` and `"12.50"`).
 */

type UpdateItemRequest = components['schemas']['UpdateItemRequest']

/** Settings the form falls back on; empty strings while the settings are still loading. */
export interface Defaults {
  currency: string
  country: string
}

export interface Draft {
  title: string
  kind: ItemKind
  summary: string
  status: string
  priceMin: string
  priceMax: string
  /** Empty = "the settings currency" (resolved by `toFields`, so an untouched form stays unchanged). */
  currency: string
  officialUrl: string
  /** Text of each kind field except `streaming`, by key. Empty = unset. */
  meta: Record<string, string>
  streamingCountry: string
  /** Comma-separated. */
  streamingPlatforms: string
}

type Metadata = Record<string, unknown>
type Streaming = { country: string; platforms?: string[] }
type Price = { min: string | null; max: string | null; currency: string } | null

/** The typed values of a draft: what the API takes (`null` clears or omits). */
export interface FormFields {
  title: string
  kind: ItemKind
  summary: string | null
  status: string | null
  price: Price
  official_website_url: string | null
  metadata: Metadata
}

export const LIMITS = { title: 300, summary: 1000, status: 100, url: 2048, platform: 60 } as const
const MAX_PLATFORMS = 30

const INTEGER = /^\d+$/
const ONE_DECIMAL = /^\d+(\.\d)?$/
const PRICE = /^\d{1,10}(\.\d{1,2})?$/

const metadataOf = (item: Item) => item.metadata as Metadata

/** The fields of a kind that are plain inputs. `streaming` is two inputs of its own. */
export const simpleFields = (kind: ItemKind): readonly Field[] =>
  kindFields[kind].filter((field) => field.input !== 'streaming')

export const hasStreaming = (kind: ItemKind) =>
  kindFields[kind].some((field) => field.input === 'streaming')

export function draftFromItem(item: Item): Draft {
  const meta: Record<string, string> = {}
  const stored = metadataOf(item)
  for (const field of simpleFields(item.kind)) {
    const value = stored[field.key]
    if (typeof value === 'string' || typeof value === 'number') meta[field.key] = String(value)
  }
  const streaming = stored.streaming as Streaming | undefined
  return {
    title: item.title,
    kind: item.kind,
    summary: item.summary ?? '',
    status: item.status ?? '',
    priceMin: item.price?.min ?? '',
    priceMax: item.price?.max ?? '',
    currency: item.price?.currency ?? '',
    officialUrl: item.official_website_url ?? '',
    meta,
    streamingCountry: streaming?.country ?? '',
    streamingPlatforms: streaming?.platforms?.join(', ') ?? '',
  }
}

/** Switching kind clears the kind details; switching back to the saved kind brings them back. */
export function withKind(draft: Draft, base: Item, kind: ItemKind): Draft {
  if (kind === draft.kind) return draft
  const original = draftFromItem(base)
  const restored = kind === base.kind
  return {
    ...draft,
    kind,
    meta: restored ? original.meta : {},
    streamingCountry: restored ? original.streamingCountry : '',
    streamingPlatforms: restored ? original.streamingPlatforms : '',
  }
}

/** Does the saved item have kind details that a kind change would clear? */
export const hasKindDetails = (item: Item) => Object.keys(metadataOf(item)).length > 0

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
function fieldValue(field: Field, text: string): unknown {
  const value = text.trim()
  if (!value) return undefined
  switch (field.input) {
    case 'year':
    case 'integer':
      return INTEGER.test(value) ? Number(value) : value
    case 'decimal':
      return ONE_DECIMAL.test(value) ? Number(value) : value
    default:
      return value
  }
}

export function toFields(draft: Draft, defaults: Defaults): FormFields {
  const min = blank(draft.priceMin)
  const max = blank(draft.priceMax)
  const price: Price =
    min === null && max === null
      ? null
      : {
          min: min === null ? null : (normalizePrice(min) ?? min),
          max: max === null ? null : (normalizePrice(max) ?? max),
          currency: draft.currency || defaults.currency,
        }

  const metadata: Metadata = {}
  for (const field of simpleFields(draft.kind)) {
    const value = fieldValue(field, draft.meta[field.key] ?? '')
    if (value !== undefined) metadata[field.key] = value
  }
  if (hasStreaming(draft.kind)) {
    const platforms = parsePlatforms(draft.streamingPlatforms)
    const country = draft.streamingCountry.trim().toUpperCase()
    if (country || platforms.length > 0) {
      const streaming: Streaming = { country: country || defaults.country.toUpperCase() }
      if (platforms.length > 0) streaming.platforms = platforms
      metadata.streaming = streaming
    }
  }

  return {
    title: draft.title.trim(),
    kind: draft.kind,
    summary: blank(draft.summary),
    status: blank(draft.status),
    price,
    official_website_url: blank(draft.officialUrl),
    metadata,
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const BASIC_KEYS = ['title', 'kind', 'summary', 'status', 'price', 'official_website_url'] as const

/**
 * The PATCH body: only the fields that differ from the saved item. `metadata` replaces the whole
 * object on the server (D-062), so it goes as the full object whenever any kind field changed, and
 * always with a kind change (an explicit `{}` rather than relying on the server's reset).
 */
export function buildPatch(base: Item, draft: Draft, defaults: Defaults): UpdateItemRequest {
  const before = toFields(draftFromItem(base), defaults)
  const after = toFields(draft, defaults)
  const patch: Record<string, unknown> = {}
  for (const key of BASIC_KEYS) {
    if (!same(before[key], after[key])) patch[key] = after[key]
  }
  if (draft.kind !== base.kind || !same(before.metadata, after.metadata)) {
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

/** Every input of the form for a kind, in page order (also the order of "focus the first invalid"). */
export function inputKeys(kind: ItemKind): string[] {
  const keys = [
    'title',
    'kind',
    'summary',
    'status',
    'price.min',
    'price.max',
    'price.currency',
    'official_website_url',
  ]
  for (const field of kindFields[kind]) {
    if (field.input === 'streaming') {
      keys.push('metadata.streaming.country', 'metadata.streaming.platforms')
    } else keys.push(`metadata.${field.key}`)
  }
  return keys
}

/** The DOM id of the input of an error key. */
export const inputId = (key: string) => `item-field-${key.replaceAll('.', '-')}`

function validateField(field: Field, text: string): string | undefined {
  const value = text.trim()
  if (!value) return undefined
  const { min, max } = field
  switch (field.input) {
    case 'text':
      return field.maxLength && value.length > field.maxLength
        ? `Use at most ${field.maxLength} characters.`
        : undefined
    case 'year':
    case 'integer':
      return INTEGER.test(value) &&
        Number(value) >= (min ?? 0) &&
        Number(value) <= (max ?? Infinity)
        ? undefined
        : `Enter a whole number from ${min} to ${max}.`
    case 'decimal':
      return ONE_DECIMAL.test(value) &&
        Number(value) >= (min ?? 0) &&
        Number(value) <= (max ?? Infinity)
        ? undefined
        : `Enter a number from ${min} to ${max} with at most one decimal.`
    case 'enum':
      return field.options?.some((option) => option.value === value)
        ? undefined
        : 'Choose one of the options.'
    case 'imdb_url':
      return IMDB_URL.test(value)
        ? undefined
        : 'Enter an IMDb title link like https://www.imdb.com/title/tt0133093/'
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
  if (draft.summary.trim().length > LIMITS.summary) {
    errors.summary = `Use at most ${LIMITS.summary} characters.`
  }
  if (draft.status.trim().length > LIMITS.status) {
    errors.status = `Use at most ${LIMITS.status} characters.`
  }

  const min = blank(draft.priceMin)
  const max = blank(draft.priceMax)
  const priceHint = 'Use digits and a dot, with at most 2 decimals, e.g. 1299.50.'
  if (min !== null && normalizePrice(min) === null) errors['price.min'] = priceHint
  if (max !== null && normalizePrice(max) === null) errors['price.max'] = priceHint
  if (min !== null && max !== null && !errors['price.min'] && !errors['price.max']) {
    if (toCents(normalizePrice(min) as string) > toCents(normalizePrice(max) as string)) {
      errors['price.max'] = 'The maximum can’t be lower than the minimum.'
    }
  }
  if ((min !== null || max !== null) && !/^[A-Z]{3}$/.test(draft.currency || defaults.currency)) {
    errors['price.currency'] = 'Choose a currency.'
  }

  const url = draft.officialUrl.trim()
  if (url) {
    if (url.length > LIMITS.url)
      errors.official_website_url = `Use at most ${LIMITS.url} characters.`
    else if (!isWebUrl(url)) {
      errors.official_website_url = 'Enter a web address starting with http:// or https://'
    }
  }

  for (const field of simpleFields(draft.kind)) {
    const message = validateField(field, draft.meta[field.key] ?? '')
    if (message) errors[`metadata.${field.key}`] = message
  }
  validateKindRules(draft, errors)

  if (hasStreaming(draft.kind)) {
    const platforms = parsePlatforms(draft.streamingPlatforms)
    const country = draft.streamingCountry.trim().toUpperCase() || defaults.country.toUpperCase()
    if ((platforms.length > 0 || draft.streamingCountry.trim()) && !/^[A-Z]{2}$/.test(country)) {
      errors['metadata.streaming.country'] = 'Enter a two-letter country code, e.g. IT.'
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
function validateKindRules(draft: Draft, errors: ErrorMap) {
  const num = (key: string) => {
    const text = (draft.meta[key] ?? '').trim()
    return INTEGER.test(text) && !errors[`metadata.${key}`] ? Number(text) : undefined
  }
  if (draft.kind === 'tv_show') {
    const first = num('first_air_year')
    const end = num('end_year')
    if (first !== undefined && end !== undefined && end < first) {
      errors['metadata.end_year'] = 'The end year can’t be before the first air year.'
    }
  }
  if (draft.kind === 'car') {
    const fuel = (draft.meta.fuel_type ?? '').trim()
    const range = (draft.meta.electric_range_km ?? '').trim()
    if (range && fuel && fuel !== 'electric' && fuel !== 'plugin_hybrid') {
      errors['metadata.electric_range_km'] = 'Only for electric and plug-in hybrid cars.'
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
  price: 'price.min',
  'metadata.streaming': 'metadata.streaming.country',
}

/**
 * Maps `errors[].field` to the inputs of the form: `price.max` to the price field, `metadata.power_hp`
 * to the Power input, `metadata.streaming.platforms[2]` to the platforms input. Anything else
 * (or a metadata key the current kind has no input for) goes to `other`.
 */
export function mapServerErrors(errors: readonly FieldError[], kind: ItemKind): MappedErrors {
  const known = new Set(inputKeys(kind))
  const result: MappedErrors = { fields: {}, other: [] }
  for (const error of errors) {
    const path = error.field.replace(/\[\d+\]/g, '')
    const key = ALIASES[path] ?? path
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

/** The first input (in page order) that has an error. */
export const firstInvalid = (errors: ErrorMap, kind: ItemKind) =>
  inputKeys(kind).find((key) => errors[key])

// ---------------------------------------------------------------------------------------------
// Copy my draft

const priceText = (price: Price) => {
  if (!price) return null
  const { min, max, currency } = price
  if (min !== null && max !== null)
    return min === max ? `${min} ${currency}` : `${min}–${max} ${currency}`
  return min !== null ? `from ${min} ${currency}` : `up to ${max} ${currency}`
}

function metadataText(kind: ItemKind, key: string, value: unknown): string {
  if (value === undefined) return '(cleared)'
  if (key === 'streaming') {
    const streaming = value as Streaming
    return [streaming.country, streaming.platforms?.join(', ')].filter(Boolean).join(': ')
  }
  const field = kindFields[kind].find((candidate) => candidate.key === key)
  return (field && formatField(field, value)) || String(value)
}

/**
 * A readable text dump of the fields the user changed, for the clipboard when a save conflicts
 * (UI_SPEC §9). Cleared fields say so.
 */
export function draftDump(base: Item, draft: Draft, defaults: Defaults): string {
  const before = toFields(draftFromItem(base), defaults)
  const after = toFields(draft, defaults)
  const lines: string[] = []
  const line = (label: string, value: string | null) =>
    lines.push(`${label}: ${value ?? '(cleared)'}`)

  if (!same(before.title, after.title)) line('Title', after.title)
  if (before.kind !== after.kind) line('Kind', kindLabels[after.kind])
  if (!same(before.summary, after.summary)) line('Summary', after.summary)
  if (!same(before.status, after.status)) line('Status', after.status)
  if (!same(before.price, after.price)) line('Price', priceText(after.price))
  if (!same(before.official_website_url, after.official_website_url)) {
    line('Official website', after.official_website_url)
  }
  const keys = new Set([...Object.keys(before.metadata), ...Object.keys(after.metadata)])
  const details: string[] = []
  for (const key of keys) {
    if (same(before.metadata[key], after.metadata[key]) && before.kind === after.kind) continue
    if (after.metadata[key] === undefined && before.kind !== after.kind) continue
    const label = kindFields[after.kind].find((field) => field.key === key)?.label ?? key
    details.push(`  ${label}: ${metadataText(after.kind, key, after.metadata[key])}`)
  }
  if (details.length > 0) lines.push(`${kindLabels[after.kind]} details:`, ...details)
  return lines.join('\n')
}
