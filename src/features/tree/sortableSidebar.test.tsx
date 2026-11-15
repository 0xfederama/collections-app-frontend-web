import { waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { drop, pickUp, stubLayout } from '../../test-drag'
import { ID, openTree, rowNames, sidebar } from './testing'

describe('AT-21 keyboard drag in the sidebar (web)', () => {
  beforeEach(stubLayout)

  it('dragging a root folder one place down moves it before the next sibling', async () => {
    const { user, backend } = await openTree()
    const handle = await pickUp(user, 'Media')
    await user.keyboard('{ArrowDown}')
    await drop(user, handle)

    await waitFor(() =>
      expect(backend.writes('POST', `/api/v1/folders/${ID.media}/move`)).toHaveLength(1),
    )
    expect(backend.writes('POST', `/api/v1/folders/${ID.media}/move`)[0]?.body).toEqual({
      parent_folder_id: null,
      before_id: ID.gear,
    })
    expect(backend.writes('PUT')).toHaveLength(0)
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
