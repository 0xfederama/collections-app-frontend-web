import { describe, expect, it } from 'vitest'
import {
  defaultPinned,
  formatPinnedValue,
  pinnableFields,
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

describe('F002-W2 default pinned fields', () => {
  it('follows the brief table', () => {
    expect(defaultPinned('movie')).toEqual({ under: ['runtime_minutes'], right: ['streaming'] })
    expect(defaultPinned('motorcycle')).toEqual({ under: ['displacement_cc'], right: ['price'] })
    expect(defaultPinned('car')).toEqual({ under: ['model_year'], right: ['price'] })
    expect(defaultPinned('camera')).toEqual({ under: ['camera_type'], right: ['price'] })
    expect(defaultPinned('generic')).toEqual({ under: [], right: [] })
  })

  it('resolvePinned: null is the default, {} pins nothing, slots are kept in order', () => {
    expect(resolvePinned({ kind: 'car', pinned_fields: null })).toEqual(defaultPinned('car'))
    expect(resolvePinned({ kind: 'car', pinned_fields: {} })).toEqual({ under: [], right: [] })
    expect(
      resolvePinned({ kind: 'car', pinned_fields: { under: ['power_hp', 'make'], right: [] } }),
    ).toEqual({ under: ['power_hp', 'make'], right: [] })
  })

  it('offers the kind fields plus price, without the IMDb link', () => {
    const keys = pinnableFields('movie').map((f) => f.key)
    expect(keys).toEqual(['release_year', 'runtime_minutes', 'streaming', 'price'])
    expect(pinnableFields('generic')).toEqual([])
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
  })

  it('a TV show default reads 5×7 · 45 min', () => {
    const show = item('tv_show', {
      metadata: { seasons: 5, episodes_per_season: 7, episode_minutes: 45 },
    })
    expect(pinnedTexts(defaultPinned('tv_show').under, show, 'tv_show').join(' · ')).toBe(
      '5×7 · 45 min',
    )
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
    expect(resolvePinned({ kind: 'generic', pinned_fields: null })).toEqual({
      under: [],
      right: [],
    })
    expect(
      resolvePinned({ kind: 'generic', pinned_fields: { under: [], right: ['price'] } }),
    ).toEqual({ under: [], right: [] })
  })
})
