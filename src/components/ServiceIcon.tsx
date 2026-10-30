import { firstLetter } from '../lib/text'
import { cx } from '../lib/cx'
import { Globe } from './ui/icons'
import {
  assetUrl,
  findService,
  normalizeServiceName,
  type Fit,
  type ServiceEntry,
  type TileStyle,
} from './serviceIcons/registry'

export { STREAMING_SERVICES } from './serviceIcons/registry'

/** What a tile shows: a vendored mark, the neutral symbol, or the first letter of the name. */
interface Visual {
  /** Display name: the tooltip, the accessible name and the letter. */
  label: string
  /** Vendored mark (registry file). Absent for the symbol and the letter. */
  src?: string
  /** A neutral symbol instead of an image (websites). */
  neutral?: boolean
  tile: TileStyle
  fit: Fit
}

/** Unknown names keep the neutral letter tile (no mark). */
const unknownVisual = (label: string): Visual => ({ label, tile: 'neutral', fit: 'inset' })

const fromEntry = (entry: ServiceEntry): Visual => ({
  label: entry.label,
  src: assetUrl(entry.file),
  tile: entry.tile,
  fit: entry.fit,
})

/** Websites are not in the registry: a neutral globe (F-009 links). */
const WEBSITE: Visual = { label: 'Website', neutral: true, tile: 'neutral', fit: 'inset' }

const visualFor = (name: string): Visual => {
  const entry = findService(name)
  return entry ? fromEntry(entry) : unknownVisual(name)
}

/**
 * F009-W5: one tile geometry for every link and streaming icon. A square with the `rounded-md`
 * radius and a hairline border. The background is the neutral `fill` surface, or `bg-tile-light`
 * for marks drawn for a white ground (F017-W2). `size` is the only thing that varies: a tight list
 * row asks for 20–26 px, the item page for the default.
 */
const TILE =
  'relative inline-flex shrink-0 items-center justify-center rounded-md border border-border'

/**
 * The mark inside an inset tile (and the symbol and letter). `object-contain` fits the image in its
 * content box, and the padding is a share of the tile, so a 20 px tile is padded like a 32 px one
 * (18% ≈ the 15–20% of F009-W5) instead of by a fixed number of pixels.
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
  /** The display name, when `name` is a key (a store, F016-W4): the tooltip, the name and the letter. */
  label?: string
}

/** The content of an inset tile: the padded image, the symbol or the letter. */
function InsetMark({ visual }: { visual: Visual }) {
  return (
    <span aria-hidden className={MARK}>
      {visual.src ? (
        <img
          src={visual.src}
          alt=""
          draggable={false}
          referrerPolicy="no-referrer"
          className="size-full object-contain"
        />
      ) : visual.neutral ? (
        <Globe className="size-full" />
      ) : (
        <span className="leading-none font-semibold">{firstLetter(visual.label)}</span>
      )}
    </span>
  )
}

/** The mark of a bleed tile: the image fills the tile, clipped by its rounded corners. */
function BleedMark({ src }: { src: string }) {
  return (
    <span aria-hidden className="absolute inset-0 overflow-hidden rounded-md">
      <img
        src={src}
        alt=""
        draggable={false}
        referrerPolicy="no-referrer"
        className="size-full object-cover"
      />
    </span>
  )
}

function Tile({
  visual,
  paid,
  size = TILE_SIZE,
}: {
  visual: Visual
  paid?: boolean
  size?: number
}) {
  const label = paid ? `${visual.label}, paid` : visual.label
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={cx(TILE, visual.tile === 'light' ? 'bg-tile-light' : 'bg-fill')}
    >
      {visual.fit === 'bleed' && visual.src ? (
        <BleedMark src={visual.src} />
      ) : (
        <InsetMark visual={visual} />
      )}
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
 * Streaming platform as a tile. A service with no registry entry gets the same tile with the first
 * letter of its name (F009-W5): no text chip, no second shape.
 */
export function ServiceIcon({ name, paid, size, label }: ServiceIconProps) {
  const visual = visualFor(name)
  return <Tile visual={label ? { ...visual, label } : visual} paid={paid} size={size} />
}

/** External link site (Google, Letterboxd, IMDb, Reddit, Website) as a tile, same geometry. */
export function LinkIcon({ name, size }: { name: string; size?: number }) {
  const visual = normalizeServiceName(name) === 'website' ? WEBSITE : visualFor(name)
  return <Tile visual={visual} size={size} />
}
