import { screen, waitFor, within } from '@testing-library/react'
import { countsText } from '../trash/model'
import { http } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import {
  apiUrl,
  ID,
  openTree,
  pickHeaderAction,
  pickRowAction,
  rowNames,
  seedTree,
  sidebar,
} from './treeTestKit'

const dialog = () => screen.findByRole('dialog')
const treeRow = (name: RegExp) => within(sidebar()).findByRole('treeitem', { name })

describe('AT-03 tree CRUD (web): create', () => {
  it('creates a root folder from the header "+" menu and shows it in the tree', async () => {
    const { user, backend } = await openTree()
    await pickHeaderAction(user, 'New folder')

    const dlg = await dialog()
    expect(within(dlg).getByText('It will be created at the top level.')).toBeInTheDocument()
    await user.type(within(dlg).getByRole('textbox', { name: 'Name' }), 'Books')
    await user.click(within(dlg).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await treeRow(/^Books/)).toBeInTheDocument()
    expect(backend.writes('POST', '/api/v1/folders')[0]?.body).toEqual({
      name: 'Books',
      parent_folder_id: null,
    })
    expect(await screen.findByText('Folder “Books” created')).toBeInTheDocument()
  })

  it('creates a root list from the header menu with folder_id null and opens it', async () => {
    const { user, backend, router } = await openTree()
    await pickHeaderAction(user, 'New list')
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Games')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(backend.writes('POST', '/api/v1/lists')[0]?.body).toEqual({
      name: 'Games',
      folder_id: null,
    })
    const created = backend.state.lists.find((l) => l.name === 'Games')!
    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${created.id}`))
  })

  it('"New folder inside" sends the parent id and the new folder shows nested', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Vehicles', 'New folder inside')
    const dlg = await dialog()
    expect(within(dlg).getByText('It will be created inside “Vehicles”.')).toBeInTheDocument()
    await user.type(within(dlg).getByRole('textbox', { name: 'Name' }), 'Trucks')
    await user.click(within(dlg).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(backend.writes('POST', '/api/v1/folders')[0]?.body).toEqual({
      name: 'Trucks',
      parent_folder_id: ID.vehicles,
    })
    expect(await treeRow(/^Trucks/)).toHaveAttribute('aria-level', '2')
  })

  it('"New list inside" sends folder_id and navigates to /lists/<id>', async () => {
    const { user, backend, router } = await openTree()
    await pickRowAction(user, 'Gear', 'New list inside')
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Lenses')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(backend.writes('POST', '/api/v1/lists')[0]?.body).toEqual({
      name: 'Lenses',
      folder_id: ID.gear,
    })
    const created = backend.state.lists.find((l) => l.name === 'Lenses')!
    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${created.id}`))
    expect(await treeRow(/^Lenses/)).toBeInTheDocument()
  })

  it('trims the name before sending it', async () => {
    const { user, backend } = await openTree()
    await pickHeaderAction(user, 'New folder')
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), '  Music  ')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(backend.writes('POST', '/api/v1/folders')).toHaveLength(1))
    expect(backend.writes('POST', '/api/v1/folders')[0]?.body).toMatchObject({ name: 'Music' })
  })

  it('Cancel closes the dialog without a request', async () => {
    const { user, backend } = await openTree()
    await pickHeaderAction(user, 'New folder')
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(backend.requests).toHaveLength(0)
  })

  it('a new root folder is appended after the existing root folders', async () => {
    const { user } = await openTree()
    await pickHeaderAction(user, 'New folder')
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Last')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await treeRow(/^Last/)
    const rootFolders = ['Media', 'Vehicles', 'Gear', 'Empty folder', 'Last']
    expect(rowNames().filter((n) => rootFolders.includes(n))).toEqual(rootFolders)
  })
})

describe('AT-03 tree CRUD (web): rename', () => {
  it('renames a folder: dialog prefilled, PATCH with If-Match of its version', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Media', 'Rename')
    const dlg = await dialog()
    const field = within(dlg).getByRole('textbox', { name: 'Name' })
    expect(field).toHaveValue('Media')

    await user.clear(field)
    await user.type(field, 'Screens')
    await user.click(within(dlg).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [patch] = backend.writes('PATCH', `/api/v1/folders/${ID.media}`)
    expect(patch?.ifMatch).toBe('"f-3"')
    expect(patch?.body).toEqual({ name: 'Screens' })
    expect(await treeRow(/^Screens/)).toBeInTheDocument()
    expect(await screen.findByText('Renamed to “Screens”')).toBeInTheDocument()
  })

  it('renames a list with If-Match "l-N"', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Watchlist', 'Rename')
    const field = within(await dialog()).getByRole('textbox', { name: 'Name' })
    expect(field).toHaveValue('Watchlist')
    await user.clear(field)
    await user.type(field, 'To watch')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await treeRow(/^To watch/)
    const [patch] = backend.writes('PATCH', `/api/v1/lists/${ID.watchlist}`)
    expect(patch?.ifMatch).toBe('"l-2"')
    expect(patch?.body).toEqual({ name: 'To watch' })
  })
})

describe('AT-03 tree CRUD (web): description', () => {
  it('saves a trimmed description with If-Match', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Wishlist', 'Edit description')
    const field = within(await dialog()).getByRole('textbox', { name: 'Description' })
    expect(field).toHaveValue('')
    await user.type(field, '  Things I want  ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [patch] = backend.writes('PATCH', `/api/v1/lists/${ID.wishlist}`)
    expect(patch?.ifMatch).toBe('"l-5"')
    expect(patch?.body).toEqual({ description: 'Things I want' })
    expect(await screen.findByText('Description saved')).toBeInTheDocument()
  })

  it('sends description null when the text is cleared', async () => {
    const tree = seedTree()
    tree.lists.find((l) => l.id === ID.wishlist)!.description = 'Old text'
    const { user, backend } = await openTree('/', tree)
    await pickRowAction(user, 'Wishlist', 'Edit description')
    const field = within(await dialog()).getByRole('textbox', { name: 'Description' })
    expect(field).toHaveValue('Old text')
    await user.clear(field)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(backend.writes('PATCH')).toHaveLength(1))
    const body = backend.writes('PATCH')[0]?.body as Record<string, unknown>
    expect(body).toHaveProperty('description', null)
    expect(body).not.toHaveProperty('name')
    await waitFor(() =>
      expect(backend.state.lists.find((l) => l.id === ID.wishlist)?.description).toBeNull(),
    )
  })

  it('has no "Edit description" entry on folders', async () => {
    const { user } = await openTree()
    await user.click(within(sidebar()).getByRole('button', { name: 'More actions for Media' }))
    await screen.findByRole('menuitem', { name: 'Rename' })
    expect(screen.queryByRole('menuitem', { name: 'Edit description' })).not.toBeInTheDocument()
  })

  it('blocks Save above 2000 characters without a request', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Wishlist', 'Edit description')
    await user.click(within(await dialog()).getByRole('textbox', { name: 'Description' }))
    await user.paste('x'.repeat(2001))
    expect(screen.getByText('Use at most 2000 characters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(backend.requests).toHaveLength(0)
  })
})

describe('AT-03 tree CRUD (web): delete', () => {
  it('a folder delete dialog mentions Trash and the counts of what goes with it', async () => {
    const { user } = await openTree()
    await pickRowAction(user, 'Media', 'Delete')
    const dlg = await screen.findByRole('alertdialog')
    expect(within(dlg).getByRole('heading', { name: 'Delete “Media”?' })).toBeInTheDocument()
    // Media holds Movies, Festival picks and TV, and lists Watchlist 12, Seen 48, Cannes 9, Currently 3.
    expect(dlg).toHaveTextContent(
      'This moves “Media” to Trash: 4 folders, 4 lists, 72 items. You can restore it from there.',
    )
  })

  it('an empty folder says only that it moves to Trash', async () => {
    const { user } = await openTree()
    await pickRowAction(user, 'Empty folder', 'Delete')
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'This moves “Empty folder” to Trash: 1 folder. You can restore it from there.',
    )
  })

  it('a list with items mentions its item count', async () => {
    const { user } = await openTree()
    await pickRowAction(user, 'Motorbikes', 'Delete')
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'This moves “Motorbikes” to Trash: 1 list, 7 items.',
    )
  })

  it('F006-W4 the folder confirm reads like the Trash entry counts for the same deletion', async () => {
    const { user } = await openTree()
    await pickRowAction(user, 'Media', 'Delete')
    const dlg = await screen.findByRole('alertdialog')
    // Trash `counts` include the root (D-065), so the same deletion is this exact text in the Trash row.
    expect(dlg).toHaveTextContent(`Trash: ${countsText({ folders: 4, lists: 4, items: 72 })}.`)
  })

  it('confirming sends DELETE with If-Match and removes the row', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Wishlist', 'Delete')
    await user.click(await screen.findByRole('button', { name: 'Move to Trash' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    const [del] = backend.writes('DELETE', `/api/v1/lists/${ID.wishlist}`)
    expect(del?.ifMatch).toBe('"l-5"')
    await waitFor(() =>
      expect(
        within(sidebar()).queryByRole('treeitem', { name: /^Wishlist/ }),
      ).not.toBeInTheDocument(),
    )
    expect(await screen.findByText('“Wishlist” moved to Trash')).toBeInTheDocument()
  })

  it('deleting a folder sends the folder version', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Vehicles', 'Delete')
    await user.click(await screen.findByRole('button', { name: 'Move to Trash' }))
    await waitFor(() => expect(backend.writes('DELETE')).toHaveLength(1))
    expect(backend.writes('DELETE')[0]).toMatchObject({
      path: `/api/v1/folders/${ID.vehicles}`,
      ifMatch: '"f-4"',
    })
  })

  it('Cancel does not delete', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Wishlist', 'Delete')
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(backend.writes('DELETE')).toHaveLength(0)
  })

  it('deleting the open list navigates to /', async () => {
    const { user, router } = await openTree(`/lists/${ID.wishlist}`)
    await pickRowAction(user, 'Wishlist', 'Delete')
    await user.click(await screen.findByRole('button', { name: 'Move to Trash' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('deleting a folder that contains the open list navigates to /', async () => {
    const { user, router } = await openTree(`/lists/${ID.watchlist}`)
    await pickRowAction(user, 'Media', 'Delete')
    await user.click(await screen.findByRole('button', { name: 'Move to Trash' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('deleting a different list keeps the current page', async () => {
    const { user, router } = await openTree(`/lists/${ID.watchlist}`)
    await pickRowAction(user, 'Wishlist', 'Delete')
    await user.click(await screen.findByRole('button', { name: 'Move to Trash' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe(`/lists/${ID.watchlist}`)
  })

  it('a failing delete (500) keeps the dialog open with an alert and a working Retry', async () => {
    const { user, backend } = await openTree()
    let calls = 0
    server.use(
      http.delete(apiUrl(`/api/v1/lists/${ID.wishlist}`), () => {
        calls += 1
        return calls === 1 ? problemResponse(500, 'internal_error') : undefined
      }),
    )
    await pickRowAction(user, 'Wishlist', 'Delete')
    await user.click(await screen.findByRole('button', { name: 'Move to Trash' }))

    const alert = await within(await screen.findByRole('alertdialog')).findByRole('alert')
    expect(alert).toHaveTextContent('The server could not be reached')
    expect(backend.state.lists.some((l) => l.id === ID.wishlist)).toBe(true)

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(backend.state.lists.some((l) => l.id === ID.wishlist)).toBe(false)
    expect(calls).toBe(2)
  })
})

describe('F006-W3 focus returns to the opener on close', () => {
  it('Esc on a Dialog opened from a row menu returns focus to the row menu button', async () => {
    const { user } = await openTree()
    await pickRowAction(user, 'Vehicles', 'Rename')
    await dialog()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() =>
      expect(
        within(sidebar()).getByRole('button', { name: 'More actions for Vehicles' }),
      ).toHaveFocus(),
    )
  })

  it('Esc on an AlertDialog opened from a row menu returns focus to the row menu button', async () => {
    const { user } = await openTree()
    await pickRowAction(user, 'Media', 'Delete')
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() =>
      expect(
        within(sidebar()).getByRole('button', { name: 'More actions for Media' }),
      ).toHaveFocus(),
    )
  })
})
