import type { ItemType } from './api'

/**
 * The inline message for a 409 `duplicate_title` (F-026 W7). Movie, TV and book lists are deduped by
 * provider id, so they name the kind of thing; every other list is deduped by title.
 */
const PROVIDER_NOUN: Partial<Record<NonNullable<ItemType>, string>> = {
  movie: 'movie',
  tv_show: 'show',
  book: 'book',
}

export function duplicateTitleMessage(type: ItemType | undefined): string {
  const noun = type ? PROVIDER_NOUN[type] : undefined
  return noun
    ? `This ${noun} is already in this list.`
    : 'An item with this title is already in this list.'
}
