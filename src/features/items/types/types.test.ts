import { describe, expect, it } from 'vitest'
import { mockTypes } from '../../../mocks/types'
import type { TypeDefinition, TypeField } from './index'
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

const field = (
  key: string,
  label: string,
  type: TypeField['type'],
  position: number,
): TypeField => ({
  key,
  label,
  type,
  position,
  is_locked: false,
  version: 1,
})

const boardGame: TypeDefinition = {
  key: 'board_game',
  name: 'Board game',
  default_icon: null,
  allows_price: false,
  default_sort_field: 'rating',
  is_locked: false,
  version: 1,
  fields: [
    field('rating', 'Rating', 'number', 0),
    field('played_on', 'Played on', 'date', 1),
    field('recommended', 'Recommended', 'boolean', 2),
    field('rules', 'Rules', 'link', 3),
  ],
}

describe('F014-W3 API-driven type fields', () => {
  it('finds custom types and renders typed values in API field order', () => {
    expect(typeDefinition([boardGame], 'board_game')).toBe(boardGame)
    expect(
      typeRows(boardGame, {
        rating: 8.5,
        played_on: '2026-10-19',
        recommended: false,
        rules: 'https://example.com/rules',
      }).map(({ key, text }) => [key, text]),
    ).toEqual([
      ['rating', '8.5'],
      ['played_on', expect.any(String)],
      ['recommended', 'No'],
      ['rules', 'https://example.com/rules'],
    ])
  })

  it('does not display values with the wrong wire type', () => {
    expect(formatField(boardGame.fields[0]!, '8.5')).toBeNull()
    expect(formatField(boardGame.fields[2]!, 'false')).toBeNull()
    expect(formatField(boardGame.fields[1]!, 'not-a-date')).toBeNull()
  })

  it('keeps built-in IMDb and streaming values out of the ordinary detail rows', () => {
    const movie: TypeDefinition = {
      ...boardGame,
      key: 'movie',
      name: 'Movie',
      fields: [
        field('director', 'Director', 'text', 0),
        field('imdb_url', 'IMDb', 'link', 1),
        field('streaming', 'Streaming', 'streaming', 2),
      ],
    }
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
    expect(typeDefinition([boardGame], null)).toBe(NO_TYPE_DEFINITION)
    expect(NO_TYPE_DEFINITION.fields).toEqual([])
    expect(NO_TYPE_DEFINITION.allows_price).toBe(false)
    expect(typeDefinition([boardGame], 'unknown')).toBeUndefined()
  })

  it('is named "No type" and is the first option, mapped back to null', () => {
    expect(typeName(undefined, null)).toBe('No type')
    expect(typeOptions([boardGame])).toEqual([
      { value: NO_TYPE_VALUE, label: 'No type' },
      { separator: true },
      { value: 'board_game', label: 'Board game' },
    ])
    expect(valueToType(NO_TYPE_VALUE)).toBeNull()
    expect(valueToType('board_game')).toBe('board_game')
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
