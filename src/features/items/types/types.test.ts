import { describe, expect, it } from 'vitest'
import { mockTypes } from '../../../mocks/types'
import type { TypeDefinition } from './index'
import {
  formatField,
  NO_TYPE_DEFINITION,
  NO_TYPE_VALUE,
  typeDefinition,
  typeName,
  typeOptions,
  typeRows,
  valueToType,
} from './index'

// The API's definition is used as it is: every field it returns is a built-in field (api-v3.0.0).
const movie: TypeDefinition = {
  key: 'movie',
  name: 'Movies',
  default_icon: 'i:film',
  allows_price: false,
  default_sort_field: 'release_year',
  fields: [
    { key: 'release_year', label: 'Release year', type: 'number', position: 0 },
    { key: 'director', label: 'Director', type: 'text', position: 1 },
    { key: 'imdb_url', label: 'IMDb', type: 'link', position: 2 },
    { key: 'streaming', label: 'Streaming', type: 'streaming', position: 3 },
  ],
}

describe('API-driven type definitions', () => {
  it('typeDefinition returns the API definition as it is, or undefined for an unknown key', () => {
    expect(typeDefinition([movie], 'movie')).toBe(movie)
    expect(typeDefinition([movie], 'book')).toBeUndefined()
  })

  it('typeRows renders the set fields in API order', () => {
    expect(
      typeRows(movie, { release_year: 1999, director: 'Lana Wachowski' }).map(({ key }) => key),
    ).toEqual(['release_year', 'director'])
  })
})

describe('typed values', () => {
  it('does not display values with the wrong wire type', () => {
    expect(formatField(movie.fields[0]!, '1999')).toBeNull()
    expect(formatField(movie.fields[1]!, 1999)).toBeNull()
  })

  it('keeps built-in IMDb and streaming values out of the ordinary detail rows', () => {
    expect(
      typeRows(movie, {
        director: 'Lana Wachowski',
        imdb_url: 'https://www.imdb.com/title/tt0133093/',
        streaming: { country: 'IT' },
      }),
    ).toEqual([{ key: 'director', label: 'Director', text: 'Lana Wachowski' }])
  })
})

describe('no type (null)', () => {
  it('has an empty definition: no fields, no price, no pins', () => {
    expect(typeDefinition([movie], null)).toBe(NO_TYPE_DEFINITION)
    expect(NO_TYPE_DEFINITION.fields).toEqual([])
    expect(NO_TYPE_DEFINITION.allows_price).toBe(false)
    expect(typeDefinition([movie], 'unknown')).toBeUndefined()
  })

  it('is named "No type" and is the first option, mapped back to null', () => {
    expect(typeName(undefined, null)).toBe('No type')
    expect(typeOptions([movie])).toEqual([
      { value: NO_TYPE_VALUE, label: 'No type' },
      { separator: true },
      { value: 'movie', label: 'Movies' },
    ])
    expect(valueToType(NO_TYPE_VALUE)).toBeNull()
    expect(valueToType('movie')).toBe('movie')
  })
})

describe('F016-W1 the book type', () => {
  const book = mockTypes.find((type) => type.key === 'book')!

  it('is offered in the type menus, from the types API definitions', () => {
    expect(typeOptions(mockTypes)).toContainEqual({ value: 'book', label: 'Books' })
  })

  it('draws store keys as tiles, never as text, and leaves them out of the text rows', () => {
    expect(
      formatField(
        book.fields.find((field) => field.key === 'stores')!,
        ['kobo'],
      ),
    ).toBeNull()
    expect(
      typeRows(book, {
        author: 'Frank Herbert',
        pages: 412,
        isbn: '9780441172719',
        stores: ['amazon', 'kobo'],
      }).map(({ key, text }) => [key, text]),
    ).toEqual([
      ['author', 'Frank Herbert'],
      ['pages', '412 p.'],
      ['isbn', '9780441172719'],
    ])
  })
})
