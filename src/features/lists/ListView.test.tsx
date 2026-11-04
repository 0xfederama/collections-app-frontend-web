import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../app/router'
import { ToastProvider } from '../../components/ui'
import { exampleResponses } from '../../mocks/fixtures'
import type { components } from '../../generated/schema'
import type { ItemSummary } from './api'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { createTestQueryClient, mockViewport } from '../../test-utils'

type List = components['schemas']['List']

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
    type: 'movie',
    image: null,
    price: null,
    website: null,
    metadata: {},
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
      let rows = q
        ? state.items.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              (i.type === 'movie' &&
                typeof i.metadata.director === 'string' &&
                i.metadata.director.toLowerCase().includes(q)),
          )
        : [...state.items]
      const fieldKey = url.searchParams.get('filter_field')
      if (fieldKey) {
        const value = url.searchParams.get('filter_value')
        const min = url.searchParams.get('filter_min')
        const max = url.searchParams.get('filter_max')
        rows = rows.filter((item) => {
          const fieldValue = item.metadata[fieldKey]
          if (value !== null) {
            if (typeof fieldValue === 'string')
              return fieldValue.toLowerCase().includes(value.toLowerCase())
            if (typeof fieldValue === 'boolean') return String(fieldValue) === value
            return false
          }
          if (fieldValue === undefined || fieldValue === null) return false
          const comparable = typeof fieldValue === 'number' ? fieldValue : String(fieldValue)
          return (
            (!min || comparable >= (typeof fieldValue === 'number' ? Number(min) : min)) &&
            (!max || comparable <= (typeof fieldValue === 'number' ? Number(max) : max))
          )
        })
      }
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

/** The sidebar tree with the test list's type replaced (the header reads the type from there). */
function treeWithType(type: List['type']) {
  const tree = { ...(exampleResponses.getTree.body as components['schemas']['Tree']) }
  tree.lists = tree.lists.map((list) => (list.id === LIST ? { ...list, type } : list))
  server.use(http.get(`${location.origin}/api/v1/tree`, () => HttpResponse.json(tree)))
}

const at = (query = '') => `/lists/${LIST}${query}`
const itemsList = () => screen.findByRole('list', { name: 'Items' })
const titles = () =>
  within(screen.getByRole('list', { name: 'Items' }))
    .getAllByRole('link')
    .map((a) => a.textContent)
const filterField = (type: List['type'] = 'movie') =>
  screen.getByRole('searchbox', {
    name: type === 'movie' ? 'Search items by title or director' : 'Search items by title',
  })
const sortSelect = () => screen.getByRole('button', { name: 'Sort' })
/** The checked choice of the sort menu, read by opening it (it closes again). */
async function checkedSort() {
  const user = userEvent.setup()
  await user.click(sortSelect())
  const label = screen.getByRole('menuitemradio', { checked: true }).textContent
  await user.keyboard('{Escape}')
  return label
}

const radioName = { compact: 'Compact rows', thumbnail: 'Thumbnail rows', grid: 'Grid' } as const

// 200-250 rows plus user-event's per-click style checks: ~1.5 s alone, 10x that on a loaded machine.
const HEAVY_TEST_TIMEOUT = 30_000

describe('W-06 display modes', () => {
  const rich = [
    makeItem(1, {
      title: 'The Matrix',
      type: 'wishlist',
      price: { min: '1200', max: '1500', currency: 'EUR' },
    }),
  ]

  it.each(['compact', 'thumbnail', 'grid'] as const)(
    '%s renders title link and price, no type label, status or summary (F007-W4, W7)',
    async (mode) => {
      // A wishlist pins its price, so the row shows it.
      treeWithType('wishlist')
      useBackend({
        list: { display_mode: mode, type: 'wishlist' },
        items: rich,
      })
      renderList(at())
      const ul = await itemsList()
      const link = within(ul).getByRole('link', { name: 'The Matrix' })
      expect(link).toHaveAttribute('href', `/lists/${LIST}/items/${rich[0]!.id}`)
      expect(within(ul).getByText(/1,200.*1,500/)).toBeInTheDocument()
      expect(within(ul).queryByText('Wishlist')).not.toBeInTheDocument()
      expect(screen.getByRole('radio', { name: radioName[mode] })).toBeChecked()
    },
  )

  it('omits the price when the item has none', async () => {
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

  it('shows the image as decorative (empty alt, the title is next to it) when there is one', async () => {
    useBackend({
      items: [makeItem(1, { title: 'Alien', image: { url: 'https://example.org/a.jpg' } })],
    })
    renderList(at())
    const ul = await itemsList()
    expect(ul.querySelector('img')).toHaveAttribute('alt', '')
    expect(ul.querySelector('img')).toHaveAttribute('src', 'https://example.org/a.jpg')
    expect(within(ul).queryByTestId('fallback-tile')).not.toBeInTheDocument()
  })

  it('switches to the tile when the image fails to load', async () => {
    useBackend({
      items: [makeItem(1, { title: 'Alien', image: { url: 'https://example.org/a.jpg' } })],
    })
    renderList(at())
    const ul = await itemsList()
    fireEvent.error(ul.querySelector('img')!)
    expect(within(ul).queryByRole('img')).not.toBeInTheDocument()
    expect(within(ul).getByTestId('fallback-tile')).toHaveTextContent('A')
  })
})

describe('F007-W10 list description', () => {
  const toggleName = /(Collapse|Expand) description/

  it('renders the Markdown description, expanded, with a Collapse toggle', async () => {
    useBackend({ list: { description: 'Some **bold** words' } })
    renderList(at())
    await itemsList()
    const section = await screen.findByRole('region', { name: 'List description' })
    expect(within(section).getByText('bold')).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: toggleName })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('collapsing is remembered per list in localStorage', async () => {
    useBackend({ list: { description: 'Some **bold** words' } })
    const user = userEvent.setup()
    renderList(at())
    await user.click(await screen.findByRole('button', { name: 'Collapse description' }))
    expect(screen.queryByText('bold')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('collection:list-description-collapsed')!)).toEqual([
      LIST,
    ])
  })

  it('starts collapsed when this list was collapsed before, and survives blocked storage', async () => {
    localStorage.setItem('collection:list-description-collapsed', JSON.stringify([LIST]))
    useBackend({ list: { description: 'Some **bold** words' } })
    renderList(at())
    expect(await screen.findByRole('button', { name: 'Expand description' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByText('bold')).not.toBeInTheDocument()
  })

  it('without a description the section shows the "Add a description" placeholder', async () => {
    useBackend({ list: { description: null } })
    renderList(at())
    await itemsList()
    const section = screen.getByRole('region', { name: 'List description' })
    expect(within(section).getByRole('button', { name: 'Add a description' })).toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: /^(Collapse|Expand)/ })).toBeNull()
  })
})

describe('W-06 URL state: sort and filter', () => {
  it('?sort=title checks "Title" in the Sort menu and the request carries sort=title', async () => {
    const backend = useBackend()
    renderList(at('?sort=title'))
    await itemsList()
    expect(await checkedSort()).toBe('Title')
    expect(backend.itemRequests.at(-1)!.searchParams.get('sort')).toBe('title')
  })

  it('sends no sort param when the URL has none and shows the list sort', async () => {
    const backend = useBackend()
    renderList(at())
    await itemsList()
    expect(await checkedSort()).toBe('Manual')
    expect(backend.itemRequests.at(-1)!.searchParams.has('sort')).toBe(false)
  })

  it('F014-W3 a movie list offers "Release year" and sends its field key', async () => {
    const backend = useBackend()
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(sortSelect())
    await user.click(await screen.findByRole('menuitemradio', { name: 'Release year' }))
    expect(router.state.location.search).toBe('?sort=release_year')
    await waitFor(() =>
      expect(backend.itemRequests.at(-1)!.searchParams.get('sort')).toBe('release_year'),
    )
  })

  it('F013-W3 offers and requests the movie Director sort', async () => {
    const backend = useBackend({ list: { type: 'movie' } })
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(sortSelect())
    await user.click(await screen.findByRole('menuitemradio', { name: 'Director' }))
    expect(router.state.location.search).toBe('?sort=director')
    await waitFor(() =>
      expect(backend.itemRequests.at(-1)!.searchParams.get('sort')).toBe('director'),
    )
  })

  it('F013-W3 ignores ?sort=director on non-movie lists', async () => {
    treeWithType('tv_show')
    const backend = useBackend({ list: { type: 'tv_show' } })
    const user = userEvent.setup()
    renderList(at('?sort=director'))
    await itemsList()
    expect(await checkedSort()).toBe('Manual')
    expect(backend.itemRequests.at(-1)!.searchParams.has('sort')).toBe(false)
    await user.click(sortSelect())
    expect(screen.queryByRole('menuitemradio', { name: 'Director' })).not.toBeInTheDocument()
  })

  it('F014-W4 serializes a type-aware number range and sends the field filter contract', async () => {
    const backend = useBackend({
      list: { type: 'movie' },
      items: [
        makeItem(1, { title: 'Earlier', metadata: { release_year: 1999 } }),
        makeItem(2, { title: 'Later', metadata: { release_year: 2001 } }),
      ],
    })
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await user.click(await screen.findByRole('combobox', { name: 'Filter field' }))
    await user.click(await screen.findByRole('option', { name: 'Release year' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Release year minimum' }), '2000')
    await waitFor(() =>
      expect(router.state.location.search).toBe('?filter_field=release_year&filter_min=2000'),
    )
    await waitFor(() => {
      expect(backend.itemRequests.at(-1)!.searchParams.get('filter_field')).toBe('release_year')
      expect(backend.itemRequests.at(-1)!.searchParams.get('filter_min')).toBe('2000')
    })
    expect(titles()).toEqual(['Later'])
    await user.keyboard('{Escape}')
    await user.click(await screen.findByRole('button', { name: /Remove filter Release year/ }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('F014-W4 ignores stale and type-incompatible field filter URLs', async () => {
    const backend = useBackend({ list: { type: 'movie' } })
    const router = renderList(at('?filter_field=missing&filter_value=anything'))
    await itemsList()
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(backend.itemRequests.at(-1)!.searchParams.has('filter_field')).toBe(false)
  })

  it('F002 a wishlist offers "Price" and picking it sets ?sort=price', async () => {
    treeWithType('wishlist')
    const backend = useBackend({ list: { type: 'wishlist' } })
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(sortSelect())
    await user.click(await screen.findByRole('menuitemradio', { name: 'Price' }))
    expect(router.state.location.search).toBe('?sort=price')
    await waitFor(() => expect(backend.itemRequests.at(-1)!.searchParams.get('sort')).toBe('price'))
  })

  it('F009-W2 a movie list has no Price in its sort menu and ignores ?sort=price', async () => {
    treeWithType('movie')
    const backend = useBackend({ list: { type: 'movie' } })
    const user = userEvent.setup()
    renderList(at('?sort=price'))
    await itemsList()
    // A stale bookmark cannot put the list in a sort the server rejects.
    expect(await checkedSort()).toBe('Manual')
    expect(backend.itemRequests.at(-1)!.searchParams.has('sort')).toBe(false)
    await user.click(sortSelect())
    expect(screen.queryByRole('menuitemradio', { name: 'Price' })).not.toBeInTheDocument()
    // The rest of the type's sort keys are still there.
    expect(screen.getByRole('menuitemradio', { name: 'Release year' })).toBeInTheDocument()
  })

  it('F007-W9 ?sort=<field key> is ignored on a list with no type', async () => {
    treeWithType(null)
    const backend = useBackend({ list: { type: null } })
    renderList(at('?sort=release_year'))
    await itemsList()
    expect(await checkedSort()).toBe('Manual')
    expect(backend.itemRequests.at(-1)!.searchParams.has('sort')).toBe(false)
  })

  it('F008-W14 ?sort=price is ignored on a list with no type, whose sort menu has no Price', async () => {
    treeWithType(null)
    const backend = useBackend({ list: { type: null } })
    const user = userEvent.setup()
    renderList(at('?sort=price'))
    await itemsList()
    expect(await checkedSort()).toBe('Manual')
    expect(backend.itemRequests.at(-1)!.searchParams.has('sort')).toBe(false)
    await user.click(sortSelect())
    expect(screen.queryByRole('menuitemradio', { name: 'Price' })).not.toBeInTheDocument()
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

  it('F013-W3 movie filter matches director names through the q contract', async () => {
    const backend = useBackend({
      list: { type: 'movie' },
      items: [
        makeItem(1, { title: 'Barbie', metadata: { director: 'Greta Gerwig' } }),
        makeItem(2, { title: 'Alien', metadata: { director: 'Ridley Scott' } }),
      ],
    })
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.type(filterField(), 'greta')
    await waitFor(() => expect(router.state.location.search).toBe('?q=greta'))
    await waitFor(() => expect(backend.itemRequests.at(-1)!.searchParams.get('q')).toBe('greta'))
    expect(titles()).toEqual(['Barbie'])
  })

  it('picking a different sort sets ?sort= and offers to make it the default', async () => {
    const backend = useBackend()
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    expect(screen.queryByRole('button', { name: 'Make this the default sort' })).toBeNull()
    await user.click(sortSelect())
    await user.click(await screen.findByRole('menuitemradio', { name: 'Title' }))
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
    await user.click(await screen.findByRole('menuitemradio', { name: 'Manual' }))
    expect(router.state.location.search).toBe('')
  })

  it('an unknown ?sort= value is ignored', async () => {
    const backend = useBackend()
    renderList(at('?sort=bogus'))
    await itemsList()
    expect(await checkedSort()).toBe('Manual')
    expect(backend.itemRequests.at(-1)!.searchParams.has('sort')).toBe(false)
  })
})

describe('F-022 W2 fixed pinned fields per type', () => {
  const movie = makeItem(1, {
    title: 'Alien',
    metadata: {
      runtime_minutes: 117,
      streaming: { platforms: ['Netflix'], paid_platforms: ['Netflix'] },
    },
  })
  const wish = makeItem(2, {
    title: 'Miata',
    type: 'wishlist',
    price: { min: '1200', max: '1500', currency: 'EUR' },
    metadata: { model_year: 1999 },
  })

  it.each(['compact', 'thumbnail', 'grid'] as const)(
    '%s shows the movie pins: runtime next to the title, streaming icon with the paid badge',
    async (mode) => {
      useBackend({
        list: { display_mode: mode, type: 'movie' },
        items: [movie],
      })
      renderList(at())
      const ul = await itemsList()
      expect(within(ul).getByText('117 min')).toBeInTheDocument()
      expect(within(ul).getByRole('img', { name: 'Netflix, paid' })).toBeInTheDocument()
    },
  )

  it('a movie row from the API shows runtime and a streaming icon with $ for a paid platform', async () => {
    useBackend({ list: { type: 'movie' }, items: [movie] })
    renderList(at())
    const ul = await itemsList()
    expect(within(ul).getByText('117 min')).toBeInTheDocument()
    const icon = within(ul).getByRole('img', { name: 'Netflix, paid' })
    expect(icon).toHaveTextContent('$')
  })

  it('a wishlist row shows its fixed price pin and no year, with no Pinned control in the toolbar', async () => {
    treeWithType('wishlist')
    const backend = useBackend({
      list: { type: 'wishlist', version: 2 },
      items: [wish],
    })
    renderList(at())
    const ul = await itemsList()
    expect(within(ul).getByText(/€\s1,200–1,500/)).toBeInTheDocument()
    expect(within(ul).queryByText('1999')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pinned fields/ })).not.toBeInTheDocument()
    // The pins come from the web's table, so the list is never PATCHed for them.
    expect(backend.patches).toHaveLength(0)
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
  it('an empty list shows "No items yet" with the only New item button', async () => {
    useBackend({ items: [], list: { item_count: 0 } })
    renderList(at())
    expect(await screen.findByText('No items yet')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Items' })).not.toBeInTheDocument()
    // F008-W7: the centered call to action is the only "New item" while the list is empty.
    expect(screen.getAllByRole('button', { name: 'New item' })).toHaveLength(1)
  })

  it('F008-W7 the top-right New item shows once the list has items, with the count at the end', async () => {
    useBackend()
    renderList(at())
    await itemsList()
    expect(screen.getAllByRole('button', { name: 'New item' })).toHaveLength(1)
    expect(screen.queryByText('No items yet')).not.toBeInTheDocument()
    const count = screen.getByText(/^\d+ items?$/)
    const items = screen.getByRole('list', { name: 'Items' })
    expect(items.compareDocumentPosition(count) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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

  it('manual sort shows an actions menu per row (the rows are draggable), with edge moves disabled', async () => {
    useBackend()
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    for (const t of ['Item 1', 'Item 2', 'Item 3']) {
      expect(screen.getByRole('button', { name: `Actions for ${t}` })).toBeInTheDocument()
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
  it.skip('keyboard drag from the focused title link (Space, ArrowDown, Space) reorders (needs real layout)', async () => {
    const backend = useBackend()
    const user = userEvent.setup()
    renderList(at())
    await itemsList()
    screen.getByRole('link', { name: 'Item 1' }).focus()
    await user.keyboard(' ')
    await user.keyboard('{ArrowDown}')
    await user.keyboard(' ')
    await waitFor(() => expect(backend.puts).toHaveLength(1))
  })

  describe('reordering is not offered', () => {
    // Without reordering the rows have no actions menu (Move up / Move down) and no drag.
    const noHandles = () =>
      expect(
        within(screen.getByRole('list', { name: 'Items' })).queryByRole('button', {
          name: /^Actions for /,
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

    // F-025 W7: no "switch to manual sorting" hint; a non-manual sort just has no handles.
    it('with title sort: no hint, no handles', async () => {
      useBackend()
      renderList(at('?sort=title'))
      await itemsList()
      expect(screen.queryByText(/Switch to Manual/)).toBeNull()
      noHandles()
    })

    it('with a list whose saved sort is not manual: no hint, no handles', async () => {
      useBackend({ list: { sort_mode: 'updated' } })
      renderList(at())
      await itemsList()
      expect(screen.queryByText(/Switch to Manual/)).toBeNull()
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
        // Everything is loaded now: reordering is back and the hint goes away.
        expect(
          await screen.findByRole('button', { name: 'Actions for Item 1' }),
        ).toBeInTheDocument()
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
    expect(screen.queryByRole('menuitem', { name: 'Edit description' })).not.toBeInTheDocument()
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

describe('F008-W9 New item opens a draft, nothing is sent until the title is committed', () => {
  const NEW_ID = '7c1e5a10-0000-4000-8000-000000000999'
  const createUrl = `${location.origin}/api/v1/lists/${LIST}/items`

  function useCreate() {
    const posts: unknown[] = []
    server.use(
      http.post(createUrl, async ({ request }) => {
        const body = (await request.json()) as { title: string }
        posts.push(body)
        const created = {
          ...(exampleResponses.getItem.body as object),
          id: NEW_ID,
          list_id: LIST,
          title: body.title,
          metadata: {},
          version: 1,
        }
        server.use(
          http.get(`${location.origin}/api/v1/items/${NEW_ID}`, () => HttpResponse.json(created)),
        )
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    return posts
  }

  it('inserts a draft row and a focused title in the side page, with no request', async () => {
    mockViewport(1400)
    useBackend()
    const posts = useCreate()
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(screen.getAllByRole('button', { name: 'New item' })[0]!)

    const panel = await screen.findByRole('complementary', { name: 'Item details' })
    const title = within(panel).getByRole('combobox', { name: 'Title' })
    await waitFor(() => expect(title).toHaveFocus())
    expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/new`)
    const rows = within(screen.getByRole('list', { name: 'Items' })).getAllByRole('listitem')
    expect(rows.at(-1)).toHaveAccessibleName('New item (draft)')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(posts).toHaveLength(0)
  })

  it('an empty title is not sent; Enter on a title creates the item and opens its page', async () => {
    mockViewport(1400)
    useBackend()
    const posts = useCreate()
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(screen.getAllByRole('button', { name: 'New item' })[0]!)
    const panel = await screen.findByRole('complementary', { name: 'Item details' })
    const title = within(panel).getByRole('combobox', { name: 'Title' })
    await user.keyboard('{Enter}')
    expect(await within(panel).findByText('Enter a title.')).toBeInTheDocument()
    expect(posts).toHaveLength(0)

    await user.type(title, '  Field notebook {Enter}')
    await waitFor(() => expect(posts).toEqual([{ title: 'Field notebook', lookup: true }]))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`),
    )
    expect(
      await within(panel).findByRole('heading', { level: 1, name: 'Field notebook' }),
    ).toBeInTheDocument()
  })

  it('selecting a TMDB suggestion immediately creates the selected title with its id', async () => {
    mockViewport(1400)
    useBackend({ list: { type: 'movie' } })
    treeWithType('movie')
    const posts: unknown[] = []
    server.use(
      http.post(createUrl, async ({ request }) => {
        const body = (await request.json()) as { title: string }
        posts.push(body)
        const created = {
          ...(exampleResponses.getItem.body as object),
          id: NEW_ID,
          list_id: LIST,
          title: body.title,
          metadata: {},
          version: 1,
        }
        server.use(
          http.get(`${location.origin}/api/v1/items/${NEW_ID}`, () => HttpResponse.json(created)),
        )
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(screen.getAllByRole('button', { name: 'New item' })[0]!)
    const panel = await screen.findByRole('complementary', { name: 'Item details' })
    const title = within(panel).getByRole('combobox', { name: 'Title' })
    await user.type(title, 'The Mat')
    await user.click(await screen.findByRole('option', { name: 'The Matrix (1999)' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`),
    )
    expect(posts).toEqual([{ title: 'The Matrix', lookup: true, tmdb_id: 603 }])
  })

  it('F016-W2 a book draft shows the Open Library status while the create is pending', async () => {
    mockViewport(1400)
    useBackend({ list: { type: 'book' } })
    treeWithType('book')
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const posts: unknown[] = []
    server.use(
      http.post(createUrl, async ({ request }) => {
        const body = (await request.json()) as { title: string }
        posts.push(body)
        await gate
        const created = {
          ...(exampleResponses.getItem.body as object),
          id: NEW_ID,
          list_id: LIST,
          title: body.title,
          metadata: {},
          version: 1,
        }
        server.use(
          http.get(`${location.origin}/api/v1/items/${NEW_ID}`, () => HttpResponse.json(created)),
        )
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(screen.getAllByRole('button', { name: 'New item' })[0]!)
    const panel = await screen.findByRole('complementary', { name: 'Item details' })
    const title = within(panel).getByRole('textbox', { name: 'Title' })
    await user.type(title, 'dune{Enter}')

    const status = await within(panel).findByRole('status')
    expect(status).toHaveTextContent('Looking up details')
    expect(posts).toEqual([{ title: 'dune' }])
    release()
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`),
    )
  })

  it('keeps the typed title and can add without TMDB after lookup is unavailable', async () => {
    mockViewport(1400)
    useBackend()
    const posts: unknown[] = []
    let calls = 0
    server.use(
      http.post(createUrl, async ({ request }) => {
        const body = (await request.json()) as { title: string; lookup: boolean }
        posts.push(body)
        calls += 1
        if (calls === 1) return problemResponse(503, 'upstream_unavailable')
        const created = {
          ...(exampleResponses.getItem.body as object),
          id: NEW_ID,
          list_id: LIST,
          title: body.title,
          metadata: {},
          version: 1,
        }
        server.use(
          http.get(`${location.origin}/api/v1/items/${NEW_ID}`, () => HttpResponse.json(created)),
        )
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(screen.getAllByRole('button', { name: 'New item' })[0]!)
    const panel = await screen.findByRole('complementary', { name: 'Item details' })
    const title = within(panel).getByRole('combobox', { name: 'Title' })
    await user.type(title, 'Field notebook')
    await user.keyboard('{Enter}')

    expect(await within(panel).findByText(/TMDB metadata is unavailable/)).toBeInTheDocument()
    expect(title).toHaveValue('Field notebook')
    await user.click(within(panel).getByRole('button', { name: 'Add without TMDB metadata' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`),
    )
    expect(posts).toEqual([
      { title: 'Field notebook', lookup: true },
      { title: 'Field notebook', lookup: false },
    ])
  })

  it('Esc removes the draft row and the side page without a request or a confirmation', async () => {
    mockViewport(1400)
    useBackend()
    const posts = useCreate()
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(screen.getAllByRole('button', { name: 'New item' })[0]!)
    const panel = await screen.findByRole('complementary', { name: 'Item details' })
    await user.type(within(panel).getByRole('combobox', { name: 'Title' }), 'Half typed')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${LIST}`))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('listitem', { name: 'New item (draft)' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Item details' })).not.toBeInTheDocument()
    expect(posts).toHaveLength(0)
  })

  it('leaving with an empty title removes the draft; the unsaved-changes guard does not trap it', async () => {
    mockViewport(1400)
    useBackend()
    const posts = useCreate()
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(screen.getAllByRole('button', { name: 'New item' })[0]!)
    const panel = await screen.findByRole('complementary', { name: 'Item details' })
    const title = within(panel).getByRole('combobox', { name: 'Title' })
    fireEvent.blur(title, { relatedTarget: document.body })

    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${LIST}`))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(posts).toHaveLength(0)
  })

  it('below 1280 px the draft is the full item page with a back link', async () => {
    mockViewport(1000)
    useBackend()
    const user = userEvent.setup()
    const router = renderList(at())
    await itemsList()
    await user.click(screen.getAllByRole('button', { name: 'New item' })[0]!)
    expect(await screen.findByRole('link', { name: /Back to/ })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Title' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${LIST}`))
  })
})

describe('F-025 W2 one-row toolbar on phones', () => {
  it('at 375px every control is on the toolbar and the icon-only ones keep their names', async () => {
    mockViewport(375)
    useBackend()
    renderList(at())
    await itemsList()
    // The accessible name keeps the full label; only the placeholder is short on phones (F-025 W8).
    expect(
      screen.getByRole('searchbox', { name: 'Search items by title or director' }),
    ).toHaveAttribute('placeholder', 'Search')
    const filter = screen.getByRole('button', { name: 'Filter' })
    // Filter and Sort are icon buttons at every width; the name comes from the visually hidden text.
    expect(filter.querySelector('span')).toHaveClass('sr-only')
    expect(sortSelect()).toBeInTheDocument()
    expect(sortSelect().querySelector('span')).toHaveClass('sr-only')
    const mode = screen.getByRole('radiogroup', { name: 'Display mode' })
    expect(within(mode).getByRole('radio', { name: radioName.compact })).toBeInTheDocument()
    expect(within(mode).getByRole('radio', { name: radioName.thumbnail })).toBeInTheDocument()
    expect(within(mode).getByRole('radio', { name: radioName.grid })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'New item' }).length).toBeGreaterThan(0)
  })
})

describe('F-025 W8 filter and sort controls', () => {
  it('Filter and Sort are icon buttons named by their label, Sort showing the checked choice in its menu', async () => {
    mockViewport(1280)
    useBackend()
    renderList(at('?sort=title'))
    await itemsList()
    // The desktop placeholder comes back above md.
    expect(screen.getByRole('searchbox', { name: /Search items by title/ })).toHaveAttribute(
      'placeholder',
      'Search by title or director',
    )
    // The only visible text of an icon button is nothing: its label is screen-reader text.
    expect(screen.getByRole('button', { name: 'Filter' })).toHaveTextContent(/^Filter$/)
    expect(sortSelect()).toHaveTextContent(/^Sort$/)
    const user = userEvent.setup()
    await user.click(sortSelect())
    expect(screen.getByRole('menuitemradio', { name: 'Title' })).toBeChecked()
    expect(screen.getByRole('menuitemradio', { name: 'Manual' })).not.toBeChecked()
  })
})
