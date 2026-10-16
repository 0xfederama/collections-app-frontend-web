import netflix from '../assets/services/netflix.webp'
import primeVideo from '../assets/services/prime-video.webp'
import disneyPlus from '../assets/services/disney-plus.webp'
import appleTv from '../assets/services/apple-tv.webp'
import youtube from '../assets/services/youtube.webp'
import timvision from '../assets/services/timvision.webp'
import infinity from '../assets/services/infinity.webp'
import letterboxd from '../assets/services/letterboxd.webp'
import reddit from '../assets/services/reddit.webp'
import google from '../assets/services/google.svg'
import imdb from '../assets/services/imdb.svg'
import { firstLetter } from '../lib/text'
import { cx } from '../lib/cx'
import { Globe } from './ui/icons'

interface Entry {
  /** Display name. */
  label: string
  /** Local image (favicon or vendored brand mark), contained in the tile. */
  src?: string
  /** A neutral symbol instead of an image (websites). */
  neutral?: boolean
}

const entry = (label: string, src?: string, neutral?: boolean): Entry => ({
  label,
  src,
  neutral,
})

const netflixEntry = entry('Netflix', netflix)
const primeEntry = entry('Prime Video', primeVideo)
const disneyEntry = entry('Disney+', disneyPlus)
const appleEntry = entry('Apple TV+', appleTv)
const youtubeEntry = entry('YouTube', youtube)
const timEntry = entry('TIMvision', timvision)
const infinityEntry = entry('Infinity', infinity)

/** Keys are normalised: lower case, only letters, digits and `+`. */
const serviceEntries: Record<string, Entry> = {
  netflix: netflixEntry,
  primevideo: primeEntry,
  amazonprimevideo: primeEntry,
  disney: disneyEntry,
  'disney+': disneyEntry,
  disneyplus: disneyEntry,
  appletv: appleEntry,
  'appletv+': appleEntry,
  appletvplus: appleEntry,
  youtube: youtubeEntry,
  timvision: timEntry,
  infinity: infinityEntry,
  mediasetinfinity: infinityEntry,
}

const linkEntries: Record<string, Entry> = {
  google: entry('Google', google),
  letterboxd: entry('Letterboxd', letterboxd),
  imdb: entry('IMDb', imdb),
  website: entry('Website', undefined, true),
  reddit: entry('Reddit', reddit),
}

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9+]/g, '')

/**
 * The streaming services offered in the item's picker, in display order. These are the ones with a
 * logo in `src/assets/services/`; any other service is still allowed (it gets the letter tile), but
 * it has to be typed rather than ticked.
 */
export const STREAMING_SERVICES = [
  netflixEntry,
  primeEntry,
  disneyEntry,
  appleEntry,
  youtubeEntry,
  timEntry,
  infinityEntry,
].map((entry) => entry.label)

/**
 * F009-W5: one tile geometry for every link and streaming icon. A square with the `rounded-md`
 * radius, a hairline border and the neutral `fill` surface (a translucent ink in light, a
 * translucent white in dark, both from `tokens.css`). `size` is the only thing that varies: a
 * tight list row asks for 20–26 px, the item page for the default. Shape, radius and inner padding
 * are the same at every size, and the mark inside is contained with even padding, never cropped.
 */
const TILE =
  'relative inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-fill'

/**
 * The mark inside the tile. `object-contain` fits the image in its content box, and the padding is
 * a share of the tile, so a 20 px tile is padded like a 32 px one (18% ≈ the 15–20% of F009-W5)
 * instead of by a fixed number of pixels.
 */
const MARK = 'flex size-full items-center justify-center p-[18%] text-text-muted'

/**
 * The tile size of the item page (F009-W5): one size for the link tiles and the streaming tiles.
 * A tighter row (the list rows, `ItemEntry`) asks for a smaller tile; only the size changes.
 */
export const TILE_SIZE = 36

export interface ServiceIconProps {
  name: string
  /** The service offers the title only for payment: shows a small `$` badge. */
  paid?: boolean
  size?: number
}

function Tile({
  entry: e,
  paid,
  size = TILE_SIZE,
}: {
  entry: Entry
  paid?: boolean
  size?: number
}) {
  const label = paid ? `${e.label}, paid` : e.label
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={TILE}
    >
      {/* One inner box for all three marks (logo, symbol, letter), so their padding is identical. */}
      <span aria-hidden className={MARK}>
        {e.src ? (
          <img
            src={e.src}
            alt=""
            draggable={false}
            referrerPolicy="no-referrer"
            className="size-full object-contain"
          />
        ) : e.neutral ? (
          <Globe className="size-full" />
        ) : (
          <span
            className="leading-none font-semibold"
            style={{ fontSize: Math.round(size * 0.45) }}
          >
            {firstLetter(e.label)}
          </span>
        )}
      </span>
      {paid && (
        <span
          aria-hidden
          data-testid="paid-badge"
          className={cx(
            'absolute -right-1 -bottom-1 inline-flex items-center justify-center rounded-full',
            'border border-surface bg-text font-bold text-surface',
          )}
          style={{
            width: Math.max(16, Math.round(size * 0.5)),
            height: Math.max(16, Math.round(size * 0.5)),
            fontSize: Math.max(10, Math.round(size * 0.32)),
          }}
        >
          $
        </span>
      )}
    </span>
  )
}

/**
 * Streaming platform as a tile. A service with no local file gets the same tile with the first
 * letter of its name (F009-W5): no text chip, no second shape.
 */
export function ServiceIcon({ name, paid, size }: ServiceIconProps) {
  return <Tile entry={serviceEntries[normalize(name)] ?? entry(name)} paid={paid} size={size} />
}

/** External link site (Google, Letterboxd, IMDb, Reddit, Website) as a tile, same geometry. */
export function LinkIcon({ name, size }: { name: string; size?: number }) {
  return <Tile entry={linkEntries[normalize(name)] ?? entry(name)} size={size} />
}
