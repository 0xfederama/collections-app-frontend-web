import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../app/router'
import { ToastProvider } from '../components/ui'
import { createTestQueryClient, mockViewport } from '../test-utils'

const WATCHLIST = '7c1e5a10-0000-4000-8000-000000000011'
const ITEM = '7c1e5a10-0000-4000-8000-000000000101'
const PATH = `/lists/${WATCHLIST}/items/${ITEM}?q=mat&sort=title`

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

describe('AT-14 detail panel keeps the list view state', () => {
  it('wide: "Close details" keeps ?q= and ?sort= and the filter keeps its value', async () => {
    mockViewport(1440)
    const user = userEvent.setup()
    const router = renderRouter(PATH)
    await screen.findByRole('complementary', { name: 'Item details' })

    await user.click(await screen.findByRole('button', { name: 'Close details' }))

    expect(router.state.location.pathname).toBe(`/lists/${WATCHLIST}`)
    expect(router.state.location.search).toBe('?q=mat&sort=title')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    const filter = await within(screen.getByRole('main')).findByRole('searchbox', {
      name: 'Filter items by title or director',
    })
    expect(filter).toHaveValue('mat')
  })

  it('F016 wide: Escape closes the item like "Close details", keeping the list state', async () => {
    mockViewport(1440)
    const user = userEvent.setup()
    const router = renderRouter(PATH)
    await screen.findByRole('heading', { level: 1 })

    await user.keyboard('{Escape}')

    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${WATCHLIST}`))
    expect(router.state.location.search).toBe('?q=mat&sort=title')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('F016 narrow: Escape goes back to the list from the full item page', async () => {
    mockViewport(800)
    const user = userEvent.setup()
    const router = renderRouter(PATH)
    await screen.findByRole('heading', { level: 1 })

    await user.keyboard('{Escape}')

    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${WATCHLIST}`))
  })

  it('F016 Escape in a text field or with a menu open does not close the item', async () => {
    mockViewport(1440)
    const user = userEvent.setup()
    const router = renderRouter(PATH)
    await screen.findByRole('heading', { level: 1 })

    // A text entry owns Escape: the filter box in the list beside the panel.
    const filter = await screen.findByRole('searchbox', {
      name: 'Filter items by title or director',
    })
    await user.click(filter)
    await user.keyboard('{Escape}')
    expect(router.state.location.pathname).toContain('/items/')
  })

  it('wide: the list beside the panel already shows the filter value', async () => {
    mockViewport(1440)
    renderRouter(PATH)
    await screen.findByRole('complementary', { name: 'Item details' })
    const filter = await within(screen.getByRole('main')).findByRole('searchbox', {
      name: 'Filter items by title or director',
    })
    expect(filter).toHaveValue('mat')
  })

  it('1100: the item is a full page without a panel, and "Back to Watchlist" keeps the search', async () => {
    mockViewport(1100)
    const user = userEvent.setup()
    const router = renderRouter(PATH)
    const main = screen.getByRole('main')
    expect(await within(main).findByRole('heading', { name: 'The Matrix' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    const back = within(main).getByRole('link', { name: /Back to Watchlist/ })
    expect(back).toHaveAttribute('href', `/lists/${WATCHLIST}?q=mat&sort=title`)

    await user.click(back)
    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${WATCHLIST}`))
    expect(router.state.location.search).toBe('?q=mat&sort=title')
  })
})
