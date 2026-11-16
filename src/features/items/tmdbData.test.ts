import { describe, expect, it } from 'vitest'
import type { Item } from './api'
import { formatTmdbScore, isImportedOnlyKey, tmdbGenres, tmdbScore } from './tmdbData'

/** Only `metadata` matters to these readers; the cast keeps the table short. */
const withMetadata = (metadata: unknown) => ({ metadata }) as Pick<Item, 'metadata'>

describe('F-028 W1 TMDB genres', () => {
  it.each<[string, unknown, string[]]>([
    ['a list of names, in order', { genres: ['Drama', 'Crime'] }, ['Drama', 'Crime']],
    ['trims and drops blanks', { genres: ['  Drama ', '', '   '] }, ['Drama']],
    [
      'drops repeats, keeping the first',
      { genres: ['Drama', 'Drama', 'Crime'] },
      ['Drama', 'Crime'],
    ],
    ['drops non-string entries', { genres: ['Drama', 7, null, { name: 'x' }] }, ['Drama']],
    ['missing key', {}, []],
    ['null', { genres: null }, []],
    ['a string instead of a list', { genres: 'Drama' }, []],
    ['an empty list', { genres: [] }, []],
    ['metadata itself null', null, []],
    ['metadata an array', ['Drama'], []],
  ])('reads genres from %s', (_name, metadata, expected) => {
    expect(tmdbGenres(withMetadata(metadata))).toEqual(expected)
  })
})

describe('F-028 W1 TMDB score', () => {
  it.each<[string, unknown, { rating: number; votes: number | null } | null]>([
    ['rating and count', { tmdb_rating: 7.4, tmdb_vote_count: 1234 }, { rating: 7.4, votes: 1234 }],
    ['rating only', { tmdb_rating: 7.4 }, { rating: 7.4, votes: null }],
    ['rating null', { tmdb_rating: null, tmdb_vote_count: 50 }, null],
    ['no keys at all', {}, null],
    ['rating zero is a rating', { tmdb_rating: 0 }, { rating: 0, votes: null }],
    ['rating ten is a rating', { tmdb_rating: 10 }, { rating: 10, votes: null }],
    ['rating above ten is garbage', { tmdb_rating: 10.1 }, null],
    ['negative rating is garbage', { tmdb_rating: -1 }, null],
    ['rating as a string is garbage', { tmdb_rating: '7.4' }, null],
    ['NaN rating is garbage', { tmdb_rating: Number.NaN }, null],
    [
      'count as a string is absent',
      { tmdb_rating: 7, tmdb_vote_count: '12' },
      { rating: 7, votes: null },
    ],
    [
      'fractional count is absent',
      { tmdb_rating: 7, tmdb_vote_count: 12.5 },
      { rating: 7, votes: null },
    ],
    [
      'negative count is absent',
      { tmdb_rating: 7, tmdb_vote_count: -3 },
      { rating: 7, votes: null },
    ],
    ['zero count is kept', { tmdb_rating: 7, tmdb_vote_count: 0 }, { rating: 7, votes: 0 }],
    ['metadata null', null, null],
  ])('reads the score from %s', (_name, metadata, expected) => {
    expect(tmdbScore(withMetadata(metadata))).toEqual(expected)
  })
})

describe('F-028 W1 TMDB score text', () => {
  it.each<[string, { rating: number; votes: number | null }, string]>([
    ['with a count', { rating: 7.4, votes: 1234 }, 'TMDB score 7.4 /10 · 1,234 votes'],
    ['without a count', { rating: 7.4, votes: null }, 'TMDB score 7.4 /10'],
    ['one decimal, whole ratings too', { rating: 8, votes: 5 }, 'TMDB score 8.0 /10 · 5 votes'],
    ['a single vote', { rating: 9.25, votes: 1 }, 'TMDB score 9.3 /10 · 1 vote'],
    ['zero votes', { rating: 6, votes: 0 }, 'TMDB score 6.0 /10 · 0 votes'],
  ])('formats the score %s', (_name, score, expected) => {
    expect(formatTmdbScore(score, 'en-US')).toBe(expected)
  })
})

describe('F-028 W1 imported-only keys', () => {
  it.each<[string, boolean]>([
    ['genres', true],
    ['tmdb_rating', true],
    ['tmdb_vote_count', true],
    ['director', false],
    ['tmdb_id', false],
  ])('%s is imported only: %s', (key, expected) => {
    expect(isImportedOnlyKey(key)).toBe(expected)
  })
})
