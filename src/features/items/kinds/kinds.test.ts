import { describe, expect, it } from 'vitest'
import type { KindDefinition, KindField } from './index'
import { formatField, kindDefinition, kindRows } from './index'

const field = (
  key: string,
  label: string,
  type: KindField['type'],
  position: number,
): KindField => ({
  key,
  label,
  type,
  position,
  is_locked: false,
  version: 1,
})

const boardGame: KindDefinition = {
  key: 'board_game',
  name: 'Board game',
  default_icon: null,
  allows_price: false,
  default_sort_field: 'rating',
  default_pinned_fields: ['rating', 'played_on'],
  is_locked: false,
  version: 1,
  fields: [
    field('rating', 'Rating', 'number', 0),
    field('played_on', 'Played on', 'date', 1),
    field('recommended', 'Recommended', 'boolean', 2),
    field('rules', 'Rules', 'link', 3),
  ],
}

describe('F014-W3 API-driven kind fields', () => {
  it('finds custom kinds and renders typed values in API field order', () => {
    expect(kindDefinition([boardGame], 'board_game')).toBe(boardGame)
    expect(
      kindRows(boardGame, {
        rating: 8.5,
        played_on: '2026-10-19',
        recommended: false,
        rules: 'https://example.com/rules',
      }).map(({ key, text }) => [key, text]),
    ).toEqual([
      ['rating', '8.5'],
      ['played_on', expect.any(String)],
      ['recommended', 'No'],
      ['rules', 'https://example.com/rules'],
    ])
  })

  it('does not display values with the wrong wire type', () => {
    expect(formatField(boardGame.fields[0]!, '8.5')).toBeNull()
    expect(formatField(boardGame.fields[2]!, 'false')).toBeNull()
    expect(formatField(boardGame.fields[1]!, 'not-a-date')).toBeNull()
  })

  it('keeps built-in IMDb and streaming values out of the ordinary detail rows', () => {
    const movie: KindDefinition = {
      ...boardGame,
      key: 'movie',
      name: 'Movie',
      fields: [
        field('director', 'Director', 'text', 0),
        field('imdb_url', 'IMDb', 'link', 1),
        field('streaming', 'Streaming', 'streaming', 2),
      ],
    }
    expect(
      kindRows(movie, {
        director: 'Lana Wachowski',
        imdb_url: 'https://www.imdb.com/title/tt0133093/',
        streaming: { country: 'IT' },
      }),
    ).toEqual([{ key: 'director', label: 'Director', text: 'Lana Wachowski' }])
  })
})
