import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { mockViewport, renderAt } from '../../test-utils'
import type { TypeDefinition } from './api'

const typesUrl = `${location.origin}/api/v1/types`
const movie: TypeDefinition = {
  key: 'movie',
  name: 'Movies',
  default_icon: null,
  allows_price: false,
  default_sort_field: 'title',
  default_pinned_fields: [],
  is_locked: true,
  version: 3,
  fields: [
    { key: 'director', label: 'Director', type: 'text', position: 0, is_locked: true, version: 1 },
  ],
}
const boardGame: TypeDefinition = {
  key: 'board_game',
  name: 'Board game',
  default_icon: null,
  allows_price: false,
  default_sort_field: null,
  default_pinned_fields: null,
  is_locked: false,
  version: 2,
  fields: [
    { key: 'rating', label: 'Rating', type: 'number', position: 0, is_locked: false, version: 1 },
  ],
}

async function openPane(types: TypeDefinition[] = [movie, boardGame], lists: object[] = []) {
  mockViewport(375)
  server.use(http.get(typesUrl, () => HttpResponse.json(types)))
  server.use(
    http.get(`${location.origin}/api/v1/tree`, () => HttpResponse.json({ folders: [], lists })),
  )
  const user = userEvent.setup()
  renderAt('/settings')
  await user.click(await screen.findByRole('button', { name: 'Types & fields' }))
  await screen.findByRole('list', { name: 'Types' })
  return user
}

describe('F014-W2 Types & fields pane', () => {
  it('marks built in types and fields read only while allowing an added field', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Movies.*Built in.*locked/ }))
    expect(
      screen.getByText('Built in fields are locked. You can add your own fields to this type.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Director')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete type' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename Director' })).not.toBeInTheDocument()

    let fieldRequest: { ifMatch: string | null; body: unknown } | undefined
    server.use(
      http.post(`${typesUrl}/movie/fields`, async ({ request }) => {
        fieldRequest = { ifMatch: request.headers.get('If-Match'), body: await request.json() }
        return HttpResponse.json(
          {
            key: 'rating',
            label: 'Rating',
            type: 'number',
            position: 1,
            is_locked: false,
            version: 1,
          },
          { status: 201 },
        )
      }),
    )
    await user.type(screen.getByLabelText('New field name'), 'Rating')
    await user.click(screen.getByRole('combobox', { name: 'Field type' }))
    await user.click(await screen.findByRole('option', { name: 'Number' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(fieldRequest).toEqual({ ifMatch: '"k-3"', body: { label: 'Rating', type: 'number' } })
  })

  it('creates custom types with the selected price option and icon value', async () => {
    const user = await openPane()
    let createRequest: { body: Record<string, unknown> } | undefined
    server.use(
      http.post(typesUrl, async ({ request }) => {
        createRequest = { body: (await request.json()) as Record<string, unknown> }
        return HttpResponse.json(
          { ...boardGame, key: 'tabletop', name: 'Tabletop', fields: [] },
          { status: 201 },
        )
      }),
    )
    await user.click(screen.getByRole('button', { name: 'New type' }))
    // F018-W3: the dialog nudges toward a plural name and keeps what is typed.
    expect(screen.getByLabelText('Type name')).toHaveAttribute('placeholder', 'Board games')
    expect(screen.getByText(/Suggest a plural name, like Board games/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Type name'), 'Tabletop')
    await user.click(screen.getByRole('checkbox', { name: 'Allows a price' }))
    await user.click(screen.getByRole('button', { name: 'Choose icon' }))
    const picker = await screen.findByRole('dialog', { name: 'Choose type icon' })
    await user.click(within(picker).getByRole('button', { name: 'gamepad 2' }))
    await user.click(within(picker).getByRole('button', { name: 'Done' }))
    await user.click(screen.getByRole('button', { name: 'Create type' }))
    expect(createRequest?.body).toEqual({
      name: 'Tabletop',
      default_icon: 'i:gamepad-2',
      allows_price: true,
    })
  })

  it('previews populated values before custom field deletion and uses the field snapshot', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Board game/ }))
    let deleteHeader: string | null = null
    server.use(
      http.get(`${typesUrl}/board_game/fields/rating`, () =>
        HttpResponse.json({ populated_item_count: 2 }),
      ),
      http.delete(`${typesUrl}/board_game/fields/rating`, ({ request }) => {
        deleteHeader = request.headers.get('If-Match')
        return HttpResponse.json({ populated_item_count: 2 })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete Rating' }))
    const confirmation = await screen.findByRole('alertdialog', { name: 'Delete Rating?' })
    expect(within(confirmation).getByText(/2 items have a value/)).toBeInTheDocument()
    await user.click(within(confirmation).getByRole('button', { name: 'Delete field' }))
    expect(deleteHeader).toBe('"kf-1"')
  })

  it('updates defaults after fields exist using the type version and only changed values', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Board game/ }))
    let updateRequest: { ifMatch: string | null; body: unknown } | undefined
    server.use(
      http.patch(`${typesUrl}/board_game`, async ({ request }) => {
        updateRequest = {
          ifMatch: request.headers.get('If-Match'),
          body: await request.json(),
        }
        return HttpResponse.json({
          ...boardGame,
          allows_price: true,
          default_sort_field: 'rating',
          default_pinned_fields: ['rating'],
          version: 3,
        })
      }),
    )
    await user.click(screen.getByRole('combobox', { name: 'Default sort field' }))
    await user.click(await screen.findByRole('option', { name: 'Rating' }))
    await user.click(screen.getByRole('checkbox', { name: 'Allow prices for items' }))
    await user.click(screen.getByRole('checkbox', { name: /^Rating/ }))
    await user.click(screen.getByRole('button', { name: 'Save type settings' }))
    expect(updateRequest).toEqual({
      ifMatch: '"k-2"',
      body: {
        allows_price: true,
        default_sort_field: 'rating',
        default_pinned_fields: ['rating'],
      },
    })
  })

  it('renames a custom type with a partial patch and the loaded type version', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Board game/ }))
    let updateRequest: { ifMatch: string | null; body: unknown } | undefined
    server.use(
      http.patch(`${typesUrl}/board_game`, async ({ request }) => {
        updateRequest = {
          ifMatch: request.headers.get('If-Match'),
          body: await request.json(),
        }
        return HttpResponse.json({ ...boardGame, name: 'Tabletop', version: 3 })
      }),
    )
    const nameField = screen.getByLabelText('Rename type')
    await user.clear(nameField)
    await user.type(nameField, 'Tabletop')
    await user.click(screen.getByRole('button', { name: 'Save name' }))
    expect(updateRequest).toEqual({ ifMatch: '"k-2"', body: { name: 'Tabletop' } })
  })

  it('sends null to clear defaults while omitting untouched type properties', async () => {
    const configured: TypeDefinition = {
      ...boardGame,
      default_icon: 'i:gamepad-2',
      default_sort_field: 'rating',
      default_pinned_fields: ['rating'],
    }
    const user = await openPane([movie, configured])
    await user.click(screen.getByRole('button', { name: /Board game/ }))
    let updateRequest: { ifMatch: string | null; body: unknown } | undefined
    server.use(
      http.patch(`${typesUrl}/board_game`, async ({ request }) => {
        updateRequest = {
          ifMatch: request.headers.get('If-Match'),
          body: await request.json(),
        }
        return HttpResponse.json({
          ...configured,
          default_icon: null,
          default_sort_field: null,
          default_pinned_fields: null,
          version: 3,
        })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Clear type icon' }))
    await user.click(screen.getByRole('combobox', { name: 'Default sort field' }))
    await user.click(await screen.findByRole('option', { name: 'None' }))
    await user.click(screen.getByRole('button', { name: 'Reset pins' }))
    await user.click(screen.getByRole('button', { name: 'Save type settings' }))
    expect(updateRequest).toEqual({
      ifMatch: '"k-2"',
      body: { default_icon: null, default_sort_field: null, default_pinned_fields: null },
    })
  })

  it('offers an explicit target type for active lists before deleting the definition', async () => {
    const list = {
      id: 'list-1',
      folder_id: null,
      name: 'Weekend games',
      type: 'board_game',
      description: null,
      display_mode: 'compact',
      sort_mode: 'manual',
      pinned_fields: null,
      icon: null,
      icon_color: null,
      sort_order: 0,
      item_count: 4,
      version: 7,
      created_at: '2026-10-14T09:30:00Z',
      updated_at: '2026-10-14T09:30:00Z',
    }
    let listType = 'board_game'
    let listPatch: { ifMatch: string | null; body: unknown } | undefined
    let typeDeleted = false
    const user = await openPane([movie, boardGame], [list])
    await user.click(screen.getByRole('button', { name: /Board game/ }))
    server.use(
      http.patch(`${location.origin}/api/v1/lists/list-1`, async ({ request }) => {
        listPatch = { ifMatch: request.headers.get('If-Match'), body: await request.json() }
        listType = 'movie'
        Object.assign(list, { type: listType })
        return HttpResponse.json({ ...list, type: listType, version: 8 })
      }),
      http.delete(`${typesUrl}/board_game`, () => {
        typeDeleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete type' }))
    const deleteDialog = await screen.findByRole('alertdialog', { name: 'Delete Board game?' })
    expect(
      within(deleteDialog).getByText(/1 active list uses this type: Weekend games/),
    ).toBeInTheDocument()
    await user.click(within(deleteDialog).getByRole('button', { name: 'Choose target type' }))
    const changeDialog = await screen.findByRole('alertdialog', {
      name: 'Change lists from Board game?',
    })
    expect(
      within(changeDialog).getByText(/permanently clears the old type's custom fields and price/),
    ).toBeInTheDocument()
    await user.click(within(changeDialog).getByRole('combobox', { name: 'Change listed lists to' }))
    await user.click(await screen.findByRole('option', { name: 'Movies' }))
    await user.click(within(changeDialog).getByRole('button', { name: 'Change listed types' }))
    await waitFor(() => expect(listPatch).toEqual({ ifMatch: '"l-7"', body: { type: 'movie' } }))
    expect(typeDeleted).toBe(false)
    const finalDialog = await screen.findByRole('alertdialog', { name: 'Delete Board game?' })
    expect(within(finalDialog).getByText(/No active lists use this type/)).toBeInTheDocument()
    await user.click(within(finalDialog).getByRole('button', { name: 'Delete type' }))
    await waitFor(() => expect(typeDeleted).toBe(true))
  })

  it('offers "No type" as a target when deleting a type, and sends type null', async () => {
    const list = {
      id: 'list-1',
      folder_id: null,
      name: 'Weekend games',
      type: 'board_game',
      description: null,
      display_mode: 'compact',
      sort_mode: 'manual',
      pinned_fields: null,
      icon: null,
      icon_color: null,
      sort_order: 0,
      item_count: 4,
      version: 7,
      created_at: '2026-10-14T09:30:00Z',
      updated_at: '2026-10-14T09:30:00Z',
    }
    let listPatch: { ifMatch: string | null; body: unknown } | undefined
    const user = await openPane([movie, boardGame], [list])
    await user.click(screen.getByRole('button', { name: /Board game/ }))
    server.use(
      http.patch(`${location.origin}/api/v1/lists/list-1`, async ({ request }) => {
        listPatch = { ifMatch: request.headers.get('If-Match'), body: await request.json() }
        return HttpResponse.json({ ...list, type: null, version: 8 })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete type' }))
    const deleteDialog = await screen.findByRole('alertdialog', { name: 'Delete Board game?' })
    await user.click(within(deleteDialog).getByRole('button', { name: 'Choose target type' }))
    const changeDialog = await screen.findByRole('alertdialog', {
      name: 'Change lists from Board game?',
    })
    await user.click(within(changeDialog).getByRole('combobox', { name: 'Change listed lists to' }))
    await user.click(await screen.findByRole('option', { name: 'No type' }))
    await user.click(within(changeDialog).getByRole('button', { name: 'Change listed types' }))
    await waitFor(() => expect(listPatch).toEqual({ ifMatch: '"l-7"', body: { type: null } }))
  })
})
