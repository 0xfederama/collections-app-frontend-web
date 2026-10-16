import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { entry, openTrash, T } from './trashTestKit'

const emptyUrl = () => `${globalThis.location.origin}/api/v1/trash`

describe('F012-W3 empty trash', () => {
  it('keeps the action visible and disables it when the trash is empty', async () => {
    await openTrash([])
    expect(await screen.findByText('Trash is empty')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Empty trash' })).toBeDisabled()
  })

  it('loads every page, counts contained items, and sends one DELETE after confirmation', async () => {
    const entries = Array.from({ length: 60 }, (_, index) =>
      entry(index, { counts: { folders: 0, lists: 1, items: index === 0 ? 4 : 1 } }),
    )
    const { user, trash } = await openTrash(entries)
    const button = await screen.findByRole('button', { name: 'Empty trash' })
    await user.click(button)
    const dialog = await screen.findByRole('alertdialog', { name: 'Empty trash permanently?' })
    expect(dialog).toHaveTextContent('60 trash entries and 63 items')
    expect(trash.calls('GET').map((request) => request.search.get('offset'))).toEqual(['0', '50'])
    expect(trash.calls('DELETE', '/api/v1/trash')).toHaveLength(0)

    await user.click(within(dialog).getByRole('button', { name: 'Empty trash' }))
    expect(await screen.findByText('Trash emptied')).toBeInTheDocument()
    expect(trash.calls('DELETE', '/api/v1/trash')).toHaveLength(1)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Empty trash' })).toBeDisabled())
  })

  it('keeps the confirmation open after a server error and retries with one request', async () => {
    const { user, trash } = await openTrash()
    await user.click(await screen.findByRole('button', { name: 'Empty trash' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Empty trash permanently?' })
    let calls = 0
    server.use(
      http.delete(emptyUrl(), () =>
        calls++ === 0 ? problemResponse(500, 'internal_error') : undefined,
      ),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Empty trash' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nothing was changed')
    await user.click(within(dialog).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Trash emptied')).toBeInTheDocument()
    expect(trash.calls('DELETE', '/api/v1/trash')).toHaveLength(2)
  })

  it('includes root items and nested batch counts in the confirmation', async () => {
    const { user } = await openTrash([
      {
        id: T.crime,
        root_type: 'list',
        root_id: T.heat,
        root_name: 'Crime',
        former_path: [],
        deleted_at: new Date().toISOString(),
        counts: { folders: 0, lists: 1, items: 3 },
        restorable_in_place: true,
      },
      entry(1, { counts: { folders: 0, lists: 1, items: 1 } }),
    ])
    await user.click(await screen.findByRole('button', { name: 'Empty trash' }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('2 trash entries and 4 items')
  })
})
