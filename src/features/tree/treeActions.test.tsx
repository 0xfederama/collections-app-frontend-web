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
  sidebar,
} from './treeTestKit'

const dialog = () => screen.findByRole('dialog')
const treeRow = (name: RegExp) => within(sidebar()).findByRole('treeitem', { name })

describe('AT-03 tree CRUD (web): create', () => {
  it('creates a root folder from the header "+" menu and shows it in the tree', async () => {
    const { user, backend } = await openTree()
    await pickHeaderAction(user, 'Folder')

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
    await pickHeaderAction(user, 'List')
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Games')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(backend.writes('POST', '/api/v1/lists')[0]?.body).toEqual({
      name: 'Games',
      kind: 'generic',
      folder_id: null,
      icon: null,
      icon_color: null,
    })
    const created = backend.state.lists.find((l) => l.name === 'Games')!
    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${created.id}`))
  })

  it('F007-W7 a new list asks for its kind (Item by default) and sends the chosen one', async () => {
    const { user, backend } = await openTree()
    await pickHeaderAction(user, 'List')
    const dlg = await dialog()
    const kind = within(dlg).getByRole('combobox', { name: 'Kind' })
    expect(kind).toHaveTextContent('Item')
    await user.type(within(dlg).getByRole('textbox', { name: 'Name' }), 'Cameras')
    await user.click(kind)
    await user.click(await screen.findByRole('option', { name: 'Camera' }))
    expect(within(dlg).queryByRole('alert')).not.toBeInTheDocument()
    await user.click(within(dlg).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(backend.writes('POST', '/api/v1/lists')).toHaveLength(1))
    expect(backend.writes('POST', '/api/v1/lists')[0]?.body).toEqual({
      name: 'Cameras',
      kind: 'camera',
      folder_id: null,
      icon: null,
      icon_color: null,
    })
    expect(backend.state.lists.find((l) => l.name === 'Cameras')?.kind).toBe('camera')
  })

  it('F012-W1 creates a list with a searchable built-in icon and named color', async () => {
    const { user, backend } = await openTree()
    await pickHeaderAction(user, 'List')
    const create = await dialog()
    await user.type(within(create).getByRole('textbox', { name: 'Name' }), 'Camera shelf')
    await user.click(within(create).getByRole('button', { name: 'Choose icon' }))
    const picker = await screen.findByRole('dialog', { name: 'Choose list icon' })
    await user.type(
      within(picker).getByRole('textbox', { name: 'Search icons and emoji' }),
      'camer',
    )
    await user.click(within(picker).getByRole('button', { name: 'camera', exact: true }))
    await user.click(within(picker).getByRole('button', { name: 'Teal' }))
    await user.click(within(picker).getByRole('button', { name: 'Done' }))
    await user.click(within(create).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(backend.writes('POST', '/api/v1/lists')).toHaveLength(1))
    expect(backend.writes('POST', '/api/v1/lists')[0]?.body).toMatchObject({
      name: 'Camera shelf',
      icon: 'i:camera',
      icon_color: 'teal',
    })
  })

  it('a new folder has no kind picker', async () => {
    const { user } = await openTree()
    await pickHeaderAction(user, 'Folder')
    const dlg = await dialog()
    expect(within(dlg).queryByRole('combobox', { name: 'Kind' })).not.toBeInTheDocument()
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
      kind: 'generic',
      folder_id: ID.gear,
      icon: null,
      icon_color: null,
    })
    const created = backend.state.lists.find((l) => l.name === 'Lenses')!
    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${created.id}`))
    expect(await treeRow(/^Lenses/)).toBeInTheDocument()
  })

  it('F010-W1 the "New list" dialog offers a folder path, top level by default', async () => {
    const { user, backend } = await openTree()
    await pickHeaderAction(user, 'List')
    const dlg = await dialog()
    // F011-W6: a dropdown beside the Kind picker, not a list of radios.
    const folders = within(dlg).getByRole('combobox', { name: 'Folder' })
    expect(folders).toHaveTextContent('Top level')
    expect(within(dlg).getByText('It will be created at the top level.')).toBeInTheDocument()

    // Every folder of the tree is offered, nested ones by their path.
    await user.click(folders)
    expect(await screen.findByRole('option', { name: 'Top level' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Gear' })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Gear' }))

    // The description follows the choice.
    expect(within(dlg).getByText('It will be created inside “Gear”.')).toBeInTheDocument()
    await user.type(within(dlg).getByRole('textbox', { name: 'Name' }), 'Lenses')
    await user.click(within(dlg).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(backend.writes('POST', '/api/v1/lists')).toHaveLength(1))
    expect(backend.writes('POST', '/api/v1/lists')[0]?.body).toEqual({
      name: 'Lenses',
      kind: 'generic',
      folder_id: ID.gear,
      icon: null,
      icon_color: null,
    })
  })

  it('F010-W1 a folder dialog has no path picker', async () => {
    const { user } = await openTree()
    await pickHeaderAction(user, 'Folder')
    const dlg = await dialog()
    expect(within(dlg).queryByRole('combobox', { name: 'Folder' })).not.toBeInTheDocument()
  })

  it('F010-W1 "New list inside" preselects that folder, and it wins over the remembered one', async () => {
    const { user } = await openTree()
    // Remember "Vehicles" from an earlier list in this session.
    await pickHeaderAction(user, 'List')
    let dlg = await dialog()
    let folders = within(dlg).getByRole('combobox', { name: 'Folder' })
    await user.click(folders)
    await user.click(await screen.findByRole('option', { name: 'Vehicles' }))
    await user.type(within(dlg).getByRole('textbox', { name: 'Name' }), 'Bikes')
    await user.click(within(dlg).getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // The next "New list" opens on the folder the last one went into.
    await pickHeaderAction(user, 'List')
    dlg = await dialog()
    folders = within(dlg).getByRole('combobox', { name: 'Folder' })
    expect(folders).toHaveTextContent('Vehicles')
    await user.click(within(dlg).getByRole('button', { name: 'Cancel' }))

    // A menu that names its own folder is an explicit choice and still wins.
    await pickRowAction(user, 'Gear', 'New list inside')
    dlg = await dialog()
    folders = within(dlg).getByRole('combobox', { name: 'Folder' })
    expect(folders).toHaveTextContent('Gear')
  })

  it('F010-W1 the remembered folder is forgotten with the session, never written to localStorage', async () => {
    const { user } = await openTree()
    await pickHeaderAction(user, 'List')
    const dlg = await dialog()
    const folders = within(dlg).getByRole('combobox', { name: 'Folder' })
    await user.click(folders)
    await user.click(await screen.findByRole('option', { name: 'Gear' }))
    // Nothing is remembered until a list is really created there.
    expect(sessionStorage.getItem('collection:list-folder')).toBeNull()
    await user.type(within(dlg).getByRole('textbox', { name: 'Name' }), 'Lenses')
    await user.click(within(dlg).getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(sessionStorage.getItem('collection:list-folder')).toBe(JSON.stringify(ID.gear))
    expect(localStorage.getItem('collection:list-folder')).toBeNull()
  })

  it('F010-W1 a remembered folder that is gone falls back to the top level', async () => {
    const { user } = await openTree()
    // Left over from an earlier session entry, now a folder that does not exist.
    sessionStorage.setItem('collection:list-folder', JSON.stringify('folder-that-is-gone'))
    await pickHeaderAction(user, 'List')
    const dlg = await dialog()
    const folders = within(dlg).getByRole('combobox', { name: 'Folder' })
    expect(folders).toHaveTextContent('Top level')
    expect(within(dlg).getByText('It will be created at the top level.')).toBeInTheDocument()
  })

  it('trims the name before sending it', async () => {
    const { user, backend } = await openTree()
    await pickHeaderAction(user, 'Folder')
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), '  Music  ')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(backend.writes('POST', '/api/v1/folders')).toHaveLength(1))
    expect(backend.writes('POST', '/api/v1/folders')[0]?.body).toMatchObject({ name: 'Music' })
  })

  it('Cancel closes the dialog without a request', async () => {
    const { user, backend } = await openTree()
    await pickHeaderAction(user, 'Folder')
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(backend.requests).toHaveLength(0)
  })

  it('a new root folder is appended after the existing root folders', async () => {
    const { user } = await openTree()
    await pickHeaderAction(user, 'Folder')
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
