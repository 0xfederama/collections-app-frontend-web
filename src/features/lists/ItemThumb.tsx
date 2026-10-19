import { useState } from 'react'
import { cx } from '../../lib/cx'
import { firstLetter } from '../../lib/text'
import type { ItemSummary } from './api'

/**
 * The one placeholder of an item without an image (F008-W13): a soft tile with the title's first
 * letter, no type symbol. The letter scales with the tile's width (container query units), so every
 * display mode (compact, thumbnail, grid, search, hero) shows the same tile and type.
 */
export function ItemInitial({ title, className }: { title: string; className?: string }) {
  return (
    <div
      aria-hidden
      data-testid="fallback-tile"
      className={cx(
        '@container flex items-center justify-center bg-fill text-text-muted select-none',
        className,
      )}
    >
      <span
        className="leading-none font-semibold"
        style={{ fontSize: 'clamp(0.875rem, 40cqw, 4rem)' }}
      >
        {firstLetter(title)}
      </span>
    </div>
  )
}

/**
 * Cover of an item: its image, or the `ItemInitial` placeholder when there is no image or the
 * image fails to load (UI_SPEC §3), so a broken-image glyph never shows. Size it with `className`
 * (the tile fills it). The tile is decorative (the title is always written next to it), so it is
 * hidden from assistive tech; a real image uses the title as `alt`.
 */
export function ItemThumb({
  item,
  className,
  decorative,
}: {
  item: Pick<ItemSummary, 'title' | 'type' | 'image'>
  className?: string
  /** The title is written right next to the cover: an empty `alt` avoids reading it twice (axe `image-redundant-alt`). */
  decorative?: boolean
}) {
  const src = item.image?.thumbnail_url ?? item.image?.url
  // The failed URL is remembered, so a new image URL gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (src && src !== failedSrc) {
    return (
      <div className={cx('overflow-hidden bg-border', className)}>
        <img
          src={src}
          alt={decorative ? '' : item.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="size-full object-cover object-center"
        />
      </div>
    )
  }
  return <ItemInitial title={item.title} className={className} />
}
