import { describe, expect, it } from 'vitest'
import type { TypeDefinition } from '../settings'
import type { FieldFilterValue } from './FieldFilter'
import {
  activeFieldFilter,
  buildItemsParams,
  parseSort,
  resolveSortOverride,
  supportedSorts,
} from './listParams'

const definition = {
  key: 'movie',
  allows_price: false,
  fields: [
    { key: 'director', type: 'text' },
    { key: 'rating', type: 'number' },
    { key: 'website', type: 'link' },
    { key: 'owned', type: 'boolean' },
  ],
} as unknown as TypeDefinition

const priced = { ...definition, allows_price: true } as TypeDefinition

const filter = (overrides: Partial<FieldFilterValue>): FieldFilterValue => ({
  field: 'director',
  value: '',
  min: '',
  max: '',
  ...overrides,
})

describe('listParams', () => {
  it.each([
    [null, null],
    ['', null],
    ['  ', null],
    ['title', 'title'],
    [' updated ', 'updated'],
  ])('parseSort(%j) is %j', (value, expected) => {
    expect(parseSort(value)).toBe(expected)
  })

  it('supportedSorts is empty without a definition', () => {
    expect(supportedSorts(undefined)).toEqual(new Set())
    expect(supportedSorts(null)).toEqual(new Set())
  })

  it.each([
    [
      'no price',
      definition,
      ['manual', 'title', 'updated', 'director', 'rating', 'website', 'owned'],
    ],
    [
      'with price',
      priced,
      ['manual', 'title', 'updated', 'price', 'director', 'rating', 'website', 'owned'],
    ],
  ])('supportedSorts %s lists the built-in and field keys', (_name, def, keys) => {
    expect(supportedSorts(def)).toEqual(new Set(keys))
  })

  it.each([
    ['supported field key', 'director', definition, 'director'],
    ['built-in sort', 'title', definition, 'title'],
    ['price where the type has none', 'price', definition, null],
    ['price where the type has it', 'price', priced, 'price'],
    ['unknown key', 'bogus', definition, null],
    ['no definition', 'title', undefined, null],
    ['no parsed value', null, definition, null],
  ] as const)('resolveSortOverride %s', (_name, parsed, def, expected) => {
    expect(resolveSortOverride(parsed, def)).toBe(expected)
  })

  it.each([
    ['empty', filter({}), null],
    ['value', filter({ value: 'Nolan' }), filter({ value: 'Nolan' })],
    ['min only', filter({ field: 'rating', min: '7' }), filter({ field: 'rating', min: '7' })],
    ['max only', filter({ field: 'rating', max: '9' }), filter({ field: 'rating', max: '9' })],
    ['no filter', null, null],
  ])('activeFieldFilter %s', (_name, value, expected) => {
    expect(activeFieldFilter(value)).toEqual(expected)
  })

  it.each([
    [
      'text filter keeps the value',
      filter({ field: 'director', value: 'Nolan' }),
      { filterField: 'director', filterValue: 'Nolan', filterMin: null, filterMax: null },
    ],
    [
      'link filter keeps the value',
      filter({ field: 'website', value: 'example.com' }),
      { filterField: 'website', filterValue: 'example.com', filterMin: null, filterMax: null },
    ],
    [
      'boolean filter keeps the value',
      filter({ field: 'owned', value: 'true' }),
      { filterField: 'owned', filterValue: 'true', filterMin: null, filterMax: null },
    ],
    [
      'number filter has no value but min and max',
      filter({ field: 'rating', min: '7', max: '9' }),
      { filterField: 'rating', filterValue: null, filterMin: '7', filterMax: '9' },
    ],
    [
      'empty filter is dropped',
      filter({ field: 'director' }),
      { filterField: null, filterValue: null, filterMin: null, filterMax: null },
    ],
    ['no filter', null, { filterField: null, filterValue: null, filterMin: null, filterMax: null }],
  ])('buildItemsParams: %s', (_name, value, expected) => {
    expect(buildItemsParams({ sortOverride: null, q: '', filter: value, definition })).toEqual({
      sort: null,
      q: '',
      ...expected,
    })
  })

  it('buildItemsParams passes the sort override and the title query through', () => {
    expect(
      buildItemsParams({ sortOverride: 'rating', q: 'dune', filter: null, definition }),
    ).toEqual({
      sort: 'rating',
      q: 'dune',
      filterField: null,
      filterValue: null,
      filterMin: null,
      filterMax: null,
    })
  })
})
