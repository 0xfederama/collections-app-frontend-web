import { describe, expect, it } from 'vitest'
import type { TypeField } from '../items/types'
import { parseFieldFilter } from './FieldFilter'

const fields: TypeField[] = [
  { key: 'name', label: 'Name', type: 'text', position: 0, is_locked: false, version: 1 },
  { key: 'url', label: 'Website', type: 'link', position: 1, is_locked: false, version: 1 },
  { key: 'rating', label: 'Rating', type: 'number', position: 2, is_locked: false, version: 1 },
  { key: 'released', label: 'Released', type: 'date', position: 3, is_locked: false, version: 1 },
  { key: 'owned', label: 'Owned', type: 'boolean', position: 4, is_locked: false, version: 1 },
  {
    key: 'streaming',
    label: 'Streaming',
    type: 'streaming',
    position: 5,
    is_locked: true,
    version: 1,
  },
]

const params = (query: string) => new URLSearchParams(query)

describe('F014-W4 field filter URL validation', () => {
  it('keeps text and link substring filters and boolean choices', () => {
    expect(parseFieldFilter(params('filter_field=name&filter_value=chess'), fields)).toMatchObject({
      field: 'name',
      value: 'chess',
    })
    expect(parseFieldFilter(params('filter_field=url&filter_value=example'), fields)).toMatchObject(
      {
        field: 'url',
        value: 'example',
      },
    )
    expect(parseFieldFilter(params('filter_field=owned&filter_value=false'), fields)).toMatchObject(
      {
        field: 'owned',
        value: 'false',
      },
    )
  })

  it('accepts valid numeric and ISO date bounds, including one-sided ranges', () => {
    expect(
      parseFieldFilter(params('filter_field=rating&filter_min=4.5&filter_max=9'), fields),
    ).toMatchObject({ min: '4.5', max: '9' })
    expect(
      parseFieldFilter(params('filter_field=released&filter_min=2026-01-31'), fields),
    ).toMatchObject({ min: '2026-01-31' })
    expect(parseFieldFilter(params('filter_field=rating&filter_min=NaN'), fields)).toBeNull()
    expect(
      parseFieldFilter(params('filter_field=released&filter_min=2026-02-31'), fields),
    ).toBeNull()
  })

  it('rejects removed fields, unsupported types, and mismatched filter parameters', () => {
    expect(parseFieldFilter(params('filter_field=removed&filter_value=x'), fields)).toBeNull()
    expect(parseFieldFilter(params('filter_field=streaming&filter_value=x'), fields)).toBeNull()
    expect(parseFieldFilter(params('filter_field=owned&filter_value=yes'), fields)).toBeNull()
    expect(parseFieldFilter(params('filter_field=name&filter_min=2'), fields)).toBeNull()
  })
})
