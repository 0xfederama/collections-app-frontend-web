import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Item } from './api'
import { TmdbDetails } from './TmdbDetails'

const base = {
  id: '7c1e5a10-0000-4000-8000-000000000101',
  title: 'The Matrix',
  type: 'movie',
} as Item

function renderDetails(metadata: Record<string, unknown>) {
  return render(<TmdbDetails item={{ ...base, metadata } as Item} />)
}

describe('F-028 W1 TMDB details on the item page', () => {
  it('shows the genres as a named list of chips, in order', () => {
    renderDetails({ genres: ['Science Fiction', 'Action'] })
    const genres = screen.getByRole('list', { name: 'Genres' })
    const chips = within(genres).getAllByRole('listitem')
    expect(chips.map((chip) => chip.textContent)).toEqual(['Science Fiction', 'Action'])
  })

  it('states the TMDB score as readable text with the vote count', () => {
    renderDetails({ tmdb_rating: 7.4, tmdb_vote_count: 1234 })
    expect(screen.getByText(/^TMDB score 7\.4 \(1,234 votes\)$/)).toBeInTheDocument()
  })

  it('shows the score without a count when the item has none', () => {
    renderDetails({ tmdb_rating: 8 })
    expect(screen.getByText('TMDB score 8.0')).toBeInTheDocument()
  })

  it('shows the genres and no score when there is no rating', () => {
    renderDetails({ genres: ['Drama'], tmdb_rating: null, tmdb_vote_count: 40 })
    expect(screen.getByRole('list', { name: 'Genres' })).toBeInTheDocument()
    expect(screen.queryByText(/TMDB score/)).not.toBeInTheDocument()
  })

  it('renders nothing at all when the item has neither genres nor a rating', () => {
    const { container } = renderDetails({ release_year: 1999 })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for garbage values instead of breaking', () => {
    const { container } = renderDetails({ genres: 'Drama', tmdb_rating: '7.4' })
    expect(container).toBeEmptyDOMElement()
  })

  it('is read-only: no pen, no edit button, no text field', () => {
    renderDetails({ genres: ['Drama'], tmdb_rating: 7, tmdb_vote_count: 10 })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
