import { describe, expect, it } from 'vitest'
import { filterOwnedPlatforms, serviceLabel, STREAMING_OFFERED } from './owned'

const name = (platform: string) => platform

describe('F-022-W3 owned streaming services', () => {
  it.each<{ platforms: string[]; owned: string[]; kept: string[]; why: string }>([
    {
      platforms: ['Netflix', 'Sky'],
      owned: [],
      kept: ['Netflix', 'Sky'],
      why: 'empty owned shows every platform, known or not',
    },
    {
      platforms: ['Netflix', 'Sky', 'Hulu'],
      owned: ['netflix', 'hulu'],
      kept: ['Netflix', 'Hulu'],
      why: 'a platform is kept when its registry key is owned',
    },
    {
      platforms: ['NETFLIX', 'Disney+'],
      owned: ['netflix'],
      kept: ['NETFLIX'],
      why: 'names are matched after normalising case and punctuation',
    },
    {
      platforms: ['Amazon Prime Video'],
      owned: ['primevideo'],
      kept: ['Amazon Prime Video'],
      why: 'an alias of the owned key resolves to it',
    },
    {
      platforms: ['Amazon Video'],
      owned: ['primevideo'],
      kept: [],
      why: 'Amazon Video is its own key, not Prime Video',
    },
    {
      platforms: ['Obscure TV', 'Sky'],
      owned: ['sky'],
      kept: ['Sky'],
      why: 'a name the registry does not know (no label, key or alias) is hidden when something is owned',
    },
    {
      platforms: ['Obscure TV'],
      owned: ['netflix'],
      kept: [],
      why: 'an unknown name is hidden when owned is non-empty',
    },
    {
      platforms: ['Netflix'],
      owned: ['disneyplus'],
      kept: [],
      why: 'an owned list that matches nothing hides everything',
    },
    {
      platforms: ['Sky', 'Netflix', 'Sky'],
      owned: ['sky'],
      kept: ['Sky', 'Sky'],
      why: 'order and repeats are kept as given',
    },
    { platforms: [], owned: ['netflix'], kept: [], why: 'no platforms, nothing to show' },
  ])('$why', ({ platforms, owned, kept }) => {
    expect(filterOwnedPlatforms(platforms, owned, name)).toEqual(kept)
  })

  it('reads the name from objects, and does not mutate its input', () => {
    const platforms = [
      { name: 'Netflix', paid: false },
      { name: 'Sky', paid: true },
    ]
    const before = structuredClone(platforms)
    expect(filterOwnedPlatforms(platforms, ['sky'], (p) => p.name)).toEqual([
      { name: 'Sky', paid: true },
    ])
    expect(filterOwnedPlatforms(platforms, [], (p) => p.name)).not.toBe(platforms)
    expect(platforms).toEqual(before)
  })

  it('offers only the streaming registry entries, and labels a key with its display name', () => {
    expect(STREAMING_OFFERED.every((entry) => entry.streaming === true)).toBe(true)
    expect(STREAMING_OFFERED.map((entry) => entry.key)).toContain('netflix')
    expect(STREAMING_OFFERED.map((entry) => entry.key)).not.toContain('kobo')
    expect(serviceLabel('disneyplus')).toBe('Disney+')
    expect(serviceLabel('unknown_key')).toBe('unknown_key')
  })
})
