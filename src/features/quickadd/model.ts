import { ApiError } from '../../lib/api'
import { checkImageFile, isTooLarge, LIMITS } from '../items'
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
