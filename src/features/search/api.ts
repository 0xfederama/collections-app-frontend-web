import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { api, unwrap } from '../../lib/api'
import { searchKeys } from '../../data/keys'

export type SearchResult = components['schemas']['SearchResult']
export type SearchPage = components['schemas']['SearchPage']

/** API.md: `q` is 1–200 characters. */
export const MAX_QUERY_LENGTH = 200
/** Rows in the sidebar dropdown (UI_SPEC §6). */
export const DROPDOWN_LIMIT = 8
/** Rows per request on the results page (the API default). */
export const RESULTS_PAGE_SIZE = 50

/** What is sent to the server: surrounding whitespace removed, cut to the API's 200 characters. */
export const normalizeQuery = (q: string) => q.trim().slice(0, MAX_QUERY_LENGTH).trim()

const fetchSearch = (q: string, limit: number, offset: number, signal: AbortSignal) =>
  unwrap(api.GET('/api/v1/search', { params: { query: { q, limit, offset } }, signal }))

/**
 * One page of matches (the dropdown). Disabled for an empty or whitespace `q`. While `q` changes,
 * the previous page stays in `data` (`isPlaceholderData`), so the list does not blink away.
 */
export function useSearch(
  q: string,
  { limit = DROPDOWN_LIMIT, offset = 0 }: { limit?: number; offset?: number } = {},
) {
  const query = normalizeQuery(q)
  return useQuery({
    queryKey: searchKeys.top(query, limit, offset),
    queryFn: ({ signal }) => fetchSearch(query, limit, offset, signal),
    enabled: query !== '',
    placeholderData: keepPreviousData,
  })
}

/** All pages of matches for the results page, loaded by offset. */
export function useSearchResults(q: string) {
  const query = normalizeQuery(q)
  return useInfiniteQuery({
    queryKey: searchKeys.results(query),
    initialPageParam: 0,
    queryFn: ({ signal, pageParam }) => fetchSearch(query, RESULTS_PAGE_SIZE, pageParam, signal),
    enabled: query !== '',
    getNextPageParam: (last) => {
      const next = last.page.offset + last.data.length
      return last.data.length > 0 && next < last.page.total ? next : undefined
    },
  })
}
