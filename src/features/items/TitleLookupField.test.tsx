import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it, vi } from 'vitest'
import { exampleResponses } from '../../generated/examples'
import { server } from '../../mocks/server'
import { createTestQueryClient, renderWithProviders } from '../../test-utils'
import { settingsKeys } from '../settings/api'
import { TitleLookupField } from './TitleLookupField'

const origin = location.origin
const settingsExample = exampleResponses.getSettings.body as Record<string, unknown>

/** Settings with the given lookup switches; the rest comes from the spec example. */
function withLookup(flags: { lookup_available?: boolean; book_lookup_available?: boolean }) {
  server.use(
    http.get(`${origin}/api/v1/settings`, () =>
      HttpResponse.json({ ...settingsExample, ...flags }),
    ),
  )
}

describe('F013-W1 title lookup', () => {
  it('shows localized movie suggestions and selects the full title with the keyboard', async () => {
    const user = userEvent.setup()
    const onTitleChange = vi.fn()
    const onSelectionChange = vi.fn()
    const onSuggestionSelect = vi.fn()
    renderWithProviders(
      <TitleLookupField
        type="movie"
        title="The Mat"
        onTitleChange={onTitleChange}
        onSelectionChange={onSelectionChange}
        onSuggestionSelect={onSuggestionSelect}
      />,
    )

    const title = await screen.findByRole('combobox', { name: 'Title' })
    await user.click(title)
    const listbox = await screen.findByRole('listbox', { name: 'TMDB title suggestions' })
    expect(await screen.findByRole('option', { name: 'The Matrix (1999)' })).toBeInTheDocument()
    expect(listbox).toHaveTextContent('1999')

    await user.keyboard('{ArrowDown}{Enter}')

    expect(onTitleChange).toHaveBeenLastCalledWith('The Matrix')
    expect(onSelectionChange).toHaveBeenLastCalledWith({ tmdb_id: 603 })
    expect(onSuggestionSelect).toHaveBeenLastCalledWith({ title: 'The Matrix', tmdb_id: 603 })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(listbox).not.toBeInTheDocument()
  })

  it('sends the same full selection when chosen with the pointer', async () => {
    const user = userEvent.setup()
    const onTitleChange = vi.fn()
    const onSelectionChange = vi.fn()
    const onSuggestionSelect = vi.fn()
    renderWithProviders(
      <TitleLookupField
        type="movie"
        title="The Mat"
        onTitleChange={onTitleChange}
        onSelectionChange={onSelectionChange}
        onSuggestionSelect={onSuggestionSelect}
      />,
    )

    await user.click(await screen.findByRole('combobox', { name: 'Title' }))
    await user.click(await screen.findByRole('option', { name: 'The Matrix (1999)' }))

    expect(onTitleChange).toHaveBeenLastCalledWith('The Matrix')
    expect(onSelectionChange).toHaveBeenLastCalledWith({ tmdb_id: 603 })
    expect(onSuggestionSelect).toHaveBeenLastCalledWith({ title: 'The Matrix', tmdb_id: 603 })
  })

  it('is a plain input with no suggestions while TMDB lookup is off', async () => {
    withLookup({ lookup_available: false })
    const client = createTestQueryClient()
    renderWithProviders(
      <TitleLookupField
        type="movie"
        title="The Mat"
        onTitleChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
      client,
    )

    await waitFor(() => expect(client.getQueryState(settingsKeys.settings)?.status).toBe('success'))
    const title = screen.getByRole('textbox', { name: 'Title' })
    expect(title).not.toHaveAttribute('aria-haspopup')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('F016-W2 book title field', () => {
  it('is a plain text input with no combobox and never requests book suggestions', async () => {
    const requests: string[] = []
    server.use(
      http.get(`${origin}/api/v1/books/suggestions`, ({ request }) => {
        requests.push(request.url)
        return HttpResponse.json(
          exampleResponses.searchBookSuggestions.body as Record<string, unknown>,
        )
      }),
    )
    const user = userEvent.setup()
    const onSuggestionSelect = vi.fn()
    const client = createTestQueryClient()
    renderWithProviders(
      <TitleLookupField
        type="book"
        title="Dune"
        onTitleChange={vi.fn()}
        onSelectionChange={vi.fn()}
        onSuggestionSelect={onSuggestionSelect}
      />,
      client,
    )

    await waitFor(() => expect(client.getQueryState(settingsKeys.settings)?.status).toBe('success'))
    const title = screen.getByRole('textbox', { name: 'Title' })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(title).not.toHaveAttribute('aria-haspopup')
    await user.click(title)
    await user.keyboard('{Enter}')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onSuggestionSelect).not.toHaveBeenCalled()
    expect(requests).toEqual([])
  })

  it('movies keep TMDB suggestions on the same server', async () => {
    renderWithProviders(
      <TitleLookupField
        type="movie"
        title="The Mat"
        onTitleChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    )
    expect(await screen.findByRole('combobox', { name: 'Title' })).toBeInTheDocument()
  })
})
