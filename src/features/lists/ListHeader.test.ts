import { describe, expect, it } from 'vitest'
import type { TypeDefinition, TypeField } from '../items'
import { sortOptionsFor } from './ListHeader'

const field = (key: string, type: TypeField['type'], label: string): TypeField =>
  ({
    key,
    label,
    type,
    position: 0,
  }) as TypeField

const book: TypeDefinition = {
  key: 'book',
  name: 'Book',
  default_icon: null,
  allows_price: true,
  default_sort_field: null,
  fields: [
    field('author', 'text', 'Writer'),
    field('pages', 'number', 'Pages'),
    field('stores', 'stores', 'Where to get it'),
  ],
}

describe('F016-W4 sort choices', () => {
  it('offers the type fields but never a stores field, which has no order', () => {
    const values = sortOptionsFor(book).map((option) => option.value)
    expect(values).toEqual(['manual', 'title', 'updated', 'price', 'author', 'pages'])
    expect(values).not.toContain('stores')
  })
})

describe('F-028 W2 rating sort choice', () => {
  const movie: TypeDefinition = {
    key: 'movie',
    name: 'Movies',
    default_icon: null,
    allows_price: false,
    default_sort_field: null,
    fields: [field('director', 'text', 'Director'), field('streaming', 'streaming', 'Streaming')],
  }

  it('offers "Rating" on movie and TV lists, after the built-in sorts', () => {
    const options = sortOptionsFor(movie)
    expect(options.find((option) => option.value === 'rating')).toEqual({
      value: 'rating',
      label: 'Rating',
    })
    expect(options.map((option) => option.value)).toEqual([
      'manual',
      'title',
      'updated',
      'rating',
      'director',
      'streaming',
    ])
  })

  it('does not offer "Rating" on a book list', () => {
    expect(sortOptionsFor(book).map((option) => option.value)).not.toContain('rating')
  })
})
