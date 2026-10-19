import type { components } from '../../generated/schema'
import { ApiError } from '../../lib/api'
import type { ItemType } from './api'

type Settings = Pick<
  components['schemas']['Settings'],
  'lookup_available' | 'book_lookup_available'
>

/**
 * The metadata source a list's type is filled from: TMDB for movie and TV, Open Library for books
 * (F-016, looked up on commit, no suggestions). `tmdbType` is only set for TMDB.
 */
export type LookupSource =
  | { provider: 'tmdb'; name: 'TMDB'; tmdbType: 'movie' | 'tv_show' }
  | { provider: 'books'; name: 'Open Library' }

/** The id a picked TMDB suggestion sends on create. Books have no picker: the server takes the first result. */
export type LookupSelection = { tmdb_id?: number }

/** A picked suggestion: the full title it fills in, plus its id. */
export type LookupTitleSelection = LookupSelection & { title: string }

export type CreateLookup = { lookup: boolean; tmdb_id?: number }

export function lookupSource(type: ItemType): LookupSource | undefined {
  if (type === 'movie' || type === 'tv_show')
    return { provider: 'tmdb', name: 'TMDB', tmdbType: type }
  if (type === 'book') return { provider: 'books', name: 'Open Library' }
  return undefined
}

/** The name shown in copy ("TMDB metadata", "Open Library metadata"). */
export const lookupSourceName = (type: ItemType) => lookupSource(type)?.name ?? 'Lookup'

/** Whether this server offers lookup for the source: `lookup_available` (TMDB) or `book_lookup_available`. */
export function lookupAvailable(settings: Settings | undefined, source: LookupSource | undefined) {
  if (!settings || !source) return false
  return source.provider === 'tmdb'
    ? settings.lookup_available === true
    : settings.book_lookup_available === true
}

/** The lookup fields of `POST /items` (lookup is ignored on other types, so they are sent as off). */
export function createLookupSelection(
  type: ItemType,
  settings: Settings | undefined,
  selection: LookupSelection,
): CreateLookup {
  const source = lookupSource(type)
  if (!lookupAvailable(settings, source)) return { lookup: false }
  if (source?.provider === 'tmdb') {
    return {
      lookup: true,
      ...(selection.tmdb_id !== undefined ? { tmdb_id: selection.tmdb_id } : {}),
    }
  }
  // Books (F-016): no picker and no id; the server fills from the first Open Library result.
  return { lookup: true }
}

/** Only movie and TV titles offer suggestions while typing (TMDB); books are looked up on commit. */
export const hasSuggestions = (type: ItemType) => type === 'movie' || type === 'tv_show'

/** A book list on a server with Open Library lookup: creating an item waits for the lookup (2-5 s). */
export const isBookLookup = (type: ItemType, settings: Settings | undefined) =>
  lookupAvailable(settings, lookupSource(type)) && lookupSource(type)?.provider === 'books'

/** The provider answered 503 because it is switched off or cannot be reached (nothing was created). */
export const isLookupUnavailable = (caught: unknown) =>
  caught instanceof ApiError &&
  caught.status === 503 &&
  (caught.code === 'upstream_unavailable' || caught.code === 'lookup_disabled')
