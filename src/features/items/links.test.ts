import { describe, expect, it } from 'vitest'
import type { ItemKind } from './api'
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
  kind: 'generic',
  official_website_url: null,
  ...over,
})

const queryOf = (href: string | null) => {
  const url = new URL(href ?? '')
  expect(url.origin + url.pathname).toBe('https://www.google.com/search')
  return url.searchParams.get('q')
}

describe('AT-13 external links: shape', () => {
  it('returns exactly three links in the order google, reddit, official', () => {
    const links = buildExternalLinks(make())
    expect(links.map((l) => l.id)).toEqual(['google', 'reddit', 'official'])
    expect(links.map((l) => l.label)).toEqual(['Google', 'Reddit', 'Official site'])
  })

  it('Google and Reddit are Google searches', () => {
    const [google, reddit] = buildExternalLinks(make({ title: 'Ducati' }))
    expect(google.href).toMatch(/^https:\/\/www\.google\.com\/search\?q=/)
    expect(reddit.href).toMatch(/^https:\/\/www\.google\.com\/search\?q=/)
  })
})

describe('AT-13 external links: search text per kind', () => {
  it.each<[string, Source, string]>([
    [
      'movie with year',
      make({ kind: 'movie', metadata: { release_year: 1999 } }),
      'The Matrix 1999 film',
    ],
    ['movie without year', make({ kind: 'movie', metadata: {} }), 'The Matrix film'],
    ['movie without metadata', make({ kind: 'movie' }), 'The Matrix film'],
    [
      'movie with a non-numeric year',
      make({ kind: 'movie', metadata: { release_year: '1999' } }),
      'The Matrix film',
    ],
    [
      'tv_show',
      make({ kind: 'tv_show', metadata: { first_air_year: 2019 } }),
      'The Matrix TV series',
    ],
    ['motorcycle', make({ kind: 'motorcycle', metadata: { model_year: 2024 } }), 'The Matrix'],
    ['car', make({ kind: 'car' }), 'The Matrix'],
    ['camera', make({ kind: 'camera' }), 'The Matrix'],
    ['generic', make({ kind: 'generic' }), 'The Matrix'],
  ])('%s', (_, item, expected) => {
    const [google, reddit] = buildExternalLinks(item)
    expect(queryOf(google.href)).toBe(expected)
    expect(queryOf(reddit.href)).toBe(`${expected} site:reddit.com`)
  })

  it('covers every kind of the spec with a title-only or suffixed query', () => {
    const kinds: ItemKind[] = ['generic', 'movie', 'tv_show', 'motorcycle', 'car', 'camera']
    for (const kind of kinds) {
      const [google] = buildExternalLinks(make({ kind, title: 'X' }))
      expect(queryOf(google.href)?.startsWith('X')).toBe(true)
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
    for (const kind of ['generic', 'movie', 'tv_show'] as const) {
      const suffix = { generic: '', movie: ' film', tv_show: ' TV series' }[kind]
      const [google, reddit] = buildExternalLinks(make({ title, kind }))
      expect(queryOf(google.href)).toBe(`${title}${suffix}`)
      expect(queryOf(reddit.href)).toBe(`${title}${suffix} site:reddit.com`)
    }
  })

  it('leaves no unencoded & or # from the title in the raw href', () => {
    const [google] = buildExternalLinks(make({ title: 'A&B#C' }))
    const raw = google.href ?? ''
    const query = raw.slice(raw.indexOf('?') + 1)
    expect(query.startsWith('q=')).toBe(true)
    expect(query).not.toMatch(/[&#]/)
    expect(new URL(raw).hash).toBe('')
    expect([...new URL(raw).searchParams.keys()]).toEqual(['q'])
  })

  it('movie year goes between the title and "film"', () => {
    const [google] = buildExternalLinks(
      make({ title: 'Amélie', kind: 'movie', metadata: { release_year: 2001 } }),
    )
    expect(queryOf(google.href)).toBe('Amélie 2001 film')
  })
})

describe('AT-13 external links: official site', () => {
  it.each([
    ['http', 'http://example.org/'],
    ['https', 'https://www.ducati.com/'],
    ['https with path and query', 'https://example.org/a/b?x=1#y'],
  ])('%s URL is used as is', (_, url) => {
    expect(buildExternalLinks(make({ official_website_url: url }))[2].href).toBe(url)
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
    expect(buildExternalLinks(make({ official_website_url: url }))[2].href).toBeNull()
  })

  it('never falls back to a search', () => {
    const links = buildExternalLinks(make({ kind: 'movie', official_website_url: null }))
    expect(links[2].href).toBeNull()
    expect(links[2].label).toBe('Official site')
  })

  it('an invalid official site does not affect Google or Reddit', () => {
    const [google, reddit] = buildExternalLinks(
      make({ official_website_url: 'javascript:alert(1)' }),
    )
    expect(google.href).not.toBeNull()
    expect(reddit.href).not.toBeNull()
  })
})
