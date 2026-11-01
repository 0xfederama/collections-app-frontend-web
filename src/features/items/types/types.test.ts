import { describe, expect, it } from 'vitest'
import { mockTypes } from '../../../mocks/types'
import type { TypeDefinition, TypeField } from './index'
import {
  builtinDefinition,
  formatField,
  isBuiltinField,
  NO_TYPE_DEFINITION,
  NO_TYPE_VALUE,
  typeDefinition,
  typeName,
  typeOptions,
  typeRows,
  valueToType,
} from './index'

// `is_locked` is the API's built-in flag: true for the five built-in types' fields, false for a custom one.
const field = (
  key: string,
  label: string,
  type: TypeField['type'],
  position: number,
  is_locked = true,
): TypeField => ({
  key,
  label,
  type,
  position,
  is_locked,
  version: 1,
})

// A built-in type with one custom field the API still sends: the web must ignore that field.
const movie: TypeDefinition = {
  key: 'movie',
  name: 'Movies',
  default_icon: 'i:film',
  allows_price: false,
  default_sort_field: 'release_year',
  is_locked: true,
  version: 1,
  fields: [
    field('release_year', 'Release year', 'number', 0),
    field('director', 'Director', 'text', 1),
    field('imdb_url', 'IMDb', 'link', 2),
    field('streaming', 'Streaming', 'streaming', 3),
    field('rating', 'Rating', 'number', 4, false),
  ],
}

describe('F-023 built-in fields only', () => {
  it.each([
    ['a built-in field', field('director', 'Director', 'text', 0, true), true],
    ['a custom field', field('rating', 'Rating', 'number', 0, false), false],
  ] as const)('isBuiltinField: %s', (_name, candidate, expected) => {
    expect(isBuiltinField(candidate)).toBe(expected)
  })

  it('builtinDefinition drops custom fields and keeps the API order', () => {
    expect(builtinDefinition(movie).fields.map((entry) => entry.key)).toEqual([
      'release_year',
      'director',
      'imdb_url',
      'streaming',
    ])
  })

  it('builtinDefinition returns the same object when every field is built in', () => {
    const builtInOnly = { ...movie, fields: movie.fields.slice(0, 2) }
    expect(builtinDefinition(builtInOnly)).toBe(builtInOnly)
  })

  it.each<[string, TypeDefinition[], string, string[] | undefined]>([
    ['a built-in type', [movie], 'movie', ['release_year', 'director', 'imdb_url', 'streaming']],
    [
      'a type of custom fields only',
      [{ ...movie, fields: [field('rating', 'Rating', 'number', 0, false)] }],
      'movie',
      [],
    ],
    ['an unknown key', [movie], 'book', undefined],
  ])('typeDefinition for %s offers built-in fields only', (_name, defs, key, expected) => {
    const found = typeDefinition(defs, key)
    expect(found?.fields.map((entry) => entry.key)).toEqual(expected)
  })

  it('typeRows over the definition from typeDefinition never shows a custom field', () => {
    const definition = typeDefinition([movie], 'movie')!
    expect(
      typeRows(definition, { release_year: 1999, director: 'Lana Wachowski', rating: 9 }).map(
        ({ key }) => key,
      ),
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
