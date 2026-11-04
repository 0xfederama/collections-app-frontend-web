import { describe, expect, it } from 'vitest'
import { filterOwnedPlatforms, orderPlatforms, serviceLabel, STREAMING_OFFERED } from './owned'

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
      kept: ['Sky'],
      why: 'order is kept and a repeated service shows once',
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

  it('F-022 resolves TMDB provider names and shows one tile per service', () => {
    const tmdb = [
      'Apple TV',
      'Apple TV Store',
      'Amazon Prime Video',
      'Amazon Prime Video with Ads',
      'Amazon Prime Video Free with Ads',
      'Amazon Video',
      'Apple TV Amazon Channel',
      'HBO Max Amazon Channel',
    ]
    expect(filterOwnedPlatforms(tmdb, [], name)).toEqual([
      'Apple TV',
      'Apple TV Store',
      'Amazon Prime Video',
      'Amazon Video',
      'HBO Max Amazon Channel',
    ])
    expect(filterOwnedPlatforms(tmdb, ['appletv', 'primevideo'], name)).toEqual([
      'Apple TV',
      'Amazon Prime Video',
    ])
    expect(
      filterOwnedPlatforms(
        ['Amazon Prime Video Free with Ads', 'Amazon MX Player'],
        ['primevideo'],
        name,
      ),
    ).toEqual(['Amazon Prime Video Free with Ads'])
  })

  it('keeps unknown names once each when nothing is owned', () => {
    expect(filterOwnedPlatforms(['Foo TV', 'foo tv', 'Bar'], [], name)).toEqual(['Foo TV', 'Bar'])
  })
})

describe('F-025 orderPlatforms', () => {
  const paid = new Set(['Sky', 'Disney+'])
  const order = (platforms: string[], owned: string[]) =>
    orderPlatforms(platforms, owned, name, (platform) => paid.has(platform))

  it.each<{ platforms: string[]; owned: string[]; expected: string[]; why: string }>([
    {
      platforms: ['Disney+', 'Netflix', 'Hulu'],
      owned: [],
      expected: ['Netflix', 'Hulu', 'Disney+'],
      why: 'empty owned: registry order, paid last',
    },
    {
      platforms: ['Netflix', 'Hulu', 'Max'],
      owned: ['hulu', 'netflix'],
      expected: ['Hulu', 'Netflix', 'Max'],
      why: 'the Settings order wins over the registry order',
    },
    {
      platforms: ['Netflix', 'Hulu', 'Disney+'],
      owned: ['disneyplus', 'hulu', 'netflix'],
      expected: ['Hulu', 'Netflix', 'Disney+'],
      why: 'a paid platform goes after the free ones even when owned first',
    },
    {
      platforms: ['Sky', 'Disney+', 'Netflix'],
      owned: ['disneyplus', 'netflix'],
      expected: ['Netflix', 'Disney+', 'Sky'],
      why: 'the Settings order holds inside the paid group; unknown last of its group',
    },
    {
      platforms: ['Zed', 'Alpha', 'Netflix'],
      owned: [],
      expected: ['Netflix', 'Zed', 'Alpha'],
      why: 'unknown names go last, in their given order',
    },
    { platforms: [], owned: ['netflix'], expected: [], why: 'nothing to order' },
  ])('$why', ({ platforms, owned, expected }) => {
    expect(order(platforms, owned)).toEqual(expected)
  })

  it('does not mutate the input', () => {
    const input = ['Hulu', 'Netflix']
    order(input, ['netflix', 'hulu'])
    expect(input).toEqual(['Hulu', 'Netflix'])
  })
})
