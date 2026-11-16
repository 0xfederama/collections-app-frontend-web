import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { useListGenres } from './api'
import { GENRE_PARAM, parseGenres, withGenres } from './genres'

/**
 * The genre filter of a movie or TV list (F-028 W3). `genres` is what the list has (`undefined` until
 * loaded or on other types); `selected` is the `?genre=` URL state, with genres the list does not have
 * dropped once they are known. Changing it replaces the URL parameters, like the other list filters.
 */
export function useGenreFilter(listId: string, enabled: boolean) {
  const [searchParams, setSearchParams] = useSearchParams()
  const genresQuery = useListGenres(listId, enabled)
  const genres = enabled ? genresQuery.data : undefined
  const selected = enabled ? parseGenres(searchParams.getAll(GENRE_PARAM), genres) : []
  const setSelected = useCallback(
    (next: string[]) => setSearchParams((current) => withGenres(current, next), { replace: true }),
    [setSearchParams],
  )
  return { genres, selected, setSelected }
}
