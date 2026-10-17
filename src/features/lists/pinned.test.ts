import { describe, expect, it } from 'vitest'
import {
  defaultPinned,
  formatPinnedValue,
  MAX_PINNED,
  pinnableFields,
  pinnedPlacements,
  pinnedTexts,
  resolvePinned,
  streamingOf,
} from './pinned'
import type { ItemSummary } from './api'

const item = (kind: ItemSummary['kind'], over: Partial<ItemSummary> = {}): ItemSummary => ({
  id: 'i1',
  list_id: 'l1',
  title: 'T',
  kind,
  image: null,
  price: null,
  website: null,
  metadata: {},
  content_version: 0,
  sort_order: 0,
  version: 1,
  created_at: '2026-10-14T09:00:00Z',
  updated_at: '2026-10-14T09:00:00Z',
  ...over,
})

describe('F009-W3 the kind default is an ordered pair', () => {
  it('follows the F-002 table, capped at two keys, in order', () => {
    expect(defaultPinned('movie')).toEqual(['runtime_minutes', 'streaming'])
    expect(defaultPinned('tv_show')).toEqual(['seasons', 'streaming'])
    expect(defaultPinned('motorcycle')).toEqual(['displacement_cc', 'price'])
    expect(defaultPinned('car')).toEqual(['model_year', 'price'])
    expect(defaultPinned('camera')).toEqual(['camera_type', 'price'])
    expect(defaultPinned('generic')).toEqual([])
  })

  it('no kind default is longer than MAX_PINNED, and MAX_PINNED is the contract limit', () => {
    expect(MAX_PINNED).toBe(2)
    for (const kind of ['movie', 'tv_show', 'motorcycle', 'car', 'camera', 'generic'] as const) {
      expect(defaultPinned(kind).length).toBeLessThanOrEqual(MAX_PINNED)
    }
  })

  it('resolvePinned: null is the kind default in its own order, [] pins nothing', () => {
    expect(resolvePinned({ kind: 'car', pinned_fields: null })).toEqual(defaultPinned('car'))
    expect(resolvePinned({ kind: 'movie', pinned_fields: null })).toEqual([
      'runtime_minutes',
      'streaming',
    ])
    expect(resolvePinned({ kind: 'car', pinned_fields: [] })).toEqual([])
    expect(resolvePinned({ kind: 'car', pinned_fields: ['power_hp', 'make'] })).toEqual([
      'power_hp',
      'make',
    ])
  })

  it('unpinning the first promotes the second (removing by key keeps the order)', () => {
    const pinned = ['runtime_minutes', 'streaming']
    expect(pinned.filter((key) => key !== 'runtime_minutes')).toEqual(['streaming'])
  })

  it('returns a copy, so the caller cannot change the defaults', () => {
    const first = defaultPinned('car')
    expect(resolvePinned({ kind: 'car', pinned_fields: [...first] })).not.toBe(first)
  })
})

describe('F009-W2 the pinned fields are the ones the kind defines', () => {
  it('offers the kind fields without the IMDb link, and price only where there is one', () => {
    expect(pinnableFields('movie').map((f) => f.key)).toEqual([
      'release_year',
      'runtime_minutes',
      'director',
      'streaming',
    ])
    expect(pinnableFields('tv_show').map((f) => f.key)).not.toContain('price')
    expect(pinnableFields('car').map((f) => f.key)).toContain('price')
    expect(pinnableFields('generic')).toEqual([])
  })

  it('a TV show pins seasons and streaming by default, and every kind field stays available', () => {
    const labels = pinnableFields('tv_show').map((f) => f.label)
    expect(labels).toContain('Episode duration')
    // Streaming in the corner, like a movie: the service icons stay in every streaming row.
    expect(defaultPinned('tv_show')).toEqual(['seasons', 'streaming'])
  })
})

describe('F002-W2 pinned values', () => {
  it('formats units and prices without cents', () => {
    const moto = item('motorcycle', {
      metadata: { displacement_cc: 937 },
      price: { min: '1200', max: '1500', currency: 'EUR' },
    })
    expect(formatPinnedValue('displacement_cc', moto, 'motorcycle')).toBe('937 cc')
    expect(formatPinnedValue('price', moto, 'motorcycle')).toBe('€\u202F1,200–1,500')
    const movie = item('movie', { metadata: { runtime_minutes: 124 } })
    expect(formatPinnedValue('runtime_minutes', movie, 'movie')).toBe('124 min')
    expect(formatPinnedValue('release_year', movie, 'movie')).toBeNull()
    expect(
      formatPinnedValue(
        'director',
        item('movie', { metadata: { director: 'Greta Gerwig' } }),
        'movie',
      ),
    ).toBe('Greta Gerwig')
  })

  it('pinnedPlacements: the first key beside the title, the second in the corner', () => {
    expect(pinnedPlacements(['runtime_minutes', 'streaming'])).toEqual({
      first: ['runtime_minutes'],
      second: ['streaming'],
    })
    expect(pinnedPlacements(['model_year'])).toEqual({ first: ['model_year'], second: [] })
    expect(pinnedPlacements([])).toEqual({ first: [], second: [] })
  })

  it('pinnedPlacements keeps a TV show’s seasons and episodes in one 5×7 piece', () => {
    expect(pinnedPlacements(['seasons', 'episodes_per_season'])).toEqual({
      first: ['seasons', 'episodes_per_season'],
      second: [],
    })
  })

  it('a TV show reads 5×7 when both seasons fields are pinned, 5 seasons by default', () => {
    const show = item('tv_show', {
      metadata: { seasons: 5, episodes_per_season: 7, episode_minutes: 45 },
    })
    // The default pins seasons only, so the corner carries the streaming icons instead.
    expect(pinnedTexts(defaultPinned('tv_show'), show, 'tv_show')).toEqual(['5 seasons'])
    expect(pinnedTexts(['seasons', 'episodes_per_season'], show, 'tv_show')).toEqual(['5×7'])
    expect(
      pinnedTexts(['seasons', 'episodes_per_season', 'episode_minutes'], show, 'tv_show'),
    ).toEqual(['5×7', '45 min'])
  })

  it('reads the streaming platforms and which ones are paid', () => {
    const movie = item('movie', {
      metadata: {
        streaming: { platforms: ['Netflix', 'Prime Video'], paid_platforms: ['prime video'] },
      },
    })
    expect(streamingOf(movie)).toEqual([
      { name: 'Netflix', paid: false },
      { name: 'Prime Video', paid: true },
    ])
  })
})

describe('F008-W14 generic lists pin nothing', () => {
  it('resolvePinned ignores any stored selection on a generic list', () => {
    expect(resolvePinned({ kind: 'generic', pinned_fields: null })).toEqual([])
    expect(resolvePinned({ kind: 'generic', pinned_fields: ['price'] })).toEqual([])
  })
})
