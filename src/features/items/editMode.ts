/**
 * Edit mode of the item page is the `?edit=1` query parameter of `/lists/:listId/items/:itemId`.
 * It is a URL state (not route state) so the form survives a reload of the page, and it is entered
 * and left with `replace`, so it never adds a history entry. The parameter belongs to the item page:
 * links to other items and the "back to list" link never carry it.
 */
export const EDIT_PARAM = 'edit'

export const isEditing = (params: URLSearchParams) => params.get(EDIT_PARAM) === '1'

/** The same query without `edit`, as a `?…` string (empty when nothing is left). */
export function withoutEdit(params: URLSearchParams | string): string {
  const next = new URLSearchParams(params)
  next.delete(EDIT_PARAM)
  return next.size > 0 ? `?${next.toString()}` : ''
}

export function withEdit(params: URLSearchParams | string): string {
  const next = new URLSearchParams(params)
  next.set(EDIT_PARAM, '1')
  return `?${next.toString()}`
}
