import { describe, expect, it } from 'vitest'
import type { ItemType } from './api'
import { buildExternalLinks, safeImdbUrl } from './links'

describe('F006-W5 safeImdbUrl', () => {
  it.each([
    'https://www.imdb.com/title/tt0133093/',
    'https://m.imdb.com/title/tt0133093',
    'https://imdb.com/title/tt0133093/',
  ])('F006-W5 returns %s', (url) => {
    expect(safeImdbUrl(url)).toBe(url)
  })

  it.each([
    'http://www.imdb.com/title/tt0133093/',
    'https://example.com/title/tt0133093/',
    'https://imdb.com.evil.tld/title/tt0133093/',
    'https://www.imdb.com@evil.tld/title/tt0133093/',
    'javascript:alert(1)',
    'https://www.imdb.com/name/nm0000206/',
    'https://www.imdb.com/title/tt12/',
    '',
    null,
    42,
  ])('F006-W5 rejects %s', (url) => {
    expect(safeImdbUrl(url)).toBeNull()
  })
})

type Source = Parameters<typeof buildExternalLinks>[0]

const make = (over: Partial<Source> = {}): Source => ({
  title: 'The Matrix',
  type: null,
  website: null,
  ...over,
})

/** The links of an item by id; a missing id throws, so a test never reads `undefined`. */
const byId = (item: Source) => {
  const all = buildExternalLinks(item)
  return (id: string) => {
    const found = all.find((link) => link.id === id)
    if (!found) throw new Error(`no ${id} link`)
    return found
  }
}

const queryOf = (href: string | null) => {
  const url = new URL(href ?? '')
  expect(url.origin + url.pathname).toBe('https://www.google.com/search')
  return url.searchParams.get('q')
}

describe('AT-13 external links: shape per type (F-002)', () => {
  it.each<[ItemType, string[]]>([
    ['movie', ['google', 'letterboxd', 'imdb']],
    ['tv_show', ['google', 'imdb']],
    [null, ['google', 'reddit', 'website']],
    ['motorcycle', ['google', 'reddit', 'website']],
    ['car', ['google', 'reddit', 'website']],
    ['camera', ['google', 'reddit', 'website']],
  ])('%s: %j', (type, ids) => {
    expect(buildExternalLinks(make({ type })).map((l) => l.id)).toEqual(ids)
  })

  it('labels are Google, Reddit, Website, Letterboxd, IMDb', () => {
    expect(buildExternalLinks(make()).map((l) => l.label)).toEqual(['Google', 'Reddit', 'Website'])
    expect(buildExternalLinks(make({ type: 'movie' })).map((l) => l.label)).toEqual([
      'Google',
      'Letterboxd',
      'IMDb',
    ])
  })

  it('Google and Reddit are Google searches', () => {
    const link = byId(make({ title: 'Ducati' }))
    expect(link('google').href).toMatch(/^https:\/\/www\.google\.com\/search\?q=/)
    expect(link('reddit').href).toMatch(/^https:\/\/www\.google\.com\/search\?q=/)
  })
})

describe('F-002 Letterboxd and IMDb', () => {
  it('Letterboxd is a title search with the title encoded as a path segment', () => {
    const href = byId(make({ type: 'movie', title: 'Tom & Jerry/2 #1' }))('letterboxd').href
    expect(href).toBe('https://letterboxd.com/search/Tom%20%26%20Jerry%2F2%20%231/')
  })

  it('IMDb opens the stored imdb_url when it is valid', () => {
    const url = 'https://www.imdb.com/title/tt0133093/'
    for (const type of ['movie', 'tv_show'] as const) {
      expect(byId(make({ type, metadata: { imdb_url: url } }))('imdb').href).toBe(url)
    }
  })

  it.each([
    ['missing', {}],
    ['empty', { imdb_url: '' }],
    ['not IMDb', { imdb_url: 'https://evil.example/title/tt0133093/' }],
    ['javascript:', { imdb_url: 'javascript:alert(1)' }],
  ])('IMDb falls back to a title search when imdb_url is %s', (_, metadata) => {
    const href = byId(make({ type: 'movie', title: 'A&B #1', metadata }))('imdb').href ?? ''
    const url = new URL(href)
    expect(url.origin + url.pathname).toBe('https://www.imdb.com/find/')
    expect(url.searchParams.get('q')).toBe('A&B #1')
    expect(url.searchParams.get('s')).toBe('tt')
    expect(url.hash).toBe('')
  })
})

describe('AT-13 external links: search text per type', () => {
  it.each<[string, Source, string]>([
    [
      'movie with year',
      make({ type: 'movie', metadata: { release_year: 1999 } }),
      'The Matrix 1999 film',
    ],
    ['movie without year', make({ type: 'movie', metadata: {} }), 'The Matrix film'],
    ['movie without metadata', make({ type: 'movie' }), 'The Matrix film'],
    [
      'movie with a non-numeric year',
      make({ type: 'movie', metadata: { release_year: '1999' } }),
      'The Matrix film',
    ],
    [
      'tv_show',
      make({ type: 'tv_show', metadata: { first_air_year: 2019 } }),
      'The Matrix TV series',
    ],
    ['motorcycle', make({ type: 'motorcycle', metadata: { model_year: 2024 } }), 'The Matrix'],
    ['car', make({ type: 'car' }), 'The Matrix'],
    ['camera', make({ type: 'camera' }), 'The Matrix'],
    ['no type', make({ type: null }), 'The Matrix'],
  ])('%s', (_, item, expected) => {
    const link = byId(item)
    expect(queryOf(link('google').href)).toBe(expected)
    if (item.type !== 'movie' && item.type !== 'tv_show') {
      expect(queryOf(link('reddit').href)).toBe(`${expected} site:reddit.com`)
    }
  })
})

describe('AT-13 external links: title encoding', () => {
  it.each([
    ['ampersand', 'Tom & Jerry'],
    ['hash', 'C# in Depth'],
    ['double quotes', 'The "Real" Thing'],
    ['plus', 'C++ Primer'],
    ['percent', '100% Wolf'],
    ['percent escape lookalike', '100%20Wolf'],
    ['accents', 'Amélie'],
    ['CJK', '千と千尋'],
    ['mixed', 'a&b=c#d "e" +f %g Ünï 千'],
  ])('%s survives a round trip through the URL', (_, title) => {
    for (const type of [null, 'movie', 'tv_show'] as const) {
      const suffix = { none: '', movie: ' film', tv_show: ' TV series' }[type ?? 'none']
      const link = byId(make({ title, type }))
      expect(queryOf(link('google').href)).toBe(`${title}${suffix}`)
      if (type === null) {
        expect(queryOf(link('reddit').href)).toBe(`${title}${suffix} site:reddit.com`)
      }
    }
  })

  it('leaves no unencoded & or # from the title in the raw href', () => {
    const raw = byId(make({ title: 'A&B#C' }))('google').href ?? ''
    const query = raw.slice(raw.indexOf('?') + 1)
    expect(query.startsWith('q=')).toBe(true)
    expect(query).not.toMatch(/[&#]/)
    expect(new URL(raw).hash).toBe('')
    expect([...new URL(raw).searchParams.keys()]).toEqual(['q'])
  })

  it('movie year goes between the title and "film"', () => {
    const link = byId(make({ title: 'Amélie', type: 'movie', metadata: { release_year: 2001 } }))
    expect(queryOf(link('google').href)).toBe('Amélie 2001 film')
  })
})

describe('AT-13 external links: website', () => {
  it.each([
    ['http', 'http://example.org/'],
    ['https', 'https://www.ducati.com/'],
    ['https with path and query', 'https://example.org/a/b?x=1#y'],
  ])('%s URL is used as is', (_, url) => {
    expect(byId(make({ website: url }))('website').href).toBe(url)
  })

  it.each([
    ['null', null],
    ['empty string', ''],
    ['javascript:', 'javascript:alert(1)'],
    ['ftp:', 'ftp://x'],
    ['data:', 'data:text/html,x'],
    ['garbage', 'not a url'],
    ['relative', '/foo'],
  ])('%s gives a null href', (_, url) => {
    expect(byId(make({ website: url }))('website').href).toBeNull()
  })

  it('movies and TV shows have no website link', () => {
    for (const type of ['movie', 'tv_show'] as const) {
      const ids = buildExternalLinks(make({ type, website: 'https://example.org/' })).map(
        (l) => l.id,
      )
      expect(ids).not.toContain('website')
    }
  })

  it('an invalid website does not affect Google or Reddit', () => {
    const link = byId(make({ website: 'javascript:alert(1)' }))
    expect(link('google').href).not.toBeNull()
    expect(link('reddit').href).not.toBeNull()
  })
})
