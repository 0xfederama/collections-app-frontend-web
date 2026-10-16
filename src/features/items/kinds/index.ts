import type { ItemKind } from '../api'
import { cameraFields } from './camera'
import { carFields } from './car'
import { genericFields } from './generic'
import { motorcycleFields } from './motorcycle'
import { movieFields } from './movie'
import { tvShowFields } from './tvShow'
import type { Field } from './types'

export type { EnumOption, Field, FieldInput } from './types'

/** Field config of every kind. The W-08 edit form renders from the same lists. */
export const kindFields: Record<ItemKind, readonly Field[]> = {
  generic: genericFields,
  movie: movieFields,
  tv_show: tvShowFields,
  motorcycle: motorcycleFields,
  car: carFields,
  camera: cameraFields,
}

/** Label of the kind's sort key (`sort=kind_key`, F007-W9); absent for `generic`, which has none. */
const sortKeyLabels: Partial<Record<ItemKind, string>> = {
  movie: 'Release year',
  tv_show: 'First air year',
  motorcycle: 'Displacement',
  car: 'Power',
  camera: 'Megapixels',
}

export function sortKeyLabel(kind: ItemKind): string | undefined {
  return sortKeyLabels[kind]
}

/** The kinds whose items can carry a price (D-085): the API rejects `price` on any other kind. */
export const kindsWithPrice: ReadonlySet<ItemKind> = new Set<ItemKind>([
  'motorcycle',
  'car',
  'camera',
])

/** Whether the kind defines a price, so it offers price in the sort menu and the pinned fields. */
export function hasPrice(kind: ItemKind): boolean {
  return kindsWithPrice.has(kind)
}

export interface KindRow {
  key: string
  label: string
  text: string
}

type Metadata = Record<string, unknown>

/** The text of one set field with its unit (`937 cc`, `24.2 MP`, `1999`), or `null` when unset or unusable. */
export function formatField(field: Field, value: unknown): string | null {
  if (value === undefined || value === null) return null
  switch (field.input) {
    case 'text':
      return typeof value === 'string' && value.trim() ? value : null
    case 'enum':
      return (
        field.options?.find((o) => o.value === value)?.label ??
        (typeof value === 'string' ? value : null)
      )
    case 'year':
      return typeof value === 'number' ? String(value) : null
    case 'integer':
    case 'decimal': {
      if (typeof value !== 'number') return null
      const digits = field.input === 'decimal' ? 1 : 0
      const text = value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
      })
      return field.unit ? `${text} ${field.unit}` : text
    }
    default:
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
 * The definition grid of the kind section: one row per set field, in config order. IMDb and
 * streaming are not rows (the movie / TV section renders them), and a TV show's two year fields
 * are one `Years` row. Empty when nothing is set, so the section is hidden.
 */
export function kindRows(kind: ItemKind, metadata: Metadata): KindRow[] {
  const rows: KindRow[] = []
  const fields = kindFields[kind]
  if (kind === 'tv_show') {
    const years = formatTvYears(
      metadata.first_air_year as number | undefined,
      metadata.end_year as number | undefined,
    )
    if (years) rows.push({ key: 'years', label: 'Years', text: years })
  }
  for (const field of fields) {
    if (kind === 'tv_show' && (field.key === 'first_air_year' || field.key === 'end_year')) continue
    const text = formatField(field, metadata[field.key])
    if (text) rows.push({ key: field.key, label: field.label, text })
  }
  return rows
}
