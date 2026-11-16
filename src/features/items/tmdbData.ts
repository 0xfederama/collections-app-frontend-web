import type { Item } from './api'

// TODO(api-v4.3.0): the backend contract for these keys is not published yet (F-028). Assumed:
// `metadata.genres: string[]` (TMDB genre names in the metadata language), `metadata.tmdb_rating: number | null`
// (TMDB `vote_average`, 0-10) and `metadata.tmdb_vote_count: number | null`. Every read of these keys is in this
// file; once api:sync lands, check the names and drop this note.

/** Imported-only keys (F-028): provider data the user never adds, edits or lists as a type field. */
const IMPORTED_ONLY_KEYS: readonly string[] = ['genres', 'tmdb_rating', 'tmdb_vote_count']

export const isImportedOnlyKey = (key: string): boolean => IMPORTED_ONLY_KEYS.includes(key)

interface TmdbScore {
  /** 0-10, as TMDB gives it (shown with one decimal). */
  rating: number
  /** The number of votes behind the rating, or `null` when the item does not say. */
  votes: number | null
}

const metadataOf = (item: Pick<Item, 'metadata'>): Record<string, unknown> => {
  const value: unknown = item.metadata
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/**
 * The TMDB genre names of an item, in the order given, trimmed and without repeats. Anything that is
 * not a list of strings (missing, `null`, garbage) is no genres.
 */
export function tmdbGenres(item: Pick<Item, 'metadata'>): string[] {
  const value: unknown = metadataOf(item).genres
  if (!Array.isArray(value)) return []
  const names = value
    .filter((name): name is string => typeof name === 'string')
    .map((name) => name.trim())
    .filter((name) => name !== '')
  return [...new Set(names)]
}

/**
 * The TMDB score of an item, or `null` when there is no usable rating. A rating outside 0-10 is
 * garbage; a vote count that is not a non-negative whole number is shown as absent (`votes: null`).
 */
export function tmdbScore(item: Pick<Item, 'metadata'>): TmdbScore | null {
  const metadata = metadataOf(item)
  const rating = finiteNumber(metadata.tmdb_rating)
  if (rating === null || rating < 0 || rating > 10) return null
  const count = finiteNumber(metadata.tmdb_vote_count)
  const votes = count !== null && Number.isInteger(count) && count >= 0 ? count : null
  return { rating, votes }
}

/**
 * The line shown under the genres: `TMDB score 7.4 (1,234 votes)` (the count only when known).
 * `locale` is for tests; the app passes `undefined` (the user's language).
 */
export function formatTmdbScore(score: TmdbScore, locale?: string): string {
  const rating = score.rating.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const base = `TMDB score ${rating}`
  if (score.votes === null) return base
  const votes = score.votes.toLocaleString(locale)
  return `${base} (${votes} ${score.votes === 1 ? 'vote' : 'votes'})`
}
