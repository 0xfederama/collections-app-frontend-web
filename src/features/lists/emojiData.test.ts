import { describe, expect, it } from 'vitest'
import { buildGroups, loadEmoji, searchEmoji } from './emojiData'

describe('F012 emoji data', () => {
  it('groups the real dataset without skin tones or emoji newer than Unicode 15.0', async () => {
    const groups = await loadEmoji()
    expect(groups.map((group) => group.label)).toEqual([
      'Smileys & emotion',
      'People & body',
      'Animals & nature',
      'Food & drink',
      'Travel & places',
      'Activities',
      'Objects',
      'Symbols',
      'Flags',
    ])
    const all = groups.flatMap((group) => group.emoji)
    expect(all.length).toBeGreaterThan(1500)
    expect(all.some((entry) => entry.name.includes('skin tone'))).toBe(false)
    expect(all.some((entry) => entry.emoji === '👋')).toBe(true)
    // Emoji 16.0 ("face with bags under eyes") is left out.
    expect(all.some((entry) => entry.emoji === '🫩')).toBe(false)
    // Emoji 15.0 ("goose") stays.
    expect(all.some((entry) => entry.emoji === '🪿')).toBe(true)
  })

  it('buildGroups drops versions above the cap and orders by dataset order', () => {
    const rows = [
      { hexcode: 'B', label: 'b', unicode: 'b', group: 0, order: 2 },
      { hexcode: 'A', label: 'a', unicode: 'a', group: 0, order: 1 },
      { hexcode: 'N', label: 'new', unicode: 'n', group: 0, order: 3 },
    ]
    const groups = buildGroups(rows, { '1': ['A', 'B'], '16': ['N'] })
    expect(groups[0]?.emoji.map((entry) => entry.emoji)).toEqual(['a', 'b'])
  })

  it('searchEmoji matches name and tags by word prefix, all words required', () => {
    const groups = buildGroups(
      [
        { hexcode: 'A', label: 'dog face', unicode: '🐶', group: 3, order: 1, tags: ['pet'] },
        { hexcode: 'B', label: 'cat face', unicode: '🐱', group: 3, order: 2, tags: ['pet'] },
      ],
      {},
    )
    const names = (query: string) =>
      searchEmoji(groups, query).flatMap((group) => group.emoji.map((entry) => entry.name))
    expect(names('PE')).toEqual(['dog face', 'cat face'])
    expect(names('pet dog')).toEqual(['dog face'])
    expect(names('og')).toEqual([])
    expect(names('  ')).toHaveLength(2)
  })
})
