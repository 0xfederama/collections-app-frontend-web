import { IMDB_URL } from '../../links'
import { isStreamingField, type TypeField } from '../types'
import {
  INITIAL_CURRENCY,
  LIMITS,
  NUMBER,
  hasStreaming,
  parsePlatforms,
  simpleFields,
  type Defaults,
  type Draft,
} from './draft'
import { blank, toFields } from './patch'
import { normalizePrice, toCents } from './price'

const INTEGER = /^\d+$/
const MAX_PLATFORMS = 30

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
