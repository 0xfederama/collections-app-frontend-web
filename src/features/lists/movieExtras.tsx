import type { MenuItem } from '../../components/ui'
import { ExternalLink, Shuffle } from '../../components/ui/icons'

/** Roadmap 36: an outside site, opened in a new tab only (never fetched or embedded). Label = the site's own title. */
export const MOVIE_MAP = { label: 'Movie Vector Map', href: 'https://mikeyguinness.com/movies/' }

const PICK_LABEL = 'Pick a random movie'

/**
 * Picks one id uniformly among `ids`. With more than one id the previous pick is left out, so
 * "Pick another" always changes. `random` returns [0, 1) like `Math.random` (seeded in tests).
 */
export function pickRandom<T>(
  ids: readonly T[],
  previous: T | null = null,
  random: () => number = Math.random,
): T | null {
  const pool = ids.length > 1 && previous !== null ? ids.filter((id) => id !== previous) : ids
  if (pool.length === 0) return null
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))
  return pool[index] ?? null
}

/** The movie entries of the list "…" menu: only on lists of the Movies type (`movie`). */
export function movieMenuItems(
  type: string | null,
  { shown, onPick }: { shown: number; onPick: () => void },
): MenuItem[] {
  if (type !== 'movie') return []
  return [
    {
      label: PICK_LABEL,
      icon: <Shuffle />,
      disabled: shown === 0,
      hint: shown === 0 ? 'No movies shown' : undefined,
      onSelect: onPick,
    },
    { type: 'link', label: MOVIE_MAP.label, href: MOVIE_MAP.href, icon: <ExternalLink /> },
  ]
}
