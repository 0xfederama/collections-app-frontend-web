import { describe, expect, it } from 'vitest'
import { createLookupSelection, hasSuggestions, isBookLookup, lookupSourceName } from './lookup'

const on = { lookup_available: true, book_lookup_available: true }

describe('F016-W2 create lookup fields', () => {
  it('sends lookup on without an id, so the server takes the first result', () => {
    expect(createLookupSelection('book', on, {})).toEqual({ lookup: true })
  })

  it('sends lookup off for a book list while book lookup is off', () => {
    expect(createLookupSelection('book', { ...on, book_lookup_available: false }, {})).toEqual({
      lookup: false,
    })
  })

  it('ignores a TMDB id on a book list', () => {
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

  it('only movie and TV offer suggestions; books are looked up on commit', () => {
    expect(hasSuggestions('movie')).toBe(true)
    expect(hasSuggestions('tv_show')).toBe(true)
    expect(hasSuggestions('book')).toBe(false)
    expect(hasSuggestions(null)).toBe(false)
  })

  it('isBookLookup is true only for a book list with book lookup available', () => {
    expect(isBookLookup('book', on)).toBe(true)
    expect(isBookLookup('book', { ...on, book_lookup_available: false })).toBe(false)
    expect(isBookLookup('movie', on)).toBe(false)
    expect(isBookLookup('book', undefined)).toBe(false)
  })
})
