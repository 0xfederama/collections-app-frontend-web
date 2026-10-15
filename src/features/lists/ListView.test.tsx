import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../app/router'
import { ToastProvider } from '../../components/ui'
import { exampleResponses } from '../../generated/examples'
import type { components } from '../../generated/schema'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { createTestQueryClient, mockViewport } from '../../test-utils'

type List = components['schemas']['List']
type ItemSummary = components['schemas']['ItemSummary']

const LIST = '7c1e5a10-0000-4000-8000-000000000011'
const listUrl = `${location.origin}/api/v1/lists/${LIST}`
const itemsUrl = `${listUrl}/items`
const orderUrl = `${listUrl}/items/order`

const baseList = exampleResponses.getList.body as List

function makeItem(n: number, over: Partial<ItemSummary> = {}): ItemSummary {
  const id = `7c1e5a10-0000-4000-8000-${String(n + 500).padStart(12, '0')}`
  return {
    id,
    list_id: LIST,
    title: `Item ${n}`,
    kind: 'movie',
    summary: null,
    status: null,
    image: null,
    price: null,
    official_website_url: null,
    content_version: 0,
    sort_order: n,
    version: 1,
    created_at: '2026-10-14T09:30:00Z',
    updated_at: '2026-10-14T09:30:00Z',
    ...over,
  }
}
const makeItems = (count: number) => Array.from({ length: count }, (_, i) => makeItem(i + 1))

interface Recorded {
  /** Every GET items URL. */
  itemRequests: URL[]
  listGets: number
  patches: { ifMatch: string | null; body: unknown }[]
  puts: { ids: string[] }[]
  list: List
  items: ItemSummary[]
}

interface Options {
  list?: Partial<List>
  items?: ItemSummary[]
  /** Overrides the PATCH answer. */
  patch?: () => Response | Promise<Response>
  /** Overrides the PUT answer (the order is applied to the fake server only when it is 204). */
  put?: () => Response | Promise<Response>
}

/** A tiny stateful fake of the list endpoints used by the list view. */
function useBackend(options: Options = {}): Recorded {
  const state: Recorded = {
    itemRequests: [],
    listGets: 0,
    patches: [],
    puts: [],
    list: { ...baseList, item_count: (options.items ?? []).length || 3, ...options.list },
    items: options.items ?? makeItems(3),
  }
  server.use(
    http.get(listUrl, () => {
      state.listGets += 1
      return HttpResponse.json(state.list)
    }),
    http.patch(listUrl, async ({ request }) => {
      state.patches.push({
        ifMatch: request.headers.get('If-Match'),
        body: await request.json(),
      })
      if (options.patch) return options.patch()
      state.list = {
        ...state.list,
        ...((state.patches.at(-1)?.body as object) ?? {}),
        version: state.list.version + 1,
      }
      return HttpResponse.json(state.list)
    }),
    http.get(itemsUrl, ({ request }) => {
      const url = new URL(request.url)
      state.itemRequests.push(url)
      const q = url.searchParams.get('q')?.toLowerCase()
      let rows = q ? state.items.filter((i) => i.title.toLowerCase().includes(q)) : [...state.items]
      if ((url.searchParams.get('sort') ?? state.list.sort_mode) === 'title') {
        rows = rows.sort((a, b) => a.title.localeCompare(b.title))
      }
      const offset = Number(url.searchParams.get('offset') ?? 0)
      const limit = Number(url.searchParams.get('limit') ?? 50)
      return HttpResponse.json({
        data: rows.slice(offset, offset + limit),
        page: { limit, offset, total: rows.length },
      })
    }),
    http.put(orderUrl, async ({ request }) => {
      const body = (await request.json()) as { ids: string[] }
      state.puts.push(body)
      if (options.put) {
        const response = await options.put()
        if (response.status !== 204) return response
      }
      state.items = body.ids.map((id) => state.items.find((i) => i.id === id)!)
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return state
}

function renderList(path: string) {
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

const at = (query = '') => `/lists/${LIST}${query}`
const itemsList = () => screen.findByRole('list', { name: 'Items' })
const titles = () =>
  within(screen.getByRole('list', { name: 'Items' }))
    .getAllByRole('link')
    .map((a) => a.textContent)
const filterField = () => screen.getByRole('searchbox', { name: 'Filter items by title' })
const sortSelect = () => screen.getByRole('combobox', { name: /Sort/ })

const radioName = { compact: 'Compact rows', thumbnail: 'Thumbnail rows', grid: 'Grid' } as const

// 200-250 rows plus user-event's per-click style checks: ~1.5 s alone, 10x that on a loaded machine.
const HEAVY_TEST_TIMEOUT = 30_000

describe('W-06 display modes', () => {
  const rich = [
    makeItem(1, {
      title: 'The Matrix',
      summary: 'A hacker learns the truth.',
      status: 'Watched',
      kind: 'movie',
      price: { min: '1200', max: '1500', currency: 'EUR' },
    }),
  ]

  it.each([
    'compact',
    'thumbnail',
    'grid',
  ] as const)('%s renders title link, status, price and kind, no summary (F007-W4)', async (mode) => {
    useBackend({ list: { display_mode: mode }, items: rich })
    renderList(at())
    const ul = await itemsList()
    const link = within(ul).getByRole('link', { name: 'The Matrix' })
    expect(link).toHaveAttribute('href', `/lists/${LIST}/items/${rich[0]!.id}`)
    expect(within(ul).getByText('Watched')).toBeInTheDocument()
    expect(within(ul).getByText(/1,200.*1,500/)).toBeInTheDocument()
    expect(within(ul).getByText('Movie')).toBeInTheDocument()
    expect(within(ul).queryByText('A hacker learns the truth.')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: radioName[mode] })).toBeChecked()
  })

  it('omits status and price when the item has none', async () => {
    useBackend({ items: [makeItem(1)], list: { display_mode: 'compact' } })
    renderList(at())
    const ul = await itemsList()
    expect(within(ul).queryByText(/€/)).not.toBeInTheDocument()
    expect(ul.querySelector('[class*="chip"]')).toBeNull()
  })

  it('carries ?q= and ?sort= from the URL into the item links', async () => {
    useBackend({ items: makeItems(3) })
    renderList(at('?q=item&sort=updated'))
    await itemsList()
    const href = screen.getAllByRole('link', { name: 'Item 1' }).at(-1)!.getAttribute('href')!
    const url = new URL(href, location.origin)
    expect(url.pathname).toMatch(new RegExp(`^/lists/${LIST}/items/`))
    expect(url.searchParams.get('q')).toBe('item')
    expect(url.searchParams.get('sort')).toBe('updated')
  })

  it('shows the item count', async () => {
    useBackend({ list: { item_count: 3 } })
    renderList(at())
    await itemsList()
    expect(screen.getByText('3 items')).toBeInTheDocument()
  })
})

describe('W-06 fallback tile', () => {
  it('shows the first letter, hidden from assistive tech, when there is no image', async () => {
    useBackend({ items: [makeItem(1, { title: 'matrix', image: null })] })
    renderList(at())
    const ul = await itemsList()
    const tile = within(ul).getByTestId('fallback-tile')
    expect(tile).toHaveAttribute('aria-hidden', 'true')
    expect(tile).toHaveTextContent('M')
    expect(within(ul).queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows the image with the title as alt when there is one', async () => {
    useBackend({
      items: [makeItem(1, { title: 'Alien', image: { url: 'https://example.org/a.jpg' } })],
    })
    renderList(at())
    const ul = await itemsList()
    expect(within(ul).getByRole('img', { name: 'Alien' })).toHaveAttribute(
      'src',
      'https://example.org/a.jpg',
    )
    expect(within(ul).queryByTestId('fallback-tile')).not.toBeInTheDocument()
  })

  it('switches to the tile when the image fails to load', async () => {
    useBackend({
      items: [makeItem(1, { title: 'Alien', image: { url: 'https://example.org/a.jpg' } })],
    })
    renderList(at())
    const ul = await itemsList()
    fireEvent.error(within(ul).getByRole('img', { name: 'Alien' }))
    expect(within(ul).queryByRole('img')).not.toBeInTheDocument()
    expect(within(ul).getByTestId('fallback-tile')).toHaveTextContent('A')
  })
})

describe('W-06 URL state: sort and filter', () => {
  it('?sort=title shows "Title" in the Sort select and the request carries sort=title', async () => {
    const backend = useBackend()
    renderList(at('?sort=title'))
    await itemsList()
    expect(sortSelect()).toHaveTextContent('Title')
    expect(backend.itemRequests.at(-1)!.searchParams.get('sort')).toBe('title')
  })

  it('sends no sort param when the URL has none and shows the list sort', async () => {
    const backend = useBackend()
    renderList(at())
    await itemsList()
    expect(sortSelect()).toHaveTextContent('Manual')
    expect(backend.itemRequests.at(-1)!.searchParams.has('sort')).toBe(false)
  })

  it('typing in the filter updates ?q= after the debounce and the request carries q', async () => {
    const backend = useBackend()
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.type(filterField(), 'Item 2')
    // Not instant: the URL waits for a pause in typing.
    expect(router.state.location.search).toBe('')
    await waitFor(() => expect(router.state.location.search).toBe('?q=Item+2'))
    await waitFor(() => expect(backend.itemRequests.at(-1)!.searchParams.get('q')).toBe('Item 2'))
    expect(await screen.findByText('1 of 3 items')).toBeInTheDocument()
    expect(titles()).toEqual(['Item 2'])
  })

  it('picking a different sort sets ?sort= and offers to make it the default', async () => {
    const backend = useBackend()
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    expect(screen.queryByRole('button', { name: 'Make this the default sort' })).toBeNull()
    await user.click(sortSelect())
    await user.click(await screen.findByRole('option', { name: 'Title' }))
    expect(router.state.location.search).toBe('?sort=title')
    await waitFor(() => expect(backend.itemRequests.at(-1)!.searchParams.get('sort')).toBe('title'))
    expect(screen.getByRole('button', { name: 'Make this the default sort' })).toBeInTheDocument()
  })

  it('"Make this the default sort" PATCHes sort_mode with If-Match', async () => {
    const backend = useBackend({ list: { version: 7 } })
    const user = userEvent.setup()
    renderList(at('?sort=title'))
    await itemsList()
    await user.click(screen.getByRole('button', { name: 'Make this the default sort' }))
    await waitFor(() => expect(backend.patches).toHaveLength(1))
    expect(backend.patches[0]).toEqual({ ifMatch: '"l-7"', body: { sort_mode: 'title' } })
    expect(await screen.findByText('Default sort saved')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Make this the default sort' })).toBeNull(),
    )
  })

  it("choosing the list's own sort removes ?sort=", async () => {
    useBackend()
    const user = userEvent.setup()
    const router = renderList(at('?sort=title'))
    await itemsList()
    await user.click(sortSelect())
    await user.click(await screen.findByRole('option', { name: 'Manual' }))
    expect(router.state.location.search).toBe('')
  })

  it('an unknown ?sort= value is ignored', async () => {
    const backend = useBackend()
    renderList(at('?sort=bogus'))
    await itemsList()
    expect(sortSelect()).toHaveTextContent('Manual')
    expect(backend.itemRequests.at(-1)!.searchParams.has('sort')).toBe(false)
  })
})

describe('W-06 display mode', () => {
  it('clicking Grid PATCHes display_mode with If-Match and switches at once', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const backend = useBackend({
      list: { display_mode: 'compact', version: 4 },
      patch: async () => {
        await gate
        return HttpResponse.json({ ...baseList, display_mode: 'grid', version: 5 })
      },
    })
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    await user.click(screen.getByRole('radio', { name: 'Grid' }))
    // Optimistic: checked before the server answered.
    expect(screen.getByRole('radio', { name: 'Grid' })).toBeChecked()
    expect(backend.patches).toHaveLength(1)
    expect(backend.patches[0]).toEqual({ ifMatch: '"l-4"', body: { display_mode: 'grid' } })
    release()
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Grid' })).toBeChecked())
  })

  it('rolls back, toasts and refetches the list on 412', async () => {
    const backend = useBackend({
      list: { display_mode: 'compact', version: 4 },
      patch: () => problemResponse(412, 'precondition_failed'),
    })
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    const getsBefore = backend.listGets
    await user.click(screen.getByRole('radio', { name: 'Grid' }))
    expect(await screen.findByText('This list was changed elsewhere')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Compact rows' })).toBeChecked()
    await waitFor(() => expect(backend.listGets).toBeGreaterThan(getsBefore))
  })

  it('rolls back with a generic toast on other errors', async () => {
    useBackend({
      list: { display_mode: 'compact' },
      patch: () => problemResponse(500, 'internal_error'),
    })
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    await user.click(screen.getByRole('radio', { name: 'Grid' }))
    expect(await screen.findByText('Couldn’t save the change')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Compact rows' })).toBeChecked()
  })
})

describe('W-06 empty and error states', () => {
  it('an empty list shows "No items yet" with Add item', async () => {
    useBackend({ items: [], list: { item_count: 0 } })
    renderList(at())
    expect(await screen.findByText('No items yet')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Items' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Add item' }).length).toBeGreaterThan(0)
  })

  it('an empty filter result shows "No items match" and Clear filter clears ?q=', async () => {
    useBackend()
    const user = userEvent.setup()
    const router = renderList(at('?q=zzz'))
    expect(await screen.findByText('No items match')).toBeInTheDocument()
    expect(filterField()).toHaveValue('zzz')
    await user.click(screen.getByRole('button', { name: 'Clear filter' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(filterField()).toHaveValue('')
    expect(await itemsList()).toBeInTheDocument()
  })

  it('an items error shows an alert whose Retry refetches', async () => {
    let calls = 0
    useBackend()
    server.use(
      http.get(itemsUrl, () => {
        calls += 1
        return calls === 1
          ? problemResponse(500, 'internal_error')
          : HttpResponse.json({
              data: makeItems(2),
              page: { limit: 200, offset: 0, total: 2 },
            })
      }),
    )
    const user = userEvent.setup()
    renderList(at())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Couldn’t load the items')
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await itemsList()).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('a list that answers 404 shows "List not found"', async () => {
    useBackend()
    server.use(http.get(listUrl, () => problemResponse(404, 'not_found')))
    renderList(at())
    expect(await screen.findByRole('heading', { name: 'List not found' })).toBeInTheDocument()
  })

  it('a list that fails otherwise shows an alert with Retry', async () => {
    useBackend()
    server.use(http.get(listUrl, () => problemResponse(500, 'internal_error')))
    renderList(at())
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})

describe('W-06 reorder', () => {
  const ids = (items: ItemSummary[]) => items.map((i) => i.id)

  async function openMenu(user: ReturnType<typeof userEvent.setup>, title: string) {
    await user.click(screen.getByRole('button', { name: `Actions for ${title}` }))
  }

  it('manual sort shows a handle and an actions menu per row, with edge moves disabled', async () => {
    useBackend()
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    for (const t of ['Item 1', 'Item 2', 'Item 3']) {
      expect(screen.getByRole('button', { name: `Reorder ${t}` })).toBeInTheDocument()
    }
    await openMenu(user, 'Item 1')
    expect(await screen.findByRole('menuitem', { name: 'Move up' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('menuitem', { name: 'Move down' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await user.keyboard('{Escape}')
    await openMenu(user, 'Item 3')
    expect(await screen.findByRole('menuitem', { name: 'Move down' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('menuitem', { name: 'Move up' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('Move down sends PUT with ALL ids in the new order and reorders the DOM at once', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const backend = useBackend({
      put: async () => {
        await gate
        return new HttpResponse(null, { status: 204 })
      },
    })
    const original = ids(backend.items)
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    await openMenu(user, 'Item 1')
    await user.click(await screen.findByRole('menuitem', { name: 'Move down' }))
    // Optimistic: the DOM changed while the PUT is still pending.
    await waitFor(() => expect(titles()).toEqual(['Item 2', 'Item 1', 'Item 3']))
    await waitFor(() => expect(backend.puts).toHaveLength(1))
    expect(backend.puts[0]!.ids).toEqual([original[1], original[0], original[2]])
    release()
    await waitFor(() =>
      expect(backend.items.map((i) => i.title)).toEqual(['Item 2', 'Item 1', 'Item 3']),
    )
    expect(titles()).toEqual(['Item 2', 'Item 1', 'Item 3'])
  })

  it('Move up on the last row swaps it with the previous one', async () => {
    const backend = useBackend()
    const original = ids(backend.items)
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    await openMenu(user, 'Item 3')
    await user.click(await screen.findByRole('menuitem', { name: 'Move up' }))
    await waitFor(() => expect(backend.puts).toHaveLength(1))
    expect(backend.puts[0]!.ids).toEqual([original[0], original[2], original[1]])
  })

  it('on 409 order_stale the order is restored and "List changed, order refreshed." shows', async () => {
    const backend = useBackend({ put: () => problemResponse(409, 'order_stale') })
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    await openMenu(user, 'Item 1')
    await user.click(await screen.findByRole('menuitem', { name: 'Move down' }))
    expect(await screen.findByText('List changed, order refreshed.')).toBeInTheDocument()
    await waitFor(() => expect(titles()).toEqual(['Item 1', 'Item 2', 'Item 3']))
    expect(backend.puts).toHaveLength(1)
  })

  it('on 500 the order rolls back and an error toast shows', async () => {
    useBackend({ put: () => problemResponse(500, 'internal_error') })
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    await openMenu(user, 'Item 1')
    await user.click(await screen.findByRole('menuitem', { name: 'Move down' }))
    expect(await screen.findByText('Couldn’t save the new order')).toBeInTheDocument()
    await waitFor(() => expect(titles()).toEqual(['Item 1', 'Item 2', 'Item 3']))
  })

  // dnd-kit's keyboard sensor measures element rects to decide where the item lands. jsdom has no
  // layout (all rects are 0), so the sortable never changes index and the drop is a no-op. This
  // cannot be exercised faithfully here; the keyboard path is covered by the "Move up/down" menu
  // tests above and should be checked in a real browser (Playwright, Q-01).
  it.skip('keyboard drag on the handle (Space, ArrowDown, Space) reorders (needs real layout)', async () => {
    const backend = useBackend()
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    screen.getByRole('button', { name: 'Reorder Item 1' }).focus()
    await user.keyboard(' ')
    await user.keyboard('{ArrowDown}')
    await user.keyboard(' ')
    await waitFor(() => expect(backend.puts).toHaveLength(1))
  })

  describe('handles are not offered', () => {
    // The sidebar tree has its own reorder handles, so look inside the items list only.
    const noHandles = () =>
      expect(
        within(screen.getByRole('list', { name: 'Items' })).queryByRole('button', {
          name: /^Reorder /,
        }),
      ).toBeNull()

    it('with a filter: hint to clear it', async () => {
      useBackend()
      renderList(at('?q=item'))
      await itemsList()
      expect(screen.getByText('Clear the filter to reorder items.')).toBeInTheDocument()
      noHandles()
      expect(screen.queryByRole('button', { name: /^Actions for / })).toBeNull()
    })

    it('with title sort: hint to switch to Manual', async () => {
      useBackend()
      renderList(at('?sort=title'))
      await itemsList()
      expect(screen.getByText('Switch to Manual sort to reorder items.')).toBeInTheDocument()
      noHandles()
    })

    it('with a list whose saved sort is not manual', async () => {
      useBackend({ list: { sort_mode: 'updated' } })
      renderList(at())
      await itemsList()
      expect(screen.getByText('Switch to Manual sort to reorder items.')).toBeInTheDocument()
      noHandles()
    })

    it(
      'when not all items are loaded: hint and Load more fetching offset=<loaded>',
      async () => {
        const backend = useBackend({ items: makeItems(205) })
        const user = userEvent.setup()
        renderList(at())
        await itemsList()
        expect(screen.getByText('Load all items to reorder them.')).toBeInTheDocument()
        noHandles()
        await user.click(screen.getByRole('button', { name: /^Load more/ }))
        await waitFor(() =>
          expect(backend.itemRequests.at(-1)!.searchParams.get('offset')).toBe('200'),
        )
        await waitFor(() => expect(titles()).toHaveLength(205))
        // Everything is loaded now: handles appear and the hint goes away.
        expect(await screen.findByRole('button', { name: 'Reorder Item 1' })).toBeInTheDocument()
        expect(screen.queryByText('Load all items to reorder them.')).toBeNull()
        expect(screen.queryByRole('button', { name: /^Load more/ })).toBeNull()
      },
      HEAVY_TEST_TIMEOUT,
    )

    it('a single item has nothing to reorder', async () => {
      useBackend({ items: makeItems(1) })
      renderList(at())
      await itemsList()
      noHandles()
    })
  })
})

describe('W-06 load more', () => {
  it(
    'page 1 of 200 with total 250 shows Load more; clicking requests offset=200',
    async () => {
      const backend = useBackend({ items: makeItems(250) })
      const user = userEvent.setup()
      renderList(at())
      await itemsList()
      expect(titles()).toHaveLength(200)
      expect(backend.itemRequests[0]!.searchParams.get('limit')).toBe('200')
      expect(backend.itemRequests[0]!.searchParams.get('offset')).toBe('0')
      await user.click(screen.getByRole('button', { name: /^Load more/ }))
      await waitFor(() => expect(titles()).toHaveLength(250))
      expect(backend.itemRequests.at(-1)!.searchParams.get('offset')).toBe('200')
      expect(screen.queryByRole('button', { name: /^Load more/ })).toBeNull()
    },
    HEAVY_TEST_TIMEOUT,
  )

  it('no Load more when everything fits in one page', async () => {
    useBackend({ items: makeItems(3) })
    renderList(at())
    await itemsList()
    expect(screen.queryByRole('button', { name: /^Load more/ })).toBeNull()
  })
})

describe('W-06 scroll restore', () => {
  // Runs first: the memory router's first entry always has key "default", and saved positions live in
  // a module-level Map, so the restore test below would otherwise leave 240 behind for this one.
  it('a fresh visit with no saved position starts at the top', async () => {
    mockViewport(1100)
    useBackend()
    renderList(at())
    await itemsList()
    expect(screen.getByRole('main').scrollTop).toBe(0)
  })

  it('restores main scroll and the filter after opening an item and going back', async () => {
    mockViewport(1100)
    useBackend()
    const user = userEvent.setup()
    const router = renderList(at('?q=item'))
    await itemsList()
    const main = screen.getByRole('main')
    main.scrollTop = 240
    await user.click(screen.getByRole('link', { name: 'Item 2' }))
    await waitFor(() => expect(router.state.location.pathname).toContain('/items/'))
    expect(router.state.location.search).toBe('?q=item')
    // Below 1280 the item replaces the list.
    expect(screen.queryByRole('list', { name: 'Items' })).toBeNull()
    main.scrollTop = 0
    await router.navigate(-1)
    await itemsList()
    await waitFor(() => expect(screen.getByRole('main').scrollTop).toBe(240))
    expect(filterField()).toHaveValue('item')
  })
})

describe('W-06 list actions menu (W-05) in the header', () => {
  const treeUrl = `${location.origin}/api/v1/tree`
  const tree = exampleResponses.getTree.body as components['schemas']['Tree']

  it('offers rename, move and delete for the open list', async () => {
    useBackend()
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    const main = screen.getByRole('main')
    await user.click(within(main).getByRole('button', { name: /More actions for/ }))
    expect(await screen.findByRole('menuitem', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Edit description' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^Move/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
  })

  it('after a rename the header follows the tree and the next display-mode PATCH uses the new version', async () => {
    const backend = useBackend()
    // The tree mirrors the fake list, as the real backend would.
    server.use(
      http.get(treeUrl, () =>
        HttpResponse.json({
          ...tree,
          lists: tree.lists.map((l) =>
            l.id === LIST ? { ...l, name: backend.list.name, version: backend.list.version } : l,
          ),
        }),
      ),
    )
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    const main = screen.getByRole('main')
    await user.click(within(main).getByRole('button', { name: /More actions for/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Rename' }))
    const field = await screen.findByRole('textbox', { name: 'Name' })
    await user.clear(field)
    await user.type(field, 'Seen it{Enter}')
    expect(await within(main).findByRole('heading', { name: 'Seen it' })).toBeInTheDocument()

    await user.click(within(main).getByRole('radio', { name: radioName.compact }))
    await waitFor(() => expect(backend.patches.at(-1)?.body).toEqual({ display_mode: 'compact' }))
    // The rename PATCH went out with the version the tree had; the display PATCH with the bumped one.
    const renameVersion = backend.patches[0]?.ifMatch
    expect(backend.patches.at(-1)?.ifMatch).not.toBe(renameVersion)
    expect(backend.patches.at(-1)?.ifMatch).toBe(`"l-${backend.list.version - 1}"`)
  })
})

describe('F006-W3 Add item dialog focus', () => {
  it('Esc on the Add item dialog returns focus to the Add item button', async () => {
    useBackend()
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    const button = screen.getAllByRole('button', { name: 'Add item' })[0]!
    await user.click(button)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(button).toHaveFocus())
  })
})
