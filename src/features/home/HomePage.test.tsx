import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { exampleResponses } from '../../mocks/fixtures'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { mockViewport, renderAt } from '../../test-utils'
import type { TreeData } from '../tree'

const WATCHLIST = '7c1e5a10-0000-4000-8000-000000000011'
const MOTORBIKES = '7c1e5a10-0000-4000-8000-000000000012'
const MATRIX = '7c1e5a10-0000-4000-8000-000000000101'

const treeUrl = `${location.origin}/api/v1/tree`
const recentUrl = `${location.origin}/api/v1/recent-items`
const tree = exampleResponses.getTree.body as { folders: unknown[]; lists: unknown[] }
const recent = exampleResponses.listRecentItems.body as { data: unknown[] }

async function openHome() {
  mockViewport(1280)
  const user = userEvent.setup()
  renderAt('/')
  await screen.findByRole('heading', { level: 1, name: 'Home' }, { timeout: 5000 })
  return user
}

/** The fixture tree with the top-level Media folder shared (F-027). The fixture itself is unshared. */
function sharedMediaTree(): TreeData {
  const tree = structuredClone(exampleResponses.getTree.body) as TreeData
  tree.folders.find((f) => f.name === 'Media')!.shared = true
  return tree
}

const quickLinks = () => screen.findByRole('list', { name: 'Your lists' })

describe('W-13 home: quick links', () => {
  it('links every list to /lists/:id, most recently updated first', async () => {
    await openHome()
    const links = within(await quickLinks()).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      `/lists/${MOTORBIKES}`, // updated 09:40
      `/lists/${WATCHLIST}`, // updated 09:30
    ])
    expect(links[0]).toHaveTextContent('in Vehicles')
    expect(links[0]).toHaveTextContent('Vehicles')
    expect(links[0]).toHaveTextContent('1 item')
    expect(links[1]).toHaveTextContent('Watchlist')
    expect(links[1]).toHaveTextContent('Media › Movies')
    expect(links[1]).toHaveTextContent('2 items')
  })

  it('clicking a quick link opens the list', async () => {
    const user = await openHome()
    await user.click(within(await quickLinks()).getByRole('link', { name: /Watchlist/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Watchlist' })).toBeInTheDocument()
  })

  it('shows a skeleton while the tree loads', async () => {
    server.use(http.get(treeUrl, () => new Promise<Response>(() => {})))
    mockViewport(1280)
    renderAt('/')
    expect(
      (await screen.findAllByText('Loading lists', {}, { timeout: 5000 })).length,
    ).toBeGreaterThan(0)
  })

  it('shows an error with Retry when the tree fails, and recovers', async () => {
    let fail = true
    server.use(http.get(treeUrl, () => (fail ? problemResponse(500, 'internal') : undefined)))
    const user = await openHome()
    const main = screen.getByRole('main')
    expect(await within(main).findByText('Couldn’t load your lists.')).toBeInTheDocument()
    fail = false
    await user.click(within(main).getByRole('button', { name: 'Retry' }))
    expect(await quickLinks()).toBeInTheDocument()
  })
})

describe('W-13 home: empty workspace', () => {
  const emptyTree = () =>
    server.use(http.get(treeUrl, () => HttpResponse.json({ ...tree, folders: [], lists: [] })))

  it('offers to create the first list instead of the sections', async () => {
    emptyTree()
    await openHome()
    const main = screen.getByRole('main')
    expect(await within(main).findByText('Create your first list')).toBeInTheDocument()
    expect(within(main).getByRole('button', { name: 'New list' })).toBeInTheDocument()
    expect(within(main).getByRole('button', { name: 'New folder' })).toBeInTheDocument()
    expect(within(main).queryByText('Your lists')).not.toBeInTheDocument()
    expect(within(main).queryByText('Recently updated')).not.toBeInTheDocument()
  })

  it('New list opens the create dialog', async () => {
    emptyTree()
    const user = await openHome()
    const main = screen.getByRole('main')
    await user.click(await within(main).findByRole('button', { name: 'New list' }))
    const dialog = await screen.findByRole('dialog', { name: 'New list' })
    expect(within(dialog).getByLabelText(/^Name/)).toBeInTheDocument()
    expect(dialog).toHaveTextContent('top level')
  })

  it('New folder opens the create dialog', async () => {
    emptyTree()
    const user = await openHome()
    const main = screen.getByRole('main')
    await user.click(await within(main).findByRole('button', { name: 'New folder' }))
    expect(await screen.findByRole('dialog', { name: 'New folder' })).toBeInTheDocument()
  })

  it('with folders but no lists, still asks for a list', async () => {
    server.use(http.get(treeUrl, () => HttpResponse.json({ ...tree, lists: [] })))
    await openHome()
    const main = screen.getByRole('main')
    expect(await within(main).findByText('Create your first list')).toBeInTheDocument()
    expect(within(main).getByText(/folders have no lists yet/i)).toBeInTheDocument()
  })
})

describe('F-025 phone home: Quick add sits below the search field', () => {
  it('orders the title, the search field, then Quick add', async () => {
    mockViewport(390)
    renderAt('/')
    const main = screen.getByRole('main')
    const title = await within(main).findByRole('heading', { level: 1 })
    const search = within(main).getByRole('searchbox', { name: /^Search$/ })
    const quick = within(main).getByRole('button', { name: 'Quick add' })
    const following = Node.DOCUMENT_POSITION_FOLLOWING
    expect(title.compareDocumentPosition(search) & following).toBeTruthy()
    expect(search.compareDocumentPosition(quick) & following).toBeTruthy()
  })
})

describe('F-027 W2 phone home title', () => {
  it('shows "Collections" as the title', async () => {
    mockViewport(390)
    renderAt('/')
    const main = screen.getByRole('main')
    expect(await within(main).findByRole('heading', { level: 1 })).toHaveTextContent('Collections')
  })
})

describe('W-13 home: recently updated', () => {
  it('rows link to /lists/{list_id}/items/{id}', async () => {
    await openHome()
    const list = await screen.findByRole('list', { name: 'Recently updated items' })
    const link = within(list).getByRole('link', { name: /The Matrix/ })
    expect(link).toHaveAttribute('href', `/lists/${WATCHLIST}/items/${MATRIX}`)
    expect(link).toHaveTextContent('Media › Movies › Watchlist')
  })

  it('requests the default limit of 12', async () => {
    const limits: (string | null)[] = []
    server.use(
      http.get(recentUrl, ({ request }) => {
        limits.push(new URL(request.url).searchParams.get('limit'))
        return HttpResponse.json(recent)
      }),
    )
    await openHome()
    await screen.findByRole('list', { name: 'Recently updated items' })
    expect(limits).toEqual(['12'])
  })

  it('shows a skeleton while loading', async () => {
    server.use(http.get(recentUrl, () => new Promise<Response>(() => {})))
    await openHome()
    expect(await screen.findByText('Loading recent items')).toBeInTheDocument()
  })

  it('shows an empty state without items', async () => {
    server.use(http.get(recentUrl, () => HttpResponse.json({ data: [] })))
    await openHome()
    expect(await screen.findByText('No items yet')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Recently updated items' })).not.toBeInTheDocument()
  })

  it('shows an error with Retry and recovers; quick links stay usable', async () => {
    let fail = true
    server.use(http.get(recentUrl, () => (fail ? problemResponse(500, 'internal') : undefined)))
    const user = await openHome()
    expect(await screen.findByText('Couldn’t load recent items.')).toBeInTheDocument()
    expect(await quickLinks()).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('list', { name: 'Recently updated items' })).toBeInTheDocument()
  })
})

describe('F-027 shared badge on home', () => {
  it('badges a list inside a shared folder, not a list in an unshared folder', async () => {
    server.use(http.get(treeUrl, () => HttpResponse.json(sharedMediaTree())))
    await openHome()
    const links = within(await quickLinks()).getAllByRole('link')
    const [motorbikes, watchlist] = [links[0]!, links[1]!]
    expect(motorbikes).toHaveAttribute('href', `/lists/${MOTORBIKES}`)
    expect(watchlist).toHaveAttribute('href', `/lists/${WATCHLIST}`)
    expect(within(watchlist).getByTestId('shared-badge')).toBeInTheDocument()
    expect(watchlist).toHaveAccessibleName(/Watchlist, shared/)
    expect(within(motorbikes).queryByTestId('shared-badge')).not.toBeInTheDocument()
    expect(motorbikes).not.toHaveAccessibleName(/shared/)
  })
})
