import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { problemResponse } from '../../mocks/problems'
import { mockViewport, renderAt } from '../../test-utils'
import { book, movie, openPane, treeUrl, typesUrl } from './typesTestKit'

// Characterization tests (F020): they pin what TypesFieldsPane does so the split into smaller files
// can be verified. Fixtures and openPane come from typesTestKit.ts.

describe('F020 characterization: Types & fields pane', () => {
  it('F020 shows the loading status until the types request resolves', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    mockViewport(375)
    server.use(
      http.get(typesUrl, async () => {
        await gate
        return HttpResponse.json([movie, book])
      }),
      http.get(treeUrl, () => HttpResponse.json({ folders: [], lists: [] })),
    )
    const user = userEvent.setup()
    renderAt('/settings')
    await user.click(await screen.findByRole('button', { name: 'Types & fields' }))

    const loading = await screen.findByText('Loading types')
    expect(loading.closest('[role="status"]')).not.toBeNull()
    expect(screen.queryByRole('list', { name: 'Types' })).not.toBeInTheDocument()

    release()
    await screen.findByRole('list', { name: 'Types' })
    expect(screen.queryByText('Loading types')).not.toBeInTheDocument()
  })

  it('F020 shows the load error with Retry, which refetches and then lists the types', async () => {
    let failing = true
    let requestsWhileFailing = 0
    mockViewport(375)
    server.use(
      http.get(typesUrl, () => {
        if (failing) {
          requestsWhileFailing += 1
          return problemResponse(500, 'internal_error')
        }
        return HttpResponse.json([movie, book])
      }),
      http.get(treeUrl, () => HttpResponse.json({ folders: [], lists: [] })),
    )
    const user = userEvent.setup()
    renderAt('/settings')
    await user.click(await screen.findByRole('button', { name: 'Types & fields' }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Couldn’t load types and fields.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Types' })).not.toBeInTheDocument()

    // The error is shown only after failing requests; Retry must send a new one that succeeds.
    expect(requestsWhileFailing).toBeGreaterThanOrEqual(1)
    const failedBeforeRetry = requestsWhileFailing
    failing = false
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    await screen.findByRole('list', { name: 'Types' })
    expect(requestsWhileFailing).toBe(failedBeforeRetry)
    expect(screen.getByRole('list', { name: 'Types' })).toBeInTheDocument()
    expect(screen.queryByText('Couldn’t load types and fields.')).not.toBeInTheDocument()
  })

  it('F020 shows the conflict banner when a custom field is renamed against a stale version, and Reload latest keeps the draft', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Books/ }))
    await user.click(screen.getByRole('button', { name: 'Rename Rating' }))
    const label = screen.getByLabelText('Field label')
    await user.clear(label)
    await user.type(label, 'Score')

    let ifMatch: string | null = null
    server.use(
      http.patch(`${typesUrl}/book/fields/rating`, ({ request }) => {
        ifMatch = request.headers.get('If-Match')
        return problemResponse(412, 'version_conflict', { current_version: 2 })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(ifMatch).toBe('"kf-1"')
    const banner = await screen.findByText(
      'This definition changed while you were editing. Reload the latest version and try again.',
    )
    const alert = banner.closest('[role="alert"]') as HTMLElement
    expect(within(alert).getByRole('button', { name: 'Reload latest' })).toBeInTheDocument()
    expect(within(alert).queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()

    let typesRequests = 0
    server.use(
      http.get(typesUrl, () => {
        typesRequests += 1
        return HttpResponse.json([movie, book])
      }),
    )
    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))

    await waitFor(() =>
      expect(
        screen.queryByText(/This definition changed while you were editing/),
      ).not.toBeInTheDocument(),
    )
    expect(typesRequests).toBeGreaterThanOrEqual(1)
    // The draft the user typed is kept, not replaced by the latest label.
    expect(screen.getByLabelText('Field label')).toHaveValue('Score')
  })

  it('F020 deleting a custom field with no values confirms with the empty copy and sends the field version', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Books/ }))
    let deleteHeader: string | null = null
    let deleteCalls = 0
    server.use(
      http.get(`${typesUrl}/book/fields/rating`, () =>
        HttpResponse.json({ populated_item_count: 0 }),
      ),
      http.delete(`${typesUrl}/book/fields/rating`, ({ request }) => {
        deleteCalls += 1
        deleteHeader = request.headers.get('If-Match')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete Rating' }))
    const confirmation = await screen.findByRole('alertdialog', { name: 'Delete Rating?' })
    expect(
      within(confirmation).getByText('No items have a value for this field.'),
    ).toBeInTheDocument()
    await user.click(within(confirmation).getByRole('button', { name: 'Delete field' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog', { name: 'Delete Rating?' })).not.toBeInTheDocument(),
    )
    expect(deleteCalls).toBe(1)
    expect(deleteHeader).toBe('"kf-1"')
  })

  it('F020 cancelling the field delete confirmation keeps the field and sends no DELETE', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Books/ }))
    let deleteCalls = 0
    server.use(
      http.get(`${typesUrl}/book/fields/rating`, () =>
        HttpResponse.json({ populated_item_count: 1 }),
      ),
      http.delete(`${typesUrl}/book/fields/rating`, () => {
        deleteCalls += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete Rating' }))
    const confirmation = await screen.findByRole('alertdialog', { name: 'Delete Rating?' })
    expect(within(confirmation).getByText(/1 item has a value/)).toBeInTheDocument()
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog', { name: 'Delete Rating?' })).not.toBeInTheDocument(),
    )
    expect(deleteCalls).toBe(0)
    expect(screen.getByRole('listitem', { name: /Rating, number/ })).toBeInTheDocument()
  })

  it('F020 exposes each type as a listitem button in the Types list, with the selected one aria-current', async () => {
    const user = await openPane([movie, book])
    const typeList = screen.getByRole('list', { name: 'Types' })
    const rows = within(typeList).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    const [movieRow, bookRow] = rows as [HTMLElement, HTMLElement]

    const moviesButton = within(movieRow).getByRole('button', { name: /Movies/ })
    const bookButton = within(bookRow).getByRole('button', { name: /Books/ })
    // The first type is selected until the user picks one.
    expect(moviesButton).toHaveAttribute('aria-current', 'true')
    expect(bookButton).not.toHaveAttribute('aria-current')

    bookButton.focus()
    expect(bookButton).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(bookButton).toHaveAttribute('aria-current', 'true')
    expect(moviesButton).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('heading', { level: 3, name: 'Books' })).toBeInTheDocument()
  })
})
