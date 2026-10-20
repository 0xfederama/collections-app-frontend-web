import { ApiError, NetworkError } from '../../lib/api'
import { checkImageFile, isLookupUnavailable, isTooLarge, LIMITS } from '../items'
import type { List } from '../tree'

/** The fields of the quick add form that can carry an error. */
export type Field = 'title' | 'website' | 'description' | 'image' | 'list'

export type QuickAddInput = {
  /** Raw text; trimmed here, as the create request sends it. */
  title: string
  /** Raw text; trimmed here, as the create request sends it. */
  website: string
  description: string
  image: File | undefined
  listId: string | undefined
}

/** Errors are shown in this order; the first one with an error takes the focus. */
const FOCUS_ORDER = ['title', 'website', 'description', 'image'] as const satisfies readonly Field[]

/** The lists of the tree, most recently updated first, then by name. Returns a new array. */
export function sortListChoices<T extends Pick<List, 'name' | 'updated_at'>>(
  lists: readonly T[],
): T[] {
  return [...lists].sort(
    (a, b) => b.updated_at.localeCompare(a.updated_at) || a.name.localeCompare(b.name),
  )
}

export const messageOf = (caught: unknown) =>
  caught instanceof ApiError ? (caught.detail ?? caught.title) : 'Something went wrong.'

/** Client-side checks before the create request. `focus` is the first field with an error. */
export function validateQuickAdd(input: QuickAddInput): {
  errors: Partial<Record<Field, string>>
  focus: Field | null
} {
  const errors: Partial<Record<Field, string>> = {}
  const trimmed = input.title.trim()
  const site = input.website.trim()
  if (!trimmed) errors.title = 'Enter a title.'
  else if (trimmed.length > LIMITS.title) errors.title = `Use at most ${LIMITS.title} characters.`
  if (site.length > LIMITS.url) errors.website = `Use at most ${LIMITS.url} characters.`
  if (isTooLarge(input.description)) errors.description = 'The description is over 1 MiB.'
  if (input.image) {
    const problem = checkImageFile(input.image)
    if (problem) errors.image = problem
  }
  if (!input.listId) errors.list = 'Create a list first.'
  const focus = FOCUS_ORDER.find((field) => errors[field]) ?? null
  return { errors, focus }
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
 * them). `formError: 'keep'` leaves the banner untouched: the 422 branch sets it only when the
 * messages have no field to sit under, and the other branches always set it (or clear it).
 */
export type CreateFailure = {
  errors: Partial<Record<Field, string>> | null
  focus: 'title' | 'website' | null
  formError: string | undefined | 'keep'
  lookupUnavailable: boolean
}

/** What the quick add form shows after the create request failed. Pure: the caller applies it. */
export function describeCreateFailure(caught: unknown): CreateFailure {
  const lookupUnavailable = isLookupUnavailable(caught)
  if (caught instanceof ApiError && caught.status === 422) {
    const mapped: Partial<Record<Field, string>> = {}
    const rest: string[] = []
    for (const e of caught.errors ?? []) {
      if (e.field === 'title' || e.field === 'website') mapped[e.field] ??= e.message
      else rest.push(e.message)
    }
    let focus: CreateFailure['focus'] = null
    if (mapped.title) focus = 'title'
    else if (mapped.website) focus = 'website'
    let formError: CreateFailure['formError'] = 'keep'
    if (rest.length || (!mapped.title && !mapped.website)) {
      formError = rest.join(' ') || caught.title
    }
    return { errors: mapped, focus, formError, lookupUnavailable }
  }
  const none = { errors: null, focus: null, lookupUnavailable }
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
  return { ...none, formError: messageOf(caught) }
}
