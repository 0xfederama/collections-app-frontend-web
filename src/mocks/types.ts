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
    name: 'Movie',
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
    name: 'TV show',
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
    key: 'motorcycle',
    name: 'Motorcycle',
    default_icon: 'i:bike',
    allows_price: true,
    default_sort_field: 'displacement_cc',
    default_pinned_fields: ['displacement_cc', 'price'],
    is_locked: true,
    version: 1,
    fields: fields([
      ['model_year', 'Model year', 'number'],
      ['displacement_cc', 'Displacement', 'number'],
      ['power_hp', 'Power', 'number'],
      ['license_class', 'License class', 'text'],
    ]),
  },
  {
    key: 'car',
    name: 'Car',
    default_icon: 'i:car',
    allows_price: true,
    default_sort_field: 'power_hp',
    default_pinned_fields: ['model_year', 'price'],
    is_locked: true,
    version: 1,
    fields: fields([
      ['make', 'Make', 'text'],
      ['model', 'Model', 'text'],
      ['model_year', 'Model year', 'number'],
      ['fuel_type', 'Fuel', 'text'],
      ['power_hp', 'Power', 'number'],
    ]),
  },
  {
    key: 'camera',
    name: 'Camera',
    default_icon: 'i:camera',
    allows_price: true,
    default_sort_field: 'megapixels',
    default_pinned_fields: ['camera_type', 'price'],
    is_locked: true,
    version: 1,
    fields: fields([
      ['camera_type', 'Type', 'text'],
      ['release_year', 'Release year', 'number'],
      ['sensor_format', 'Sensor', 'text'],
      ['megapixels', 'Resolution', 'number'],
    ]),
  },
]

export const typeHandlers = [
  http.get(`${globalThis.location?.origin ?? ''}/api/v1/types`, () => HttpResponse.json(mockTypes)),
]
