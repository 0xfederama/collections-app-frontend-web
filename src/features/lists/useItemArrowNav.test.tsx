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
import { server } from '../../mocks/server'
import { createTestQueryClient, mockViewport } from '../../test-utils'

type List = components['schemas']['List']
type Item = components['schemas']['Item']

const LIST = '7c1e5a10-0000-4000-8000-000000000011'
const listUrl = `${location.origin}/api/v1/lists/${LIST}`
const baseList = exampleResponses.getList.body as List
const baseItem = exampleResponses.getItem.body as Item

const idOf = (n: number) => `7c1e5a10-0000-4000-8000-${String(n + 500).padStart(12, '0')}`
const TITLES = ['Charlie', 'Alpha', 'Echo', 'Bravo', 'Delta']

function summaries(): ItemSummary[] {
  return TITLES.map((title, i) => ({
    id: idOf(i + 1),
    list_id: LIST,
    title,
    type: 'movie',
    image: null,
    price: null,
    website: null,
    metadata: {},
    content_version: 0,
    sort_order: i + 1,
    version: 1,
    created_at: '2026-10-14T09:30:00Z',
    updated_at: '2026-10-14T09:30:00Z',
    created_by_user_id: null,
    updated_by_user_id: null,
  }))
}

/** Fake list endpoints: `?q=` filters by title, `?sort=title` sorts, else manual order. */
function useBackend() {
  const all = summaries()
  server.use(
    http.get(listUrl, () =>
      HttpResponse.json({ ...baseList, sort_mode: 'manual', item_count: all.length }),
    ),
    http.get(`${listUrl}/items`, ({ request }) => {
      const url = new URL(request.url)
      const q = url.searchParams.get('q')?.toLowerCase()
      let rows = q ? all.filter((i) => i.title.toLowerCase().includes(q)) : [...all]
      if (url.searchParams.get('sort') === 'title') {
        rows = rows.sort((a, b) => a.title.localeCompare(b.title))
      }
      return HttpResponse.json({ data: rows, page: { limit: 50, offset: 0, total: rows.length } })
    }),
    http.get(`${location.origin}/api/v1/items/:id`, ({ params }) => {
      const found = all.find((i) => i.id === params.id)
      return HttpResponse.json({
        ...baseItem,
        ...found,
        metadata: baseItem.metadata,
        list_id: LIST,
      })
    }),
  )
}

function renderAt(path: string) {
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

const itemPath = (n: number, search = '') => `/lists/${LIST}/items/${idOf(n)}${search}`
const panel = () => screen.findByRole('complementary', { name: 'Item details' })
const press = (key: string, init: KeyboardEventInit = {}, target: Element = document.body) =>
  fireEvent.keyDown(target, { key, ...init })

describe('roadmap 40 arrow keys move between items', () => {
  it('ArrowDown and ArrowUp open the next and previous item, stopping at the ends', async () => {
    mockViewport(1400)
    useBackend()
    const router = renderAt(itemPath(1))
    await panel()
    await screen.findByRole('link', { name: 'Echo' })

    press('ArrowUp')
    expect(router.state.location.pathname).toBe(itemPath(1))
    press('ArrowDown')
    await waitFor(() => expect(router.state.location.pathname).toBe(itemPath(2)))
    for (const n of [3, 4, 5]) {
      press('ArrowDown')
      await waitFor(() => expect(router.state.location.pathname).toBe(itemPath(n)))
    }
    press('ArrowDown')
    expect(router.state.location.pathname).toBe(itemPath(5))
    press('ArrowUp')
    await waitFor(() => expect(router.state.location.pathname).toBe(itemPath(4)))
  })

  it('follows the list order under a sort and keeps ?sort= in the URL', async () => {
    mockViewport(1400)
    useBackend()
    const router = renderAt(itemPath(1, '?sort=title'))
    await panel()
    await screen.findByRole('link', { name: 'Alpha' })
    // By title: Alpha, Bravo, Charlie, Delta, Echo. Charlie is third; next is Delta (item 5).
    press('ArrowDown')
    await waitFor(() => expect(router.state.location.pathname).toBe(itemPath(5)))
    expect(router.state.location.search).toBe('?sort=title')
    press('ArrowUp')
    await waitFor(() => expect(router.state.location.pathname).toBe(itemPath(1)))
    press('ArrowUp')
    await waitFor(() => expect(router.state.location.pathname).toBe(itemPath(4)))
  })

  it('walks only the rows an active ?q= filter shows, and announces the position', async () => {
    mockViewport(1400)
    useBackend()
    // "a" matches Charlie, Alpha, Bravo, Delta (not Echo): Alpha is 2 of 4.
    const router = renderAt(itemPath(2, '?q=a'))
    await panel()
    await screen.findByRole('link', { name: 'Bravo' })
    press('ArrowDown')
    await waitFor(() => expect(router.state.location.pathname).toBe(itemPath(4)))
    expect(router.state.location.search).toBe('?q=a')
    expect(screen.getByText('Bravo, 3 of 4')).toHaveAttribute('aria-live', 'polite')
    press('ArrowDown')
    await waitFor(() => expect(router.state.location.pathname).toBe(itemPath(5)))
    press('ArrowDown')
    expect(router.state.location.pathname).toBe(itemPath(5))
  })

  it('marks the open row as current', async () => {
    mockViewport(1400)
    useBackend()
    renderAt(itemPath(3))
    const list = await screen.findByRole('list', { name: 'Items' })
    await waitFor(() =>
      expect(within(list).getByRole('link', { name: 'Echo' })).toHaveAttribute(
        'aria-current',
        'true',
      ),
    )
    expect(within(list).getByRole('link', { name: 'Alpha' })).not.toHaveAttribute('aria-current')
  })

  it('is ignored while typing in an input', async () => {
    mockViewport(1400)
    useBackend()
    const router = renderAt(itemPath(1))
    await panel()
    await screen.findByRole('link', { name: 'Echo' })
    const input = screen.getByRole('searchbox', { name: 'Search items by title or director' })
    press('ArrowDown', {}, input)
    expect(router.state.location.pathname).toBe(itemPath(1))
  })

  it('is ignored with a menu open', async () => {
    mockViewport(1400)
    useBackend()
    const user = userEvent.setup()
    const router = renderAt(itemPath(1))
    await panel()
    await screen.findByRole('link', { name: 'Echo' })
    await user.click(screen.getByRole('button', { name: 'View options' }))
    await screen.findByRole('menu')
    press('ArrowDown')
    expect(router.state.location.pathname).toBe(itemPath(1))
  })

  it('is ignored with a modifier key', async () => {
    mockViewport(1400)
    useBackend()
    const router = renderAt(itemPath(1))
    await panel()
    await screen.findByRole('link', { name: 'Echo' })
    for (const init of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { shiftKey: true },
    ]) {
      press('ArrowDown', init)
    }
    expect(router.state.location.pathname).toBe(itemPath(1))
  })

  it('is ignored below the wide breakpoint', async () => {
    mockViewport(1100)
    useBackend()
    const router = renderAt(itemPath(1))
    await screen.findByRole('link', { name: /Back to/ })
    press('ArrowDown')
    expect(router.state.location.pathname).toBe(itemPath(1))
  })

  it('is ignored when no item is open', async () => {
    mockViewport(1400)
    useBackend()
    const router = renderAt(`/lists/${LIST}`)
    await screen.findByRole('link', { name: 'Echo' })
    press('ArrowDown')
    expect(router.state.location.pathname).toBe(`/lists/${LIST}`)
  })
})
