import { describe, expect, it } from 'vitest'
import { typeDefinition, type TypeDefinition, type TypeField } from '../items'
import { describeFieldFilter, parseFieldFilter } from './FieldFilter'

const fields: TypeField[] = [
  { key: 'name', label: 'Name', type: 'text', position: 0 },
  { key: 'url', label: 'Website', type: 'link', position: 1 },
  { key: 'rating', label: 'Rating', type: 'number', position: 2 },
  { key: 'released', label: 'Released', type: 'date', position: 3 },
  { key: 'owned', label: 'Owned', type: 'boolean', position: 4 },
  {
    key: 'streaming',
    label: 'Streaming',
    type: 'streaming',
    position: 5,
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

describe('F016-W4 store keys are not a filter', () => {
  it('offers no filter on a stores field, so its URL parameters are refused', () => {
    const stores: TypeField = {
      key: 'stores',
      label: 'Where to get it',
      type: 'stores',
      position: 0,
    }
    expect(parseFieldFilter(params('filter_field=stores&filter_value=kobo'), [stores])).toBeNull()
  })
})

describe('filter_field with a key the type does not define', () => {
  it('is ignored, and a type field still filters', () => {
    const movie: TypeDefinition = {
      key: 'movie',
      name: 'Movies',
      default_icon: null,
      allows_price: false,
      default_sort_field: null,
      fields: [{ key: 'director', label: 'Director', type: 'text', position: 0 }],
    }
    const defined = typeDefinition([movie], 'movie')!.fields
    expect(parseFieldFilter(params('filter_field=rating&filter_min=7'), defined)).toBeNull()
    expect(
      parseFieldFilter(params('filter_field=director&filter_value=Lana'), defined),
    ).toMatchObject({ field: 'director', value: 'Lana' })
  })
})

describe('describeFieldFilter', () => {
  it('reads an applied filter for its chip and is null while empty', () => {
    expect(describeFieldFilter(fields, null)).toBeNull()
    expect(describeFieldFilter(fields, { field: 'name', value: '', min: '', max: '' })).toBeNull()
    expect(describeFieldFilter(fields, { field: 'name', value: 'Ada', min: '', max: '' })).toBe(
      'Name: Ada',
    )
    expect(describeFieldFilter(fields, { field: 'rating', value: '', min: '7', max: '' })).toBe(
      'Rating: 7–',
    )
    expect(describeFieldFilter(fields, { field: 'owned', value: 'true', min: '', max: '' })).toBe(
      'Owned: Yes',
    )
  })
})
