import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { exampleResponses } from '../../mocks/fixtures'
import { server } from '../../mocks/server'
import { problemResponse } from '../../mocks/problems'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../app/router'
import { mockViewport, renderWithProviders } from '../../test-utils'
import type { Item } from '../items'
const LIST = '7c1e5a10-0000-4000-8000-000000000011'
const NEW_ID = '7c1e5a10-0000-4000-8000-000000000999'
const origin = location.origin
const matrix = exampleResponses.getItem.body as Item

describe('F002-W4 quick add', () => {
  it('the Quick add button hands focus from the iOS keyboard proxy to the title, every time', async () => {
    mockViewport(1100)
    const user = userEvent.setup()
    const router = createTestRouter([`/lists/${LIST}`])
    renderWithProviders(<RouterProvider router={router} />)

    for (let round = 0; round < 2; round += 1) {
      await user.click(await screen.findByRole('button', { name: 'Quick add' }))
      const dialog = await screen.findByRole('dialog', { name: 'Quick add' })
      const title = within(dialog).getByLabelText(/^Title/)
      await waitFor(() => expect(title).toHaveFocus())
      expect(document.querySelector('[data-keyboard-proxy]')).toBeNull()
      await user.keyboard('{Escape}')
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Quick add' })).not.toBeInTheDocument(),
      )
    }
  })

  it('keeps the typed title and can add without TMDB after lookup is unavailable', async () => {
    mockViewport(1100)
    const posts: unknown[] = []
    let calls = 0
    server.use(
      http.post(`${origin}/api/v1/lists/${LIST}/items`, async ({ request }) => {
        const body = (await request.json()) as { title: string; lookup: boolean }
        posts.push(body)
        calls += 1
        if (calls === 1) return problemResponse(503, 'lookup_disabled')
        const created = { ...matrix, id: NEW_ID, title: body.title, metadata: {}, version: 1 }
        server.use(http.get(`${origin}/api/v1/items/${NEW_ID}`, () => HttpResponse.json(created)))
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    const router = createTestRouter([`/lists/${LIST}`])
    renderWithProviders(<RouterProvider router={router} />)

    await user.keyboard('n')
    const dialog = await screen.findByRole('dialog', { name: 'Quick add' })
    const title = within(dialog).getByLabelText(/^Title/)
    await user.type(title, 'Field notebook{Enter}')
    expect(await within(dialog).findByText(/TMDB metadata is unavailable/)).toBeInTheDocument()
    expect(title).toHaveValue('Field notebook')
    await user.click(within(dialog).getByRole('button', { name: 'Add without TMDB metadata' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`),
    )
    expect(posts).toEqual([
      { title: 'Field notebook', lookup: true },
      { title: 'Field notebook', lookup: false },
    ])
  })

  it('N opens it, is ignored while typing, and Enter adds with only a title and opens the item', async () => {
    mockViewport(1100)
    const posts: unknown[] = []
    server.use(
      http.post(`${origin}/api/v1/lists/${LIST}/items`, async ({ request }) => {
        const body = (await request.json()) as { title: string }
        posts.push(body)
        const created = { ...matrix, id: NEW_ID, title: body.title, metadata: {}, version: 1 }
        server.use(http.get(`${origin}/api/v1/items/${NEW_ID}`, () => HttpResponse.json(created)))
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    const router = createTestRouter([`/lists/${LIST}`])
    renderWithProviders(<RouterProvider router={router} />)

    // Typing an "n" in the sidebar search does not open it.
    const search = await screen.findByRole('combobox', { name: 'Search' })
    await user.click(search)
    await user.keyboard('n')
    expect(screen.queryByRole('dialog', { name: 'Quick add' })).not.toBeInTheDocument()
    search.blur()

    await user.keyboard('n')
    const dialog = await screen.findByRole('dialog', { name: 'Quick add' })
    const title = within(dialog).getByLabelText(/^Title/)
    expect(title).toHaveFocus()
    await user.type(title, '  Field notebook {Enter}')

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`),
    )
    expect(router.state.location.search).toBe('')
    expect(posts).toEqual([{ title: 'Field notebook', lookup: true }])
    expect(screen.queryByRole('dialog', { name: 'Quick add' })).not.toBeInTheDocument()
  })

  it('pointer selection immediately creates the localized TMDB title and sends only the title and lookup', async () => {
    mockViewport(1100)
    const posts: unknown[] = []
    server.use(
      http.post(`${origin}/api/v1/lists/${LIST}/items`, async ({ request }) => {
        const body = (await request.json()) as { title: string; tmdb_id: number }
        posts.push(body)
        const created = { ...matrix, id: NEW_ID, title: body.title, metadata: {}, version: 1 }
        server.use(http.get(`${origin}/api/v1/items/${NEW_ID}`, () => HttpResponse.json(created)))
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    const router = createTestRouter([`/lists/${LIST}`])
    renderWithProviders(<RouterProvider router={router} />)

    await user.keyboard('n')
    const dialog = await screen.findByRole('dialog', { name: 'Quick add' })
    const title = within(dialog).getByLabelText(/^Title/)
    for (const name of ['Website', 'Description', 'Image']) {
      expect(within(dialog).queryByRole('button', { name })).not.toBeInTheDocument()
    }
    await user.type(title, 'The Mat')
    await user.click(await within(dialog).findByRole('option', { name: 'The Matrix (1999)' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`),
    )
    expect(posts).toEqual([{ title: 'The Matrix', lookup: true, tmdb_id: 603 }])
  })
})

describe('F016-W2 quick add on a book list', () => {
  it('Enter creates the book without source_id or an explicit lookup flag, shows the lookup status while pending, then opens it', async () => {
    mockViewport(1100)
    const tree = exampleResponses.getTree.body as Record<string, unknown> & {
      lists: Record<string, unknown>[]
    }
    server.use(
      http.get(`${origin}/api/v1/tree`, () =>
        HttpResponse.json({
          ...tree,
          lists: tree.lists.map((list) => (list.id === LIST ? { ...list, type: 'book' } : list)),
        }),
      ),
    )
    const suggestions: string[] = []
    server.use(
      http.get(`${origin}/api/v1/books/suggestions`, ({ request }) => {
        suggestions.push(request.url)
        return HttpResponse.json({ available: true, results: [] })
      }),
    )
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    const posts: unknown[] = []
    server.use(
      http.post(`${origin}/api/v1/lists/${LIST}/items`, async ({ request }) => {
        const body = (await request.json()) as { title: string }
        posts.push(body)
        await gate
        const created = { ...matrix, id: NEW_ID, title: body.title, metadata: {}, version: 1 }
        server.use(http.get(`${origin}/api/v1/items/${NEW_ID}`, () => HttpResponse.json(created)))
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    const router = createTestRouter([`/lists/${LIST}`])
    renderWithProviders(<RouterProvider router={router} />)

    await user.keyboard('n')
    const dialog = await screen.findByRole('dialog', { name: 'Quick add' })
    expect(within(dialog).queryByRole('combobox', { name: 'Title' })).not.toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'Dune{Enter}')

    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      'Looking up details… this can take a few seconds.',
    )
    expect(within(dialog).getByRole('button', { name: 'Add' })).toBeDisabled()
    release()
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`),
    )
    expect(posts).toEqual([{ title: 'Dune' }])
    expect(suggestions).toEqual([])
  })
})

describe('F-025 W13 quick add on phones', () => {
  function useCreate() {
    server.use(
      http.post(`${origin}/api/v1/lists/${LIST}/items`, async ({ request }) => {
        const body = (await request.json()) as { title: string }
        const created = { ...matrix, id: NEW_ID, title: body.title, metadata: {}, version: 1 }
        server.use(http.get(`${origin}/api/v1/items/${NEW_ID}`, () => HttpResponse.json(created)))
        return HttpResponse.json(created, { status: 201 })
      }),
    )
  }

  it('on a phone the list stays on screen and the toast opens the new item', async () => {
    mockViewport(375)
    useCreate()
    const user = userEvent.setup()
    const router = createTestRouter([`/lists/${LIST}`])
    renderWithProviders(<RouterProvider router={router} />)

    await user.keyboard('n')
    const dialog = await screen.findByRole('dialog', { name: 'Quick add' })
    await user.type(within(dialog).getByLabelText(/^Title/), 'Field notebook{Enter}')

    expect(await screen.findByText('Added “Field notebook”')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Quick add' })).toBeNull())
    expect(router.state.location.pathname).toBe(`/lists/${LIST}`)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`),
    )
  })

  it('on a phone adding from Home stays on Home', async () => {
    mockViewport(375)
    useCreate()
    const user = userEvent.setup()
    const router = createTestRouter(['/'])
    renderWithProviders(<RouterProvider router={router} />)

    await user.keyboard('n')
    const dialog = await screen.findByRole('dialog', { name: 'Quick add' })
    // Opened from Home there is no current list: the first one is chosen once the tree has loaded.
    await waitFor(() =>
      expect(within(dialog).queryByText('Loading lists…')).not.toBeInTheDocument(),
    )
    await user.type(within(dialog).getByLabelText(/^Title/), 'Field notebook{Enter}')

    // The default list is a movie list: Enter takes the first TMDB suggestion, so the title is the fixture's.
    expect(await screen.findByText(/^Added “/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Quick add' })).toBeNull())
    expect(router.state.location.pathname).toBe('/')
  })

  it('at tablet width the item opens directly, with no toast action', async () => {
    mockViewport(1024)
    useCreate()
    const user = userEvent.setup()
    const router = createTestRouter([`/lists/${LIST}`])
    renderWithProviders(<RouterProvider router={router} />)

    await user.keyboard('n')
    const dialog = await screen.findByRole('dialog', { name: 'Quick add' })
    await user.type(within(dialog).getByLabelText(/^Title/), 'Field notebook{Enter}')

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`),
    )
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument()
  })

  it('F-026 W7 duplicate_title shows inline under the title, keeps the draft and the dialog', async () => {
    mockViewport(1100)
    server.use(
      http.post(`${origin}/api/v1/lists/${LIST}/items`, () =>
        problemResponse(409, 'duplicate_title'),
      ),
    )
    const user = userEvent.setup()
    const router = createTestRouter([`/lists/${LIST}`])
    renderWithProviders(<RouterProvider router={router} />)

    await user.keyboard('n')
    const dialog = await screen.findByRole('dialog', { name: 'Quick add' })
    const title = within(dialog).getByLabelText(/^Title/)
    await user.type(title, 'Field notebook{Enter}')

    expect(await within(dialog).findByText(/is already in this list\./)).toBeInTheDocument()
    expect(title).toHaveValue('Field notebook')
    expect(title).toHaveFocus()
    expect(router.state.location.pathname).toBe(`/lists/${LIST}`)
  })
})
