import type { KindDefinition, KindField } from '../../settings/api'

export type { KindDefinition, KindField }

export const kindDefinition = (
  definitions: readonly KindDefinition[] | undefined,
  key: string,
): KindDefinition | undefined => definitions?.find((kind) => kind.key === key)

export const kindName = (definition: KindDefinition | undefined, fallback: string) =>
  definition?.name ?? fallback.replaceAll('_', ' ')

/** IMDb is rendered as an external-link tile and streaming keeps its richer built-in editor. */
export const isHiddenTmdbField = (field: KindField) => field.key === 'imdb_url'
export const isStreamingField = (field: KindField) =>
  field.key === 'streaming' && field.type === 'streaming'

/** Whether this definition lets its items carry a price. */
export const hasPrice = (definition: KindDefinition | undefined): boolean =>
  definition?.allows_price === true

export interface KindRow {
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
  megapixels: { unit: 'MP', maximumFractionDigits: 1 },
}

const BUILTIN_TEXT_LABELS: Record<string, Record<string, string>> = {
  fuel_type: {
    petrol: 'Petrol',
    diesel: 'Diesel',
    hybrid: 'Hybrid',
    plugin_hybrid: 'Plug-in hybrid',
    electric: 'Electric',
    lpg: 'LPG',
    cng: 'CNG',
    hydrogen: 'Hydrogen',
    other: 'Other',
  },
  camera_type: { mirrorless: 'Mirrorless', dslr: 'DSLR', film: 'Film' },
  sensor_format: {
    full_frame: 'Full frame',
    aps_c: 'APS-C',
    micro_four_thirds: 'Micro Four Thirds',
    one_inch: '1-inch',
    medium_format: 'Medium format',
    film_35mm: '35 mm film',
    other: 'Other',
  },
}

/** The text of one set field with its unit (`937 cc`, `24.2 MP`, `1999`), or `null` when unset or unusable. */
export function formatField(field: KindField, value: unknown): string | null {
  if (value === undefined || value === null) return null
  switch (field.type) {
    case 'text':
      if (typeof value !== 'string' || !value.trim()) return null
      return BUILTIN_TEXT_LABELS[field.key]?.[value] ?? value
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
export function kindRows(definition: KindDefinition, metadata: Record<string, unknown>): KindRow[] {
  const rows: KindRow[] = []
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
