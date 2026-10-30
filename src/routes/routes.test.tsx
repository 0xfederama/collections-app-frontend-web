import { QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../components/ui'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../app/router'
import { exampleResponses } from '../mocks/fixtures'
import { problemResponse } from '../mocks/problems'
import { server } from '../mocks/server'
import type { TreeData } from '../features/tree'
import { createTestQueryClient, mockViewport, renderAt } from '../test-utils'

const treeUrl = `${location.origin}/api/v1/tree`
const WATCHLIST = '7c1e5a10-0000-4000-8000-000000000011'
const ITEM = '7c1e5a10-0000-4000-8000-000000000101'
const UNKNOWN = '7c1e5a10-0000-4000-8000-0000000000ee'

const main = () => screen.getByRole('main')
const heading = (name: string) => within(main()).findByRole('heading', { name })
const breadcrumb = () => screen.queryByRole('navigation', { name: 'Breadcrumb' })

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

describe('W-04 routes render their heading', () => {
  it('/ is Home', async () => {
    renderAt('/')
    expect(await heading('Home')).toBeInTheDocument()
  })

  it('/lists/:listId is the list name', async () => {
    renderAt(`/lists/${WATCHLIST}`)
    expect(await heading('Watchlist')).toBeInTheDocument()
  })

  it('/lists/:listId/items/:itemId is the item page (full page below 1280)', async () => {
    mockViewport(1100)
    renderAt(`/lists/${WATCHLIST}/items/${ITEM}`)
    expect(await heading('The Matrix')).toBeInTheDocument()
    expect(within(main()).getByRole('link', { name: /Back to Watchlist/ })).toBeInTheDocument()
  })

  it('/search?q= is Search and shows the query', async () => {
    renderAt('/search?q=tiger')
    expect(await heading('Search')).toBeInTheDocument()
    expect(await within(main()).findByText(/for “tiger”/)).toBeInTheDocument()
  })

  it('/search without q is still Search', async () => {
    renderAt('/search')
    expect(await heading('Search')).toBeInTheDocument()
  })

  it('/trash is Trash', async () => {
    renderAt('/trash')
    expect(await heading('Trash')).toBeInTheDocument()
  })

  it('/settings is Settings', async () => {
    renderAt('/settings')
    expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })

  it('an unknown path is Page not found', async () => {
    renderAt('/nope')
    expect(await heading('Page not found')).toBeInTheDocument()
  })
})

describe('W-04 unknown list', () => {
  it('shows a loading status, then "List not found" for /lists/<unknown>', async () => {
    renderAt(`/lists/${UNKNOWN}`)
    expect(within(main()).getByRole('status')).toHaveTextContent('Loading list')
    expect(await heading('List not found')).toBeInTheDocument()
    expect(within(main()).getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })

  it('shows "List not found" on the item route of an unknown list', async () => {
    mockViewport(1100)
    renderAt(`/lists/${UNKNOWN}/items/${ITEM}`)
    expect(await heading('List not found')).toBeInTheDocument()
  })

  it('shows "List not found" in the detail panel on wide screens without crashing', async () => {
    mockViewport(1440)
    renderAt(`/lists/${UNKNOWN}/items/${ITEM}`)
    const aside = await screen.findByRole('complementary', { name: 'Item details' })
    expect(await within(aside).findByRole('heading', { name: 'List not found' })).toBeVisible()
    expect(await heading('List not found')).toBeInTheDocument()
  })

  it('does not mark any tree row as selected for an unknown list', async () => {
    renderAt(`/lists/${UNKNOWN}`)
    await screen.findByRole('treeitem', { name: /Media/ })
    for (const row of screen.getAllByRole('treeitem')) {
      expect(row).toHaveAttribute('aria-selected', 'false')
    }
  })

  it('"Back to home" returns to Home', async () => {
    const user = userEvent.setup()
    const router = renderRouter(`/lists/${UNKNOWN}`)
    await user.click(await within(main()).findByRole('link', { name: 'Back to home' }))
    expect(router.state.location.pathname).toBe('/')
    expect(await heading('Home')).toBeInTheDocument()
  })
})

describe('W-04 list route when the tree fails', () => {
  it('shows the error with Retry, and Retry loads the list', async () => {
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
    renderAt(`/lists/${WATCHLIST}`)
    expect(await within(main()).findByText('Couldn’t load this list.')).toBeInTheDocument()
    expect(within(main()).queryByText('List not found')).not.toBeInTheDocument()

    await user.click(within(main()).getByRole('button', { name: 'Retry' }))
    expect(await heading('Watchlist')).toBeInTheDocument()
    expect(within(main()).queryByText('Couldn’t load this list.')).not.toBeInTheDocument()
  })
})

describe('F007-W5 no breadcrumbs', () => {
  it.each([
    ['a list', `/lists/${WATCHLIST}`, 'Watchlist'],
    ['an unknown list', `/lists/${UNKNOWN}`, 'List not found'],
    ['Home', '/', 'Home'],
  ])('is absent on %s', async (_, path, name) => {
    renderAt(path)
    await heading(name)
    expect(breadcrumb()).not.toBeInTheDocument()
  })

  it('is absent on the item route', async () => {
    mockViewport(1100)
    renderAt(`/lists/${WATCHLIST}/items/${ITEM}`)
    await screen.findByRole('treeitem', { name: /Media/ })
    expect(breadcrumb()).not.toBeInTheDocument()
  })
})
