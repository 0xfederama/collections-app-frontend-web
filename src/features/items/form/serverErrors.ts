import type { FieldError } from '../../../lib/api'
import type { TypeField } from '../types'
import type { PriceMode } from './price'
import { inputKeys, type ErrorMap } from './validate'

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
