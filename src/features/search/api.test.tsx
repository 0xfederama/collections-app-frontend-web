import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import {
  DROPDOWN_LIMIT,
  MAX_QUERY_LENGTH,
  RESULTS_PAGE_SIZE,
  normalizeQuery,
  useSearch,
  useSearchResults,
  type SearchPage,
} from './api'

const uuid = (n: number) => `7c1e5a10-0000-4000-8000-${String(n).padStart(12, '0')}`

function makePage(total: number, offset: number, limit: number): SearchPage {
  const count = Math.max(0, Math.min(limit, total - offset))
  return {
    data: Array.from({ length: count }, (_, i) => ({
      item: {
        id: uuid(1000 + offset + i),
        list_id: uuid(11),
        title: `Item ${offset + i}`,
        kind: 'generic',
        image: null,
        price: null,
        website: null,
        content_version: 1,
        sort_order: offset + i,
        version: 1,
        created_at: '2026-10-14T09:31:00Z',
        updated_at: '2026-10-14T09:31:00Z',
      },
      path: [{ type: 'list' as const, id: uuid(11), name: 'Things' }],
    })),
    page: { limit, offset, total },
  }
}

/** Serves `total` matches by offset and records every request URL. */
function serveSearch(total: number) {
  const requests: URL[] = []
  server.use(
    http.get(`${location.origin}/api/v1/search`, ({ request }) => {
      const url = new URL(request.url)
      requests.push(url)
      const limit = Number(url.searchParams.get('limit') ?? 50)
      const offset = Number(url.searchParams.get('offset') ?? 0)
      return HttpResponse.json(makePage(total, offset, limit))
    }),
  )
  return requests
}

/** Reads every field the tests look at during render, so the observer notifies on each change. */
function useTrackedResults(q: string) {
  const query = useSearchResults(q)
  void [query.data, query.hasNextPage, query.fetchStatus, query.isSuccess]
  return query
}

function makeWrapper() {
  const client = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('W-11 normalizeQuery', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeQuery('  red bike \n')).toBe('red bike')
  })

  it('keeps inner whitespace', () => {
    expect(normalizeQuery('red   bike')).toBe('red   bike')
  })

  it('turns whitespace-only input into an empty string', () => {
    expect(normalizeQuery('    ')).toBe('')
    expect(normalizeQuery('')).toBe('')
  })

  it('caps the query at 200 characters', () => {
    expect(MAX_QUERY_LENGTH).toBe(200)
    expect(normalizeQuery('a'.repeat(200))).toHaveLength(200)
    expect(normalizeQuery('a'.repeat(201))).toHaveLength(200)
    expect(normalizeQuery('a'.repeat(500))).toHaveLength(200)
  })

  it('does not leave trailing whitespace when the cut lands after a space', () => {
    const result = normalizeQuery(`${'a'.repeat(199)} bbb`)
    expect(result).toBe('a'.repeat(199))
  })
})

describe('W-11 useSearch', () => {
  it('requests the trimmed query with limit 8 and offset 0', async () => {
    const requests = serveSearch(3)
    const { result } = renderHook(() => useSearch('  matrix  '), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests).toHaveLength(1)
    expect(DROPDOWN_LIMIT).toBe(8)
    expect(requests[0]!.searchParams.get('q')).toBe('matrix')
    expect(requests[0]!.searchParams.get('limit')).toBe('8')
    expect(requests[0]!.searchParams.get('offset')).toBe('0')
    expect(result.current.data?.data).toHaveLength(3)
  })

  it('caps q at 200 characters', async () => {
    const requests = serveSearch(0)
    const { result } = renderHook(() => useSearch('x'.repeat(300)), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests[0]!.searchParams.get('q')).toBe('x'.repeat(200))
  })

  it('honours custom limit and offset', async () => {
    const requests = serveSearch(100)
    const { result } = renderHook(() => useSearch('a', { limit: 5, offset: 10 }), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests[0]!.searchParams.get('limit')).toBe('5')
    expect(requests[0]!.searchParams.get('offset')).toBe('10')
    expect(result.current.data?.data).toHaveLength(5)
  })

  it.each([[''], ['   '], ['\t\n']])('sends nothing for an empty query (%j)', async (q) => {
    const requests = serveSearch(3)
    const { result } = renderHook(() => useSearch(q), { wrapper: makeWrapper() })
    // Give a wrongly enabled query time to start.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(requests).toHaveLength(0)
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('surfaces a server error', async () => {
    server.use(
      http.get(`${location.origin}/api/v1/search`, () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'boom', status: 500, code: 'internal_error' },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    const { result } = renderHook(() => useSearch('matrix'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('W-11 useSearchResults', () => {
  it('loads the first page with limit 50 and offset 0', async () => {
    const requests = serveSearch(120)
    const { result } = renderHook(() => useTrackedResults('item'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(RESULTS_PAGE_SIZE).toBe(50)
    expect(requests).toHaveLength(1)
    expect(requests[0]!.searchParams.get('limit')).toBe('50')
    expect(requests[0]!.searchParams.get('offset')).toBe('0')
    expect(result.current.data?.pages[0]?.data).toHaveLength(50)
    expect(result.current.hasNextPage).toBe(true)
  })

  it('fetches the next page by offset until total is reached', async () => {
    const requests = serveSearch(120)
    const { result } = renderHook(() => useTrackedResults('item'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    await act(() => result.current.fetchNextPage())
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(requests[1]!.searchParams.get('offset')).toBe('50')
    expect(result.current.hasNextPage).toBe(true)

    await act(() => result.current.fetchNextPage())
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3))
    expect(requests[2]!.searchParams.get('offset')).toBe('100')
    expect(result.current.data?.pages[2]?.data).toHaveLength(20)
    expect(result.current.hasNextPage).toBe(false)
  })

  it('has no next page when everything fits in one page', async () => {
    serveSearch(50)
    const { result } = renderHook(() => useTrackedResults('item'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
  })

  it('has no next page when there are no matches', async () => {
    serveSearch(0)
    const { result } = renderHook(() => useTrackedResults('item'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages[0]?.data).toEqual([])
    expect(result.current.hasNextPage).toBe(false)
  })

  it('does not loop on an empty page that still reports a larger total', async () => {
    server.use(
      http.get(`${location.origin}/api/v1/search`, () =>
        HttpResponse.json({ data: [], page: { limit: 50, offset: 0, total: 10 } }),
      ),
    )
    const { result } = renderHook(() => useTrackedResults('item'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
  })

  it('trims and caps q, and sends nothing for an empty query', async () => {
    const requests = serveSearch(1)
    const long = renderHook(() => useTrackedResults(`  ${'y'.repeat(260)}  `), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(long.result.current.isSuccess).toBe(true))
    expect(requests[0]!.searchParams.get('q')).toBe('y'.repeat(200))

    const before = requests.length
    const empty = renderHook(() => useTrackedResults('   '), { wrapper: makeWrapper() })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(requests).toHaveLength(before)
    expect(empty.result.current.fetchStatus).toBe('idle')
  })
})
