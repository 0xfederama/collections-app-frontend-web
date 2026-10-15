import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function makeResult(n: number, title = `Result ${n}`) {
  return {
    item: {
      id: uuid(1000 + n),
      list_id: LIST_ID,
      title,
      kind: 'movie' as const,
      summary: null,
      status: null,
      image: null,
      price: null,
      official_website_url: null,
      content_version: 1,
      sort_order: n,
      version: 1,
      created_at: '2026-10-14T09:31:00Z',
      updated_at: '2026-10-14T09:31:00Z',
    },
    path: [
      { type: 'folder' as const, id: uuid(1), name: 'Media' },
      { type: 'folder' as const, id: uuid(2), name: 'Movies' },
      { type: 'list' as const, id: LIST_ID, name: 'Watchlist' },
    ],
  }
}

function page(count: number, total = count): SearchPage {
  return {
    data: Array.from({ length: count }, (_, i) => makeResult(i + 1)),
    page: { limit: 8, offset: 0, total },
  }
}

/** Answers every search with `body` (or a function of the URL) and records the request URLs. */
function serveSearch(body: SearchPage | ((url: URL) => SearchPage) = page(3)) {
  const requests: URL[] = []
  server.use(
    http.get(`${location.origin}/api/v1/search`, ({ request }) => {
      const url = new URL(request.url)
      requests.push(url)
      return HttpResponse.json(typeof body === 'function' ? body(url) : body)
    }),
  )
  return requests
}

function renderRouter(path = '/') {
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

const field = () => screen.getByRole('combobox', { name: 'Search' })
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

/**
 * Sets the field in one step. The fake clock follows real time (`shouldAdvanceTime`), so typing
 * key by key on a busy machine could let the debounce fire in the middle of a test.
 */
const setText = (text: string) => fireEvent.change(field(), { target: { value: text } })

function fakeUser() {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('W-11 sidebar search debounce', () => {
  it('sends no request before 250 ms, then exactly one with the trimmed q and limit 8', async () => {
    const requests = serveSearch()
    fakeUser()
    renderRouter()

    setText('  matrix  ')
    await tick(150)
    expect(requests).toHaveLength(0)

    await tick(150)
    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0]!.searchParams.get('q')).toBe('matrix')
    expect(requests[0]!.searchParams.get('limit')).toBe('8')
    expect(await screen.findAllByRole('option')).toHaveLength(3)
    expect(requests).toHaveLength(1)
  })

  it('restarts the pause on every keystroke and sends only the final text', async () => {
    const requests = serveSearch()
    fakeUser()
    renderRouter()

    setText('ma')
    await tick(150)
    setText('matr')
    await tick(150)
    expect(requests).toHaveLength(0)

    await tick(150)
    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0]!.searchParams.get('q')).toBe('matr')
  })

  it('caps q at 200 characters', async () => {
    const requests = serveSearch()
    const user = fakeUser()
    renderRouter()

    await user.click(field())
    await user.paste('z'.repeat(250))
    await tick(300)
    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0]!.searchParams.get('q')).toBe('z'.repeat(200))
  })

  it('sends nothing for whitespace-only input and shows no list', async () => {
    const requests = serveSearch()
    fakeUser()
    renderRouter()

    setText('     ')
    await tick(600)
    expect(requests).toHaveLength(0)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/Searching/)).not.toBeInTheDocument()
  })

  it('shows "Searching…" only after 150 ms of waiting for an answer', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.get(`${location.origin}/api/v1/search`, async () => {
        await gate
        return HttpResponse.json(page(2))
      }),
    )
    // A strict fake clock (it does not follow real time): the 150 ms threshold is checked exactly,
    // however long the machine stalls between two statements.
    vi.useFakeTimers()
    renderRouter()

    setText('slow')
    await tick(100)
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument()

    await tick(100)
    expect(screen.getByText('Searching…')).toBeInTheDocument()

    // `vi.waitFor` advances the fake clock itself while it polls for the (mocked) answer.
    release()
    await vi.waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2))
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument()
  })
})

describe('W-11 sidebar search results', () => {
  it('lists the matches as options of a listbox with title and path', async () => {
    serveSearch(page(2))
    const user = userEvent.setup()
    renderRouter()

    expect(field()).toHaveAttribute('aria-expanded', 'false')
    await user.type(field(), 'res')
    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(2)
    expect(screen.getByRole('listbox', { name: 'Search results' })).toBeInTheDocument()
    expect(field()).toHaveAttribute('aria-expanded', 'true')
    expect(options[0]).toHaveTextContent('Result 1')
    expect(options[0]).toHaveTextContent('Media › Movies › Watchlist')
  })

  it('shows the empty state when nothing matches', async () => {
    serveSearch(page(0))
    const user = userEvent.setup()
    renderRouter()

    await user.type(field(), 'zzz')
    expect(await screen.findByText('No results for “zzz”')).toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('shows an error with Retry, and Retry recovers', async () => {
    server.use(
      http.get(`${location.origin}/api/v1/search`, () => problemResponse(500, 'internal_error')),
    )
    const user = userEvent.setup()
    renderRouter()

    await user.type(field(), 'matrix')
    const retry = await screen.findByRole('button', { name: 'Retry' })
    expect(screen.getByText('Couldn’t search.')).toBeInTheDocument()

    serveSearch(page(2))
    await user.click(retry)
    expect(await screen.findAllByRole('option')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    // Focus never left the input.
    expect(field()).toHaveFocus()
  })

  it('keeps the previous rows on screen while a newer query loads', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.get(`${location.origin}/api/v1/search`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('q') === 'ab') await gate
        return HttpResponse.json(page(2))
      }),
    )
    const user = userEvent.setup()
    renderRouter()

    await user.type(field(), 'a')
    expect(await screen.findAllByRole('option')).toHaveLength(2)
    await user.type(field(), 'b')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument()
    release()
  })
})

describe('W-11 sidebar search keyboard', () => {
  it('ArrowDown/ArrowUp move the highlight from none, wrapping through none', async () => {
    serveSearch(page(3))
    const user = userEvent.setup()
    renderRouter()

    await user.type(field(), 'res')
    const options = await screen.findAllByRole('option')
    const selected = () => options.map((o) => o.getAttribute('aria-selected'))
    expect(selected()).toEqual(['false', 'false', 'false'])
    expect(field()).not.toHaveAttribute('aria-activedescendant')

    await user.keyboard('{ArrowDown}')
    expect(selected()).toEqual(['true', 'false', 'false'])
    expect(field()).toHaveAttribute('aria-activedescendant', options[0]!.id)

    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(selected()).toEqual(['false', 'false', 'true'])
    expect(field()).toHaveAttribute('aria-activedescendant', options[2]!.id)

    // Past the last row the highlight is none again.
    await user.keyboard('{ArrowDown}')
    expect(selected()).toEqual(['false', 'false', 'false'])
    expect(field()).not.toHaveAttribute('aria-activedescendant')

    // ArrowUp from none goes to the last row, and back up to none from the first.
    await user.keyboard('{ArrowUp}')
    expect(selected()).toEqual(['false', 'false', 'true'])
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}')
    expect(selected()).toEqual(['false', 'false', 'false'])
    expect(field()).toHaveFocus()
  })

  it('Enter on a highlighted row opens that item', async () => {
    serveSearch(page(3))
    const user = userEvent.setup()
    const router = renderRouter()

    await user.type(field(), 'res')
    await screen.findAllByRole('option')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(router.state.location.pathname).toBe(`/lists/${LIST_ID}/items/${uuid(1002)}`)
    expect(router.state.location.search).toBe('')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })

  it('Enter with no highlighted row goes to /search?q= with the trimmed, encoded text', async () => {
    serveSearch(page(3))
    const user = userEvent.setup()
    const router = renderRouter()

    await user.type(field(), ' a&b c ')
    await screen.findAllByRole('option')
    await user.keyboard('{Enter}')

    expect(router.state.location.pathname).toBe('/search')
    expect(router.state.location.search).toBe('?q=a%26b%20c')
    expect(await screen.findByRole('searchbox', { name: 'Search all items' })).toHaveValue('a&b c')
  })

  it('Enter after the highlight wrapped back to none also goes to the results page', async () => {
    serveSearch(page(1))
    const user = userEvent.setup()
    const router = renderRouter()

    await user.type(field(), 'res')
    await screen.findAllByRole('option')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(router.state.location.pathname).toBe('/search')
    expect(router.state.location.search).toBe('?q=res')
  })

  it('Escape closes the list but keeps the text', async () => {
    serveSearch(page(2))
    const user = userEvent.setup()
    renderRouter()

    await user.type(field(), 'res')
    await screen.findAllByRole('option')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(field()).toHaveValue('res')
    expect(field()).toHaveFocus()
    expect(field()).toHaveAttribute('aria-expanded', 'false')
  })

  it('ArrowDown reopens the list after Escape', async () => {
    serveSearch(page(2))
    const user = userEvent.setup()
    renderRouter()

    await user.type(field(), 'res')
    await screen.findAllByRole('option')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())

    await user.keyboard('{ArrowDown}')
    expect(await screen.findAllByRole('option')).toHaveLength(2)
  })

  it('Enter with an empty field does not navigate', async () => {
    const user = userEvent.setup()
    const router = renderRouter()
    await user.click(field())
    await user.keyboard('{Enter}')
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('W-11 sidebar search row click', () => {
  it('clicking a row opens the item URL and closes the list', async () => {
    serveSearch(page(3))
    const user = userEvent.setup()
    const router = renderRouter()

    await user.type(field(), 'res')
    const options = await screen.findAllByRole('option')
    await user.click(options[1]!)

    expect(router.state.location.pathname).toBe(`/lists/${LIST_ID}/items/${uuid(1002)}`)
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })
})
