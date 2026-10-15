import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { apiUrl, ID, openTree, pickHeaderAction, pickRowAction } from './treeTestKit'

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
      within(screen.getByRole('navigation', { name: 'Library' })).queryByRole('treeitem', {
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
        within(screen.getByRole('navigation', { name: 'Library' })).queryByRole('treeitem', {
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
        within(screen.getByRole('navigation', { name: 'Library' })).queryByRole('treeitem', {
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
