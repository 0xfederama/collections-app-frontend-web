import { describe, expect, it } from 'vitest'
import { typeDefinition, type TypeDefinition, type TypeField } from '../items'
import { sortOptionsFor } from './ListHeader'

const field = (key: string, type: TypeField['type'], label: string): TypeField =>
  ({
    key,
    label,
    type,
    is_locked: true,
    version: 1,
    position: 0,
  }) as TypeField

const book: TypeDefinition = {
  key: 'book',
  name: 'Book',
  default_icon: null,
  allows_price: true,
  default_sort_field: null,
  is_locked: true,
  version: 1,
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

describe('F-023 sort choices offer built-in fields only', () => {
  it('a custom field the API still sends is not a sort choice', () => {
    const withCustom: TypeDefinition = {
      ...book,
      fields: [...book.fields, { ...field('rating', 'number', 'Rating'), is_locked: false }],
    }
    const values = sortOptionsFor(typeDefinition([withCustom], 'book')!).map(
      (option) => option.value,
    )
    expect(values).toEqual(['manual', 'title', 'updated', 'price', 'author', 'pages'])
  })
})
