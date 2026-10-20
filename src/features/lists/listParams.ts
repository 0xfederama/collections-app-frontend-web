import type { TypeDefinition } from '../settings'
import type { ItemsParams, SortMode } from './api'
import type { FieldFilterValue } from './FieldFilter'

/** The `?sort=` URL value, trimmed; blank means no override. */
export function parseSort(value: string | null): SortMode | null {
  return value?.trim() || null
}

/**
 * The sort keys a list's type defines. A sort the type does not define falls back to the list's mode, so a stale bookmark (or a
 * type change) cannot put the list in a sort the server rejects: a type field on a list with no type
 * (F007-W9), `price` where the type has no price (D-085), or `director` off movie lists (F013).
 */
export function supportedSorts(definition: TypeDefinition | undefined | null): Set<string> {
  if (!definition) return new Set<string>()
  return new Set([
    'manual',
    'title',
    'updated',
    ...(definition.allows_price ? ['price'] : []),
    ...definition.fields.map((field) => field.key),
  ])
}

/** The URL sort override when the type supports it, otherwise `null`. */
export function resolveSortOverride(
  parsed: SortMode | null,
  definition: TypeDefinition | undefined | null,
): SortMode | null {
  return parsed && supportedSorts(definition).has(parsed) ? parsed : null
}

/** The field filter when it has a value, a min or a max; otherwise `null`. */
export function activeFieldFilter(fieldFilter: FieldFilterValue | null): FieldFilterValue | null {
  return fieldFilter &&
    (fieldFilter.value !== '' || fieldFilter.min !== '' || fieldFilter.max !== '')
    ? fieldFilter
    : null
}

/** The query params of `GET /lists/{id}/items` for the list screen's URL state. */
export function buildItemsParams({
  sortOverride,
  q,
  filter,
  definition,
}: {
  sortOverride: SortMode | null
  q: string
  filter: FieldFilterValue | null
  definition: TypeDefinition | undefined | null
}): ItemsParams {
  const active = activeFieldFilter(filter)
  const filterDefinitionField = definition?.fields.find((field) => field.key === active?.field)
  return {
    sort: sortOverride,
    q,
    filterField: active?.field ?? null,
    filterValue:
      active &&
      (filterDefinitionField?.type === 'text' ||
        filterDefinitionField?.type === 'link' ||
        filterDefinitionField?.type === 'boolean')
        ? active.value
        : null,
    filterMin: active?.min || null,
    filterMax: active?.max || null,
  }
}
