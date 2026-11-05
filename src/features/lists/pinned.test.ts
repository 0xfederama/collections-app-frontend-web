import { describe, expect, it } from 'vitest'
import { typeDefinition, type TypeDefinition } from '../items'
import type { ItemSummary } from './api'
import {
  compactPinned,
  fixedPinned,
  formatPinnedValue,
  isLowPriorityPin,
  pinnedPieces,
  pinnedPlacements,
} from './pinned'

/** A definition with the given field keys (the pins only read the keys) and price flag. */
const def = (key: string, fieldKeys: string[], allowsPrice = false): TypeDefinition => ({
  key,
  name: key,
  default_icon: null,
  allows_price: allowsPrice,
  default_sort_field: null,
  fields: fieldKeys.map((field, position) => ({
    key: field,
    label: field,
    type: 'text',
    position,
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
      ['runtime_minutes', 'director', 'streaming'],
    ],
    [
      'tv_show',
      def('tv_show', ['first_air_year', 'seasons', 'episodes_per_season', 'streaming']),
      ['seasons', 'streaming'],
    ],
    ['book', def('book', ['author', 'pages', 'isbn', 'stores']), ['pages', 'author', 'stores']],
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
      'a movie without a director field pins runtime and streaming',
      def('movie', ['runtime_minutes', 'streaming']),
      ['runtime_minutes', 'streaming'],
    ],
    [
      'a movie without streaming pins runtime and director',
      def('movie', ['runtime_minutes', 'director']),
      ['runtime_minutes', 'director'],
    ],
    [
      'a book without stores pins pages and author',
      def('book', ['author', 'pages']),
      ['pages', 'author'],
    ],
    [
      'a vehicle with no power field pins the year only',
      def('vehicle', ['model_year']),
      ['model_year'],
    ],
    ['a type with none of its pins pins nothing', def('movie', ['release_year']), []],
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
      },
      {
        key: 'streaming',
        label: 'Streaming',
        type: 'streaming',
        position: 1,
      },
    ],
  }
  const tvShow = def('tv_show', ['seasons', 'streaming'])

  it('formats a movie runtime from its number field, and streaming draws no text', () => {
    const row = item({ runtime_minutes: 117, streaming: { platforms: ['Netflix'] } })
    expect(formatPinnedValue('runtime_minutes', row, movie)).toBe('117 min')
    expect(formatPinnedValue('streaming', row, movie)).toBeNull()
    expect(pinnedPieces(['runtime_minutes', 'streaming'], row, movie)).toEqual([
      { key: 'runtime_minutes', text: '117 min' },
    ])
  })

  it('formats a TV show seasons count', () => {
    expect(formatPinnedValue('seasons', item({ seasons: 5 }), tvShow)).toBe('5 seasons')
    expect(formatPinnedValue('seasons', item({}), tvShow)).toBeNull()
  })

  it('formats the price from the item, not the metadata', () => {
    const wishlist = def('wishlist', [], true)
    const priced = item({}, { min: '1200', max: '1500', currency: 'EUR' })
    expect(pinnedPieces(['price'], priced, wishlist)).toEqual([
      { key: 'price', text: expect.stringMatching(/1,200/) },
    ])
  })
})

describe('F-025 W9 pinned pieces keep their keys, and the low-priority ones are the metadata', () => {
  const movie: TypeDefinition = {
    ...def('movie', []),
    fields: [
      { key: 'runtime_minutes', label: 'Runtime', type: 'number', position: 0 },
      { key: 'director', label: 'Director', type: 'text', position: 1 },
      { key: 'streaming', label: 'Streaming', type: 'streaming', position: 2 },
    ],
  }
  const book: TypeDefinition = {
    ...def('book', []),
    fields: [
      { key: 'pages', label: 'Pages', type: 'number', position: 0 },
      { key: 'author', label: 'Writer', type: 'text', position: 1 },
      { key: 'stores', label: 'Where to get it', type: 'stores', position: 2 },
    ],
  }

  it.each([
    [
      'a movie reads runtime, then director',
      movie,
      { runtime_minutes: 117, director: 'Ridley Scott' },
      ['runtime_minutes', 'director'],
      [
        { key: 'runtime_minutes', text: '117 min' },
        { key: 'director', text: 'Ridley Scott' },
      ],
    ],
    [
      'a book reads pages, then author',
      book,
      { pages: 127, author: 'Jane Austen' },
      ['pages', 'author'],
      [
        { key: 'pages', text: '127 p.' },
        { key: 'author', text: 'Jane Austen' },
      ],
    ],
    [
      'a missing value leaves its piece out',
      movie,
      { runtime_minutes: 117 },
      ['runtime_minutes', 'director'],
      [{ key: 'runtime_minutes', text: '117 min' }],
    ],
  ])('%s', (_label, definition, metadata, keys, expected) => {
    expect(pinnedPieces(keys, item(metadata), definition)).toEqual(expected)
  })

  it.each([
    ['director', true],
    ['pages', true],
    ['author', false],
    ['streaming', false],
    ['runtime_minutes', false],
    ['stores', false],
  ])('%s is low priority: %s', (key, expected) => {
    expect(isLowPriorityPin(key)).toBe(expected)
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

  it('places the fixed book pins: pages next to the title, writer next to it, stores in the corner', () => {
    expect(pinnedPlacements(['pages', 'author', 'stores'])).toEqual({
      first: ['pages'],
      second: ['author'],
      third: ['stores'],
    })
  })

  it('places the fixed movie pins: runtime and director beside the title, streaming in the corner', () => {
    expect(pinnedPlacements(['runtime_minutes', 'director', 'streaming'])).toEqual({
      first: ['runtime_minutes'],
      second: ['director'],
      third: ['streaming'],
    })
  })
})

describe('F026-W3 compact rows keep the length and the tiles, not the director or author', () => {
  it.each([
    [
      'a movie keeps runtime and streaming',
      ['runtime_minutes', 'director', 'streaming'],
      ['runtime_minutes', 'streaming'],
    ],
    ['a book keeps pages and stores', ['pages', 'author', 'stores'], ['pages', 'stores']],
    ['a TV show is unchanged', ['seasons', 'streaming'], ['seasons', 'streaming']],
    ['a vehicle is unchanged', ['model_year', 'power_hp'], ['model_year', 'power_hp']],
    ['a wishlist price is unchanged', ['price'], ['price']],
    ['no pins stay none', [], []],
  ])('%s', (_label, pinned, expected) => {
    expect(compactPinned(pinned)).toEqual(expected)
  })

  it.each([
    [
      'a movie: runtime beside the title, streaming in the corner',
      ['runtime_minutes', 'director', 'streaming'],
      { first: ['runtime_minutes'], second: ['streaming'], third: [] },
    ],
    [
      'a book: pages beside the title, stores in the corner',
      ['pages', 'author', 'stores'],
      { first: ['pages'], second: ['stores'], third: [] },
    ],
  ])('%s', (_label, pinned, expected) => {
    expect(pinnedPlacements(compactPinned(pinned))).toEqual(expected)
  })
})
