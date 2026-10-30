/**
 * F017-W2: the entries of the service registry (see `registry.ts` for the lookup and the assets).
 * Order matters: the streaming picker lists the `streaming` entries in this order.
 */

/** `neutral` keeps the `fill` surface; `light` is the theme-independent white (`bg-tile-light`). */
export type TileStyle = 'neutral' | 'light'

/** `inset` contains the mark with padding; `bleed` fills the tile and is clipped by its corners. */
export type Fit = 'inset' | 'bleed'

export interface ServiceEntry {
  /** Stable identifier (the store key, or a lower-case name). */
  key: string
  /** Display name: the tooltip, the accessible name, the letter and the picker label. */
  label: string
  /** Extra names that resolve to this entry, beyond the normalised label and key. */
  aliases: string[]
  /** File name inside `src/assets/services/`. */
  file: string
  tile: TileStyle
  fit: Fit
  /** Offered in the streaming picker (item editor). */
  streaming?: boolean
}

export const SERVICES: ServiceEntry[] = [
  // Links and stores
  {
    key: 'google',
    label: 'Google',
    aliases: [],
    file: 'google.svg',
    tile: 'neutral',
    fit: 'inset',
  },
  { key: 'imdb', label: 'IMDb', aliases: [], file: 'imdb.svg', tile: 'neutral', fit: 'inset' },
  {
    key: 'letterboxd',
    label: 'Letterboxd',
    aliases: [],
    file: 'letterboxd.svg',
    tile: 'neutral',
    fit: 'inset',
  },
  {
    key: 'reddit',
    label: 'Reddit',
    aliases: [],
    file: 'reddit.svg',
    tile: 'neutral',
    fit: 'inset',
  },
  {
    key: 'goodreads',
    label: 'Goodreads',
    aliases: [],
    file: 'goodreads.svg',
    tile: 'light',
    fit: 'inset',
  },
  {
    key: 'openlibrary',
    label: 'Open Library',
    aliases: [],
    file: 'open-library.svg',
    tile: 'neutral',
    fit: 'bleed',
  },
  { key: 'amazon', label: 'Amazon', aliases: [], file: 'amazon.svg', tile: 'light', fit: 'inset' },
  {
    key: 'bookshop',
    label: 'Bookshop.org',
    aliases: ['bookshoporg'],
    file: 'bookshop.svg',
    tile: 'neutral',
    fit: 'bleed',
  },
  {
    key: 'apple_books',
    label: 'Apple Books',
    aliases: [],
    file: 'apple-books.svg',
    tile: 'neutral',
    fit: 'inset',
  },
  { key: 'kobo', label: 'Kobo', aliases: [], file: 'kobo.svg', tile: 'neutral', fit: 'bleed' },

  // Streaming platforms (offered in the picker, in this order)
  {
    key: 'netflix',
    label: 'Netflix',
    aliases: [],
    file: 'netflix.svg',
    tile: 'neutral',
    fit: 'inset',
    streaming: true,
  },
  {
    key: 'primevideo',
    label: 'Prime Video',
    aliases: ['amazonprimevideo'],
    file: 'prime-video.svg',
    tile: 'neutral',
    fit: 'bleed',
    streaming: true,
  },
  {
    key: 'disneyplus',
    label: 'Disney+',
    aliases: ['disney', 'disney+'],
    file: 'disney-plus.svg',
    tile: 'neutral',
    fit: 'bleed',
    streaming: true,
  },
  {
    key: 'appletv',
    label: 'Apple TV+',
    aliases: ['appletv+', 'appletvplus'],
    file: 'apple-tv.svg',
    tile: 'light',
    fit: 'inset',
    streaming: true,
  },
  {
    key: 'youtube',
    label: 'YouTube',
    aliases: [],
    file: 'youtube.svg',
    tile: 'neutral',
    fit: 'inset',
    streaming: true,
  },
  {
    key: 'timvision',
    label: 'TIMvision',
    aliases: [],
    file: 'timvision.svg',
    tile: 'neutral',
    fit: 'bleed',
    streaming: true,
  },
  {
    key: 'infinity',
    label: 'Infinity',
    aliases: ['mediasetinfinity'],
    file: 'infinity.svg',
    tile: 'neutral',
    fit: 'bleed',
    streaming: true,
  },
  {
    key: 'paramountplus',
    label: 'Paramount+',
    aliases: ['paramountplus'],
    file: 'paramount-plus.svg',
    tile: 'neutral',
    fit: 'inset',
    streaming: true,
  },
  {
    key: 'hbomax',
    label: 'HBO Max',
    aliases: ['max', 'hbomax'],
    file: 'hbo-max.svg',
    tile: 'light',
    fit: 'inset',
    streaming: true,
  },
  {
    key: 'now',
    label: 'NOW',
    aliases: ['nowtv'],
    file: 'now.svg',
    tile: 'light',
    fit: 'inset',
    streaming: true,
  },
  {
    key: 'sky',
    label: 'Sky',
    aliases: ['skygo', 'skyitalia'],
    file: 'sky.svg',
    tile: 'neutral',
    fit: 'inset',
    streaming: true,
  },
  {
    key: 'raiplay',
    label: 'RaiPlay',
    aliases: [],
    file: 'raiplay.svg',
    tile: 'light',
    fit: 'inset',
    streaming: true,
  },
  {
    key: 'rakutentv',
    label: 'Rakuten TV',
    aliases: ['rakuten'],
    file: 'rakuten-tv.svg',
    tile: 'neutral',
    fit: 'bleed',
    streaming: true,
  },
  {
    key: 'hulu',
    label: 'Hulu',
    aliases: [],
    file: 'hulu.svg',
    tile: 'neutral',
    fit: 'inset',
    streaming: true,
  },
  {
    key: 'discoveryplus',
    label: 'Discovery+',
    aliases: ['discoveryplus'],
    file: 'discovery-plus.svg',
    tile: 'neutral',
    fit: 'bleed',
    streaming: true,
  },
  {
    key: 'mubi',
    label: 'MUBI',
    aliases: [],
    file: 'mubi.svg',
    tile: 'light',
    fit: 'inset',
    streaming: true,
  },
  {
    key: 'googleplay',
    label: 'Google Play',
    aliases: ['googleplaymovies', 'googleplaybooks'],
    file: 'google-play.svg',
    tile: 'neutral',
    fit: 'inset',
    streaming: true,
  },
  {
    key: 'peacock',
    label: 'Peacock',
    aliases: ['peacockpremium'],
    file: 'peacock.svg',
    tile: 'neutral',
    fit: 'bleed',
    streaming: true,
  },
  {
    key: 'crunchyroll',
    label: 'Crunchyroll',
    aliases: [],
    file: 'crunchyroll.svg',
    tile: 'neutral',
    fit: 'inset',
    streaming: true,
  },
]
