import { NO_TYPE_LABEL, type ItemType, type SelectEntry } from '../../../components/ui'
import type { TypeDefinition, TypeField } from '../../settings'

export type { TypeDefinition, TypeField }

/**
 * What a list with no type (`null`) offers: no fields, no price, no pinned fields, only the built-in
 * sorts. The API has no definition for it, so the client keeps this empty one and every screen can
 * treat "no type" like any other definition.
 */
export const NO_TYPE_DEFINITION: TypeDefinition = {
  key: '__no_type__',
  name: NO_TYPE_LABEL,
  default_icon: null,
  allows_price: false,
  default_sort_field: null,
  is_locked: true,
  version: 0,
  fields: [],
}

/** The definition of a type key; `null` (no type) gets `NO_TYPE_DEFINITION`, an unknown key `undefined`. */
export const typeDefinition = (
  definitions: readonly TypeDefinition[] | undefined,
  key: ItemType,
): TypeDefinition | undefined =>
  key === null ? NO_TYPE_DEFINITION : definitions?.find((type) => type.key === key)

/** The display name of a type key: the definition's name, a prettified key while loading, "No type" for `null`. */
export const typeName = (definition: TypeDefinition | undefined, fallback: ItemType) =>
  fallback === null ? NO_TYPE_LABEL : (definition?.name ?? fallback.replaceAll('_', ' '))

/** Select values are strings, so "No type" (`null`) travels as this sentinel. */
export const NO_TYPE_VALUE = '__no_type__'
export const typeToValue = (type: ItemType): string => type ?? NO_TYPE_VALUE
export const valueToType = (value: string): ItemType => (value === NO_TYPE_VALUE ? null : value)

/** Type choices for a list: "No type" first, a separator, then the workspace types in API order (built-in, then custom). */
export const typeOptions = (definitions: readonly TypeDefinition[] | undefined): SelectEntry[] => [
  { value: NO_TYPE_VALUE, label: NO_TYPE_LABEL },
  ...((definitions?.length ?? 0) > 0 ? [{ separator: true as const }] : []),
  ...(definitions ?? []).map((definition) => ({ value: definition.key, label: definition.name })),
]

/** IMDb is rendered as an external-link tile and streaming keeps its richer built-in editor. */
export const isHiddenTmdbField = (field: TypeField) => field.key === 'imdb_url'
export const isStreamingField = (field: TypeField) =>
  field.key === 'streaming' && field.type === 'streaming'

/** Whether this definition lets its items carry a price. */
export const hasPrice = (definition: TypeDefinition | undefined): boolean =>
  definition?.allows_price === true

export interface TypeRow {
  key: string
  label: string
  text: string
}

const BUILTIN_NUMBER_FORMAT: Record<
  string,
  { unit?: string; maximumFractionDigits: number; grouping?: boolean }
> = {
  release_year: { maximumFractionDigits: 0, grouping: false },
  first_air_year: { maximumFractionDigits: 0, grouping: false },
  end_year: { maximumFractionDigits: 0, grouping: false },
  model_year: { maximumFractionDigits: 0, grouping: false },
  runtime_minutes: { unit: 'min', maximumFractionDigits: 0 },
  episode_minutes: { unit: 'min', maximumFractionDigits: 0 },
  displacement_cc: { unit: 'cc', maximumFractionDigits: 0 },
  power_hp: { unit: 'hp', maximumFractionDigits: 1 },
  // Catalogue convention for a page count: `321 p.` (`pp.` is for a page range).
  pages: { unit: 'p.', maximumFractionDigits: 0 },
}

/** The text of one set field with its unit (`937 cc`, `1999`), or `null` when unset or unusable. */
export function formatField(field: TypeField, value: unknown): string | null {
  if (value === undefined || value === null) return null
  switch (field.type) {
    case 'text':
      if (typeof value !== 'string' || !value.trim()) return null
      return value
    case 'link':
      return typeof value === 'string' && value.trim() ? value : null
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null
      const presentation = BUILTIN_NUMBER_FORMAT[field.key]
      const text = value.toLocaleString(undefined, {
        maximumFractionDigits: presentation?.maximumFractionDigits ?? 20,
        useGrouping: presentation?.grouping ?? true,
      })
      return presentation?.unit ? `${text} ${presentation.unit}` : text
    }
    case 'date': {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
      const date = new Date(`${value}T00:00:00Z`)
      return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value
        ? null
        : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
    }
    case 'boolean':
      return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : null
    case 'streaming':
      return null
    // Store keys are tiles (F016-W4), drawn by the detail and the rows, never as text.
    case 'stores':
      return null
  }
}

/** `2019–2023`, `2019–present` (no end year), or `2019` when it ended the year it started. */
export function formatTvYears(first: number | undefined, end: number | undefined): string | null {
  if (first === undefined) return end === undefined ? null : `Ended ${end}`
  if (end === undefined) return `${first}–present`
  return end === first ? String(first) : `${first}–${end}`
}

/**
 * The definition grid of the type section: one row per set field, in config order. IMDb and
 * streaming are not rows (the movie / TV section renders them), and a TV show's two year fields
 * are one `Years` row. Empty when nothing is set, so the section is hidden.
 */
export function typeRows(definition: TypeDefinition, metadata: Record<string, unknown>): TypeRow[] {
  const rows: TypeRow[] = []
  if (definition.key === 'tv_show') {
    const years = formatTvYears(
      metadata.first_air_year as number | undefined,
      metadata.end_year as number | undefined,
    )
    if (years) rows.push({ key: 'years', label: 'Years', text: years })
  }
  for (const field of definition.fields) {
    if (isHiddenTmdbField(field) || isStreamingField(field)) continue
    if (
      definition.key === 'tv_show' &&
      (field.key === 'first_air_year' || field.key === 'end_year')
    )
      continue
    const text = formatField(field, metadata[field.key])
    if (text) rows.push({ key: field.key, label: field.label, text })
  }
  return rows
}
