import {
  ApiError,
  errorMessage,
  fieldErrorText,
  isDuplicateTitle,
  NetworkError,
} from '../../lib/api'
import { duplicateTitleMessage, isLookupUnavailable, LIMITS, type ItemType } from '../items'
import type { List } from '../tree'

/** The fields of the quick add form that can carry an error. */
export type Field = 'title' | 'list'

export type QuickAddInput = {
  /** Raw text; trimmed here, as the create request sends it. */
  title: string
  listId: string | undefined
}

/** The lists of the tree, most recently updated first, then by name. Returns a new array. */
export function sortListChoices<T extends Pick<List, 'name' | 'updated_at'>>(
  lists: readonly T[],
): T[] {
  return [...lists].sort(
    (a, b) => b.updated_at.localeCompare(a.updated_at) || a.name.localeCompare(b.name),
  )
}

/** Client-side checks before the create request. `focus` is the title when it has an error. */
export function validateQuickAdd(input: QuickAddInput): {
  errors: Partial<Record<Field, string>>
  focus: 'title' | null
} {
  const errors: Partial<Record<Field, string>> = {}
  const trimmed = input.title.trim()
  if (!trimmed) errors.title = 'Enter a title.'
  else if (trimmed.length > LIMITS.title) errors.title = `Use at most ${LIMITS.title} characters.`
  if (!input.listId) errors.list = 'Create a list first.'
  return { errors, focus: errors.title ? 'title' : null }
}

/** The picked list, else the initial one when it exists, else the first list. */
export function resolveListId(
  lists: readonly Pick<List, 'id'>[],
  pickedList: string | undefined,
  initialListId: string | undefined,
): string | undefined {
  return (
    pickedList ??
    (lists.some((l) => l.id === initialListId) ? initialListId : undefined) ??
    lists[0]?.id
  )
}

/**
 * How a failed create is shown. `errors: null` leaves the field errors untouched (only a 422 sets
 * them). `keepFormError` leaves the banner untouched: it is true only for a 422 whose messages all
 * sit under the title, so the banner has nothing to show. The other branches set
 * `formError` (undefined clears it).
 */
export type CreateFailure = {
  errors: Partial<Record<Field, string>> | null
  focus: 'title' | null
  formError: string | undefined
  keepFormError: boolean
  lookupUnavailable: boolean
}

/** What the quick add form shows after the create request failed. Pure: the caller applies it. */
export function describeCreateFailure(caught: unknown, type?: ItemType): CreateFailure {
  const lookupUnavailable = isLookupUnavailable(caught)
  if (isDuplicateTitle(caught)) {
    // Inline under the title, which keeps its text (F-026 W7).
    return {
      errors: { title: duplicateTitleMessage(type) },
      focus: 'title',
      formError: undefined,
      keepFormError: true,
      lookupUnavailable: false,
    }
  }
  if (caught instanceof ApiError && caught.status === 422) {
    const mapped: Partial<Record<Field, string>> = {}
    const rest: string[] = []
    for (const e of caught.errors ?? []) {
      if (e.field === 'title') mapped.title ??= e.message
      else rest.push(fieldErrorText(e))
    }
    const focus: CreateFailure['focus'] = mapped.title ? 'title' : null
    const keepFormError = !rest.length && !!mapped.title
    const formError = keepFormError ? undefined : rest.join(' ') || errorMessage(caught)
    return { errors: mapped, focus, formError, keepFormError, lookupUnavailable }
  }
  const none = { errors: null, focus: null, keepFormError: false, lookupUnavailable }
  if (caught instanceof ApiError && caught.status === 409) {
    return { ...none, formError: 'This list no longer exists or is in Trash.' }
  }
  if (lookupUnavailable) return { ...none, formError: undefined }
  if (caught instanceof NetworkError || (caught instanceof ApiError && caught.status >= 500)) {
    return {
      ...none,
      formError: 'The server could not be reached. Nothing was created, so you can try again.',
    }
  }
  return { ...none, formError: errorMessage(caught) }
}
