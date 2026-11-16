import { Chip } from '../../components/ui'
import type { Item } from './api'
import { formatTmdbScore, tmdbGenres, tmdbScore } from './tmdbData'

/**
 * The imported TMDB data of an item (F-028): genre chips and the TMDB score. Read-only, with no pen
 * and no "+ Add field": the provider gives them, the user does not edit them. Nothing is rendered
 * when the item has neither, so an item without them looks as it always did.
 */
export function TmdbDetails({ item }: { item: Item }) {
  const genres = tmdbGenres(item)
  const score = tmdbScore(item)
  if (genres.length === 0 && score === null) return null
  return (
    <div className="flex flex-col gap-2 text-ui">
      {genres.length > 0 && (
        <ul aria-label="Genres" className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <li key={genre}>
              <Chip>{genre}</Chip>
            </li>
          ))}
        </ul>
      )}
      {score && <p className="tabular-nums text-text-muted">{formatTmdbScore(score)}</p>}
    </div>
  )
}
