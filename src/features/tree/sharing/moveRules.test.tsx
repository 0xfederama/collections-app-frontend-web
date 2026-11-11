import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw/http'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { problemResponse } from '../../../mocks/problems'
import { server } from '../../../mocks/server'
import { MEMBER_USER_ID, OWNER_USER_ID } from '../../../mocks/users'
import { renderWithProviders } from '../../../test-utils'
import { useTreeIndex } from '../api'
import type { TreeActions } from '../useTreeDialogs'
import { useTreeDialogs } from '../useTreeDialogs'
import { apiUrl, ID, installTreeBackend, openTree, pickRowAction, seedTree } from '../treeTestKit'

/** Media (and everything in it) shared with Alice; I own it. */
function sharedWithAlice() {
  const tree = seedTree()
  const media = tree.folders.find((f) => f.id === ID.media)!
  media.shared = true
  media.member_user_ids = [MEMBER_USER_ID]
  return tree
}

const dialog = () => screen.findByRole('dialog')
const alert = () => screen.findByRole('alertdialog')

async function pickDestination(name: string) {
  const dlg = await dialog()
  await userEvent.click(within(dlg).getByRole('radio', { name: new RegExp(`^${name}`) }))
  await userEvent.click(within(dlg).getByRole('button', { name: 'Move' }))
  return dlg
}

/** Renders `useTreeDialogs` with a button that runs `run(actions)`: the drag path has no keyboard route into a folder. */
function Harness({ run }: { run: (actions: TreeActions) => void }) {
  const { actions, dialogs } = useTreeDialogs()
  const status = useTreeIndex().status
  return (
    <>
      <span>{`tree ${status}`}</span>
      <button onClick={() => run(actions)}>go</button>
      {dialogs}
    </>
  )
}

/** Loads the tree, then runs `run` once; `override` handlers go in after the fake so they win. */
async function render(
  run: (actions: TreeActions) => void,
  tree = seedTree(),
  override?: Parameters<typeof server.use>,
) {
  const backend = installTreeBackend(tree)
  if (override) server.use(...override)
  const router = createMemoryRouter([{ path: '*', element: <Harness run={run} /> }])
  renderWithProviders(<RouterProvider router={router} />)
  const user = userEvent.setup()
  await screen.findByText('tree success')
  await user.click(screen.getByRole('button', { name: 'go' }))
  return { backend, user }
}

const drag = (
  tree: ReturnType<typeof seedTree>,
  id: string,
  into: string,
  override?: Parameters<typeof server.use>,
) => render((a) => a.applyMove({ id, group: 'g', from: 0, to: 0, into }), tree, override)

describe('F-027 W5 move out of a shared folder: Move dialog', () => {
  it('asks before moving a list out of a shared folder and names the other people', async () => {
    const { user, backend } = await openTree('/', sharedWithAlice())
    await pickRowAction(user, 'Watchlist', 'Move…')
    await pickDestination('Top level')
    const confirm = await alert()
    expect(within(confirm).getByText('Move ‘Watchlist’ out of ‘Media’?')).toBeInTheDocument()
    expect(confirm).toHaveTextContent('It becomes yours. Alice will no longer see it.')
    expect(backend.writes('POST')).toHaveLength(0)

    await user.click(within(confirm).getByRole('button', { name: 'Move' }))
    await waitFor(() =>
      expect(backend.writes('POST', `/api/v1/lists/${ID.watchlist}/move`)).toHaveLength(1),
    )
    expect(backend.writes('POST', `/api/v1/lists/${ID.watchlist}/move`)[0]?.body).toEqual({
      folder_id: null,
    })
  })

  it('cancel sends nothing', async () => {
    const { user, backend } = await openTree('/', sharedWithAlice())
    await pickRowAction(user, 'Watchlist', 'Move…')
    await pickDestination('Gear')
    const confirm = await alert()
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(backend.writes('POST')).toHaveLength(0)
    expect(screen.getByRole('dialog', { name: 'Move “Watchlist”' })).toBeInTheDocument()
  })

  it('asks for a folder inside the box as well', async () => {
    const { user } = await openTree('/', sharedWithAlice())
    await pickRowAction(user, 'Movies', 'Move…')
    await pickDestination('Gear')
    expect(await alert()).toHaveTextContent('Move ‘Movies’ out of ‘Media’?')
  })

  it('does not ask inside the same box', async () => {
    const { user, backend } = await openTree('/', sharedWithAlice())
    await pickRowAction(user, 'Watchlist', 'Move…')
    await pickDestination('TV')
    await waitFor(() =>
      expect(backend.writes('POST', `/api/v1/lists/${ID.watchlist}/move`)).toHaveLength(1),
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('does not ask when moving a private list into a shared folder', async () => {
    const { user, backend } = await openTree('/', sharedWithAlice())
    await pickRowAction(user, 'Wishlist', 'Move…')
    await pickDestination('Media')
    await waitFor(() =>
      expect(backend.writes('POST', `/api/v1/lists/${ID.wishlist}/move`)).toHaveLength(1),
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('does not ask when nothing is shared', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Watchlist', 'Move…')
    await pickDestination('Top level')
    await waitFor(() => expect(backend.writes('POST')).toHaveLength(1))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('F-027 W5 move out of a shared folder: drag into a folder', () => {
  it('asks first, then sends the move on confirm', async () => {
    const { backend, user } = await drag(sharedWithAlice(), ID.watchlist, ID.gear)
    const confirm = await alert()
    expect(confirm).toHaveTextContent('Move ‘Watchlist’ out of ‘Media’?')
    expect(confirm).toHaveTextContent('Alice will no longer see it.')
    expect(backend.writes('POST')).toHaveLength(0)
    await user.click(within(confirm).getByRole('button', { name: 'Move' }))
    await waitFor(() =>
      expect(backend.writes('POST', `/api/v1/lists/${ID.watchlist}/move`)).toHaveLength(1),
    )
  })

  it('cancel sends nothing', async () => {
    const { backend, user } = await drag(sharedWithAlice(), ID.movies, ID.gear)
    await user.click(within(await alert()).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(backend.writes('POST')).toHaveLength(0)
  })

  it('moves within the box without asking', async () => {
    const { backend } = await drag(sharedWithAlice(), ID.watchlist, ID.tv)
    await waitFor(() =>
      expect(backend.writes('POST', `/api/v1/lists/${ID.watchlist}/move`)).toHaveLength(1),
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('lists the owner when the shared folder is not mine', async () => {
    const tree = sharedWithAlice()
    const media = tree.folders.find((f) => f.id === ID.media)!
    media.owner_user_id = MEMBER_USER_ID
    media.member_user_ids = [OWNER_USER_ID]
    await drag(tree, ID.watchlist, ID.gear)
    expect(await alert()).toHaveTextContent('It becomes yours. Alice will no longer see it.')
  })
})

describe('F-027 W5 errors', () => {
  it('403 forbidden on a move says only the owner can do that', async () => {
    const { user } = await openTree()
    server.use(
      http.post(apiUrl(`/api/v1/folders/${ID.gear}/move`), () => problemResponse(403, 'forbidden')),
    )
    await pickRowAction(user, 'Gear', 'Move…')
    const dlg = await pickDestination('Media')
    expect(await within(dlg).findByRole('alert')).toHaveTextContent(
      'Only the owner of ‘Gear’ can do that.',
    )
  })

  it('409 folder_shared says a shared folder cannot go inside another', async () => {
    const { user } = await openTree()
    server.use(
      http.post(apiUrl(`/api/v1/folders/${ID.gear}/move`), () =>
        problemResponse(409, 'folder_shared'),
      ),
    )
    await pickRowAction(user, 'Gear', 'Move…')
    const dlg = await pickDestination('Media')
    expect(await within(dlg).findByRole('alert')).toHaveTextContent(
      'A shared folder can’t go inside another folder.',
    )
  })

  it('the dev fake answers 409 folder_shared for a folder with members moved into a folder', async () => {
    const tree = seedTree()
    const gear = tree.folders.find((f) => f.id === ID.gear)!
    gear.member_user_ids = [MEMBER_USER_ID]
    gear.shared = true
    const backend = installTreeBackend(tree)
    const response = await fetch(apiUrl(`/api/v1/folders/${ID.gear}/move`), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'If-Match': `"f-${backend.state.folders.find((f) => f.id === ID.gear)!.version}"`,
      },
      body: JSON.stringify({ parent_folder_id: ID.media }),
    })
    expect(response.status).toBe(409)
    expect(((await response.json()) as { code: string }).code).toBe('folder_shared')
  })

  it('409 destination_unavailable on a drag says the place is gone', async () => {
    await drag(seedTree(), ID.wishlist, ID.gear, [
      http.post(apiUrl(`/api/v1/lists/${ID.wishlist}/move`), () =>
        problemResponse(409, 'destination_unavailable'),
      ),
    ])
    expect(
      await screen.findByText('That place is no longer available. Pick another one.'),
    ).toBeInTheDocument()
  })

  it('403 forbidden on delete says only the owner can do that', async () => {
    const { user } = await openTree()
    server.use(
      http.delete(apiUrl(`/api/v1/folders/${ID.gear}`), () => problemResponse(403, 'forbidden')),
    )
    await pickRowAction(user, 'Gear', 'Delete')
    const dlg = await alert()
    await user.click(within(dlg).getByRole('button', { name: 'Move to Trash' }))
    expect(await within(dlg).findByRole('alert')).toHaveTextContent(
      'Only the owner of ‘Gear’ can do that.',
    )
  })

  it('409 order_stale on a reorder refetches and asks to try again', async () => {
    await render((a) => a.nudge(ID.vehicles, 1), seedTree(), [
      http.put(apiUrl('/api/v1/folders/order'), () => problemResponse(409, 'order_stale')),
    ])
    expect(await screen.findByText('The order changed elsewhere. Try again.')).toBeInTheDocument()
  })
})

describe('F-027 W5 delete', () => {
  it('a shared folder I own warns that the people it is shared with lose it too', async () => {
    const { user } = await openTree('/', sharedWithAlice())
    await pickRowAction(user, 'Media', 'Delete')
    expect(await alert()).toHaveTextContent('The people it’s shared with lose it too.')
  })

  it('a private folder has no such warning', async () => {
    const { user } = await openTree()
    await pickRowAction(user, 'Media', 'Delete')
    expect(await alert()).not.toHaveTextContent('lose it too')
  })
})
