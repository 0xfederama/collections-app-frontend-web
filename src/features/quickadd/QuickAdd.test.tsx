import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { exampleResponses } from '../../generated/examples'
import { server } from '../../mocks/server'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../app/router'
import { mockViewport, renderWithProviders } from '../../test-utils'
import type { Item } from '../items/api'

const LIST = '7c1e5a10-0000-4000-8000-000000000011'
const NEW_ID = '7c1e5a10-0000-4000-8000-000000000999'
const origin = location.origin
const matrix = exampleResponses.getItem.body as Item

describe('F002-W4 quick add', () => {
  it('N opens it, is ignored while typing, and Enter adds with only a title and opens the item', async () => {
    mockViewport(1100)
    const posts: unknown[] = []
    server.use(
      http.post(`${origin}/api/v1/lists/${LIST}/items`, async ({ request }) => {
        const body = (await request.json()) as { title: string }
        posts.push(body)
        const created = { ...matrix, id: NEW_ID, title: body.title, metadata: {}, version: 1 }
        server.use(http.get(`${origin}/api/v1/items/${NEW_ID}`, () => HttpResponse.json(created)))
        return HttpResponse.json(created, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    const router = createTestRouter([`/lists/${LIST}`])
    renderWithProviders(<RouterProvider router={router} />)

    // Typing an "n" in the sidebar search does not open it.
    const search = await screen.findByRole('combobox', { name: 'Search' })
    await user.click(search)
    await user.keyboard('n')
    expect(screen.queryByRole('dialog', { name: 'Quick add' })).not.toBeInTheDocument()
    search.blur()

    await user.keyboard('n')
    const dialog = await screen.findByRole('dialog', { name: 'Quick add' })
    const title = within(dialog).getByLabelText(/^Title/)
    expect(title).toHaveFocus()
    await user.type(title, '  Field notebook {Enter}')

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`),
    )
    expect(router.state.location.search).toBe('')
    expect(posts).toEqual([{ title: 'Field notebook', lookup: true }])
    expect(screen.queryByRole('dialog', { name: 'Quick add' })).not.toBeInTheDocument()
  })
})
