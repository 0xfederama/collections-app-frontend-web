import { describe, expect, it } from 'vitest'
import { createLookupSelection, lookupSourceName } from './lookup'

const on = { lookup_available: true, book_lookup_available: true }

describe('F016-W2 create lookup fields', () => {
  it('sends the selected book work id with lookup on for a book list', () => {
    expect(createLookupSelection('book', on, { source_id: 'OL893415W' })).toEqual({
      lookup: true,
      source_id: 'OL893415W',
    })
  })

  it('sends lookup on without an id, so the server takes the first result', () => {
    expect(createLookupSelection('book', on, {})).toEqual({ lookup: true })
  })

  it('sends lookup off for a book list while book lookup is off', () => {
    expect(
      createLookupSelection('book', { ...on, book_lookup_available: false }, { source_id: 'OL1W' }),
    ).toEqual({ lookup: false })
  })

  it('ignores a book id on a movie list and a TMDB id on a book list', () => {
    expect(createLookupSelection('movie', on, { source_id: 'OL893415W' })).toEqual({ lookup: true })
    expect(createLookupSelection('book', on, { tmdb_id: 603 })).toEqual({ lookup: true })
  })

  it('keeps TMDB ids for movie and TV lists and is off without a TMDB switch', () => {
    expect(createLookupSelection('tv_show', on, { tmdb_id: 1399 })).toEqual({
      lookup: true,
      tmdb_id: 1399,
    })
    expect(
      createLookupSelection('movie', { ...on, lookup_available: false }, { tmdb_id: 603 }),
    ).toEqual({ lookup: false })
  })

  it('is off for lists without a metadata source and while settings are unknown', () => {
    expect(createLookupSelection(null, on, { tmdb_id: 603 })).toEqual({ lookup: false })
    expect(createLookupSelection('book', undefined, {})).toEqual({ lookup: false })
  })

  it('names the source in copy', () => {
    expect(lookupSourceName('movie')).toBe('TMDB')
    expect(lookupSourceName('book')).toBe('Open Library')
  })
})
