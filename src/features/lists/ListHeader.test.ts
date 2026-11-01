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
