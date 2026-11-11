import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { apiUrl, ID, openTree, pickRowAction, rowNames } from './treeTestKit'

const SELF = 'A folder can’t be moved into itself.'
const SUBFOLDER = 'A folder can’t be moved into one of its own subfolders.'
const HERE = 'It is already here.'

const openMove = async (user: Parameters<typeof pickRowAction>[0], name: string) => {
  await pickRowAction(user, name, 'Move…')
  return screen.findByRole('dialog', { name: `Move “${name}”` })
}
const radio = (dlg: HTMLElement, name: string) =>
  within(dlg).getByRole('radio', { name: new RegExp(`^${name}`) })
const moveButton = (dlg: HTMLElement) => within(dlg).getByRole('button', { name: 'Move' })

describe('AT-04 move dialog disables invalid destinations', () => {
  it('disables the folder itself, its descendants and its current parent, each with a visible reason', async () => {
    const { user } = await openTree()
    // Festival picks sits in Movies (current parent) inside Media; it has no children.
    // Use Movies: self, Festival picks (descendant), Media (current parent).
    const dlg = await openMove(user, 'Movies')

    expect(radio(dlg, 'Movies')).toBeDisabled()
    expect(radio(dlg, 'Movies')).toHaveAccessibleDescription(SELF)
    expect(radio(dlg, 'Festival picks')).toBeDisabled()
    expect(radio(dlg, 'Festival picks')).toHaveAccessibleDescription(SUBFOLDER)
    expect(radio(dlg, 'Media')).toBeDisabled()
    expect(radio(dlg, 'Media')).toHaveAccessibleDescription(HERE)

    // The reasons are on screen, not only in a tooltip.
    expect(within(dlg).getAllByText(SELF)).toHaveLength(1)
    expect(within(dlg).getAllByText(SUBFOLDER)).toHaveLength(1)
    expect(within(dlg).getAllByText(HERE)).toHaveLength(1)

    // Everything else is a valid destination, the top level included.
    for (const name of ['Top level', 'TV', 'Vehicles', 'Gear', 'Empty folder']) {
      expect(radio(dlg, name)).toBeEnabled()
    }
  })

  it('a root folder disables Top level as its current parent, and all its descendants deeply', async () => {
    const { user } = await openTree()
    const dlg = await openMove(user, 'Media')
    expect(radio(dlg, 'Top level')).toBeDisabled()
    expect(radio(dlg, 'Top level')).toHaveAccessibleDescription(HERE)
    for (const name of ['Movies', 'Festival picks', 'TV']) {
      expect(radio(dlg, name)).toBeDisabled()
      expect(radio(dlg, name)).toHaveAccessibleDescription(SUBFOLDER)
    }
    expect(radio(dlg, 'Media')).toHaveAccessibleDescription(SELF)
    expect(radio(dlg, 'Vehicles')).toBeEnabled()
  })

  it('a list can go into any folder but not where it already is', async () => {
    const { user } = await openTree()
    const dlg = await openMove(user, 'Watchlist')
    expect(radio(dlg, 'Movies')).toBeDisabled()
    expect(radio(dlg, 'Movies')).toHaveAccessibleDescription(HERE)
    expect(radio(dlg, 'Top level')).toBeEnabled()
    // Folders are never "self" or "subfolder" for a list.
    expect(radio(dlg, 'Media')).toBeEnabled()
    expect(within(dlg).queryByText(SELF)).not.toBeInTheDocument()
    expect(within(dlg).queryByText(SUBFOLDER)).not.toBeInTheDocument()
  })

  it('a root list has Top level disabled as its current location', async () => {
    const { user } = await openTree()
    const dlg = await openMove(user, 'Wishlist')
    expect(radio(dlg, 'Top level')).toBeDisabled()
    expect(radio(dlg, 'Top level')).toHaveAccessibleDescription(HERE)
  })

  it('keeps Move disabled until a valid destination is chosen, and a disabled one cannot be chosen', async () => {
    const { user, backend } = await openTree()
    const dlg = await openMove(user, 'Media')
    expect(moveButton(dlg)).toBeDisabled()

    await user.click(radio(dlg, 'Movies'))
    expect(radio(dlg, 'Movies')).not.toBeChecked()
    expect(moveButton(dlg)).toBeDisabled()

    await user.click(radio(dlg, 'Gear'))
    expect(radio(dlg, 'Gear')).toBeChecked()
    expect(moveButton(dlg)).toBeEnabled()
    expect(backend.requests).toHaveLength(0)
  })
})

describe('AT-03 move between root and folders (web)', () => {
  it('moves a list root -> folder -> root, sending the parent key each time, and appends it last', async () => {
    const { user, backend } = await openTree()

    // Root -> Vehicles
    let dlg = await openMove(user, 'Wishlist')
    await user.click(radio(dlg, 'Vehicles'))
    await user.click(moveButton(dlg))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const [toFolder] = backend.writes('POST', `/api/v1/lists/${ID.wishlist}/move`)
    expect(toFolder?.ifMatch).toBe('"l-5"')
    expect(toFolder?.body).toEqual({ folder_id: ID.vehicles })
    await waitFor(() => {
      // Vehicles' lists are Motorbikes, Cars, then the moved Wishlist last.
      const names = rowNames()
      const start = names.indexOf('Vehicles')
      expect(names.slice(start + 1, start + 4)).toEqual(['Motorbikes', 'Cars', 'Wishlist'])
    })
    expect(await screen.findByText('“Wishlist” moved')).toBeInTheDocument()
    expect(screen.getByText('Now inside “Vehicles”.')).toBeInTheDocument()

    // Folder -> root (version is now 6, from the move)
    dlg = await openMove(user, 'Wishlist')
    expect(radio(dlg, 'Vehicles')).toBeDisabled()
    await user.click(radio(dlg, 'Top level'))
    await user.click(moveButton(dlg))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const [toRoot] = backend.writes('POST', `/api/v1/lists/${ID.wishlist}/move`).slice(-1)
    expect(toRoot?.ifMatch).toBe('"l-6"')
    expect(toRoot?.body).toHaveProperty('folder_id', null)
    expect(backend.state.lists.find((l) => l.id === ID.wishlist)?.folder_id).toBeNull()
    expect(await screen.findByText('Now at the top level.')).toBeInTheDocument()
  })

  it('moving a list to the top level appends it after the existing root lists', async () => {
    const { user, backend } = await openTree()
    const dlg = await openMove(user, 'Gadgets')
    await user.click(radio(dlg, 'Top level'))
    await user.click(moveButton(dlg))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const root = backend.state.lists
      .filter((l) => l.folder_id === null)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => l.name)
    expect(root).toEqual(['Wishlist', 'Ideas', 'Gadgets'])
  })

  it('moves a folder into another folder with parent_folder_id and expands the destination', async () => {
    const { user, backend } = await openTree()
    const dlg = await openMove(user, 'Gear')
    await user.click(radio(dlg, 'Vehicles'))
    await user.click(moveButton(dlg))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const [move] = backend.writes('POST', `/api/v1/folders/${ID.gear}/move`)
    expect(move?.ifMatch).toBe('"f-1"')
    expect(move?.body).toEqual({ parent_folder_id: ID.vehicles })
    expect(await screen.findByRole('treeitem', { name: /^Gear/ })).toHaveAttribute(
      'aria-level',
      '2',
    )
  })

  it('moves a nested folder back to the root with parent_folder_id null', async () => {
    const { user, backend } = await openTree()
    const dlg = await openMove(user, 'TV')
    await user.click(radio(dlg, 'Top level'))
    await user.click(moveButton(dlg))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const [move] = backend.writes('POST', `/api/v1/folders/${ID.tv}/move`)
    expect(move?.body).toHaveProperty('parent_folder_id', null)
    expect(backend.state.folders.find((f) => f.id === ID.tv)?.parent_folder_id).toBeNull()
    // Appended last among the root folders.
    const roots = backend.state.folders
      .filter((f) => f.parent_folder_id === null)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f) => f.name)
    expect(roots.at(-1)).toBe('TV')
  })
})

describe('AT-04 server-side rejections of a move', () => {
  it('409 cycle_detected shows a message, keeps the dialog open and refreshes the tree', async () => {
    const { user, backend } = await openTree()
    let treeFetches = 0
    server.use(
      http.get(apiUrl('/api/v1/tree'), () => {
        treeFetches += 1
        return undefined
      }),
      http.post(apiUrl(`/api/v1/folders/${ID.vehicles}/move`), () =>
        problemResponse(409, 'cycle_detected'),
      ),
    )
    const dlg = await openMove(user, 'Vehicles')
    const before = treeFetches
    await user.click(radio(dlg, 'Gear'))
    await user.click(moveButton(dlg))

    const alert = await within(dlg).findByRole('alert')
    expect(alert).toHaveTextContent(
      'A folder can’t be moved into itself or one of its own subfolders.',
    )
    expect(screen.getByRole('dialog', { name: 'Move “Vehicles”' })).toBeInTheDocument()
    await waitFor(() => expect(treeFetches).toBeGreaterThan(before))
    expect(backend.state.folders.find((f) => f.id === ID.vehicles)?.parent_folder_id).toBeNull()
  })

  it('the real backend rejects a cycle with 409 and the UI shows the cycle message', async () => {
    // Force the UI to send an illegal destination by making the dialog stale: the cached tree
    // says Gear is free, the server (state edited behind its back) says Gear is inside Vehicles.
    const { user, backend } = await openTree()
    const dlg = await openMove(user, 'Vehicles')
    backend.state.folders.find((f) => f.id === ID.gear)!.parent_folder_id = ID.vehicles
    await user.click(radio(dlg, 'Gear'))
    await user.click(moveButton(dlg))

    expect(await within(dlg).findByRole('alert')).toHaveTextContent(
      /moved into itself or one of its own subfolders/,
    )
    // The refetch now shows Gear under Vehicles, so it became a disabled destination.
    await waitFor(() => expect(radio(dlg, 'Gear')).toBeDisabled())
    expect(radio(dlg, 'Gear')).toHaveAccessibleDescription(SUBFOLDER)
    expect(moveButton(dlg)).toBeDisabled()
  })

  it('409 destination_unavailable says so, refreshes, and drops the vanished choice', async () => {
    const { user, backend } = await openTree()
    server.use(
      http.post(apiUrl(`/api/v1/lists/${ID.wishlist}/move`), () => {
        // Someone trashed Gear meanwhile.
        backend.state.folders = backend.state.folders.filter((f) => f.id !== ID.gear)
        backend.state.lists = backend.state.lists.filter((l) => l.folder_id !== ID.gear)
        return problemResponse(409, 'destination_unavailable')
      }),
    )
    const dlg = await openMove(user, 'Wishlist')
    await user.click(radio(dlg, 'Gear'))
    await user.click(moveButton(dlg))

    expect(await within(dlg).findByRole('alert')).toHaveTextContent(
      'That place is no longer available. Pick another one.',
    )
    await waitFor(() =>
      expect(within(dlg).queryByRole('radio', { name: /^Gear/ })).not.toBeInTheDocument(),
    )
    expect(moveButton(dlg)).toBeDisabled()
    expect(screen.getByRole('dialog', { name: 'Move “Wishlist”' })).toBeInTheDocument()
  })
})
