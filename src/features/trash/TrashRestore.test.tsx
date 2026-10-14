import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it, vi } from 'vitest'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { ID } from '../tree/treeTestKit'
import { buttonName, entry, openTrash, rowOf, T, waitForRows } from './trashTestKit'

const restoreUrl = (batchId?: string) =>
  `${globalThis.location.origin}/api/v1/trash/${batchId ?? ':batchId'}/restore`
const rowTitles = async () =>
  (await waitForRows()).map((li) => li.querySelector('span.truncate')?.textContent)

describe('AT-11 restore in place', () => {
  it('POSTs without a body or destination, toasts with "Open", and removes the row', async () => {
    const { user, trash } = await openTrash()
    const row = await rowOf('Old cameras')
    await user.click(row.getByRole('button', { name: buttonName('Restore', 'Old cameras') }))

    expect(await screen.findByText('Restored “Old cameras”')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    const posts = trash.calls('POST')
    expect(posts).toHaveLength(1)
    expect(posts[0]!.path).toBe(`/api/v1/trash/${T.cameras}/restore`)
    expect(posts[0]!.body).toBeUndefined()
    await waitFor(async () => expect(await rowTitles()).not.toContain('Old cameras'))
  })

  it('a folder gets a success toast without an "Open" action', async () => {
    const { user } = await openTrash()
    const row = await rowOf('Old media')
    await user.click(row.getByRole('button', { name: buttonName('Restore', 'Old media') }))
    expect(await screen.findByText('Restored “Old media”')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument()
  })

  it('invalidates tree, list, item and search queries after restoring', async () => {
    const { user, client } = await openTrash()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const row = await rowOf('Old cameras')
    await user.click(row.getByRole('button', { name: buttonName('Restore', 'Old cameras') }))
    await screen.findByText('Restored “Old cameras”')
    const keys = spy.mock.calls.map(([filters]) => (filters?.queryKey ?? []).join('/'))
    expect(keys).toEqual(expect.arrayContaining(['trash', 'tree', 'lists', 'items', 'search']))
  })

  it('shows the network failure inline with a Retry that works', async () => {
    const { user, trash } = await openTrash()
    let calls = 0
    server.use(http.post(restoreUrl(), () => (calls++ === 0 ? HttpResponse.error() : undefined)))
    const row = await rowOf('Old cameras')
    await user.click(row.getByRole('button', { name: buttonName('Restore', 'Old cameras') }))

    expect(await row.findByRole('alert')).toHaveTextContent('The server could not be reached')
    expect(row.getByRole('button', { name: buttonName('Restore', 'Old cameras') })).toBeEnabled()
    await user.click(row.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Restored “Old cameras”')).toBeInTheDocument()
    expect(trash.state.entries.map((e) => e.id)).not.toContain(T.cameras)
  })

  it('shows a 5xx inline with Retry and keeps the row', async () => {
    const { user } = await openTrash()
    let calls = 0
    server.use(
      http.post(restoreUrl(), () =>
        calls++ === 0 ? problemResponse(503, 'unavailable') : undefined,
      ),
    )
    const row = await rowOf('Old cameras')
    await user.click(row.getByRole('button', { name: buttonName('Restore', 'Old cameras') }))
    expect(await row.findByRole('alert')).toBeInTheDocument()
    await user.click(row.getByRole('button', { name: 'Retry' }))
    await waitFor(async () => expect(await rowTitles()).not.toContain('Old cameras'))
  })

  it('404: toasts "Already gone" and the refetch drops the row', async () => {
    const { user, trash } = await openTrash()
    const row = await rowOf('Old cameras')
    // Purged from another device after this page loaded.
    trash.state.entries = trash.state.entries.filter((e) => e.id !== T.cameras)
    await user.click(row.getByRole('button', { name: buttonName('Restore', 'Old cameras') }))

    expect(await screen.findByText('Already gone')).toBeInTheDocument()
    await waitFor(async () => expect(await rowTitles()).not.toContain('Old cameras'))
  })
})

describe('AT-11 blocked restore', () => {
  it('offers "Restore to…" and the reason, and "Restore Crime instead" when its entry is present', async () => {
    await openTrash()
    const heat = await rowOf('Heat')
    expect(heat.getByText('Parent list ‘Crime’ is in Trash.')).toBeInTheDocument()
    expect(
      heat.getByRole('button', { name: buttonName('Restore to…', 'Heat') }),
    ).toBeInTheDocument()
    expect(heat.getByRole('button', { name: 'Restore “Crime” instead' })).toBeInTheDocument()
  })

  it('does not offer "instead" when the parent is not among the entries (Tenet)', async () => {
    await openTrash()
    const tenet = await rowOf('Tenet')
    expect(
      tenet.getByText(/Parent list ‘Sci-fi’ is in Trash or no longer exists\./),
    ).toBeInTheDocument()
    expect(
      tenet.getByRole('button', { name: buttonName('Restore to…', 'Tenet') }),
    ).toBeInTheDocument()
    expect(tenet.queryByRole('button', { name: /instead/ })).not.toBeInTheDocument()
  })

  it('does not offer "instead" when the parent entry is itself not restorable in place', async () => {
    const parent = entry(1, {
      root_type: 'folder',
      root_name: 'Bikes',
      restorable_in_place: false,
      former_path: [{ type: 'folder', id: 'gone-id', name: 'Vehicles' }],
    })
    const child = entry(2, {
      root_type: 'list',
      root_name: 'Racing',
      restorable_in_place: false,
      former_path: [{ type: 'folder', id: parent.root_id, name: 'Bikes' }],
    })
    await openTrash([parent, child])
    const row = await rowOf('Racing')
    expect(
      row.getByRole('button', { name: buttonName('Restore to…', 'Racing') }),
    ).toBeInTheDocument()
    expect(row.queryByRole('button', { name: /instead/ })).not.toBeInTheDocument()
  })

  it('"Restore Crime instead" restores the parent batch, not the blocked one', async () => {
    const { user, trash } = await openTrash()
    const heat = await rowOf('Heat')
    await user.click(heat.getByRole('button', { name: 'Restore “Crime” instead' }))

    expect(await screen.findByText('Restored “Crime”')).toBeInTheDocument()
    expect(trash.calls('POST').map((r) => r.path)).toEqual([`/api/v1/trash/${T.crime}/restore`])
    expect(trash.call('POST', 0).body).toBeUndefined()
    // Crime is gone, and Heat can now be restored in place.
    await waitFor(async () => expect(await rowTitles()).not.toContain('Crime'))
    const refreshed = await rowOf('Heat')
    expect(
      await refreshed.findByRole('button', { name: buttonName('Restore', 'Heat') }),
    ).toBeInTheDocument()
    expect(refreshed.queryByRole('button', { name: /instead/ })).not.toBeInTheDocument()
  })

  it('409 parent_in_trash on a stale row: info toast, and the row turns into "Restore to…"', async () => {
    const { user, trash } = await openTrash()
    const row = await rowOf('Old cameras')
    // Its parent folder was trashed after the list loaded; the server now refuses an in-place restore.
    trash.state.entries.find((e) => e.id === T.cameras)!.restorable_in_place = false
    await user.click(row.getByRole('button', { name: buttonName('Restore', 'Old cameras') }))

    expect(await screen.findByText('Can’t restore “Old cameras” there')).toBeInTheDocument()
    const refreshed = await rowOf('Old cameras')
    expect(
      await refreshed.findByRole('button', { name: buttonName('Restore to…', 'Old cameras') }),
    ).toBeInTheDocument()
    expect(refreshed.getByText(/Parent folder ‘Vehicles’/)).toBeInTheDocument()
    expect(
      refreshed.queryByRole('button', { name: buttonName('Restore', 'Old cameras') }),
    ).not.toBeInTheDocument()
    expect(trash.state.entries.map((e) => e.id)).toContain(T.cameras)
  })
})

describe('AT-11 restore to… destination picker', () => {
  const orphanList = entry(1, {
    root_type: 'list',
    root_name: 'Orphan',
    restorable_in_place: false,
    former_path: [{ type: 'folder', id: 'gone-id', name: 'Lost' }],
  })
  const orphanFolder = entry(2, {
    root_type: 'folder',
    root_name: 'Orphan folder',
    restorable_in_place: false,
    counts: { folders: 1, lists: 0, items: 0 },
    former_path: [{ type: 'folder', id: 'gone-id', name: 'Lost' }],
  })

  const openPicker = async (
    entries: Parameters<typeof openTrash>[0],
    name: string,
    title = `Restore “${name}” to…`,
  ) => {
    const ctx = await openTrash(entries)
    const row = await rowOf(name)
    await ctx.user.click(row.getByRole('button', { name: buttonName('Restore to…', name) }))
    const dialog = await screen.findByRole('dialog', { name: title })
    await within(dialog).findByRole('radiogroup', { name: 'Destination' })
    return { ...ctx, dialog }
  }
  const restoreButton = (dialog: HTMLElement) =>
    within(dialog).getByRole('button', { name: 'Restore' })

  it('for a list lists "Top level" and every folder; Restore stays disabled until one is chosen', async () => {
    const { dialog, user } = await openPicker([orphanList], 'Orphan')
    const radios = within(dialog).getAllByRole('radio')
    expect(radios.map((r) => r.closest('label')?.textContent)).toEqual([
      'Top level',
      'Media',
      'Movies',
      'Festival picks',
      'TV',
      'Vehicles',
      'Gear',
      'Empty folder',
    ])
    expect(radios.every((r) => !(r as HTMLInputElement).checked)).toBe(true)
    expect(restoreButton(dialog)).toBeDisabled()

    await user.click(within(dialog).getByRole('radio', { name: 'Vehicles' }))
    expect(restoreButton(dialog)).toBeEnabled()
  })

  it('sends { destination: { folder_id } } for a chosen folder and { folder_id: null } for Top level', async () => {
    const { dialog, user, trash } = await openPicker([orphanList, orphanFolder], 'Orphan')
    await user.click(within(dialog).getByRole('radio', { name: 'Vehicles' }))
    await user.click(restoreButton(dialog))
    expect(await screen.findByText('Restored “Orphan”')).toBeInTheDocument()
    expect(trash.call('POST', 0).body).toEqual({ destination: { folder_id: ID.vehicles } })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const row = await rowOf('Orphan folder')
    await user.click(row.getByRole('button', { name: buttonName('Restore to…', 'Orphan folder') }))
    const second = await screen.findByRole('dialog', { name: 'Restore “Orphan folder” to…' })
    await user.click(await within(second).findByRole('radio', { name: 'Top level' }))
    await user.click(restoreButton(second))
    await waitFor(() => expect(trash.calls('POST')).toHaveLength(2))
    expect(trash.call('POST', 1).body).toEqual({ destination: { folder_id: null } })
  })

  it('a restored list offers "Open" in the success toast', async () => {
    const { dialog, user } = await openPicker([orphanList], 'Orphan')
    await user.click(within(dialog).getByRole('radio', { name: 'Gear' }))
    await user.click(restoreButton(dialog))
    expect(await screen.findByRole('button', { name: 'Open' })).toBeInTheDocument()
  })

  it('for an item shows lists under their folders (folders are not selectable) and sends list_id', async () => {
    const { dialog, user, trash } = await openPicker(undefined, 'Tenet')
    const names = within(dialog)
      .getAllByRole('radio')
      .map((r) => r.closest('label')?.textContent)
    expect([...names].sort()).toEqual([
      'Cameras',
      'Cannes 2026',
      'Cars',
      'Currently watching',
      'Ideas',
      'Motorbikes',
      'Seen',
      'Watchlist',
      'Wishlist',
    ])
    // Folders and Top level are labels, not choices.
    expect(within(dialog).queryByRole('radio', { name: 'Top level' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('radio', { name: 'Media' })).not.toBeInTheDocument()
    expect(within(dialog).getByText('Media')).toBeInTheDocument()
    expect(restoreButton(dialog)).toBeDisabled()

    await user.click(within(dialog).getByRole('radio', { name: 'Watchlist' }))
    await user.click(restoreButton(dialog))
    expect(await screen.findByText('Restored “Tenet”')).toBeInTheDocument()
    expect(trash.call('POST', 0).body).toEqual({ destination: { list_id: ID.watchlist } })
    // An item opens in the list it was restored to.
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
  })

  it('Cancel closes the picker without restoring', async () => {
    const { dialog, user, trash } = await openPicker([orphanList], 'Orphan')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trash.calls('POST')).toHaveLength(0)
    expect(await rowOf('Orphan')).toBeDefined()
  })

  it('409 cycle_detected keeps the dialog open, explains, disables that folder and clears the choice', async () => {
    const { dialog, user } = await openPicker([orphanFolder], 'Orphan folder')
    server.use(http.post(restoreUrl(), () => problemResponse(409, 'cycle_detected')))
    await user.click(within(dialog).getByRole('radio', { name: 'Media' }))
    await user.click(restoreButton(dialog))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent(
      'A folder can’t be restored into itself or one of its own subfolders.',
    )
    expect(screen.getByRole('dialog', { name: 'Restore “Orphan folder” to…' })).toBeInTheDocument()
    const media = within(dialog).getByRole('radio', { name: /^Media/ })
    expect(media).toBeDisabled()
    expect(media).not.toBeChecked()
    expect(restoreButton(dialog)).toBeDisabled()
    // Another destination still works.
    expect(within(dialog).getByRole('radio', { name: 'Vehicles' })).toBeEnabled()
  })

  it('409 destination_unavailable keeps the dialog open with a message and clears the choice', async () => {
    const { dialog, user } = await openPicker([orphanList], 'Orphan')
    server.use(http.post(restoreUrl(), () => problemResponse(409, 'destination_unavailable')))
    await user.click(within(dialog).getByRole('radio', { name: 'Gear' }))
    await user.click(restoreButton(dialog))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'That destination no longer exists or is in Trash',
    )
    expect(within(dialog).getByRole('radio', { name: 'Gear' })).not.toBeChecked()
    expect(restoreButton(dialog)).toBeDisabled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('404 closes the dialog with an "Already gone" toast and refetches', async () => {
    const { dialog, user, trash } = await openPicker([orphanList], 'Orphan')
    trash.state.entries = []
    await user.click(within(dialog).getByRole('radio', { name: 'Gear' }))
    await user.click(restoreButton(dialog))
    expect(await screen.findByText('Already gone')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Trash is empty')).toBeInTheDocument()
  })

  it('a 5xx shows an inline error with a Retry that restores to the same destination', async () => {
    const { dialog, user, trash } = await openPicker([orphanList], 'Orphan')
    let calls = 0
    server.use(
      http.post(restoreUrl(), () =>
        calls++ === 0 ? problemResponse(500, 'internal_error') : undefined,
      ),
    )
    await user.click(within(dialog).getByRole('radio', { name: 'Gear' }))
    await user.click(restoreButton(dialog))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nothing was changed')
    await user.click(within(dialog).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Restored “Orphan”')).toBeInTheDocument()
    expect(trash.calls('POST').at(-1)!.body).toEqual({ destination: { folder_id: ID.gear } })
  })
})
