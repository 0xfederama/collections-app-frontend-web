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

const LIST = '7c1e5a10-0000-4000-8000-000000000011'
const ID = '7c1e5a10-0000-4000-8000-000000000101'
const url = `${location.origin}/api/v1/items/${ID}`
const lookupUrl = `${url}/lookup`
const itemExample = exampleResponses.getItem.body as Item
const original = {
  ...itemExample,
  metadata: { ...itemExample.metadata, tmdb_id: 603 },
} as Item

function renderItem(getItem = () => HttpResponse.json(original)) {
  server.use(http.get(url, getItem))
  mockViewport(1100)
  const router = createTestRouter([`/lists/${LIST}/items/${ID}`])
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return router
}

describe('F013-W2 filled item TMDB actions', () => {
  it('asks before re-matching, sends the opened version, and reports success', async () => {
    const requests: { etag: string | null; body: unknown }[] = []
    const rematched = { ...original, title: 'The Matrix Reloaded', version: 4 }
    server.use(
      http.post(lookupUrl, async ({ request }) => {
        requests.push({ etag: request.headers.get('If-Match'), body: await request.json() })
        return HttpResponse.json(rematched)
      }),
    )
    renderItem()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Wrong match?' }))
    const dialog = await screen.findByRole('dialog', { name: 'Re-match this item?' })
    await user.click(within(dialog).getByRole('button', { name: 'Re-match' }))
    expect(await screen.findByText('Matched with TMDB.')).toBeInTheDocument()
    expect(requests).toEqual([{ etag: '"i-3"', body: { mode: 'rematch' } }])
  })

  it('refresh reports no match and keeps the item unchanged', async () => {
    server.use(http.post(lookupUrl, () => HttpResponse.json(original)))
    renderItem()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Refresh from TMDB' }))
    expect(
      await screen.findByText('No match was found. Your item was kept as entered.'),
    ).toBeInTheDocument()
  })

  it('503 reports lookup unavailable without changing the item', async () => {
    server.use(http.post(lookupUrl, () => problemResponse(503, 'upstream_unavailable')))
    renderItem()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Refresh from TMDB' }))
    expect(
      await screen.findByText('TMDB lookup is currently unavailable. Your item was not changed.'),
    ).toBeInTheDocument()
  })

  it('412 reports the conflict and refetches the latest item', async () => {
    let gets = 0
    renderItem(() => {
      gets++
      return HttpResponse.json(original)
    })
    server.use(http.post(lookupUrl, () => problemResponse(412, 'version_conflict')))
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Refresh from TMDB' }))
    expect(await screen.findByText(/Someone else changed this item/)).toBeInTheDocument()
    await waitFor(() => expect(gets).toBeGreaterThan(1))
  })

  it('turns automatic lookup off through an If-Match item update', async () => {
    let seen: { etag: string | null; body: unknown } | undefined
    server.use(
      http.patch(url, async ({ request }) => {
        seen = { etag: request.headers.get('If-Match'), body: await request.json() }
        return HttpResponse.json({
          ...original,
          metadata: { ...original.metadata, lookup_disabled: true },
          version: 4,
        })
      }),
    )
    renderItem()
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Turn off automatic TMDB updates' }))
    expect(await screen.findByText('Automatic TMDB updates are off.')).toBeInTheDocument()
    expect(seen).toEqual({
      etag: '"i-3"',
      body: { metadata: { ...original.metadata, lookup_disabled: true } },
    })
  })
})
