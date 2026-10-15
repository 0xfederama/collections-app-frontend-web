import type { ItemKind } from './api'

export interface ExternalLink {
  id: 'google' | 'reddit' | 'official'
  label: string
  /** `null` = disabled: the item has no (usable) official site. */
  href: string | null
}

export const NO_OFFICIAL_SITE = 'No official site'

interface LinkSource {
  title: string
  kind: ItemKind
  official_website_url: string | null
  metadata?: object
}

/** The search text for the item (PRODUCT §9): movies add year and `film`, TV shows `TV series`. */
function searchQuery({ title, kind, metadata }: LinkSource): string {
  if (kind === 'movie') {
    const year = (metadata as { release_year?: unknown } | undefined)?.release_year
    return [title, typeof year === 'number' ? String(year) : '', 'film'].filter(Boolean).join(' ')
  }
  if (kind === 'tv_show') return `${title} TV series`
  return title
}

const google = (query: string) =>
  `https://www.google.com/search?${new URLSearchParams({ q: query }).toString()}`

/** Only an `http(s)` URL is a link; anything else (or nothing) disables the control. */
function safeOfficialUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

/** Same pattern as the contract: `imdb_url` in api/openapi.yaml (movie / TV show metadata). */
const IMDB_URL = /^https:\/\/(www\.|m\.)?imdb\.com\/title\/tt\d{7,10}\/?$/

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
 * The three external controls of AT-13, always in this order: Google, Reddit, Official site.
 * The official site is never replaced by a search. `URLSearchParams` does the encoding, so
 * `&`, `#`, quotes and non-ASCII titles cannot change the URL's structure.
 */
export function buildExternalLinks(item: LinkSource): [ExternalLink, ExternalLink, ExternalLink] {
  const query = searchQuery(item)
  return [
    { id: 'google', label: 'Google', href: google(query) },
    { id: 'reddit', label: 'Reddit', href: google(`${query} site:reddit.com`) },
    { id: 'official', label: 'Official site', href: safeOfficialUrl(item.official_website_url) },
  ]
}
