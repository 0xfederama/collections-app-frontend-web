import type { ItemType } from './api'

export interface ExternalLink {
  id: 'google' | 'letterboxd' | 'imdb' | 'reddit' | 'website' | 'goodreads' | 'openlibrary'
  label: string
  /** `null` (website only): the item has no (usable) website, so no link is shown. */
  href: string | null
}

interface LinkSource {
  title: string
  type: ItemType
  website: string | null
  metadata?: object
}

/** The Open Library work page when the lookup found one, else its ISBN page, else a search. */
function openLibraryUrl({ metadata }: LinkSource, query: string): string {
  const meta = metadata as { openlibrary_id?: unknown; isbn?: unknown } | undefined
  const id = meta?.openlibrary_id
  if (typeof id === 'string' && /^OL\d+W$/.test(id)) return `https://openlibrary.org/works/${id}`
  if (/^\d{10}(\d{3})?$/.test(query)) return `https://openlibrary.org/isbn/${query}`
  return `https://openlibrary.org/search?${new URLSearchParams({ q: query }).toString()}`
}

/** Books are searched by ISBN when there is one, else by title. */
function bookQuery({ title, metadata }: LinkSource): string {
  const isbn = (metadata as { isbn?: unknown } | undefined)?.isbn
  const digits = typeof isbn === 'string' ? isbn.replace(/[\s-]/g, '') : ''
  return digits || title
}

/** The search text for the item (PRODUCT §9): movies add year and `film`, TV shows `TV series`. */
function searchQuery({ title, type, metadata }: LinkSource): string {
  if (type === 'movie') {
    const year = (metadata as { release_year?: unknown } | undefined)?.release_year
    return [title, typeof year === 'number' ? String(year) : '', 'film'].filter(Boolean).join(' ')
  }
  if (type === 'tv_show') return `${title} TV series`
  return title
}

const google = (query: string) =>
  `https://www.google.com/search?${new URLSearchParams({ q: query }).toString()}`

/** Only an `http(s)` URL is a link; anything else (or nothing) disables the control. */
function safeWebsiteUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

/** Same pattern as the contract: `imdb_url` in api/openapi.yaml (movie / TV show metadata). */
export const IMDB_URL = /^https:\/\/(www\.|m\.)?imdb\.com\/title\/tt\d{7,10}\/?$/

/**
 * The IMDb URL only if it matches the contract pattern and parses as `https` on an IMDb host;
 * otherwise `null`, so bad data that slipped into the database is never rendered as a link.
 */
export function safeImdbUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !IMDB_URL.test(url)) return null
  try {
    const { protocol, hostname } = new URL(url)
    const ok =
      protocol === 'https:' && ['imdb.com', 'www.imdb.com', 'm.imdb.com'].includes(hostname)
    return ok ? url : null
  } catch {
    return null
  }
}

/**
 * The external controls of AT-13 and F-002, in this order: movies Google, Letterboxd, IMDb; TV
 * shows Google, IMDb; books Google, Goodreads, Open Library (Amazon and the other shops are the "Where to get it" stores); every other type Google, Reddit, Website. The website is never replaced by a
 * search; IMDb opens the stored `imdb_url` when valid, else a title search on IMDb. `URLSearchParams`
 * and `encodeURIComponent` do the encoding, so `&`, `#`, quotes and non-ASCII titles cannot change
 * the URL's structure.
 */
export function buildExternalLinks(item: LinkSource): ExternalLink[] {
  const query = searchQuery(item)
  const googleLink: ExternalLink = { id: 'google', label: 'Google', href: google(query) }
  const imdb: ExternalLink = {
    id: 'imdb',
    label: 'IMDb',
    href:
      safeImdbUrl((item.metadata as { imdb_url?: unknown } | undefined)?.imdb_url) ??
      `https://www.imdb.com/find/?${new URLSearchParams({ q: item.title, s: 'tt' }).toString()}`,
  }
  if (item.type === 'movie') {
    const letterboxd: ExternalLink = {
      id: 'letterboxd',
      label: 'Letterboxd',
      href: `https://letterboxd.com/search/${encodeURIComponent(item.title)}/`,
    }
    return [googleLink, letterboxd, imdb]
  }
  if (item.type === 'tv_show') return [googleLink, imdb]
  if (item.type === 'book') {
    const query = bookQuery(item)
    return [
      googleLink,
      {
        id: 'goodreads',
        label: 'Goodreads',
        href: `https://www.goodreads.com/search?${new URLSearchParams({ q: query }).toString()}`,
      },
      { id: 'openlibrary', label: 'Open Library', href: openLibraryUrl(item, query) },
    ]
  }
  return [
    googleLink,
    { id: 'reddit', label: 'Reddit', href: google(`${query} site:reddit.com`) },
    { id: 'website', label: 'Website', href: safeWebsiteUrl(item.website) },
  ]
}
