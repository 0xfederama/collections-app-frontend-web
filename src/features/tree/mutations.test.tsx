import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { apiUrl, ID, openTree, pickHeaderAction, pickRowAction, rowNames } from './treeTestKit'

/** Counts GET /tree calls (the handler falls through to the backend). */
function countTreeFetches() {
  const count = { value: 0 }
  server.use(
    http.get(apiUrl('/api/v1/tree'), () => {
      count.value += 1
      return undefined
    }),
  )
  return count
}

/** A promise the test resolves by hand, to hold a response back. */
function gate() {
  let open!: () => void
  const opened = new Promise<void>((resolve) => (open = resolve))
  return { opened, open }
}

const nameField = () => screen.findByRole('textbox', { name: 'Name' })

describe('AT-03 tree write errors (web): 412 conflict', () => {
  it('keeps the dialog and the typed value, shows the conflict alert, and never auto-retries', async () => {
    const { user, backend } = await openTree()
    const fetches = countTreeFetches()
    await pickRowAction(user, 'Media', 'Rename')
    const field = await nameField()
    await user.clear(field)
    await user.type(field, 'My draft')

    // Somebody else renames it first.
    const media = backend.state.folders.find((f) => f.id === ID.media)!
    media.name = 'Their name'
    media.version = 4

    const before = fetches.value
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const alert = await within(screen.getByRole('dialog')).findByRole('alert')
    expect(alert).toHaveTextContent(
      'Someone else changed this folder while you were editing. Your changes have not been saved.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(field).toHaveValue('My draft')
    expect(within(alert).getByRole('button', { name: 'Reload latest' })).toBeInTheDocument()
    // One PATCH, with the stale version; no automatic retry and no silent tree refetch.
    expect(backend.writes('PATCH')).toHaveLength(1)
    expect(backend.writes('PATCH')[0]?.ifMatch).toBe('"f-3"')
    expect(fetches.value).toBe(before)
    expect(media.name).toBe('Their name')
  })

  it('"Reload latest" refetches the tree, fills the latest name, and the next Save uses the new version', async () => {
    const { user, backend } = await openTree()
    const fetches = countTreeFetches()
    await pickRowAction(user, 'Media', 'Rename')
    const field = await nameField()
    await user.clear(field)
    await user.type(field, 'My draft')
    const media = backend.state.folders.find((f) => f.id === ID.media)!
    media.name = 'Their name'
    media.version = 4
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const alert = await within(screen.getByRole('dialog')).findByRole('alert')

    const before = fetches.value
    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))

    await waitFor(() => expect(field).toHaveValue('Their name'))
    expect(fetches.value).toBeGreaterThan(before)
    expect(within(screen.getByRole('dialog')).queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(backend.writes('PATCH')).toHaveLength(2)
    expect(backend.writes('PATCH')[1]?.ifMatch).toBe('"f-4"')
  })

  it('a 412 on a list description keeps the text and offers Reload latest', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Wishlist', 'Edit description')
    const field = await screen.findByRole('textbox', { name: 'Description' })
    await user.type(field, 'Mine')
    const list = backend.state.lists.find((l) => l.id === ID.wishlist)!
    list.description = 'Theirs'
    list.version = 6

    await user.click(screen.getByRole('button', { name: 'Save' }))
    const alert = await within(screen.getByRole('dialog')).findByRole('alert')
    expect(alert).toHaveTextContent('Someone else changed this list')
    expect(field).toHaveValue('Mine')

    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))
    await waitFor(() => expect(field).toHaveValue('Theirs'))
    expect(backend.writes('PATCH')).toHaveLength(1)
  })

  it('a 412 on delete keeps the dialog; Reload latest then lets the next confirm use the new version', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Vehicles', 'Delete')
    backend.state.folders.find((f) => f.id === ID.vehicles)!.version = 9
    await user.click(await screen.findByRole('button', { name: 'Move to Trash' }))

    const dlg = await screen.findByRole('alertdialog')
    const alert = await within(dlg).findByRole('alert')
    expect(alert).toHaveTextContent('Someone else changed this folder')
    expect(backend.writes('DELETE')).toHaveLength(1)

    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))
    await waitFor(() => expect(within(dlg).queryByRole('alert')).not.toBeInTheDocument())
    await user.click(within(dlg).getByRole('button', { name: 'Move to Trash' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(backend.writes('DELETE')[1]?.ifMatch).toBe('"f-9"')
  })

  it('"Reload latest" for a folder that disappeared meanwhile refreshes the tree and drops it', async () => {
    // The dialog's own "no longer exists" alert is unreachable here: the refetch removes the node,
    // which unmounts the dialog (reported as a UX note, not asserted).
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Media', 'Rename')
    await user.type(await nameField(), '!')
    backend.state.folders.find((f) => f.id === ID.media)!.version = 7
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const alert = await within(screen.getByRole('dialog')).findByRole('alert')

    backend.state.folders = backend.state.folders.filter((f) => f.id !== ID.media)
    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(
      within(screen.getByRole('navigation', { name: 'Collections' })).queryByRole('treeitem', {
        name: /^Media/,
      }),
    ).not.toBeInTheDocument()
  })
})

describe('AT-03 tree write errors (web): other failures', () => {
  it('409 destination_unavailable when creating inside a folder trashed meanwhile refreshes the tree', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Gear', 'New folder inside')
    const field = await nameField()
    await user.type(field, 'Tripods')
    backend.state.folders = backend.state.folders.filter((f) => f.id !== ID.gear)
    backend.state.lists = backend.state.lists.filter((l) => l.folder_id !== ID.gear)

    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
      'That destination no longer exists or is in Trash.',
    )
    expect(field).toHaveValue('Tripods')
    await waitFor(() =>
      expect(
        within(screen.getByRole('navigation', { name: 'Collections' })).queryByRole('treeitem', {
          name: /^Gear/,
        }),
      ).not.toBeInTheDocument(),
    )
  })

  it('404 on rename (folder gone) refreshes the tree and removes the row', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Gear', 'Rename')
    await user.type(await nameField(), '2')
    backend.state.folders = backend.state.folders.filter((f) => f.id !== ID.gear)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(
        within(screen.getByRole('navigation', { name: 'Collections' })).queryByRole('treeitem', {
          name: /^Gear/,
        }),
      ).not.toBeInTheDocument(),
    )
    expect(backend.writes('PATCH')).toHaveLength(1)
  })

  it('422 is shown on the name field, not in a generic alert, and the value is kept', async () => {
    const { user } = await openTree()
    server.use(
      http.patch(apiUrl(`/api/v1/folders/${ID.media}`), () =>
        problemResponse(422, 'validation_failed', {
          errors: [{ field: 'name', message: 'Name is already used here.' }],
        }),
      ),
    )
    await pickRowAction(user, 'Media', 'Rename')
    const field = await nameField()
    await user.clear(field)
    await user.type(field, 'Vehicles')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(field).toHaveAccessibleDescription('Name is already used here.'))
    expect(within(screen.getByRole('dialog')).queryByRole('alert')).not.toBeInTheDocument()
    expect(field).toHaveValue('Vehicles')
  })

  it('a network error keeps the value and shows Retry, which resubmits', async () => {
    const { user, backend } = await openTree()
    let calls = 0
    server.use(
      http.post(apiUrl('/api/v1/folders'), () => {
        calls += 1
        return calls === 1 ? HttpResponse.error() : undefined
      }),
    )
    await pickHeaderAction(user, 'New folder')
    const field = await nameField()
    await user.type(field, 'Offline folder')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    const alert = await within(screen.getByRole('dialog')).findByRole('alert')
    expect(alert).toHaveTextContent('The server could not be reached. Your input is kept')
    expect(field).toHaveValue('Offline folder')
    expect(calls).toBe(1)

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(calls).toBe(2)
    expect(backend.state.folders.some((f) => f.name === 'Offline folder')).toBe(true)
  })

  it('a 500 is treated like a network failure (Retry, input kept)', async () => {
    const { user } = await openTree()
    server.use(http.post(apiUrl('/api/v1/lists'), () => problemResponse(500, 'internal_error')))
    await pickHeaderAction(user, 'New list')
    const field = await nameField()
    await user.type(field, 'Keep me')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    const alert = await within(screen.getByRole('dialog')).findByRole('alert')
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(field).toHaveValue('Keep me')
  })

  it('an empty or blank name shows "Enter a name." and sends nothing', async () => {
    const { user, backend } = await openTree()
    await pickHeaderAction(user, 'New folder')
    const field = await nameField()
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText('Enter a name.')).toBeInTheDocument()
    expect(field).toHaveAccessibleDescription('Enter a name.')

    await user.type(field, '   ')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText('Enter a name.')).toBeInTheDocument()
    expect(backend.requests).toHaveLength(0)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('clearing the name on rename is blocked client-side too', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Media', 'Rename')
    await user.clear(await nameField())
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Enter a name.')).toBeInTheDocument()
    expect(backend.requests).toHaveLength(0)
  })

  it('limits the name to 200 characters', async () => {
    const { user, backend } = await openTree()
    await pickHeaderAction(user, 'New folder')
    const field = await nameField()
    expect(field).toHaveAttribute('maxlength', '200')
    await user.click(field)
    await user.paste('a'.repeat(250))
    expect((field as HTMLInputElement).value).toHaveLength(200)
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(backend.writes('POST')).toHaveLength(1))
    expect((backend.writes('POST')[0]?.body as { name: string }).name).toHaveLength(200)
  })
})

describe('AT-21 reorder siblings (web)', () => {
  it('"Move down" on a root folder PUTs the order with ALL sibling folder ids and a null parent', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Media', 'Move down')

    await waitFor(() => expect(backend.writes('PUT')).toHaveLength(1))
    const [put] = backend.writes('PUT')
    expect(put?.path).toBe('/api/v1/folders/order')
    expect(put?.body).toEqual({
      parent_folder_id: null,
      ids: [ID.vehicles, ID.media, ID.gear, ID.empty],
    })
    expect(await screen.findByText('Media moved down')).toBeInTheDocument()
    expect(screen.getByText('Position 2 of 4.')).toBeInTheDocument()
    await waitFor(() =>
      expect(rowNames().filter((n) => ['Media', 'Vehicles'].includes(n))).toEqual([
        'Vehicles',
        'Media',
      ]),
    )
  })

  it('"Move up" on a nested folder sends its parent_folder_id', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'TV', 'Move up')
    await waitFor(() => expect(backend.writes('PUT')).toHaveLength(1))
    expect(backend.writes('PUT')[0]?.body).toEqual({
      parent_folder_id: ID.media,
      ids: [ID.tv, ID.movies],
    })
    expect(await screen.findByText('TV moved up')).toBeInTheDocument()
  })

  it('"Move up" on a list sends all list ids of its folder under folder_id', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Seen', 'Move up')
    await waitFor(() => expect(backend.writes('PUT')).toHaveLength(1))
    expect(backend.writes('PUT')[0]).toMatchObject({
      path: '/api/v1/lists/order',
      body: { folder_id: ID.movies, ids: [ID.seen, ID.watchlist] },
    })
  })

  it('reordering root lists sends folder_id null, and folders are not mixed in', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Ideas', 'Move up')
    await waitFor(() => expect(backend.writes('PUT')).toHaveLength(1))
    const body = backend.writes('PUT')[0]?.body as Record<string, unknown>
    expect(body).toHaveProperty('folder_id', null)
    expect(body.ids).toEqual([ID.ideas, ID.wishlist])
  })

  it('disables "Move up" on the first and "Move down" on the last sibling of its kind', async () => {
    const { user } = await openTree()
    const disabled = async (name: string, entry: string) => {
      await user.click(
        within(screen.getByRole('navigation', { name: 'Collections' })).getByRole('button', {
          name: `More actions for ${name}`,
        }),
      )
      const item = await screen.findByRole('menuitem', { name: entry })
      const state = item.getAttribute('aria-disabled') === 'true'
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
      return state
    }
    expect(await disabled('Media', 'Move up')).toBe(true)
    expect(await disabled('Media', 'Move down')).toBe(false)
    // Last folder at the root, although lists follow it in the tree.
    expect(await disabled('Empty folder', 'Move down')).toBe(true)
    expect(await disabled('Empty folder', 'Move up')).toBe(false)
    expect(await disabled('Watchlist', 'Move up')).toBe(true)
    expect(await disabled('Seen', 'Move down')).toBe(true)
    // An only child has neither.
    expect(await disabled('Festival picks', 'Move up')).toBe(true)
    expect(await disabled('Festival picks', 'Move down')).toBe(true)
  })

  it('a disabled entry sends nothing when activated', async () => {
    const { user, backend } = await openTree()
    await user.click(
      within(screen.getByRole('navigation', { name: 'Collections' })).getByRole('button', {
        name: 'More actions for Media',
      }),
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Move up' }))
    expect(backend.writes('PUT')).toHaveLength(0)
  })

  it('shows the new order before the server answers, then keeps it', async () => {
    const { user } = await openTree()
    const held = gate()
    server.use(
      http.put(apiUrl('/api/v1/folders/order'), async () => {
        await held.opened
        return undefined
      }),
    )
    await pickRowAction(user, 'Media', 'Move down')

    // The PUT is still pending, yet the tree already shows the new order.
    await waitFor(() =>
      expect(rowNames().filter((n) => ['Media', 'Vehicles'].includes(n))).toEqual([
        'Vehicles',
        'Media',
      ]),
    )
    held.open()
    await waitFor(() =>
      expect(rowNames().filter((n) => ['Media', 'Vehicles'].includes(n))).toEqual([
        'Vehicles',
        'Media',
      ]),
    )
  })

  it('rolls the order back on a server error and shows an error toast', async () => {
    const { user, backend } = await openTree()
    const fetches = countTreeFetches()
    const held = gate()
    server.use(
      http.put(apiUrl('/api/v1/folders/order'), async () => {
        await held.opened
        return problemResponse(500, 'internal_error')
      }),
    )
    const original = ['Media', 'Vehicles', 'Gear', 'Empty folder']
    const roots = () => rowNames().filter((n) => original.includes(n))

    await pickRowAction(user, 'Media', 'Move down')
    await waitFor(() => expect(roots()).toEqual(['Vehicles', 'Media', 'Gear', 'Empty folder']))
    const before = fetches.value
    held.open()

    expect(await screen.findByText('Couldn’t save the new order')).toBeInTheDocument()
    expect(
      screen.getByText('The previous order was restored. Please try again.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(roots()).toEqual(original))
    await waitFor(() => expect(fetches.value).toBeGreaterThan(before))
    expect(backend.state.folders.find((f) => f.id === ID.media)?.sort_order).toBe(0)
  })

  it('409 order_stale rolls back, refetches the tree and tells the user', async () => {
    const { user, backend } = await openTree()
    // Another device added a root folder after we loaded: our id list is now incomplete.
    const template = backend.state.folders.find((f) => f.id === ID.gear)!
    backend.state.folders.push({
      ...template,
      id: '7c1e5a10-0000-4000-8000-0000000000aa',
      name: 'Added elsewhere',
      sort_order: 9,
    })
    const fetches = countTreeFetches()
    const before = fetches.value

    await pickRowAction(user, 'Media', 'Move down')

    expect(await screen.findByText('List changed, order refreshed.')).toBeInTheDocument()
    expect(screen.queryByText('Couldn’t save the new order')).not.toBeInTheDocument()
    await waitFor(() => expect(fetches.value).toBeGreaterThan(before))
    // The refetched tree has the other device's folder, and Media kept its place.
    expect(await screen.findByRole('treeitem', { name: /^Added elsewhere/ })).toBeInTheDocument()
    const roots = rowNames().filter((n) =>
      ['Media', 'Vehicles', 'Gear', 'Empty folder', 'Added elsewhere'].includes(n),
    )
    expect(roots).toEqual(['Media', 'Vehicles', 'Gear', 'Empty folder', 'Added elsewhere'])
    expect(backend.state.folders.find((f) => f.id === ID.media)?.sort_order).toBe(0)
  })

  it('409 order_stale on lists behaves the same', async () => {
    const { user, backend } = await openTree()
    server.use(http.put(apiUrl('/api/v1/lists/order'), () => problemResponse(409, 'order_stale')))
    await pickRowAction(user, 'Ideas', 'Move up')
    expect(await screen.findByText('List changed, order refreshed.')).toBeInTheDocument()
    await waitFor(() =>
      expect(rowNames().indexOf('Wishlist')).toBeLessThan(rowNames().indexOf('Ideas')),
    )
    expect(backend.state.lists.find((l) => l.id === ID.ideas)?.sort_order).toBe(1)
  })
})
