import { describe, expect, it } from 'vitest'
import type { KindDefinition } from '../items/kinds'
import type { ItemSummary } from './api'
import {
  defaultPinned,
  formatPinnedValue,
  pinnableFields,
  pinnedTexts,
  resolvePinned,
} from './pinned'

const definition: KindDefinition = {
  key: 'board_game',
  name: 'Board game',
  default_icon: null,
  allows_price: true,
  default_sort_field: 'rating',
  default_pinned_fields: ['rating', 'recommended'],
  is_locked: false,
  version: 1,
  fields: [
    { key: 'rating', label: 'Rating', type: 'number', position: 0, is_locked: false, version: 1 },
    {
      key: 'recommended',
      label: 'Recommended',
      type: 'boolean',
      position: 1,
      is_locked: false,
      version: 1,
    },
    {
      key: 'played_on',
      label: 'Played on',
      type: 'date',
      position: 2,
      is_locked: false,
      version: 1,
    },
  ],
}

const item: ItemSummary = {
  id: 'i1',
  list_id: 'l1',
  title: 'Brass',
  kind: definition.key,
  image: null,
  price: null,
  website: null,
  metadata: { rating: 8.5, recommended: false, played_on: '2026-10-19' },
  content_version: 0,
  sort_order: 0,
  version: 1,
  created_at: '2026-10-19T00:00:00Z',
  updated_at: '2026-10-19T00:00:00Z',
}

describe('F014-W3 definition-backed pinned fields', () => {
  it('uses the API default only for null and preserves an explicit empty list', () => {
    expect(defaultPinned(definition)).toEqual(['rating', 'recommended'])
    expect(resolvePinned({ pinned_fields: null }, definition)).toEqual(['rating', 'recommended'])
    expect(resolvePinned({ pinned_fields: [] }, definition)).toEqual([])
  })

  it('offers every defined field and price when allowed', () => {
    expect(pinnableFields(definition).map(({ key }) => key)).toEqual([
      'rating',
      'recommended',
      'played_on',
      'price',
    ])
  })

  it('formats number, boolean and date values from their API types', () => {
    expect(formatPinnedValue('rating', item, definition)).toBe('8.5')
    expect(formatPinnedValue('recommended', item, definition)).toBe('No')
    expect(formatPinnedValue('played_on', item, definition)).toEqual(expect.any(String))
    expect(pinnedTexts(['rating', 'recommended'], item, definition)).toEqual(['8.5', 'No'])
  })
})
