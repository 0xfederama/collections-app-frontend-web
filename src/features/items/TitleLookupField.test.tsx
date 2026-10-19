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

describe('F016-W2 book title lookup', () => {
  it('shows Open Library suggestions with authors, year, pages and the cover', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <TitleLookupField
        type="book"
        title="Dune"
        onTitleChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    )

    await user.click(await screen.findByRole('combobox', { name: 'Title' }))
    const listbox = await screen.findByRole('listbox', { name: 'Open Library title suggestions' })
    const dune = await screen.findByRole('option', { name: 'Dune by Frank Herbert (1965)' })

    expect(dune).toHaveTextContent('Dune')
    expect(dune).toHaveTextContent('Frank Herbert · 1965 · 608 pages')
    expect(dune.querySelector('img')).toHaveAttribute(
      'src',
      'https://covers.openlibrary.org/b/id/12547191-M.jpg',
    )
    // A row without a year or pages shows only what Open Library has, and no cover.
    const messiah = screen.getByRole('option', { name: 'Dune Messiah by Frank Herbert' })
    expect(messiah).toHaveTextContent('Frank Herbert')
    expect(messiah).not.toHaveTextContent('pages')
    expect(messiah.querySelector('img')).toBeNull()
    expect(listbox).toHaveTextContent('608 pages')
  })

  it('first result on Enter selects the work id and fills the title', async () => {
    const user = userEvent.setup()
    const onTitleChange = vi.fn()
    const onSelectionChange = vi.fn()
    const onSuggestionSelect = vi.fn()
    renderWithProviders(
      <TitleLookupField
        type="book"
        title="Dune"
        onTitleChange={onTitleChange}
        onSelectionChange={onSelectionChange}
        onSuggestionSelect={onSuggestionSelect}
      />,
    )

    await user.click(await screen.findByRole('combobox', { name: 'Title' }))
    await screen.findByRole('option', { name: 'Dune by Frank Herbert (1965)' })
    await user.keyboard('{Enter}')

    expect(onTitleChange).toHaveBeenLastCalledWith('Dune')
    expect(onSelectionChange).toHaveBeenLastCalledWith({ source_id: 'OL893415W' })
    expect(onSuggestionSelect).toHaveBeenLastCalledWith({ title: 'Dune', source_id: 'OL893415W' })
  })

  it('pointer selection of a second suggestion sends its own work id', async () => {
    const user = userEvent.setup()
    const onSuggestionSelect = vi.fn()
    renderWithProviders(
      <TitleLookupField
        type="book"
        title="Dune"
        onTitleChange={vi.fn()}
        onSelectionChange={vi.fn()}
        onSuggestionSelect={onSuggestionSelect}
      />,
    )

    await user.click(await screen.findByRole('combobox', { name: 'Title' }))
    await user.click(await screen.findByRole('option', { name: 'Dune Messiah by Frank Herbert' }))

    expect(onSuggestionSelect).toHaveBeenLastCalledWith({
      title: 'Dune Messiah',
      source_id: 'OL1234567W',
    })
  })

  it('is a plain input while book lookup is off, and movies keep TMDB suggestions', async () => {
    withLookup({ book_lookup_available: false, lookup_available: true })
    const client = createTestQueryClient()
    const { unmount } = renderWithProviders(
      <TitleLookupField
        type="book"
        title="Dune"
        onTitleChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
      client,
    )

    await waitFor(() => expect(client.getQueryState(settingsKeys.settings)?.status).toBe('success'))
    expect(screen.getByRole('textbox', { name: 'Title' })).not.toHaveAttribute('aria-haspopup')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    unmount()

    // The switches are per source: the movie field of the same server still has suggestions.
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

  it('a movie title never requests book suggestions', async () => {
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
    renderWithProviders(
      <TitleLookupField
        type="movie"
        title="The Mat"
        onTitleChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    )

    await user.click(await screen.findByRole('combobox', { name: 'Title' }))
    expect(await screen.findByRole('option', { name: 'The Matrix (1999)' })).toBeInTheDocument()
    expect(requests).toEqual([])
  })
})
