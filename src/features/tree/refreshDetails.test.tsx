import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { apiUrl, ID, openTree, seedTree } from './treeTestKit'

const main = () => screen.getByRole('main')
const REFRESH = (id: string) => apiUrl(`/api/v1/lists/${id}/lookup-refresh`)

async function openMenu(id: string, tree = seedTree()) {
  const view = await openTree(`/lists/${id}`, tree)
  await within(main()).findByRole('heading', { level: 1 })
  await view.user.click(await within(main()).findByRole('button', { name: /^More actions for/ }))
  await screen.findByRole('menuitem', { name: 'Rename' })
  return view
}

const refreshItem = () => screen.queryByRole('menuitem', { name: 'Refresh details' })

describe('F025-W11 Refresh details in the list menu', () => {
  it('is offered for a movie list with items', async () => {
    await openMenu(ID.watchlist)
    expect(refreshItem()).toBeInTheDocument()
  })

  it('is offered for a TV list with items', async () => {
    await openMenu('7c1e5a10-0000-4000-8000-000000000014')
    expect(refreshItem()).toBeInTheDocument()
  })

  it('is hidden for a vehicle list, a no-type list and an empty movie list', async () => {
    await openMenu(ID.motorbikes)
    expect(refreshItem()).not.toBeInTheDocument()
  })

  it('is hidden for a list with no type', async () => {
    await openMenu(ID.ideas)
    expect(refreshItem()).not.toBeInTheDocument()
  })

  it('is hidden for a movie list without items', async () => {
    const tree = seedTree()
    tree.lists.find((l) => l.id === ID.watchlist)!.item_count = 0
    await openMenu(ID.watchlist, tree)
    expect(refreshItem()).not.toBeInTheDocument()
  })

  it('shows the counts, and "Run again" repeats the call while items remain', async () => {
    let calls = 0
    server.use(
      http.post(REFRESH(ID.watchlist), () => {
        calls += 1
        return HttpResponse.json(
          calls === 1
            ? { updated: 50, failed: 1, skipped: 0, remaining: 4 }
            : { updated: 4, failed: 0, skipped: 0, remaining: 0 },
        )
      }),
    )
    const { user } = await openMenu(ID.watchlist)
    await user.click(refreshItem()!)
    expect(await screen.findByText('50 updated, 1 failed')).toBeInTheDocument()
    expect(screen.getByText('4 more left, run again')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Run again' }))
    expect(await screen.findByText('4 updated')).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('explains when the server has the lookup turned off (503 lookup_disabled)', async () => {
    server.use(http.post(REFRESH(ID.watchlist), () => problemResponse(503, 'lookup_disabled')))
    const { user } = await openMenu(ID.watchlist)
    await user.click(refreshItem()!)
    expect(
      await screen.findByText('Details lookup is turned off on the server'),
    ).toBeInTheDocument()
  })

  it('a network failure gives a generic failure toast', async () => {
    server.use(http.post(REFRESH(ID.watchlist), () => HttpResponse.error()))
    const { user } = await openMenu(ID.watchlist)
    await user.click(refreshItem()!)
    expect(await screen.findByText('Couldn’t refresh details')).toBeInTheDocument()
  })
})
