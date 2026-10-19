import type { components } from '../generated/schema'
import { http, HttpResponse } from 'msw/http'

type TypeDefinition = components['schemas']['TypeDefinition']
type TypeField = components['schemas']['TypeField']

const fields = (entries: Array<[string, string, TypeField['type']]>): TypeField[] =>
  entries.map(([key, label, type], position) => ({
    key,
    label,
    type,
    position,
    is_locked: true,
    version: 1,
  }))

/** Stable built-in definitions for MSW tests and the standalone mock worker. */
export const mockTypes: TypeDefinition[] = [
  {
    key: 'movie',
    name: 'Movies',
    default_icon: 'i:film',
    allows_price: false,
    default_sort_field: 'release_year',
    default_pinned_fields: ['runtime_minutes', 'streaming'],
    is_locked: true,
    version: 1,
    fields: fields([
      ['release_year', 'Release year', 'number'],
      ['runtime_minutes', 'Runtime', 'number'],
      ['director', 'Director', 'text'],
      ['imdb_url', 'IMDb', 'link'],
      ['streaming', 'Streaming', 'streaming'],
    ]),
  },
  {
    key: 'tv_show',
    name: 'TV shows',
    default_icon: 'i:tv',
    allows_price: false,
    default_sort_field: 'first_air_year',
    default_pinned_fields: ['seasons', 'streaming'],
    is_locked: true,
    version: 1,
    fields: fields([
      ['first_air_year', 'First aired', 'number'],
      ['end_year', 'Ended', 'number'],
      ['seasons', 'Seasons', 'number'],
      ['episodes_per_season', 'Episodes per season', 'number'],
      ['episode_minutes', 'Episode duration', 'number'],
      ['imdb_url', 'IMDb', 'link'],
      ['streaming', 'Streaming', 'streaming'],
    ]),
  },
  {
    key: 'vehicle',
    name: 'Vehicles',
    default_icon: 'i:car',
    allows_price: false,
    default_sort_field: 'model_year',
    default_pinned_fields: ['model_year', 'power_hp'],
    is_locked: true,
    version: 1,
    fields: fields([
      ['make', 'Make', 'text'],
      ['model', 'Model', 'text'],
      ['model_year', 'Year', 'number'],
      ['displacement_cc', 'Engine size (cc)', 'number'],
      ['power_hp', 'Power (hp)', 'number'],
    ]),
  },
  {
    key: 'book',
    name: 'Books',
    default_icon: 'i:book-open',
    allows_price: false,
    default_sort_field: null,
    default_pinned_fields: ['author', 'pages', 'stores'],
    is_locked: true,
    version: 1,
    fields: fields([
      ['author', 'Writer', 'text'],
      ['pages', 'Pages', 'number'],
      ['isbn', 'ISBN', 'text'],
      ['stores', 'Where to get it', 'stores'],
    ]),
  },
  {
    key: 'wishlist',
    name: 'Wishlist',
    default_icon: 'i:tag',
    allows_price: true,
    default_sort_field: null,
    default_pinned_fields: ['price'],
    is_locked: true,
    version: 1,
    fields: [],
  },
]

export const typeHandlers = [
  http.get(`${globalThis.location?.origin ?? ''}/api/v1/types`, () => HttpResponse.json(mockTypes)),
]
