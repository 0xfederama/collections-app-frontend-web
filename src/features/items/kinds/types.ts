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
 * Builds the field list of one kind, checked against the generated metadata type `M`: a key that
 * is not in `M` is an error, and so is a key of `M` that has no entry. A renamed or added field in
 * the spec therefore breaks the build until its config is updated.
 */
export function defineFields<M>() {
  return <const F extends readonly Field<keyof M & string>[]>(
    fields: F & ([Exclude<keyof M & string, F[number]['key']>] extends [never] ? unknown : never),
  ): readonly Field[] => fields
}
