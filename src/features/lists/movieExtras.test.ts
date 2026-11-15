import { describe, expect, it } from 'vitest'
import { MOVIE_MAP, movieMenuItems, pickRandom } from './movieExtras'

/** A seeded generator (mulberry32), so the picks are repeatable. */
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('roadmap 36 pickRandom', () => {
  it.each([
    { ids: [], previous: null, random: 0.5, expected: null },
    { ids: ['a'], previous: null, random: 0.99, expected: 'a' },
    { ids: ['a'], previous: 'a', random: 0.3, expected: 'a' },
    { ids: ['a', 'b', 'c'], previous: null, random: 0, expected: 'a' },
    { ids: ['a', 'b', 'c'], previous: null, random: 0.999, expected: 'c' },
    { ids: ['a', 'b', 'c'], previous: 'a', random: 0, expected: 'b' },
    { ids: ['a', 'b', 'c'], previous: 'c', random: 0.999, expected: 'b' },
    { ids: ['a', 'b'], previous: 'gone', random: 0.6, expected: 'b' },
  ])('$ids after $previous with $random -> $expected', ({ ids, previous, random, expected }) => {
    expect(pickRandom(ids, previous, () => random)).toBe(expected)
  })

  it('never repeats the previous pick and is uniform (seeded)', () => {
    const ids = ['a', 'b', 'c', 'd']
    const random = seeded(36)
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 }
    let previous: string | null = null
    for (let i = 0; i < 8000; i += 1) {
      const next: string | null = pickRandom(ids, previous, random)
      expect(next).not.toBe(previous)
      if (next) counts[next] = (counts[next] ?? 0) + 1
      previous = next
    }
    for (const id of ids) expect(counts[id]).toBeGreaterThan(1800)
  })
})

describe('roadmap 36 movie menu entries', () => {
  const onPick = () => {}

  it.each([null, 'tv_show', 'book', 'vehicle', 'wishlist'])('none for type %s', (type) => {
    expect(movieMenuItems(type, { shown: 3, onPick })).toEqual([])
  })

  it('a Movies list gets the pick and the map link', () => {
    const items = movieMenuItems('movie', { shown: 3, onPick })
    expect(items).toMatchObject([
      { label: 'Pick a random movie', disabled: false, hint: undefined },
      { type: 'link', label: MOVIE_MAP.label, href: 'https://mikeyguinness.com/movies/' },
    ])
  })

  it('the pick is disabled with a reason when nothing is shown', () => {
    expect(movieMenuItems('movie', { shown: 0, onPick })[0]).toMatchObject({
      disabled: true,
      hint: 'No movies shown',
    })
  })
})
