import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestRouter } from '../../app/router'
import { ToastProvider } from '../../components/ui'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import type { SearchPage } from './api'

const uuid = (n: number) => `7c1e5a10-0000-4000-8000-${String(n).padStart(12, '0')}`
const LIST_ID = uuid(11)

function makeResult(n: number) {
  return {
    item: {
      id: uuid(1000 + n),
      list_id: LIST_ID,
      title: `Result ${n}`,
      kind: 'movie' as const,
      image: null,
      price: null,
      website: null,
      metadata: {},
      content_version: 1,
      sort_order: n,
      version: 1,
      created_at: '2026-10-14T09:31:00Z',
      updated_at: '2026-10-14T09:31:00Z',
    },
    kind_name: 'Movie',
    path: [
      { type: 'folder' as const, id: uuid(1), name: 'Media', icon: null, icon_color: null },
      { type: 'folder' as const, id: uuid(2), name: 'Movies', icon: null, icon_color: null },
      { type: 'list' as const, id: LIST_ID, name: 'Watchlist', icon: null, icon_color: null },
    ],
  }
}

function makePage(total: number, offset: number, limit: number): SearchPage {
  const count = Math.max(0, Math.min(limit, total - offset))
  return {
    data: Array.from({ length: count }, (_, i) => makeResult(offset + i + 1)),
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
      return HttpResponse.json(
        makePage(
          total,
          Number(url.searchParams.get('offset') ?? 0),
          Number(url.searchParams.get('limit') ?? 50),
        ),
      )
    }),
  )
  return requests
}

function renderRouter(path: string) {
  const router = createTestRouter([path])
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return router
}

const input = () => screen.getByRole('searchbox', { name: 'Search all items' })
const resultList = () => screen.findByRole('list', { name: 'Search results' })

afterEach(() => {
  vi.useRealTimers()
})

describe('W-11 search results page', () => {
  it('prefills the field from ?q= and requests it with limit 50', async () => {
    const requests = serveSearch(3)
    renderRouter('/search?q=matrix')

    // The route is lazy: wait for its field to appear.
    expect(await screen.findByRole('searchbox', { name: 'Search all items' })).toHaveValue('matrix')
    const list = await resultList()
    expect(within(list).getAllByRole('link')).toHaveLength(3)
    expect(requests).toHaveLength(1)
    expect(requests[0]!.searchParams.get('q')).toBe('matrix')
    expect(requests[0]!.searchParams.get('limit')).toBe('50')
    expect(requests[0]!.searchParams.get('offset')).toBe('0')
  })

  it('shows the total in "N results for “q”"', async () => {
    serveSearch(3)
    renderRouter('/search?q=matrix')
    expect(await screen.findByText('3 results for “matrix”')).toBeInTheDocument()
  })

  it('uses the singular for one result', async () => {
    serveSearch(1)
    renderRouter('/search?q=matrix')
    expect(await screen.findByText('1 result for “matrix”')).toBeInTheDocument()
  })

  it('rows are links to the item URL, with title and path', async () => {
    serveSearch(2)
    renderRouter('/search?q=res')
    const links = within(await resultList()).getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', `/lists/${LIST_ID}/items/${uuid(1001)}`)
    expect(links[1]).toHaveAttribute('href', `/lists/${LIST_ID}/items/${uuid(1002)}`)
    expect(links[0]).toHaveTextContent('Result 1')
    expect(links[0]).toHaveTextContent('Media › Movies › Watchlist')
  })

  it('clicking a row navigates to the item', async () => {
    serveSearch(2)
    const user = userEvent.setup()
    const router = renderRouter('/search?q=res')
    const links = within(await resultList()).getAllByRole('link')
    await user.click(links[1]!)
    expect(router.state.location.pathname).toBe(`/lists/${LIST_ID}/items/${uuid(1002)}`)
  })

  it('shows a skeleton while the first page is pending', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.get(`${location.origin}/api/v1/search`, async () => {
        await gate
        return HttpResponse.json(makePage(2, 0, 50))
      }),
    )
    renderRouter('/search?q=res')

    expect(screen.getByTestId('search-skeleton')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Search results' })).not.toBeInTheDocument()

    release()
    await resultList()
    expect(screen.queryByTestId('search-skeleton')).not.toBeInTheDocument()
  })

  it('shows "No results" when nothing matches', async () => {
    serveSearch(0)
    renderRouter('/search?q=zzz')
    expect(await screen.findByText('No results')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Search results' })).not.toBeInTheDocument()
    expect(screen.queryByText(/results? for/)).not.toBeInTheDocument()
  })

  it('shows an alert with Retry on failure, and Retry recovers', async () => {
    server.use(
      http.get(`${location.origin}/api/v1/search`, () => problemResponse(500, 'internal_error')),
    )
    const user = userEvent.setup()
    renderRouter('/search?q=matrix')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Couldn’t search.')
    // The typed text survives the failure.
    expect(input()).toHaveValue('matrix')

    serveSearch(2)
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(within(await resultList()).getAllByRole('link')).toHaveLength(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the prompt and sends no request without a query', async () => {
    const requests = serveSearch(3)
    renderRouter('/search')
    expect(screen.getByText('Search your collection')).toBeInTheDocument()
    expect(input()).toHaveValue('')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(requests).toHaveLength(0)
  })

  it('treats a whitespace-only ?q= as no query', async () => {
    const requests = serveSearch(3)
    renderRouter('/search?q=%20%20%20')
    expect(screen.getByText('Search your collection')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(requests).toHaveLength(0)
  })

  it('trims the URL query before using it', async () => {
    const requests = serveSearch(1)
    renderRouter('/search?q=%20%20cats%20%20')
    await resultList()
    expect(input()).toHaveValue('cats')
    expect(requests[0]!.searchParams.get('q')).toBe('cats')
  })

  it('caps a URL query longer than 200 characters', async () => {
    const requests = serveSearch(1)
    renderRouter(`/search?q=${'a'.repeat(250)}`)
    await resultList()
    expect(requests[0]!.searchParams.get('q')).toBe('a'.repeat(200))
    expect((input() as HTMLInputElement).value).toHaveLength(200)
    expect(input()).toHaveAttribute('maxlength', '200')
  })
})

describe('W-11 search results page, load more', () => {
  it('loads the next 50 by offset, appends, and hides the button at total', async () => {
    const requests = serveSearch(120)
    const user = userEvent.setup()
    renderRouter('/search?q=res')

    const list = await resultList()
    expect(within(list).getAllByRole('link')).toHaveLength(50)
    expect(screen.getByText('120 results for “res”')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Load more (70 remaining)' }))
    await waitFor(() => expect(within(list).getAllByRole('link')).toHaveLength(100))
    expect(requests).toHaveLength(2)
    expect(requests[1]!.searchParams.get('offset')).toBe('50')
    expect(requests[1]!.searchParams.get('limit')).toBe('50')
    // The first rows are still there, in order.
    expect(within(list).getAllByRole('link')[0]).toHaveTextContent('Result 1')
    expect(within(list).getAllByRole('link')[99]).toHaveTextContent('Result 100')

    await user.click(await screen.findByRole('button', { name: 'Load more (20 remaining)' }))
    await waitFor(() => expect(within(list).getAllByRole('link')).toHaveLength(120))
    expect(requests[2]!.searchParams.get('offset')).toBe('100')
    expect(screen.queryByRole('button', { name: /Load more/ })).not.toBeInTheDocument()
    expect(screen.getByText('120 results for “res”')).toBeInTheDocument()
  })

  it('has no Load more button when everything fits on one page', async () => {
    serveSearch(50)
    renderRouter('/search?q=res')
    const list = await resultList()
    expect(within(list).getAllByRole('link')).toHaveLength(50)
    expect(screen.queryByRole('button', { name: /Load more/ })).not.toBeInTheDocument()
  })
})

describe('W-11 search results page, typing', () => {
  it('updates ?q= after 250 ms, replacing the history entry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const requests = serveSearch(2)
    const router = renderRouter('/search?q=old')
    await resultList()
    const before = requests.length

    // One change event: the fake clock follows real time, so key-by-key typing could be slow
    // enough on a busy machine to let the debounce fire early.
    fireEvent.change(input(), { target: { value: '  new  ' } })
    await act(() => vi.advanceTimersByTimeAsync(150))
    expect(router.state.location.search).toBe('?q=old')

    await act(() => vi.advanceTimersByTimeAsync(150))
    expect(router.state.location.search).toBe('?q=new')
    expect(router.state.historyAction).toBe('REPLACE')
    await waitFor(() => expect(requests.length).toBeGreaterThan(before))
    expect(requests.at(-1)!.searchParams.get('q')).toBe('new')
    await resultList()
  })

  it('removes ?q= when the field is cleared', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    serveSearch(2)
    const router = renderRouter('/search?q=old')
    await resultList()

    await user.clear(input())
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(router.state.location.search).toBe('')
    expect(screen.getByText('Search your collection')).toBeInTheDocument()
  })

  it('Enter updates ?q= at once', async () => {
    const user = userEvent.setup()
    serveSearch(2)
    const router = renderRouter('/search?q=old')
    await resultList()

    await user.clear(input())
    await user.type(input(), 'fresh{Enter}')
    expect(router.state.location.search).toBe('?q=fresh')
  })

  it('follows the URL when the sidebar search navigates here', async () => {
    const user = userEvent.setup()
    serveSearch(2)
    const router = renderRouter('/search?q=old')
    await resultList()

    await user.type(screen.getByRole('combobox', { name: 'Search' }), 'other{Enter}')
    expect(router.state.location.search).toBe('?q=other')
    await waitFor(() => expect(input()).toHaveValue('other'))
  })
})
