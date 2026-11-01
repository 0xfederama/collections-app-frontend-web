/**
 * F017-W2: the entries of the service registry (see `registry.ts` for the lookup and the assets).
 * Order matters: the streaming picker lists the `streaming` entries in this order.
 */

import { STREAMING_ENTRIES } from './streamingEntries'

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

const LINK_ENTRIES: ServiceEntry[] = [
  // Links and stores
  {
    key: 'google',
    label: 'Google',
    aliases: [],
    file: 'google.svg',
    tile: 'light',
    fit: 'inset',
  },
  { key: 'imdb', label: 'IMDb', aliases: [], file: 'imdb.svg', tile: 'light', fit: 'inset' },
  {
    key: 'letterboxd',
    label: 'Letterboxd',
    aliases: [],
    file: 'letterboxd.svg',
    tile: 'light',
    fit: 'inset',
  },
  {
    key: 'reddit',
    label: 'Reddit',
    aliases: [],
    file: 'reddit.svg',
    tile: 'light',
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
    tile: 'light',
    fit: 'inset',
  },
  { key: 'kobo', label: 'Kobo', aliases: [], file: 'kobo.svg', tile: 'neutral', fit: 'bleed' },
]

/** Every entry: the links and stores first, then the streaming platforms (picker order). */
export const SERVICES: ServiceEntry[] = [...LINK_ENTRIES, ...STREAMING_ENTRIES]
