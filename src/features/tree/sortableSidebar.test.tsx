import { waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { drop, pickUp, stubLayout } from '../../test-drag'
import { ID, openTree, rowNames, sidebar } from './testing'

describe('AT-21 keyboard drag in the sidebar (web)', () => {
  beforeEach(stubLayout)

  it('dragging a root folder one place down PUTs the full new order', async () => {
    const { user, backend } = await openTree()
    const handle = await pickUp(user, 'Media')
    await user.keyboard('{ArrowDown}')
    await drop(user, handle)

    await waitFor(() => expect(backend.writes('PUT')).toHaveLength(1))
    expect(backend.writes('PUT')[0]).toMatchObject({
      path: '/api/v1/folders/order',
      body: { parent_folder_id: null, ids: [ID.vehicles, ID.media, ID.gear, ID.empty] },
    })
    await waitFor(() =>
      expect(
        within(sidebar())
          .getAllByRole('treeitem')
          .map((row) => row.getAttribute('data-tree-id'))
          .filter((rowId) => [ID.media, ID.vehicles].includes(rowId ?? ''))
          .join(),
      ).toBe([ID.vehicles, ID.media].join()),
    )
    expect(rowNames()).toContain('Media')
  })
})
