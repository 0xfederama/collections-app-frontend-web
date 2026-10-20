import { useQuery } from '@tanstack/react-query'
import { homeKeys } from '../../data/keys'
import { api, unwrap } from '../../lib/api'

/** Rows in Home's "Recently updated" section (D-070, API default). */
export const RECENT_LIMIT = 12

/**
 * `GET /recent-items` (D-070): the most recently updated active items of the whole workspace, newest
 * first, in the same `{ item, path }` shape as search results. The server does the aggregation.
 * `staleTime: 0` so Home always shows the latest when it is opened.
 */
export function useRecentItems(limit = RECENT_LIMIT) {
  return useQuery({
    queryKey: [...homeKeys.recent, limit] as const,
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/recent-items', { params: { query: { limit } }, signal })),
    staleTime: 0,
  })
}
