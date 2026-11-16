/** The `?genre=` URL parameter, repeated once per genre (F-028 W3). */
export const GENRE_PARAM = 'genre'

/** A genre name longer than this is not a genre: it is dropped from the URL. */
const MAX_GENRE_LENGTH = 100

/**
 * The genres of the `?genre=` values, in URL order: trimmed, blanks and over-long values dropped,
 * duplicates removed. With `known` (the genres the list has, once loaded) a genre the list does not
 * have is dropped too, so a stale bookmark never filters on nothing.
 */
export function parseGenres(values: readonly string[], known?: readonly string[]): string[] {
  const offered = known ? new Set(known) : null
  const genres: string[] = []
  for (const raw of values) {
    const genre = raw.trim()
    if (!genre || genre.length > MAX_GENRE_LENGTH) continue
    if (offered && !offered.has(genre)) continue
    if (!genres.includes(genre)) genres.push(genre)
  }
  return genres
}

/** A copy of the URL parameters with the genre parameters replaced by `genres`; other parameters stay. */
export function withGenres(params: URLSearchParams, genres: readonly string[]): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete(GENRE_PARAM)
  for (const genre of genres) next.append(GENRE_PARAM, genre)
  return next
}

/** The selection with `genre` added when it is not chosen, removed when it is. */
export function toggleGenre(selected: readonly string[], genre: string): string[] {
  return selected.includes(genre)
    ? selected.filter((picked) => picked !== genre)
    : [...selected, genre]
}
