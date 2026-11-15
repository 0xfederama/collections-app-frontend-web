import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { stubLayout } from '../../test-drag'
import { MEMBER_USER_ID } from '../../mocks/users'
import { ID, openTree, seedTree, sidebar } from './treeTestKit'

// Pointer drags in the sidebar, end to end through the stateful fake (web 3.3.0, D-158). jsdom has no
// layout, so `stubLayout` stacks the rows 36 px apart in DOM order; with every folder open the rows are
// Media, Movies, Festival picks, Cannes, Watchlist, Seen, TV, Currently watching, Vehicles, Motorbikes,
// Cars, Gear, Gadgets, Empty folder, Wishlist, Ideas. dnd-kit keeps a placeholder where the lifted row
// was, so rows below it shift by one slot while it is lifted.
const ROWS = [
  ID.media,
  ID.movies,
  ID.festival,
  ID.cannes,
  ID.watchlist,
  ID.seen,
  ID.tv,
  '7c1e5a10-0000-4000-8000-000000000014',
  ID.vehicles,
  ID.motorbikes,
  ID.cars,
  ID.gear,
  '7c1e5a10-0000-4000-8000-000000000017',
  ID.empty,
  ID.wishlist,
  ID.ideas,
]
const HEIGHT = 36

/** Pointer y at `where` of row `id` while `source` is lifted. */
function yOf(id: string, where: 'top' | 'middle' | 'bottom', source: string) {
  const at = ROWS.indexOf(id) + (ROWS.indexOf(id) > ROWS.indexOf(source) ? 1 : 0)
  return at * HEIGHT + { top: 4, middle: HEIGHT / 2, bottom: HEIGHT - 4 }[where]
}

async function dragTo(source: string, y: number) {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  const row = within(sidebar()).getAllByRole('treeitem')[ROWS.indexOf(source)]
  if (!row) throw new Error('no row')
  const startY = ROWS.indexOf(source) * HEIGHT + 10
  await user.pointer([
    { keys: '[MouseLeft>]', target: row, coords: { clientX: 20, clientY: startY } },
    { coords: { clientX: 20, clientY: startY + 20 } },
    { coords: { clientX: 20, clientY: y } },
  ])
  await screen.findByText(/^Picked up /)
  return user
}

const drop = (user: ReturnType<typeof userEvent.setup>) => user.pointer({ keys: '[/MouseLeft]' })
const line = () => document.querySelector('[data-tree-drop-line]')

describe('web 3.3.0 sidebar pointer drag', () => {
  beforeEach(stubLayout)

  it('a list dropped between two lists of another folder moves there at that place', async () => {
    const { backend } = await openTree()
    const user = await dragTo(ID.wishlist, yOf(ID.seen, 'top', ID.wishlist))
    await waitFor(() => expect(line()).not.toBeNull())
    expect(line()).toHaveAttribute('data-tree-drop-line', 'before')
    expect(line()).toHaveAttribute('data-tree-drop-level', '3')
    await drop(user)
    await waitFor(() =>
      expect(backend.writes('POST', `/api/v1/lists/${ID.wishlist}/move`)).toHaveLength(1),
    )
    expect(backend.writes('POST', `/api/v1/lists/${ID.wishlist}/move`)[0]?.body).toEqual({
      folder_id: ID.movies,
      before_id: ID.seen,
    })
    expect(line()).toBeNull()
  })

  it('a folder dropped on a folder’s middle goes into it, last', async () => {
    const { backend } = await openTree()
    const user = await dragTo(ID.gear, yOf(ID.vehicles, 'middle', ID.gear))
    await waitFor(() =>
      expect(within(sidebar()).getAllByRole('treeitem')[ROWS.indexOf(ID.vehicles)]).toHaveClass(
        'bg-accent-tint',
      ),
    )
    expect(line()).toBeNull()
    await drop(user)
    await waitFor(() =>
      expect(backend.writes('POST', `/api/v1/folders/${ID.gear}/move`)).toHaveLength(1),
    )
    expect(backend.writes('POST', `/api/v1/folders/${ID.gear}/move`)[0]?.body).toEqual({
      parent_folder_id: ID.vehicles,
      before_id: null,
    })
  })

  it('out of a folder to the top level, below the last row', async () => {
    const { backend } = await openTree()
    const user = await dragTo(ID.watchlist, 1000)
    await drop(user)
    await waitFor(() =>
      expect(backend.writes('POST', `/api/v1/lists/${ID.watchlist}/move`)).toHaveLength(1),
    )
    expect(backend.writes('POST', `/api/v1/lists/${ID.watchlist}/move`)[0]?.body).toEqual({
      folder_id: null,
      before_id: null,
    })
  })

  it('inside one parent it is a reorder, not a move', async () => {
    const { backend } = await openTree()
    const user = await dragTo(ID.gear, yOf(ID.vehicles, 'top', ID.gear))
    await drop(user)
    await waitFor(() => expect(backend.writes('PUT')).toHaveLength(1))
    expect(backend.writes('PUT')[0]).toMatchObject({
      path: '/api/v1/folders/order',
      body: { parent_folder_id: null, ids: [ID.media, ID.gear, ID.vehicles, ID.empty] },
    })
    expect(backend.writes('POST')).toHaveLength(0)
  })

  it('a folder into its own descendant: no line, nothing sent', async () => {
    const { backend } = await openTree()
    const user = await dragTo(ID.media, yOf(ID.movies, 'middle', ID.media))
    expect(line()).toBeNull()
    await drop(user)
    await screen.findByText(/^Dropped Media/)
    expect(backend.writes()).toHaveLength(0)
  })

  it('dropping where it already is sends nothing', async () => {
    const { backend } = await openTree()
    const user = await dragTo(ID.gear, yOf(ID.empty, 'top', ID.gear))
    expect(line()).toBeNull()
    await drop(user)
    await screen.findByText(/^Dropped Gear/)
    expect(backend.writes()).toHaveLength(0)
  })

  it('taking a list out of a shared folder asks first', async () => {
    const tree = seedTree()
    const media = tree.folders.find((f) => f.id === ID.media)!
    media.shared = true
    media.member_user_ids = [MEMBER_USER_ID]
    const { backend } = await openTree('/', tree)
    const user = await dragTo(ID.watchlist, 1000)
    await drop(user)
    const confirm = await screen.findByRole('alertdialog')
    expect(confirm).toHaveTextContent('Move ‘Watchlist’ out of ‘Media’?')
    expect(backend.writes('POST')).toHaveLength(0)
    await userEvent.click(within(confirm).getByRole('button', { name: 'Move' }))
    await waitFor(() => expect(backend.writes('POST')).toHaveLength(1))
  })
})
