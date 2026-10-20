import { ApiError, NetworkError } from '../../../lib/api'
import type { TypeDefinition, TypeField, UpdateTypeRequest } from '../api'

export const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / no' },
  { value: 'link', label: 'Link' },
] as const

export const NONE_FIELD = '__none__'

/** The friendly name of a field type where the raw API word reads badly (`stores` is "Where to get it"'s type, F016-W4). */
export const fieldTypeWord = (type: TypeField['type']) => (type === 'stores' ? 'Stores' : type)

export interface TypeDefaultsDraft {
  typeKey: string
  icon: string | null
  allowsPrice: boolean
  sortField: string | null
  pinnedFields: string[] | null
}

export const defaultsFromType = (type: TypeDefinition): TypeDefaultsDraft => ({
  typeKey: type.key,
  icon: type.default_icon ?? null,
  allowsPrice: type.allows_price,
  sortField: type.default_sort_field ?? null,
  pinnedFields: type.default_pinned_fields ?? null,
})

export function sameNullableList(left: string[] | null, right: string[] | null) {
  if (left === null || right === null) return left === right
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export function errorText(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 412)
      return 'This definition changed while you were editing. Reload the latest version and try again.'
    if (error.errors?.length) return error.errors.map((entry) => entry.message).join(' ')
    return error.detail ?? error.title
  }
  if (error instanceof NetworkError)
    return 'Could not reach the server. Your changes are still here; try again.'
  return 'Something went wrong. Your changes are still here; try again.'
}

/** The body of a type-settings save: only the keys that differ from the saved definition. */
export function defaultsPatch(
  selected: TypeDefinition,
  defaults: TypeDefaultsDraft,
): UpdateTypeRequest {
  const patch: UpdateTypeRequest = {}
  if (defaults.icon !== (selected.default_icon ?? null)) patch.default_icon = defaults.icon
  if (defaults.allowsPrice !== selected.allows_price) patch.allows_price = defaults.allowsPrice
  if (defaults.sortField !== (selected.default_sort_field ?? null))
    patch.default_sort_field = defaults.sortField
  if (!sameNullableList(defaults.pinnedFields, selected.default_pinned_fields ?? null))
    patch.default_pinned_fields = defaults.pinnedFields
  return patch
}

/** Whether the type-settings draft differs from the saved definition. Built-in types are never dirty. */
export function isDefaultsDirty(
  selected: TypeDefinition | null,
  defaults: TypeDefaultsDraft | null,
): boolean {
  return (
    !!selected &&
    !!defaults &&
    !selected.is_locked &&
    (defaults.icon !== (selected.default_icon ?? null) ||
      defaults.allowsPrice !== selected.allows_price ||
      defaults.sortField !== (selected.default_sort_field ?? null) ||
      !sameNullableList(defaults.pinnedFields, selected.default_pinned_fields ?? null))
  )
}

/** The fields (and the price, when the draft allows it) a type can use as default sort or pin. */
export function defaultFieldOptions(
  selected: TypeDefinition | null,
  allowsPrice: boolean,
): { value: string; label: string }[] {
  return selected
    ? [
        ...selected.fields.map((field) => ({ value: field.key, label: field.label })),
        ...(allowsPrice ? [{ value: 'price', label: 'Price' }] : []),
      ]
    : []
}
