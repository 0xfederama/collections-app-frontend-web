/** How a kind field is entered (W-08 form) and shown (view mode). */
export type FieldInput =
  | 'text'
  | 'year' // integer shown without digit grouping
  | 'integer'
  | 'decimal' // one decimal
  | 'enum'
  | 'imdb_url' // shared sub-shape, shown by the movie / TV section
  | 'streaming' // shared sub-shape, shown by the movie / TV section

export interface EnumOption<V extends string = string> {
  value: V
  label: string
}

/** One entry of a kind's field config; mirrors DATA_MODEL §2.1. */
export interface Field<K extends string = string> {
  key: K
  label: string
  input: FieldInput
  /** Suffix shown after the value (`937 cc`). */
  unit?: string
  options?: readonly EnumOption[]
  /** Inclusive bounds of numbers; `maxLength` of text. Server-side validation is authoritative. */
  min?: number
  max?: number
  maxLength?: number
}

/**
 * Builds the user-editable field list checked against generated metadata `M`. Internal metadata
 * keys such as provider IDs may be excluded; every other key must have a field entry.
 */
type ProviderBookkeeping = 'tmdb_id' | 'lookup_disabled'

export function defineFields<M, Ignored extends keyof M = Extract<keyof M, ProviderBookkeeping>>() {
  return <const F extends readonly Field<Exclude<keyof M, Ignored> & string>[]>(
    fields: F &
      ([Exclude<Exclude<keyof M, Ignored> & string, F[number]['key']>] extends [never]
        ? unknown
        : never),
  ): readonly Field[] => fields
}
