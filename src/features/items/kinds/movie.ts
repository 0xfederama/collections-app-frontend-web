import type { components } from '../../../generated/schema'
import { defineFields } from './types'

export const movieFields = defineFields<components['schemas']['MovieMetadata']>()([
  { key: 'release_year', label: 'Release year', input: 'year', min: 1870, max: 2100 },
  { key: 'runtime_minutes', label: 'Runtime', input: 'integer', unit: 'min', min: 1, max: 1000 },
  { key: 'director', label: 'Director', input: 'text', maxLength: 300 },
  { key: 'imdb_url', label: 'IMDb', input: 'imdb_url' },
  { key: 'streaming', label: 'Streaming', input: 'streaming' },
])
