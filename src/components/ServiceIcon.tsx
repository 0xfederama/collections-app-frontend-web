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
import { cx } from '../lib/cx'
import { Chip } from './ui'
import { Globe } from './ui/icons'

interface Entry {
  /** Display name. */
  label: string
  /** Local image (favicon or vendored brand mark), full-bleed in the tile. */
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

export interface ServiceIconProps {
  name: string
  /** The service offers the title only for payment: shows a small `$` badge. */
  paid?: boolean
  size?: number
}

function Tile({ entry: e, paid, size = 32 }: { entry: Entry; paid?: boolean; size?: number }) {
  const label = paid ? `${e.label}, paid` : e.label
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className="relative inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-fill"
    >
      {e.src ? (
        <img
          src={e.src}
          alt=""
          aria-hidden
          draggable={false}
          referrerPolicy="no-referrer"
          className="size-full rounded-[inherit] object-cover"
        />
      ) : e.neutral ? (
        <Globe aria-hidden className="size-1/2 text-text-muted" />
      ) : null}
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

/** Streaming platform as a favicon tile. Unknown services fall back to a text Chip. */
export function ServiceIcon({ name, paid, size }: ServiceIconProps) {
  const found = serviceEntries[normalize(name)]
  if (!found) return <Chip>{paid ? `${name}, paid` : name}</Chip>
  return <Tile entry={found} paid={paid} size={size} />
}

/** External link site (Google, Letterboxd, IMDb, Reddit, Website) as an icon tile. */
export function LinkIcon({ name, size }: { name: string; size?: number }) {
  const found = linkEntries[normalize(name)]
  if (!found) return <Chip>{name}</Chip>
  return <Tile entry={found} size={size} />
}
