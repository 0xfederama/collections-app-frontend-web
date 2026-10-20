import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { problemResponse } from '../../mocks/problems'
import { mockViewport, renderAt } from '../../test-utils'
import type { TypeDefinition } from './api'
import { boardGame, movie, openPane, treeUrl, typesUrl } from './typesTestKit'

// Characterization tests (F020): they pin what TypesFieldsPane does today so the split into smaller
// files can be verified. Fixtures and openPane come from typesTestKit.ts.

const listsUrl = `${location.origin}/api/v1/lists`
function listFixture(id: string, name: string, version: number) {
  return {
    id,
    folder_id: null,
    name,
    type: 'board_game' as string | null,
    description: null,
    display_mode: 'compact',
    sort_mode: 'manual',
    pinned_fields: null,
    icon: null,
    icon_color: null,
    sort_order: 0,
    item_count: 4,
    version,
    created_at: '2026-10-14T09:30:00Z',
    updated_at: '2026-10-14T09:30:00Z',
  }
}

describe('F020 characterization: Types & fields pane', () => {
  it('F020 shows the loading status until the types request resolves', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    mockViewport(375)
    server.use(
      http.get(typesUrl, async () => {
        await gate
        return HttpResponse.json([movie, boardGame])
      }),
      http.get(treeUrl, () => HttpResponse.json({ folders: [], lists: [] })),
    )
    const user = userEvent.setup()
    renderAt('/settings')
    await user.click(await screen.findByRole('button', { name: 'Types & fields' }))

    const loading = await screen.findByText('Loading types')
    expect(loading.closest('[role="status"]')).not.toBeNull()
    expect(screen.queryByRole('list', { name: 'Types' })).not.toBeInTheDocument()

    release()
    await screen.findByRole('list', { name: 'Types' })
    expect(screen.queryByText('Loading types')).not.toBeInTheDocument()
  })

  it('F020 shows the load error with Retry, which refetches and then lists the types', async () => {
    let failing = true
    let requestsWhileFailing = 0
    mockViewport(375)
    server.use(
      http.get(typesUrl, () => {
        if (failing) {
          requestsWhileFailing += 1
          return problemResponse(500, 'internal_error')
        }
        return HttpResponse.json([movie, boardGame])
      }),
      http.get(treeUrl, () => HttpResponse.json({ folders: [], lists: [] })),
    )
    const user = userEvent.setup()
    renderAt('/settings')
    await user.click(await screen.findByRole('button', { name: 'Types & fields' }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Couldn’t load types and fields.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Types' })).not.toBeInTheDocument()

    // The error is shown only after failing requests; Retry must send a new one that succeeds.
    expect(requestsWhileFailing).toBeGreaterThanOrEqual(1)
    const failedBeforeRetry = requestsWhileFailing
    failing = false
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    await screen.findByRole('list', { name: 'Types' })
    expect(requestsWhileFailing).toBe(failedBeforeRetry)
    expect(screen.getByRole('list', { name: 'Types' })).toBeInTheDocument()
    expect(screen.queryByText('Couldn’t load types and fields.')).not.toBeInTheDocument()
  })

  it('F020 shows the conflict banner when type defaults are saved against a stale version, and Reload latest resets the draft', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Board game/ }))
    await user.click(screen.getByRole('combobox', { name: 'Default sort field' }))
    await user.click(await screen.findByRole('option', { name: 'Rating' }))

    let ifMatch: string | null = null
    server.use(
      http.patch(`${typesUrl}/board_game`, ({ request }) => {
        ifMatch = request.headers.get('If-Match')
        return problemResponse(412, 'version_conflict', { current_version: 3 })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Save type settings' }))

    expect(ifMatch).toBe('"k-2"')
    const banner = await screen.findByText(
      'This definition changed while you were editing. Reload the latest version and try again.',
    )
    const alert = banner.closest('[role="alert"]') as HTMLElement
    expect(within(alert).getByRole('button', { name: 'Reload latest' })).toBeInTheDocument()
    expect(within(alert).queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Default sort field' })).toHaveTextContent('Rating')

    // The server now has allows_price on and no sort field; Reload latest must show that.
    const latestBoardGame: TypeDefinition = {
      ...boardGame,
      allows_price: true,
      default_sort_field: null,
      version: 3,
    }
    let typesRequests = 0
    server.use(
      http.get(typesUrl, () => {
        typesRequests += 1
        return HttpResponse.json([movie, latestBoardGame])
      }),
    )
    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))

    await waitFor(() =>
      expect(
        screen.queryByText(/This definition changed while you were editing/),
      ).not.toBeInTheDocument(),
    )
    expect(typesRequests).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('combobox', { name: 'Default sort field' })).toHaveTextContent('None')
    expect(screen.getByRole('checkbox', { name: 'Allow prices for items' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Save type settings' })).toBeDisabled()
  })

  it('F020 keeps the New type dialog open with the server message when creating fails', async () => {
    const user = await openPane()
    let createCalls = 0
    server.use(
      http.post(typesUrl, () => {
        createCalls += 1
        return problemResponse(422, 'validation_failed', {
          errors: [{ field: 'name', message: 'A type with this name already exists.' }],
        })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'New type' }))
    await user.type(screen.getByLabelText('Type name'), 'Movies')
    await user.click(screen.getByRole('button', { name: 'Create type' }))

    expect(await screen.findByText('A type with this name already exists.')).toBeInTheDocument()
    expect(createCalls).toBe(1)
    expect(screen.getByRole('dialog', { name: 'New type' })).toBeInTheDocument()
    expect(screen.getByLabelText('Type name')).toHaveValue('Movies')
  })

  it('F020 closes the New type dialog and selects the created type after a successful create', async () => {
    const user = await openPane()
    const created: TypeDefinition = {
      ...boardGame,
      key: 'tabletop',
      name: 'Tabletop',
      default_sort_field: null,
      default_pinned_fields: null,
      fields: [],
      version: 1,
    }
    let types: TypeDefinition[] = [movie, boardGame]
    let createBody: unknown
    server.use(
      http.get(typesUrl, () => HttpResponse.json(types)),
      http.post(typesUrl, async ({ request }) => {
        createBody = await request.json()
        types = [...types, created]
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'New type' }))
    await user.type(screen.getByLabelText('Type name'), 'Tabletop')
    await user.click(screen.getByRole('button', { name: 'Create type' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'New type' })).not.toBeInTheDocument(),
    )
    expect(createBody).toEqual({ name: 'Tabletop', allows_price: false })
    const row = await screen.findByRole('button', { name: /Tabletop/ })
    expect(row).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('heading', { level: 3, name: 'Tabletop' })).toBeInTheDocument()
    expect(screen.getByLabelText('Rename type')).toHaveValue('Tabletop')
    expect(screen.getByText('No fields yet. Add a field above.')).toBeInTheDocument()
  })

  it('F020 cancelling the change-lists dialog sends no list or type request', async () => {
    const lists = [
      listFixture('list-1', 'Weekend games', 7),
      listFixture('list-2', 'Game nights', 9),
    ]
    const user = await openPane([movie, boardGame], lists)
    await user.click(screen.getByRole('button', { name: /Board game/ }))
    let listPatches = 0
    let typeDeletes = 0
    server.use(
      http.patch(`${listsUrl}/:id`, () => {
        listPatches += 1
        return HttpResponse.json({})
      }),
      http.delete(`${typesUrl}/board_game`, () => {
        typeDeletes += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Delete type' }))
    const deleteDialog = await screen.findByRole('alertdialog', { name: 'Delete Board game?' })
    expect(
      within(deleteDialog).getByText(
        '2 active lists use this type: Weekend games, Game nights. Change them to another type before deleting this definition.',
      ),
    ).toBeInTheDocument()
    await user.click(within(deleteDialog).getByRole('button', { name: 'Choose target type' }))

    const changeDialog = await screen.findByRole('alertdialog', {
      name: 'Change lists from Board game?',
    })
    expect(within(changeDialog).getByText('Lists: Weekend games, Game nights')).toBeInTheDocument()
    expect(
      within(changeDialog).getByRole('combobox', { name: 'Change listed lists to' }),
    ).toHaveTextContent('Movies')
    await user.click(within(changeDialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('alertdialog', { name: 'Change lists from Board game?' }),
      ).not.toBeInTheDocument(),
    )
    expect(
      screen.queryByRole('alertdialog', { name: 'Delete Board game?' }),
    ).not.toBeInTheDocument()
    expect(listPatches).toBe(0)
    expect(typeDeletes).toBe(0)
    expect(lists.map((list) => list.type)).toEqual(['board_game', 'board_game'])
  })

  it('F020 confirming the change-lists dialog patches each list with its own version and then asks to delete the type', async () => {
    const lists = [
      listFixture('list-1', 'Weekend games', 7),
      listFixture('list-2', 'Game nights', 9),
    ]
    const user = await openPane([movie, boardGame], lists)
    await user.click(screen.getByRole('button', { name: /Board game/ }))
    const patches: Array<{ id: string; ifMatch: string | null; body: unknown }> = []
    server.use(
      http.patch(`${listsUrl}/:id`, async ({ request, params }) => {
        patches.push({
          id: String(params.id),
          ifMatch: request.headers.get('If-Match'),
          body: await request.json(),
        })
        const list = lists.find((entry) => entry.id === params.id)
        if (!list) return problemResponse(404, 'not_found')
        // Mutate the fixture so the tree refetch reports the new type, as the server would.
        list.type = 'movie'
        list.version += 1
        return HttpResponse.json(list)
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Delete type' }))
    const deleteDialog = await screen.findByRole('alertdialog', { name: 'Delete Board game?' })
    await user.click(within(deleteDialog).getByRole('button', { name: 'Choose target type' }))
    const changeDialog = await screen.findByRole('alertdialog', {
      name: 'Change lists from Board game?',
    })
    await user.click(within(changeDialog).getByRole('button', { name: 'Change listed types' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('alertdialog', { name: 'Change lists from Board game?' }),
      ).not.toBeInTheDocument(),
    )
    expect(patches).toEqual([
      { id: 'list-1', ifMatch: '"l-7"', body: { type: 'movie' } },
      { id: 'list-2', ifMatch: '"l-9"', body: { type: 'movie' } },
    ])
    const finalDialog = await screen.findByRole('alertdialog', { name: 'Delete Board game?' })
    expect(within(finalDialog).getByText(/No active lists use this type/)).toBeInTheDocument()
  })

  it('F020 deleting a custom field with no values confirms with the empty copy and sends the field version', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Board game/ }))
    let deleteHeader: string | null = null
    let deleteCalls = 0
    server.use(
      http.get(`${typesUrl}/board_game/fields/rating`, () =>
        HttpResponse.json({ populated_item_count: 0 }),
      ),
      http.delete(`${typesUrl}/board_game/fields/rating`, ({ request }) => {
        deleteCalls += 1
        deleteHeader = request.headers.get('If-Match')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete Rating' }))
    const confirmation = await screen.findByRole('alertdialog', { name: 'Delete Rating?' })
    expect(
      within(confirmation).getByText('No items have a value for this field.'),
    ).toBeInTheDocument()
    await user.click(within(confirmation).getByRole('button', { name: 'Delete field' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog', { name: 'Delete Rating?' })).not.toBeInTheDocument(),
    )
    expect(deleteCalls).toBe(1)
    expect(deleteHeader).toBe('"kf-1"')
  })

  it('F020 cancelling the field delete confirmation keeps the field and sends no DELETE', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Board game/ }))
    let deleteCalls = 0
    server.use(
      http.get(`${typesUrl}/board_game/fields/rating`, () =>
        HttpResponse.json({ populated_item_count: 1 }),
      ),
      http.delete(`${typesUrl}/board_game/fields/rating`, () => {
        deleteCalls += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete Rating' }))
    const confirmation = await screen.findByRole('alertdialog', { name: 'Delete Rating?' })
    expect(within(confirmation).getByText(/1 item has a value/)).toBeInTheDocument()
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog', { name: 'Delete Rating?' })).not.toBeInTheDocument(),
    )
    expect(deleteCalls).toBe(0)
    expect(screen.getByRole('listitem', { name: /Rating, number/ })).toBeInTheDocument()
  })

  it('F020 exposes each type as a listitem button in the Types list, with the selected one aria-current', async () => {
    const user = await openPane([movie, boardGame])
    const typeList = screen.getByRole('list', { name: 'Types' })
    const rows = within(typeList).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    const [movieRow, boardRow] = rows as [HTMLElement, HTMLElement]

    const moviesButton = within(movieRow).getByRole('button', { name: /Movies/ })
    const boardButton = within(boardRow).getByRole('button', { name: /Board game/ })
    // The first type is selected until the user picks one.
    expect(moviesButton).toHaveAttribute('aria-current', 'true')
    expect(boardButton).not.toHaveAttribute('aria-current')

    boardButton.focus()
    expect(boardButton).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(boardButton).toHaveAttribute('aria-current', 'true')
    expect(moviesButton).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('heading', { level: 3, name: 'Board game' })).toBeInTheDocument()
  })
})
