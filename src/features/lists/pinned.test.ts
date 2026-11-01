import { describe, expect, it } from 'vitest'
import { typeDefinition, type TypeDefinition } from '../items'
import type { ItemSummary } from './api'
import { fixedPinned, formatPinnedValue, pinnedPlacements, pinnedTexts } from './pinned'

/** A definition with the given field keys (the pins only read the keys) and price flag. */
const def = (key: string, fieldKeys: string[], allowsPrice = false): TypeDefinition => ({
  key,
  name: key,
  default_icon: null,
  allows_price: allowsPrice,
  default_sort_field: null,
  is_locked: true,
  version: 1,
  fields: fieldKeys.map((field, position) => ({
    key: field,
    label: field,
    type: 'text',
    position,
    is_locked: true,
    version: 1,
  })),
})

const item = (
  metadata: Record<string, unknown>,
  price: ItemSummary['price'] = null,
): ItemSummary => ({
  id: 'i1',
  list_id: 'l1',
  title: 'Brass',
  type: 'movie',
  image: null,
  price,
  website: null,
  metadata,
  content_version: 0,
  sort_order: 0,
  version: 1,
  created_at: '2026-10-19T00:00:00Z',
  updated_at: '2026-10-19T00:00:00Z',
})

describe('F-022 W2 fixed pinned fields per built-in type', () => {
  it.each([
    [
      'movie',
      def('movie', ['release_year', 'runtime_minutes', 'director', 'imdb_url', 'streaming']),
      ['runtime_minutes', 'streaming'],
    ],
    [
      'tv_show',
      def('tv_show', ['first_air_year', 'seasons', 'episodes_per_season', 'streaming']),
      ['seasons', 'streaming'],
    ],
    ['book', def('book', ['author', 'pages', 'isbn', 'stores']), ['author', 'pages', 'stores']],
    [
      'vehicle',
      def('vehicle', ['make', 'model', 'model_year', 'displacement_cc', 'power_hp']),
      ['model_year', 'power_hp'],
    ],
    ['wishlist with a price', def('wishlist', [], true), ['price']],
    ['wishlist without a price', def('wishlist', [], false), []],
  ])('%s pins its fixed fields in order', (_label, definition, expected) => {
    expect(fixedPinned(definition)).toEqual(expected)
  })

  it.each([
    [
      'a movie without streaming pins runtime only',
      def('movie', ['runtime_minutes']),
      ['runtime_minutes'],
    ],
    [
      'a book without stores pins author and pages',
      def('book', ['author', 'pages']),
      ['author', 'pages'],
    ],
    [
      'a vehicle with no power field pins the year only',
      def('vehicle', ['model_year']),
      ['model_year'],
    ],
    ['a type with none of its pins pins nothing', def('movie', ['director']), []],
  ])('drops pins whose field the definition lacks: %s', (_label, definition, expected) => {
    expect(fixedPinned(definition)).toEqual(expected)
  })

  it.each([
    ['"No type" pins nothing', typeDefinition(undefined, null)!],
    ['an unknown type pins nothing', def('board_game', ['rating'], true)],
  ])('%s', (_label, definition) => {
    expect(fixedPinned(definition)).toEqual([])
  })
})

describe('F014-W3 pinned text', () => {
  // Runtime is a number field, so the formatter reads it as one (the pins themselves are text-agnostic).
  const movie: TypeDefinition = {
    ...def('movie', []),
    fields: [
      {
        key: 'runtime_minutes',
        label: 'Runtime',
        type: 'number',
        position: 0,
        is_locked: true,
        version: 1,
      },
      {
        key: 'streaming',
        label: 'Streaming',
        type: 'streaming',
        position: 1,
        is_locked: true,
        version: 1,
      },
    ],
  }
  const tvShow = def('tv_show', ['seasons', 'streaming'])

  it('formats a movie runtime from its number field, and streaming draws no text', () => {
    const row = item({ runtime_minutes: 117, streaming: { platforms: ['Netflix'] } })
    expect(formatPinnedValue('runtime_minutes', row, movie)).toBe('117 min')
    expect(formatPinnedValue('streaming', row, movie)).toBeNull()
    expect(pinnedTexts(['runtime_minutes', 'streaming'], row, movie)).toEqual(['117 min'])
  })

  it('formats a TV show seasons count', () => {
    expect(formatPinnedValue('seasons', item({ seasons: 5 }), tvShow)).toBe('5 seasons')
    expect(formatPinnedValue('seasons', item({}), tvShow)).toBeNull()
  })

  it('formats the price from the item, not the metadata', () => {
    const wishlist = def('wishlist', [], true)
    const priced = item({}, { min: '1200', max: '1500', currency: 'EUR' })
    expect(pinnedTexts(['price'], priced, wishlist)).toEqual([expect.stringMatching(/1,200/)])
  })
})

describe('F016-W3 pinned placements (up to three pins)', () => {
  it('one pin sits beside the title, two keep first and corner, three add a third', () => {
    expect(pinnedPlacements([])).toEqual({ first: [], second: [], third: [] })
    expect(pinnedPlacements(['a'])).toEqual({ first: ['a'], second: [], third: [] })
    expect(pinnedPlacements(['a', 'b'])).toEqual({ first: ['a'], second: ['b'], third: [] })
    expect(pinnedPlacements(['a', 'b', 'c'])).toEqual({
      first: ['a'],
      second: ['b'],
      third: ['c'],
    })
  })

  it('places the fixed book pins: writer next to the title, pages next to it, stores in the corner', () => {
    expect(pinnedPlacements(['author', 'pages', 'stores'])).toEqual({
      first: ['author'],
      second: ['pages'],
      third: ['stores'],
    })
  })
})
