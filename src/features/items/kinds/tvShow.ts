import type { components } from '../../../generated/schema'
import { defineFields } from './types'

export const tvShowFields = defineFields<components['schemas']['TvShowMetadata']>()([
  { key: 'first_air_year', label: 'First aired', input: 'year', min: 1920, max: 2100 },
  { key: 'end_year', label: 'Ended', input: 'year', min: 1920, max: 2100 },
  { key: 'seasons', label: 'Seasons', input: 'integer', min: 1, max: 200 },
  { key: 'episodes_per_season', label: 'Episodes per season', input: 'integer', min: 1, max: 500 },
  {
    key: 'episode_minutes',
    label: 'Episode duration (min)',
    input: 'integer',
    min: 1,
    max: 1000,
  },
  { key: 'imdb_url', label: 'IMDb', input: 'imdb_url' },
  { key: 'streaming', label: 'Streaming', input: 'streaming' },
])
