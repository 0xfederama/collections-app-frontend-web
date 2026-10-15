import { QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../../components/ui'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../app/router'
import { exampleResponses } from '../../generated/examples'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { createTestQueryClient, renderAt } from '../../test-utils'
import type { TreeData } from './api'

const treeUrl = `${location.origin}/api/v1/tree`
const MEDIA = '7c1e5a10-0000-4000-8000-000000000001'
const MOVIES = '7c1e5a10-0000-4000-8000-000000000002'
const VEHICLES = '7c1e5a10-0000-4000-8000-000000000003'
const WATCHLIST = '7c1e5a10-0000-4000-8000-000000000011'
const MOTORBIKES = '7c1e5a10-0000-4000-8000-000000000012'
const KEY = 'collection:tree-expanded'

/** Like `renderAt`, but hands back the router so tests can navigate and spy. */
function renderRouter(path: string) {
  const router = createTestRouter([path])
  const utils = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { router, ...utils }
}

const stored = () => JSON.parse(localStorage.getItem(KEY) ?? 'null') as string[] | null
const sidebar = () => screen.getByRole('navigation', { name: 'Library' })
const treeitem = (name: RegExp | string) => within(sidebar()).queryByRole('treeitem', { name })
const mainHeading = (name: string) =>
  within(screen.getByRole('main')).findByRole('heading', { name })

describe('W-04 sidebar tree states', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows a loading status while the tree is fetched', async () => {
    renderAt('/')
    // Home (the page at `/`) shows its own loading status for the same query: look in the sidebar.
    expect(within(sidebar()).getByRole('status')).toHaveTextContent('Loading lists')
    expect(await within(sidebar()).findByRole('tree')).toBeInTheDocument()
    expect(screen.queryByText('Loading lists')).not.toBeInTheDocument()
  })

  it('shows an error with Retry that refetches successfully', async () => {
    let calls = 0
    server.use(
      http.get(treeUrl, () => {
        calls += 1
        return calls === 1
          ? problemResponse(500, 'internal_error')
          : HttpResponse.json(exampleResponses.getTree.body as TreeData)
      }),
    )
    const user = userEvent.setup()
    renderAt('/')
    expect((await screen.findAllByText('Couldn’t load your lists.')).length).toBeGreaterThan(0)
    expect(within(sidebar()).queryByRole('tree')).not.toBeInTheDocument()

    await user.click(within(sidebar()).getByRole('button', { name: 'Retry' }))
    expect(await within(sidebar()).findByRole('treeitem', { name: /Media/ })).toBeInTheDocument()
    expect(screen.queryByText('Couldn’t load your lists.')).not.toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('shows the empty state, without the sidebar New row (F008-W2)', async () => {
    server.use(http.get(treeUrl, () => HttpResponse.json({ folders: [], lists: [] })))
    renderAt('/')
    expect(await screen.findByText('No lists yet')).toBeInTheDocument()
    expect(within(sidebar()).queryByRole('tree')).not.toBeInTheDocument()
    expect(within(sidebar()).queryByRole('button', { name: 'New' })).not.toBeInTheDocument()
  })

  it('shows the New row once a folder or list exists (F008-W2)', async () => {
    renderAt('/')
    await within(sidebar()).findByRole('tree')
    expect(within(sidebar()).getByRole('button', { name: 'New' })).toBeInTheDocument()
  })
})

describe('W-04 sidebar tree behaviour', () => {
  it('shows root folders collapsed, with lists hidden until expanded', async () => {
    renderAt('/')
    const media = await within(sidebar()).findByRole('treeitem', { name: /Media/ })
    expect(media).toHaveAttribute('aria-expanded', 'false')
    expect(treeitem(/Vehicles/)).toHaveAttribute('aria-expanded', 'false')
    expect(treeitem(/Movies/)).not.toBeInTheDocument()
    expect(treeitem(/Motorbikes/)).not.toBeInTheDocument()
  })

  it('expands and collapses a folder by click', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await within(sidebar()).findByRole('treeitem', { name: /Media/ }))
    expect(treeitem(/Media/)).toHaveAttribute('aria-expanded', 'true')
    expect(treeitem(/Movies/)).toBeInTheDocument()

    await user.click(treeitem(/Media/)!)
    expect(treeitem(/Media/)).toHaveAttribute('aria-expanded', 'false')
    expect(treeitem(/Movies/)).not.toBeInTheDocument()
  })

  it('expands and collapses a folder with ArrowRight and ArrowLeft', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const media = await within(sidebar()).findByRole('treeitem', { name: /Media/ })
    media.focus()
    await user.keyboard('{ArrowRight}')
    expect(treeitem(/Media/)).toHaveAttribute('aria-expanded', 'true')
    expect(treeitem(/Movies/)).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(treeitem(/Media/)).toHaveAttribute('aria-expanded', 'false')
    expect(treeitem(/Movies/)).not.toBeInTheDocument()
  })

  it('renders lists as links to /lists/:id with an accessible item count', async () => {
    localStorage.setItem(KEY, JSON.stringify([MEDIA, MOVIES, VEHICLES]))
    renderAt('/')
    const watchlist = await within(sidebar()).findByRole('link', { name: /Watchlist/ })
    expect(watchlist).toHaveAttribute('href', `/lists/${WATCHLIST}`)
    expect(watchlist).toHaveAccessibleName(/Watchlist\s*2\s*items/)
    const motorbikes = within(sidebar()).getByRole('link', { name: /Motorbikes/ })
    expect(motorbikes).toHaveAttribute('href', `/lists/${MOTORBIKES}`)
    expect(motorbikes).toHaveAccessibleName(/Motorbikes\s*1\s*items?/)
  })

  it('navigates to the list when Enter is pressed on a list row', async () => {
    localStorage.setItem(KEY, JSON.stringify([MEDIA, MOVIES]))
    const user = userEvent.setup()
    const { router } = renderRouter('/')
    const row = await within(sidebar()).findByRole('treeitem', { name: /Watchlist/ })
    row.focus()
    await user.keyboard('{Enter}')
    expect(await mainHeading('Watchlist')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/lists/${WATCHLIST}`)
  })

  it('marks the active list aria-selected and no other row', async () => {
    renderAt(`/lists/${WATCHLIST}`)
    const active = await within(sidebar()).findByRole('treeitem', { name: /Watchlist/ })
    expect(active).toHaveAttribute('aria-selected', 'true')
    expect(treeitem(/Movies/)).toHaveAttribute('aria-selected', 'false')
    expect(treeitem(/Media/)).toHaveAttribute('aria-selected', 'false')
  })

  it('navigates exactly once when a list link is clicked', async () => {
    localStorage.setItem(KEY, JSON.stringify([VEHICLES]))
    const user = userEvent.setup()
    const router = createTestRouter(['/'])
    const navigate = vi.spyOn(router, 'navigate')
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>,
    )
    await user.click(await within(sidebar()).findByRole('link', { name: /Motorbikes/ }))
    expect(await mainHeading('Motorbikes')).toBeInTheDocument()
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(router.state.location.pathname).toBe(`/lists/${MOTORBIKES}`)
  })

  it('does not navigate when a folder is clicked', async () => {
    const user = userEvent.setup()
    const { router } = renderRouter('/')
    await user.click(await within(sidebar()).findByRole('treeitem', { name: /Media/ }))
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('W-04 expanded folders', () => {
  afterEach(() => vi.restoreAllMocks())

  it('persists expanded folder ids to collection:tree-expanded', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await within(sidebar()).findByRole('treeitem', { name: /Media/ }))
    await waitFor(() => expect(stored()).toEqual([MEDIA]))
    await user.click(treeitem(/Vehicles/)!)
    await waitFor(() => expect(stored()).toEqual([MEDIA, VEHICLES]))
    await user.click(treeitem(/Media/)!)
    await waitFor(() => expect(stored()).toEqual([VEHICLES]))
  })

  it('restores the expanded folders on reload', async () => {
    localStorage.setItem(KEY, JSON.stringify([MEDIA, MOVIES]))
    renderAt('/')
    expect(await within(sidebar()).findByRole('treeitem', { name: /Watchlist/ })).toBeVisible()
    expect(treeitem(/Media/)).toHaveAttribute('aria-expanded', 'true')
    expect(treeitem(/Movies/)).toHaveAttribute('aria-expanded', 'true')
    expect(treeitem(/Vehicles/)).toHaveAttribute('aria-expanded', 'false')
  })

  it('ignores unknown ids and prunes them on the next write', async () => {
    const stale = '7c1e5a10-0000-4000-8000-0000000000ff'
    localStorage.setItem(KEY, JSON.stringify([MEDIA, stale, 42, null]))
    const user = userEvent.setup()
    renderAt('/')
    expect(await within(sidebar()).findByRole('treeitem', { name: /Movies/ })).toBeInTheDocument()
    await user.click(treeitem(/Vehicles/)!)
    await waitFor(() => expect(stored()).toEqual([MEDIA, VEHICLES]))
  })

  it('does not prune valid ids while the tree is still loading', async () => {
    localStorage.setItem(KEY, JSON.stringify([MEDIA]))
    renderAt('/')
    expect(stored()).toEqual([MEDIA])
    await within(sidebar()).findByRole('tree')
    expect(stored()).toEqual([MEDIA])
  })

  it.each([
    ['not JSON', '{oops'],
    ['a non-array', '{"a":1}'],
    ['a string', '"Media"'],
  ])('tolerates %s in storage and still renders the tree', async (_, raw) => {
    localStorage.setItem(KEY, raw)
    renderAt('/')
    expect(await within(sidebar()).findByRole('treeitem', { name: /Media/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('tolerates localStorage throwing on read and write', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await within(sidebar()).findByRole('treeitem', { name: /Media/ }))
    expect(treeitem(/Movies/)).toBeInTheDocument()
  })

  it('auto-expands the ancestors of the active list on load', async () => {
    renderAt(`/lists/${WATCHLIST}`)
    expect(await within(sidebar()).findByRole('treeitem', { name: /Watchlist/ })).toBeVisible()
    expect(treeitem(/Media/)).toHaveAttribute('aria-expanded', 'true')
    expect(treeitem(/Movies/)).toHaveAttribute('aria-expanded', 'true')
    expect(treeitem(/Vehicles/)).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(stored()).toEqual([MEDIA, MOVIES]))
  })

  it('auto-expands the ancestors again after navigating to another list', async () => {
    const { router } = renderRouter(`/lists/${WATCHLIST}`)
    await within(sidebar()).findByRole('treeitem', { name: /Watchlist/ })
    expect(treeitem(/Vehicles/)).toHaveAttribute('aria-expanded', 'false')

    await router.navigate(`/lists/${MOTORBIKES}`)
    expect(await within(sidebar()).findByRole('treeitem', { name: /Motorbikes/ })).toBeVisible()
    expect(treeitem(/Vehicles/)).toHaveAttribute('aria-expanded', 'true')
    expect(treeitem(/Motorbikes/)).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps a manual collapse of an ancestor until the active list changes', async () => {
    const user = userEvent.setup()
    const { router } = renderRouter(`/lists/${WATCHLIST}`)
    await within(sidebar()).findByRole('treeitem', { name: /Watchlist/ })

    await user.click(treeitem(/Movies/)!)
    expect(treeitem(/Movies/)).toHaveAttribute('aria-expanded', 'false')
    expect(treeitem(/Watchlist/)).not.toBeInTheDocument()
    // Unrelated re-renders (hash change keeps the same list) must not reopen it.
    await router.navigate(`/lists/${WATCHLIST}#top`)
    expect(treeitem(/Movies/)).toHaveAttribute('aria-expanded', 'false')

    await router.navigate(`/lists/${MOTORBIKES}`)
    await within(sidebar()).findByRole('treeitem', { name: /Motorbikes/ })
    expect(treeitem(/Movies/)).toHaveAttribute('aria-expanded', 'false')

    await router.navigate(`/lists/${WATCHLIST}`)
    expect(await within(sidebar()).findByRole('treeitem', { name: /Watchlist/ })).toBeVisible()
    expect(treeitem(/Movies/)).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('F006-W2 sidebar tree keyboard reach', () => {
  it('Tab from the element before the tree reaches a treeitem, and arrows move inside the tree', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await within(sidebar()).findByRole('tree')
    // The element right before the tree in tab order is the workspace link of the sidebar.
    within(sidebar()).getAllByRole('link')[0]!.focus()
    await user.tab()
    const first = document.activeElement as HTMLElement
    expect(first).toHaveAttribute('role', 'treeitem')
    await user.keyboard('{ArrowDown}')
    const second = document.activeElement as HTMLElement
    expect(second).toHaveAttribute('role', 'treeitem')
    expect(second).not.toBe(first)
    expect(second).toHaveAttribute('tabindex', '0')
    expect(first).toHaveAttribute('tabindex', '-1')
  })
})
