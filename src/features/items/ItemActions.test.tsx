import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../app/router'
import { ToastProvider } from '../../components/ui'
import { exampleResponses } from '../../generated/examples'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { createTestQueryClient, mockViewport } from '../../test-utils'
import type { Item } from './api'

const WATCHLIST = '7c1e5a10-0000-4000-8000-000000000011'
const MOTORBIKES = '7c1e5a10-0000-4000-8000-000000000012'
const ITEM = '7c1e5a10-0000-4000-8000-000000000101'
const PATH = `/lists/${WATCHLIST}/items/${ITEM}`
const itemUrl = `${location.origin}/api/v1/items/${ITEM}`
const moveUrl = `${itemUrl}/move`

const matrix = exampleResponses.getItem.body as Item

function renderRouter(path = PATH) {
  mockViewport(1100)
  const router = createTestRouter([path])
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return router
}

/** Counts the GETs of the item. */
function countItemGets() {
  const count = { value: 0 }
  server.use(
    http.get(itemUrl, () => {
      count.value++
      return HttpResponse.json(matrix)
    }),
  )
  return count
}

async function openDelete(path = PATH) {
  const router = renderRouter(path)
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Delete' }))
  const dialog = await screen.findByRole('alertdialog')
  return { router, user, dialog }
}

const CARS = '7c1e5a10-0000-4000-8000-000000000013'

/**
 * The example tree has one list per kind. The move picker only offers lists of the item's kind
 * (F007-W7), so Motorbikes is served as a movie list here, next to a Cars list of another kind.
 */
function serveMoveTree() {
  const tree = exampleResponses.getTree.body as {
    folders: unknown[]
    lists: Record<string, unknown>[]
  }
  const motorbikes = tree.lists.find((list) => list.id === MOTORBIKES)!
  server.use(
    http.get(`${location.origin}/api/v1/tree`, () =>
      HttpResponse.json({
        ...tree,
        lists: [
          ...tree.lists.filter((list) => list.id !== MOTORBIKES),
          { ...motorbikes, kind: 'movie' },
          { ...motorbikes, id: CARS, name: 'Cars', kind: 'car', sort_order: 1 },
        ],
      }),
    ),
  )
}

async function openMove(path = PATH) {
  serveMoveTree()
  const router = renderRouter(path)
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Move' }))
  const dialog = await screen.findByRole('dialog', { name: /Move/ })
  return { router, user, dialog }
}

const confirmDelete = (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) =>
  user.click(within(dialog).getByRole('button', { name: 'Delete' }))

describe('F009-W4 Move and Delete at the bottom of the item page', () => {
  it('the "…" menu is gone and both buttons live in the footer', async () => {
    renderRouter()
    await screen.findByRole('heading', { name: 'The Matrix', level: 1 })
    expect(screen.queryByRole('button', { name: 'Item actions' })).not.toBeInTheDocument()
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('button', { name: 'Move' })).toBeInTheDocument()
    expect(within(footer).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(within(footer).getByText(/^Updated/)).toBeInTheDocument()
  })

  it('Delete keeps its confirmation and is reachable from the keyboard alone', async () => {
    renderRouter()
    await screen.findByRole('heading', { name: 'The Matrix', level: 1 })
    const remove = within(screen.getByRole('contentinfo')).getByRole('button', { name: 'Delete' })
    remove.focus()
    await userEvent.keyboard('{Enter}')
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Delete “The Matrix”?')
    expect(dialog).toHaveTextContent(/Trash/)
  })
})

describe('AT-11 delete item (moves it to Trash)', () => {
  it('asks for confirmation and mentions Trash', async () => {
    const { dialog } = await openDelete()
    expect(
      within(dialog).getByRole('heading', { name: 'Delete “The Matrix”?' }),
    ).toBeInTheDocument()
    expect(dialog).toHaveTextContent(/Trash/)
  })

  it('F006-W4 the confirm states the same counts as the item Trash entry ("1 item")', async () => {
    const { dialog } = await openDelete()
    expect(dialog).toHaveTextContent('This moves “The Matrix” to Trash: 1 item.')
  })

  it('Cancel closes the dialog and sends nothing', async () => {
    let deletes = 0
    server.use(http.delete(itemUrl, () => (deletes++, new HttpResponse(null, { status: 204 }))))
    const { user, dialog } = await openDelete()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(deletes).toBe(0)
  })

  it('confirm sends DELETE with If-Match "i-3", then goes to the list and keeps ?q=', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.delete(itemUrl, ({ request }) => {
        seen.push(request.headers.get('If-Match'))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { router, user, dialog } = await openDelete(`${PATH}?q=mat`)
    await confirmDelete(user, dialog)

    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${WATCHLIST}`))
    expect(router.state.location.search).toBe('?q=mat')
    expect(seen).toEqual(['"i-3"'])
    expect(await screen.findByText('Item moved to Trash')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Watchlist' })).toBeInTheDocument()
  })

  it('412 shows the conflict, keeps the dialog open and refetches the item', async () => {
    const gets = countItemGets()
    server.use(http.delete(itemUrl, () => problemResponse(412, 'version_conflict')))
    const { router, user, dialog } = await openDelete()
    expect(gets.value).toBe(1)
    await confirmDelete(user, dialog)

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Someone else changed this item',
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await waitFor(() => expect(gets.value).toBe(2))
    expect(router.state.location.pathname).toBe(PATH)
  })

  it('404 shows a toast and goes back to the list', async () => {
    server.use(http.delete(itemUrl, () => problemResponse(404, 'not_found')))
    const { router, user, dialog } = await openDelete(`${PATH}?q=mat`)
    await confirmDelete(user, dialog)

    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${WATCHLIST}`))
    expect(router.state.location.search).toBe('?q=mat')
    expect(await screen.findByText('This item no longer exists.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('a network error keeps the dialog open with a retryable message', async () => {
    server.use(http.delete(itemUrl, () => HttpResponse.error()))
    const { router, user, dialog } = await openDelete()
    await confirmDelete(user, dialog)

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'server could not be reached',
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(PATH)
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeEnabled()
  })
})

describe('move item (UI_SPEC §9 errors)', () => {
  it('F007-W7 offers only lists of the item’s kind, with the current one disabled and labelled', async () => {
    const { user, dialog } = await openMove()
    await user.click(within(dialog).getByRole('combobox', { name: 'Destination list' }))
    const current = await screen.findByRole('option', { name: /\(current list\)/ })
    expect(current).toHaveTextContent('Watchlist (current list)')
    expect(current).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('option', { name: 'Vehicles › Motorbikes' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.queryByRole('option', { name: /Cars/ })).not.toBeInTheDocument()
  })

  it('the Move button is disabled until a list is chosen', async () => {
    const { user, dialog } = await openMove()
    const submit = within(dialog).getByRole('button', { name: 'Move' })
    expect(submit).toBeDisabled()
    await user.click(within(dialog).getByRole('combobox', { name: 'Destination list' }))
    await user.click(await screen.findByRole('option', { name: 'Vehicles › Motorbikes' }))
    expect(submit).toBeEnabled()
  })

  it('choosing the current list does not enable Move', async () => {
    const { user, dialog } = await openMove()
    await user.click(within(dialog).getByRole('combobox', { name: 'Destination list' }))
    await user.click(await screen.findByRole('option', { name: /\(current list\)/ }))
    expect(within(dialog).getByRole('button', { name: 'Move' })).toBeDisabled()
  })

  async function chooseMotorbikes(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
    await user.click(within(dialog).getByRole('combobox', { name: 'Destination list' }))
    await user.click(await screen.findByRole('option', { name: 'Vehicles › Motorbikes' }))
  }

  it('sends POST with If-Match "i-3" and {list_id}, then opens the item in its new list', async () => {
    const seen: { ifMatch: string | null; body: unknown }[] = []
    let moved = false
    server.use(
      http.post(moveUrl, async ({ request }) => {
        seen.push({ ifMatch: request.headers.get('If-Match'), body: await request.json() })
        moved = true
        return HttpResponse.json({ ...matrix, list_id: MOTORBIKES, version: 4 })
      }),
      http.get(itemUrl, () =>
        HttpResponse.json(moved ? { ...matrix, list_id: MOTORBIKES, version: 4 } : matrix),
      ),
    )
    const { router, user, dialog } = await openMove()
    await chooseMotorbikes(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Move' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${MOTORBIKES}/items/${ITEM}`),
    )
    expect(seen).toEqual([{ ifMatch: '"i-3"', body: { list_id: MOTORBIKES } }])
    expect(await screen.findByText('Item moved')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Back to Motorbikes/ })).toBeInTheDocument()
  })

  it('409 says the list is gone and keeps the dialog open', async () => {
    server.use(http.post(moveUrl, () => problemResponse(409, 'conflict')))
    const { router, user, dialog } = await openMove()
    await chooseMotorbikes(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Move' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'no longer exists or is in Trash',
    )
    expect(screen.getByRole('dialog', { name: /Move/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(PATH)
  })

  it('F007-W7 409 kind_mismatch explains that items only move within a kind', async () => {
    server.use(http.post(moveUrl, () => problemResponse(409, 'kind_mismatch')))
    const { router, user, dialog } = await openMove()
    await chooseMotorbikes(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Move' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'only move to lists of the same kind',
    )
    expect(screen.getByRole('dialog', { name: /Move/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(PATH)
  })

  it('412 shows the conflict, keeps the dialog open and refetches the item', async () => {
    const gets = countItemGets()
    server.use(http.post(moveUrl, () => problemResponse(412, 'version_conflict')))
    const { user, dialog } = await openMove()
    await chooseMotorbikes(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Move' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Someone else changed this item',
    )
    expect(screen.getByRole('dialog', { name: /Move/ })).toBeInTheDocument()
    await waitFor(() => expect(gets.value).toBe(2))
  })

  it('404 shows a toast and goes back to the list', async () => {
    server.use(http.post(moveUrl, () => problemResponse(404, 'not_found')))
    const { router, user, dialog } = await openMove(`${PATH}?q=mat`)
    await chooseMotorbikes(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Move' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${WATCHLIST}`))
    expect(router.state.location.search).toBe('?q=mat')
    expect(await screen.findByText('This item no longer exists.')).toBeInTheDocument()
  })

  it('a network error keeps the dialog open', async () => {
    server.use(http.post(moveUrl, () => HttpResponse.error()))
    const { user, dialog } = await openMove()
    await chooseMotorbikes(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Move' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'server could not be reached',
    )
  })
})
