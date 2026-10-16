import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { devTrash } from '../../mocks/devTrash'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { renderAt } from '../../test-utils'
import { absoluteTime } from './model'
import { buttonName, entry, installTrash, openTrash, rowOf, waitForRows } from './trashTestKit'

const trashUrl = () => `${globalThis.location.origin}/api/v1/trash`

describe('AT-11 trash list states', () => {
  it('shows a loading skeleton while the first page is on its way', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const trash = installTrash()
    server.use(
      http.get(trashUrl(), async () => {
        await gate
        return undefined
      }),
    )
    renderAt('/trash')
    expect(await screen.findByTestId('trash-skeleton')).toBeInTheDocument()
    expect(screen.getByText('Loading Trash')).toBeInTheDocument()
    release()
    await waitForRows()
    expect(screen.queryByTestId('trash-skeleton')).not.toBeInTheDocument()
    expect(trash.calls('GET').length).toBeGreaterThan(0)
  })

  it('shows "Trash is empty" when there is nothing', async () => {
    await openTrash([])
    expect(await screen.findByText('Trash is empty')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Restore/ })).not.toBeInTheDocument()
  })

  it('centres the empty state in the whole content area, like Home (F009-W7)', async () => {
    await openTrash([])
    const heading = await screen.findByRole('heading', { name: 'Trash is empty' })
    // The shared EmptyState block, unchanged: centred text in its own column.
    const emptyState = heading.parentElement!
    expect(emptyState).toHaveClass('flex', 'items-center', 'text-center')
    // It sits directly in the page, which no longer caps its width, so `items-center` centres it
    // in the whole content area instead of in the narrow column the rows use.
    const page = emptyState.closest('section')!
    expect(page).not.toHaveClass('max-w-5xl')
    expect(emptyState.parentElement).toBe(page)
  })

  it('shows an error with Retry when loading fails, and Retry loads the list', async () => {
    const trash = installTrash()
    let fail = true
    server.use(
      http.get(trashUrl(), () => (fail ? problemResponse(500, 'internal_error') : undefined)),
    )
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderAt('/trash')
    expect(await screen.findByText('Trash could not be loaded.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await rowOf('Crime')).toBeDefined()
    expect(screen.queryByText('Trash could not be loaded.')).not.toBeInTheDocument()
    expect(trash.calls('GET').length).toBeGreaterThan(0)
  })

  it('keeps showing a network failure as an error with Retry', async () => {
    installTrash()
    server.use(http.get(trashUrl(), () => HttpResponse.error()))
    renderAt('/trash')
    expect(await screen.findByText('Trash could not be loaded.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
  })
})

describe('AT-11 trash rows', () => {
  it('renders one row per batch, newest first, with type, former path and counts', async () => {
    await openTrash()
    const rows = await waitForRows()
    expect(rows).toHaveLength(devTrash.length)
    // With rows in it, the page is the narrow column again (the empty state is the only full width).
    expect(rows[0]?.closest('section')).toHaveClass('max-w-5xl')
    expect(rows.map((li) => li.querySelector('span.truncate')?.textContent)).toEqual([
      'Crime',
      'Heat',
      'Old media',
      'Tenet',
      'Old cameras',
    ])

    const heat = await rowOf('Heat')
    expect(heat.getByText('Item')).toBeInTheDocument()
    expect(heat.getByText('Media › Crime')).toBeInTheDocument()
    expect(heat.getByText('1 item')).toBeInTheDocument()

    const oldMedia = await rowOf('Old media')
    expect(oldMedia.getByText('Folder')).toBeInTheDocument()
    expect(oldMedia.getByText('Top level')).toBeInTheDocument()
    expect(oldMedia.getByText('2 folders, 3 lists, 41 items')).toBeInTheDocument()

    const cameras = await rowOf('Old cameras')
    expect(cameras.getByText('List')).toBeInTheDocument()
    expect(cameras.getByText('1 list, 17 items')).toBeInTheDocument()
  })

  it('shows the deleted time relative, with the absolute time as title', async () => {
    await openTrash()
    const crime = await rowOf('Crime')
    const relative = crime.getByText('1 hour ago')
    const time = relative.closest('time')!
    expect(time).toHaveAttribute('title', absoluteTime(devTrash[0]!.deleted_at))
    expect(time).toHaveAttribute('datetime', devTrash[0]!.deleted_at)
    expect((await rowOf('Old media')).getByText('3 days ago')).toBeInTheDocument()
  })

  it('gives restorable rows "Restore" and blocked rows "Restore to…"', async () => {
    await openTrash()
    const crime = await rowOf('Crime')
    expect(crime.getByRole('button', { name: buttonName('Restore', 'Crime') })).toBeInTheDocument()
    expect(crime.queryByRole('button', { name: /^Restore to…/ })).not.toBeInTheDocument()
    expect(
      crime.getByRole('button', { name: buttonName('Delete permanently', 'Crime') }),
    ).toBeInTheDocument()

    const heat = await rowOf('Heat')
    expect(
      heat.getByRole('button', { name: buttonName('Restore to…', 'Heat') }),
    ).toBeInTheDocument()
    expect(
      heat.queryByRole('button', { name: buttonName('Restore', 'Heat') }),
    ).not.toBeInTheDocument()
  })
})

describe('AT-11 trash pagination', () => {
  const many = Array.from({ length: 60 }, (_, i) => entry(i))

  it('loads 50 rows, then the rest with "Load more" using the offset', async () => {
    const { user, trash } = await openTrash(many)
    expect(await waitForRows()).toHaveLength(50)
    expect(trash.call('GET', 0).search.get('offset')).toBe('0')

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await waitFor(async () => expect(await waitForRows()).toHaveLength(60))
    const gets = trash.calls('GET')
    expect(gets.at(-1)!.search.get('offset')).toBe('50')
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('has no "Load more" when everything fits in one page', async () => {
    await openTrash()
    await waitForRows()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })
})

describe('AT-11 trash is fresh on every visit', () => {
  it('refetches when the page is opened again with a warm cache', async () => {
    const { client, trash, unmount } = await openTrash()
    await waitForRows()
    const before = trash.calls('GET').length
    unmount()

    // Something was trashed meanwhile, elsewhere in the app.
    trash.state.entries.unshift(entry(1, { root_name: 'Deleted meanwhile' }))
    renderAt('/trash', client)
    // The cached rows may flash, but the fresh answer must arrive.
    expect(await rowOf('Deleted meanwhile')).toBeDefined()
    expect(trash.calls('GET').length).toBeGreaterThan(before)
  })
})
