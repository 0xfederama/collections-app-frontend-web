import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw/http'
import { describe, expect, it, vi } from 'vitest'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { buttonName, openTrash, rowOf, T, waitForRows } from './trashTestKit'

const deleteUrl = () => `${globalThis.location.origin}/api/v1/trash/:batchId`
const rowTitles = async () =>
  (await waitForRows()).map((li) => li.querySelector('span.truncate')?.textContent)

async function openPurge(name: string) {
  const ctx = await openTrash()
  const row = await rowOf(name)
  await ctx.user.click(row.getByRole('button', { name: buttonName('Delete permanently', name) }))
  const dialog = await screen.findByRole('alertdialog', { name: 'Delete permanently?' })
  return { ...ctx, dialog }
}
const confirmButton = (dialog: HTMLElement) =>
  within(dialog).getByRole('button', { name: 'Delete permanently' })

describe('AT-11 purge confirmation', () => {
  it('states the counts, the image files and the older nested entries for a folder', async () => {
    const { dialog } = await openPurge('Old media')
    expect(dialog).toHaveTextContent('permanently deletes the folder “Old media”')
    expect(dialog).toHaveTextContent('2 folders, 3 lists, 41 items')
    expect(dialog).toHaveTextContent('image files')
    expect(dialog).toHaveTextContent('Older entries in Trash that were inside it are deleted too')
    expect(dialog).toHaveTextContent('can’t be undone')
  })

  it('says the same for a list', async () => {
    const { dialog } = await openPurge('Old cameras')
    expect(dialog).toHaveTextContent('the list “Old cameras”')
    expect(dialog).toHaveTextContent('1 list, 17 items')
    expect(dialog).toHaveTextContent('Older entries in Trash')
  })

  it('does not mention nested entries for a single item', async () => {
    const { dialog } = await openPurge('Heat')
    expect(dialog).toHaveTextContent('the item “Heat”')
    expect(dialog).toHaveTextContent('image files')
    expect(dialog).not.toHaveTextContent('Older entries')
  })

  it('has no type-to-confirm input', async () => {
    const { dialog } = await openPurge('Old media')
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
    expect(confirmButton(dialog)).toBeEnabled()
  })

  it('Cancel closes the dialog and never calls DELETE', async () => {
    const { dialog, user, trash } = await openPurge('Old media')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(trash.calls('DELETE')).toHaveLength(0)
    expect(await rowTitles()).toContain('Old media')
  })

  it('Escape also cancels without calling DELETE', async () => {
    const { user, trash } = await openPurge('Old media')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(trash.calls('DELETE')).toHaveLength(0)
  })
})

describe('AT-11 purge', () => {
  it('confirming calls DELETE, toasts and removes the row', async () => {
    const { dialog, user, trash } = await openPurge('Old media')
    await user.click(confirmButton(dialog))

    expect(await screen.findByText('Permanently deleted “Old media”')).toBeInTheDocument()
    expect(trash.calls('DELETE')).toHaveLength(1)
    expect(trash.call('DELETE', 0).path).toBe(`/api/v1/trash/${T.oldMedia}`)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(async () => expect(await rowTitles()).not.toContain('Old media'))
  })

  it('invalidates tree, list, item and search queries', async () => {
    const { dialog, user, client } = await openPurge('Old cameras')
    const spy = vi.spyOn(client, 'invalidateQueries')
    await user.click(confirmButton(dialog))
    await screen.findByText('Permanently deleted “Old cameras”')
    const keys = spy.mock.calls.map(([filters]) => (filters?.queryKey ?? []).join('/'))
    expect(keys).toEqual(expect.arrayContaining(['trash', 'tree', 'lists', 'items', 'search']))
  })

  it('404: closes with an "Already gone" toast and the refetch drops the row', async () => {
    const { dialog, user, trash } = await openPurge('Old media')
    trash.state.entries = trash.state.entries.filter((e) => e.id !== T.oldMedia)
    await user.click(confirmButton(dialog))

    expect(await screen.findByText('Already gone')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(async () => expect(await rowTitles()).not.toContain('Old media'))
  })

  it('a 5xx keeps the dialog open with an inline error and a Retry that purges', async () => {
    const { dialog, user, trash } = await openPurge('Old media')
    let calls = 0
    server.use(
      http.delete(deleteUrl(), () =>
        calls++ === 0 ? problemResponse(500, 'internal_error') : undefined,
      ),
    )
    await user.click(confirmButton(dialog))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nothing was changed')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Permanently deleted “Old media”')).toBeInTheDocument()
    expect(trash.state.entries.map((e) => e.id)).not.toContain(T.oldMedia)
  })
})
