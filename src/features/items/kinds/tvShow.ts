import type { components } from '../../../generated/schema'
import { defineFields } from './types'

export const tvShowFields = defineFields<components['schemas']['TvShowMetadata']>()([
  { key: 'first_air_year', label: 'First aired', input: 'year', min: 1920, max: 2100 },
  { key: 'end_year', label: 'Ended', input: 'year', min: 1920, max: 2100 },
  { key: 'seasons', label: 'Seasons', input: 'integer', min: 1, max: 200 },
  { key: 'imdb_url', label: 'IMDb', input: 'imdb_url' },
  { key: 'streaming', label: 'Streaming', input: 'streaming' },
])
