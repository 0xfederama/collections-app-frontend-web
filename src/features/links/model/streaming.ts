// Search URL of a streaming service for a title. Port of the backend's
// internal/streamlinks (docs/modules/streamlinks.md): same table, same URLs, same
// escaping as Go's url.QueryEscape. Pure, no I/O.

const NETFLIX = 'https://www.netflix.com/search?q='
const PRIME_VIDEO = 'https://www.primevideo.com/search/?phrase='
const DISNEY = 'https://www.disneyplus.com/search?q='
const APPLE_TV = 'https://tv.apple.com/search?term='
const MAX = 'https://play.max.com/search?q='
const PARAMOUNT = 'https://www.paramountplus.com/search/?q='
const HULU = 'https://www.hulu.com/search?q='
const PEACOCK = 'https://www.peacocktv.com/search?q='
const YOUTUBE = 'https://www.youtube.com/results?search_query='
const CRUNCHYROLL = 'https://www.crunchyroll.com/search?q='
const MUBI = 'https://mubi.com/search/films?query='

// Normalised platform name -> search URL prefix.
const EXACT: Record<string, string> = {
  netflix: NETFLIX,
  amazonprimevideo: PRIME_VIDEO,
  primevideo: PRIME_VIDEO,
  disneyplus: DISNEY,
  appletv: APPLE_TV,
  appletvplus: APPLE_TV,
  max: MAX,
  hbomax: MAX,
  paramountplus: PARAMOUNT,
  hulu: HULU,
  peacock: PEACOCK,
  peacockpremium: PEACOCK,
  youtube: YOUTUBE,
  crunchyroll: CRUNCHYROLL,
  mubi: MUBI,
}

// Tolerate TMDB's plan variants ("Netflix basic with Ads"). Tried in order after the
// exact match.
const PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ['netflix', NETFLIX],
  ['amazonprimevideo', PRIME_VIDEO],
  ['primevideo', PRIME_VIDEO],
  ['disneyplus', DISNEY],
]

/**
 * Lowercases a platform name, spells "+" as "plus" and drops every other character
 * that is not a letter or digit: "Disney+" and "Disney Plus" both give "disneyplus".
 */
export function normalizePlatform(name: string): string {
  return name
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

// Like Go's url.QueryEscape: spaces become "+", and the characters encodeURIComponent
// leaves alone but Go escapes (! ' ( ) *) are percent-encoded. "~" stays as is.
function queryEscape(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

function lookup(platform: string): string | null {
  const n = normalizePlatform(platform)
  if (Object.prototype.hasOwnProperty.call(EXACT, n)) {
    return EXACT[n] ?? null
  }
  for (const [prefix, url] of PREFIXES) {
    if (n.startsWith(prefix)) {
      return url
    }
  }
  return null
}

/**
 * Search URL of a streaming platform for a title, or null when the title is blank or
 * the platform is not in the table (the caller then falls back to streaming.link).
 */
export function streamingSearchLink(platform: string, title: string): string | null {
  const trimmed = title.trim()
  if (trimmed === '') {
    return null
  }
  const prefix = lookup(platform)
  if (prefix === null) {
    return null
  }
  return prefix + queryEscape(trimmed)
}
