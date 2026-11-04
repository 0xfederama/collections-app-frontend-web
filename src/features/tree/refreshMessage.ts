import type { components } from '../../generated/schema'

type Counts = components['schemas']['ListLookupRefresh']

/** Types whose items have TMDB details to refresh (one type per list). */
const REFRESHABLE_TYPES: readonly (string | null)[] = ['movie', 'tv_show']

/** "Refresh details" is offered for movie and TV lists that have items. */
export function canRefreshDetails(list: { type: string | null; item_count: number }): boolean {
  return REFRESHABLE_TYPES.includes(list.type) && list.item_count > 0
}

/**
 * The result toast text. Updated is always named; failed and skipped only when above zero;
 * `remaining` adds the hint to run again (the toast offers the action).
 */
export function refreshSummary(counts: Counts): {
  title: string
  description?: string
  kind: 'success' | 'error'
} {
  const parts = [`${counts.updated} updated`]
  if (counts.failed > 0) parts.push(`${counts.failed} failed`)
  if (counts.skipped > 0) parts.push(`${counts.skipped} skipped`)
  return {
    title: parts.join(', '),
    ...(counts.remaining > 0 ? { description: `${counts.remaining} more left, run again` } : {}),
    kind: counts.updated === 0 && counts.failed > 0 ? 'error' : 'success',
  }
}
