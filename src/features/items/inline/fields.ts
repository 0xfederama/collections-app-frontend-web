import { formatPrice } from '../../lists/price'
import type { Item, ItemKind } from '../api'
import { INITIAL_CURRENCY, type Draft } from '../form/draft'
import { formatField, formatTvYears, kindFields, type Field } from '../kinds'

/**
 * What one in-place field is: which part of the form `Draft` it edits, which error keys belong to
 * it, and whether the item has a value for it (empty fields are hidden, "+ Add field" lists them).
 *
 * A save never sends the whole draft. `take` copies only this field's inputs onto a fresh draft of
 * the item's *current* state, so the PATCH (built by `buildPatch`) holds just this field, and a
 * refetch that brought somebody else's change to another field is never undone.
 */
export interface FieldSpec {
  /** Stable id: `title`, `price`, `website`, `metadata.<key>`, `years` or `metadata.streaming`. */
  id: string
  label: string
  /** `ErrorMap` keys (the API's dotted field paths) that belong to this field, in page order. */
  errorKeys: string[]
  take: (target: Draft, source: Draft) => Draft
  isSet: (item: Item) => boolean
  /** Plain text of the saved value, for the read-only display (and the draft dump). */
  text?: (item: Item) => string | null
  /** The kind field behind it, when it is one (the editor widget follows its `input`). */
  field?: Field
}

type Metadata = Record<string, unknown>
const metadataOf = (item: Item) => item.metadata as Metadata

const has = (value: unknown) => value !== undefined && value !== null && value !== ''

function takeTop<K extends keyof Draft>(keys: readonly K[]) {
  return (target: Draft, source: Draft): Draft => {
    const next = { ...target }
    for (const key of keys) next[key] = source[key]
    return next
  }
}

const takeMeta =
  (keys: readonly string[]) =>
  (target: Draft, source: Draft): Draft => ({
    ...target,
    meta: {
      ...target.meta,
      ...Object.fromEntries(keys.map((key) => [key, source.meta[key] ?? ''])),
    },
  })

export const titleSpec: FieldSpec = {
  id: 'title',
  label: 'Title',
  errorKeys: ['title'],
  take: takeTop(['title']),
  isSet: () => true,
}

export const priceSpec: FieldSpec = {
  id: 'price',
  label: 'Price',
  errorKeys: ['price.amount', 'price.min', 'price.max', 'price.currency'],
  take: takeTop(['hasPrice', 'priceMode', 'priceAmount', 'priceMin', 'priceMax', 'currency']),
  isSet: (item) => item.price !== null,
  text: (item) => formatPrice(item.price),
}

export const websiteSpec: FieldSpec = {
  id: 'website',
  label: 'Website',
  errorKeys: ['website'],
  take: takeTop(['website']),
  isSet: (item) => has(item.website),
  text: (item) => item.website,
}

/** The draft changes that open the price editor as a new price, single or range. */
export const newPrice = (range: boolean): Partial<Draft> => ({
  hasPrice: true,
  priceMode: range ? 'range' : 'single',
  currency: INITIAL_CURRENCY,
})

/**
 * The detail rows of a kind, in config order: each kind field is one row, a TV show's two year
 * fields are one `Years` row, and streaming is one row (country, platforms, which ones are paid).
 */
export function kindSpecs(kind: ItemKind): FieldSpec[] {
  const specs: FieldSpec[] = []
  for (const field of kindFields[kind]) {
    if (field.input === 'streaming') {
      specs.push({
        id: 'metadata.streaming',
        label: field.label,
        errorKeys: ['metadata.streaming.country', 'metadata.streaming.platforms'],
        take: takeTop(['streamingCountry', 'streamingPlatforms', 'streamingPaid']),
        isSet: (item) => has(metadataOf(item).streaming),
        field,
      })
    } else if (kind === 'tv_show' && (field.key === 'first_air_year' || field.key === 'end_year')) {
      if (field.key === 'end_year') continue
      specs.push({
        id: 'years',
        label: 'Years',
        errorKeys: ['metadata.first_air_year', 'metadata.end_year'],
        take: takeMeta(['first_air_year', 'end_year']),
        isSet: (item) => has(metadataOf(item).first_air_year) || has(metadataOf(item).end_year),
        text: (item) =>
          formatTvYears(
            metadataOf(item).first_air_year as number | undefined,
            metadataOf(item).end_year as number | undefined,
          ),
      })
    } else {
      specs.push({
        id: `metadata.${field.key}`,
        label: field.label,
        errorKeys: [`metadata.${field.key}`],
        take: takeMeta([field.key]),
        isSet: (item) => has(metadataOf(item)[field.key]),
        text: (item) => formatField(field, metadataOf(item)[field.key]),
        field,
      })
    }
  }
  return specs
}
