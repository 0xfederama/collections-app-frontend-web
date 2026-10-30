import { QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../components/ui'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../app/router'
import { problemResponse } from '../mocks/problems'
import { server } from '../mocks/server'
import { createTestQueryClient, mockViewport, renderAt } from '../test-utils'

const MEDIA = '7c1e5a10-0000-4000-8000-000000000001'
const MOVIES = '7c1e5a10-0000-4000-8000-000000000002'
const WATCHLIST = '7c1e5a10-0000-4000-8000-000000000011'
const ITEM = '7c1e5a10-0000-4000-8000-000000000101'
const ITEM_PATH = `/lists/${WATCHLIST}/items/${ITEM}`
const SIDEBAR_KEY = 'collection:sidebar'
const settingsUrl = `${location.origin}/api/v1/settings`

const storedSidebar = () => JSON.parse(localStorage.getItem(SIDEBAR_KEY) ?? 'null')
const nav = () => screen.queryByRole('navigation', { name: 'Library' })
const separator = () => screen.queryByRole('separator', { name: 'Resize sidebar' })

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

describe('AT-14 landmarks per breakpoint', () => {
  it('mobile (375): no top bar, a menu button and main; the navigation lives in the drawer', async () => {
    mockViewport(375)
    renderAt('/')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(nav()).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(separator()).not.toBeInTheDocument()
  })

  it.each([
    ['tablet', 768],
    ['tablet (upper edge)', 1023],
    ['desktop', 1024],
    ['desktop (upper edge)', 1279],
    ['wide', 1440],
  ])('%s (%ipx): navigation and main, no top bar, no aside on the home page', async (_, width) => {
    mockViewport(width)
    renderAt('/')
    expect(nav()).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('wide: the item route adds an aside "Item details" beside the list in main', async () => {
    mockViewport(1280)
    renderAt(ITEM_PATH)
    const aside = await screen.findByRole('complementary', { name: 'Item details' })
    expect(await within(aside).findByRole('heading', { name: 'The Matrix' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(await within(main).findByRole('heading', { name: 'Watchlist' })).toBeInTheDocument()
    expect(within(main).queryByRole('heading', { name: 'The Matrix' })).not.toBeInTheDocument()
  })

  it.each([375, 800, 1100, 1279])(
    'at %ipx the item route is a full page in main and there is no aside',
    async (width) => {
      mockViewport(width)
      renderAt(ITEM_PATH)
      const main = screen.getByRole('main')
      expect(await within(main).findByRole('heading', { name: 'The Matrix' })).toBeInTheDocument()
      expect(within(main).queryByRole('heading', { name: 'Watchlist' })).not.toBeInTheDocument()
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    },
  )

  it('wide: the aside is absent on non-item routes', async () => {
    mockViewport(1440)
    renderAt(`/lists/${WATCHLIST}`)
    expect(
      await within(screen.getByRole('main')).findByRole('heading', { name: 'Watchlist' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('wide: "Close details" returns to the list route and removes the aside', async () => {
    mockViewport(1440)
    const user = userEvent.setup()
    const router = renderRouter(ITEM_PATH)
    await user.click(await screen.findByRole('button', { name: 'Close details' }))
    expect(router.state.location.pathname).toBe(`/lists/${WATCHLIST}`)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('swaps the panel for a full page when the viewport shrinks from wide to narrow', async () => {
    mockViewport(1440)
    renderAt(ITEM_PATH)
    await screen.findByRole('complementary', { name: 'Item details' })

    mockViewport(1100)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(
      await within(screen.getByRole('main')).findByRole('heading', { name: 'The Matrix' }),
    ).toBeInTheDocument()

    mockViewport(1400)
    expect(await screen.findByRole('complementary', { name: 'Item details' })).toBeInTheDocument()
  })

  it('drops the sidebar for the drawer button when the viewport shrinks below 768', async () => {
    mockViewport(1100)
    renderAt('/')
    expect(nav()).toBeInTheDocument()
    mockViewport(700)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
    expect(nav()).not.toBeInTheDocument()
  })
})

describe('AT-14 scroll containment', () => {
  it('keeps the sidebar tree and main scrollable within the viewport frame', async () => {
    mockViewport(1100)
    renderAt('/')

    const sidebarRegion = screen.getByRole('region', { name: 'Sidebar' })
    expect(sidebarRegion).toHaveClass('min-h-0', 'overflow-hidden')

    const sidebar = await within(sidebarRegion).findByRole('navigation', { name: 'Library' })
    const tree = await within(sidebar).findByRole('tree')
    const treeScroller = tree.closest('.overflow-y-auto')
    expect(treeScroller).toHaveClass('min-h-0', 'flex-1')
    expect(treeScroller).not.toContainElement(sidebar.querySelector('.border-t'))
    expect(sidebar.querySelector('.border-t')).toHaveTextContent('Trash')
    expect(sidebar.querySelector('.border-t')).toHaveTextContent('Settings')

    const main = screen.getByRole('main')
    expect(main).toHaveClass('min-h-0', 'overflow-y-auto')
    expect(main.parentElement).toHaveClass('min-h-0', 'overflow-hidden')
  })
})

describe('AT-14 mobile drawer', () => {
  it('opens from "Open menu" with the tree, and the menu button is labelled', async () => {
    mockViewport(375)
    const user = userEvent.setup()
    renderAt('/')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('navigation', { name: 'Library' })).toBeInTheDocument()
    expect(await within(dialog).findByRole('treeitem', { name: /Media/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('combobox', { name: 'Search' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Quick add' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /sidebar$/ })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Trash' })).toHaveAttribute('href', '/trash')
    expect(within(dialog).getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    )
  })

  it('closes with the Close button and with Escape', async () => {
    mockViewport(375)
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(await screen.findByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes after a list is chosen and shows that list', async () => {
    mockViewport(375)
    localStorage.setItem('collection:tree-expanded', JSON.stringify([MEDIA, MOVIES]))
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('link', { name: /Watchlist/ }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(
      await within(screen.getByRole('main')).findByRole('heading', { name: 'Watchlist' }),
    ).toBeInTheDocument()
  })

  it('closes after navigating to Settings', async () => {
    mockViewport(375)
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('link', { name: 'Settings' }))
    // The drawer is gone; the dialog left is the Settings pane.
    expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })

  it('stays closed after navigating and can be opened again', async () => {
    mockViewport(375)
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('link', { name: 'Trash' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('AT-14 sidebar content order', () => {
  it('has the workspace name, then search, then Quick add, then the tree', async () => {
    mockViewport(1100)
    renderAt('/')
    const tree = await within(nav()!).findByRole('tree')
    const name = await within(nav()!).findByRole('link', { name: 'Our Collection' })
    const search = within(nav()!).getByRole('combobox', { name: 'Search' })
    const add = within(nav()!).getByRole('button', { name: 'Quick add' })
    const before = (a: Element, b: Element) =>
      !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(before(name, search)).toBe(true)
    expect(before(search, add)).toBe(true)
    expect(before(add, tree)).toBe(true)
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('the workspace name is larger than 15px type', async () => {
    mockViewport(1100)
    renderAt('/')
    expect(await within(nav()!).findByRole('link', { name: 'Our Collection' })).toHaveClass(
      'font-display',
      'font-bold',
      'truncate',
    )
  })

  it('Quick add in the sidebar opens the dialog', async () => {
    mockViewport(1100)
    const user = userEvent.setup()
    renderAt('/')
    await user.click(within(nav()!).getByRole('button', { name: 'Quick add' }))
    expect(await screen.findByRole('dialog', { name: 'Quick add' })).toBeInTheDocument()
  })
})

describe('AT-14 collapsible sidebar (icon rail)', () => {
  it.each([800, 1100, 1440])(
    'at %ipx starts expanded with a "Collapse sidebar" toggle and the tree',
    async (width) => {
      mockViewport(width)
      renderAt('/')
      const toggle = screen.getByRole('button', { name: 'Collapse sidebar' })
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      expect(await within(nav()!).findByRole('tree')).toBeInTheDocument()
    },
  )

  it.each([800, 1100, 1440])(
    'at %ipx collapses to a rail with the top-level entries only, and expands again',
    async (width) => {
      mockViewport(width)
      const user = userEvent.setup()
      renderAt('/')
      await within(nav()!).findByRole('tree')

      await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
      const expand = screen.getByRole('button', { name: 'Expand sidebar' })
      expect(expand).toHaveAttribute('aria-expanded', 'false')
      expect(within(nav()!).queryByRole('tree')).not.toBeInTheDocument()
      expect(within(nav()!).queryByRole('combobox')).not.toBeInTheDocument()
      expect(separator()).not.toBeInTheDocument()
      expect(await within(nav()!).findByRole('button', { name: 'Media' })).toBeInTheDocument()
      expect(within(nav()!).getByRole('button', { name: 'Vehicles' })).toBeInTheDocument()
      // Sub-folders and lists inside folders are not in the rail.
      expect(within(nav()!).queryByRole('button', { name: 'Movies' })).not.toBeInTheDocument()
      expect(within(nav()!).queryByRole('link', { name: 'Watchlist' })).not.toBeInTheDocument()
      expect(within(nav()!).getByRole('button', { name: 'Search' })).toBeInTheDocument()
      expect(within(nav()!).getByRole('button', { name: 'Quick add' })).toBeInTheDocument()
      expect(within(nav()!).getByRole('link', { name: 'Trash' })).toHaveAttribute('href', '/trash')
      expect(within(nav()!).getByRole('link', { name: 'Settings' })).toHaveAttribute(
        'href',
        '/settings',
      )
      await waitFor(() => expect(storedSidebar().collapsed).toBe(true))

      await user.click(expand)
      expect(await within(nav()!).findByRole('tree')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
      await waitFor(() => expect(storedSidebar().collapsed).toBe(false))
    },
  )

  it('keeps keyboard focus on the toggle when it flips', async () => {
    mockViewport(800)
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveFocus()
  })

  it('restores the collapsed rail from storage on desktop too', async () => {
    mockViewport(1100)
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify({ collapsed: true, width: 280 }))
    renderAt('/')
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    expect(within(nav()!).queryByRole('tree')).not.toBeInTheDocument()
    expect(separator()).not.toBeInTheDocument()
  })

  it('highlights the root folder that contains the open list', async () => {
    mockViewport(1100)
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify({ collapsed: true, width: 280 }))
    renderAt(`/lists/${WATCHLIST}`)
    const media = await within(nav()!).findByRole('button', { name: 'Media' })
    expect(media).toHaveAttribute('aria-current', 'true')
    expect(within(nav()!).getByRole('button', { name: 'Vehicles' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('highlights nothing on Home', async () => {
    mockViewport(1100)
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify({ collapsed: true, width: 280 }))
    renderAt('/')
    expect(await within(nav()!).findByRole('button', { name: 'Media' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('a root folder expands the sidebar with that folder open', async () => {
    mockViewport(1100)
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify({ collapsed: true, width: 280 }))
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await within(nav()!).findByRole('button', { name: 'Vehicles' }))
    expect(await within(nav()!).findByRole('tree')).toBeInTheDocument()
    expect(
      await within(nav()!).findByRole('treeitem', { name: /^Vehicles\s*\d+\s*items?/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
  })

  it('Quick add in the rail opens the dialog', async () => {
    mockViewport(1100)
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify({ collapsed: true, width: 280 }))
    const user = userEvent.setup()
    renderAt('/')
    await user.click(within(nav()!).getByRole('button', { name: 'Quick add' }))
    expect(await screen.findByRole('dialog', { name: 'Quick add' })).toBeInTheDocument()
  })
})

describe('AT-14 desktop sidebar resize', () => {
  it('shows a separator at the 268px default with 220/400 limits', async () => {
    mockViewport(1100)
    renderAt('/')
    const sep = separator()!
    expect(sep).toHaveAttribute('aria-valuenow', '268')
    expect(sep).toHaveAttribute('aria-valuemin', '220')
    expect(sep).toHaveAttribute('aria-valuemax', '400')
    expect(nav()!.parentElement).toHaveStyle({ width: '268px' })
  })

  it('resizes by keyboard, clamps to 220/400 and persists the width', async () => {
    mockViewport(1100)
    const user = userEvent.setup()
    renderAt('/')
    separator()!.focus()

    await user.keyboard('{ArrowRight}')
    expect(separator()).toHaveAttribute('aria-valuenow', '284')
    expect(nav()!.parentElement).toHaveStyle({ width: '284px' })
    await waitFor(() => expect(storedSidebar().width).toBe(284))

    await user.keyboard('{Home}')
    expect(separator()).toHaveAttribute('aria-valuenow', '220')
    await user.keyboard('{ArrowLeft}')
    expect(separator()).toHaveAttribute('aria-valuenow', '220')

    await user.keyboard('{End}')
    expect(separator()).toHaveAttribute('aria-valuenow', '400')
    await user.keyboard('{ArrowRight}')
    expect(separator()).toHaveAttribute('aria-valuenow', '400')
    await waitFor(() => expect(storedSidebar().width).toBe(400))
    expect(separator()).toHaveFocus()
  })

  it('restores the stored width', async () => {
    mockViewport(1100)
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify({ collapsed: false, width: 350 }))
    renderAt('/')
    expect(separator()).toHaveAttribute('aria-valuenow', '350')
  })

  it('restores the width on the wide layout too', async () => {
    mockViewport(1440)
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify({ collapsed: false, width: 240 }))
    renderAt('/')
    expect(separator()).toHaveAttribute('aria-valuenow', '240')
  })

  it.each([
    ['not JSON', 'garbage'],
    ['a non-object', '42'],
    ['null', 'null'],
    ['a non-numeric width', JSON.stringify({ collapsed: false, width: 'wide' })],
    ['a missing width', JSON.stringify({ collapsed: false })],
    ['a NaN-like width', '{"width":null}'],
  ])('falls back to 268 for %s in storage', async (_, raw) => {
    mockViewport(1100)
    localStorage.setItem(SIDEBAR_KEY, raw)
    renderAt('/')
    expect(separator()).toHaveAttribute('aria-valuenow', '268')
  })

  it.each([
    [10, 220],
    [9999, 400],
  ])('clamps a stored out-of-range width %i to %i', async (stored, expected) => {
    mockViewport(1100)
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify({ collapsed: false, width: stored }))
    renderAt('/')
    expect(separator()).toHaveAttribute('aria-valuenow', String(expected))
  })

  it('keeps the width when the viewport crosses to tablet and back', async () => {
    mockViewport(1100)
    const user = userEvent.setup()
    renderAt('/')
    separator()!.focus()
    await user.keyboard('{ArrowRight}')
    mockViewport(800)
    expect(separator()).not.toBeInTheDocument()
    mockViewport(1100)
    expect(separator()).toHaveAttribute('aria-valuenow', '284')
  })
})

describe('W-04 workspace name', () => {
  it('shows the workspace name from /api/v1/settings in the sidebar', async () => {
    mockViewport(1100)
    renderAt('/')
    expect(await within(nav()!).findByRole('link', { name: 'Our Collection' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('falls back to "Collection" while loading and when settings fail', async () => {
    mockViewport(1100)
    server.use(http.get(settingsUrl, () => problemResponse(500, 'internal_error')))
    renderAt('/')
    expect(within(nav()!).getByRole('link', { name: 'Collection' })).toBeInTheDocument()
    await waitFor(() =>
      expect(within(nav()!).getByRole('link', { name: 'Collection' })).toBeVisible(),
    )
    expect(screen.queryByText('Our Collection')).not.toBeInTheDocument()
  })

  it('falls back to "Collection" for a blank workspace name', async () => {
    mockViewport(1100)
    server.use(
      http.get(settingsUrl, () =>
        HttpResponse.json({
          workspace_name: '',
          streaming_country_code: 'IT',
          markdown_history_limit: 20,
          trash_retention_days: null,
          version: 1,
        }),
      ),
    )
    renderAt('/')
    expect(within(nav()!).getByRole('link', { name: 'Collection' })).toBeInTheDocument()
  })

  it('shows the name as the drawer title', async () => {
    mockViewport(375)
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(await screen.findByRole('dialog', { name: 'Our Collection' })).toBeInTheDocument()
  })
})

describe('W-04 shell footer links', () => {
  it('has Trash and Settings links at the bottom of the sidebar, after the tree', async () => {
    mockViewport(1100)
    renderAt('/')
    const tree = await within(nav()!).findByRole('tree')
    const trash = within(nav()!).getByRole('link', { name: 'Trash' })
    const settings = within(nav()!).getByRole('link', { name: 'Settings' })
    expect(trash).toHaveAttribute('href', '/trash')
    expect(settings).toHaveAttribute('href', '/settings')
    expect(tree.compareDocumentPosition(trash) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(trash.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('marks the current footer link with aria-current', async () => {
    mockViewport(1100)
    renderAt('/trash')
    expect(within(nav()!).getByRole('link', { name: 'Trash' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav()!).getByRole('link', { name: 'Settings' })).not.toHaveAttribute(
      'aria-current',
    )
  })
})
