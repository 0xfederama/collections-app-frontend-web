import { useState } from 'react'
import { kindIcons } from '../../components/ui'
import { cx } from '../../lib/cx'
import type { ItemSummary } from './api'

const firstLetter = (title: string) => Array.from(title.trim())[0]?.toUpperCase() ?? '?'

/**
 * Cover of an item: its image, or a soft tinted tile with the kind icon and the title's first
 * letter when there is no image or the image fails to load (UI_SPEC §3), so a broken-image glyph
 * never shows. Size it with `className` (the tile fills it). The tile is decorative (the title is
 * always written next to it), so it is hidden from assistive tech; a real image uses the title as `alt`.
 */
export function ItemThumb({
  item,
  className,
  compact,
}: {
  item: Pick<ItemSummary, 'title' | 'kind' | 'image'>
  className?: string
  /** Smaller icon and letter, for 40 px thumbs. */
  compact?: boolean
}) {
  const src = item.image?.thumbnail_url ?? item.image?.url
  // The failed URL is remembered, so a new image URL gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const Icon = kindIcons[item.kind]

  if (src && src !== failedSrc) {
    return (
      <div className={cx('overflow-hidden bg-border', className)}>
        <img
          src={src}
          alt={item.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="size-full object-cover object-center"
        />
      </div>
    )
  }
  return (
    <div
      aria-hidden
      data-testid="fallback-tile"
      className={cx(
        'flex flex-col items-center justify-center bg-accent/15 text-accent-text select-none',
        className,
      )}
    >
      <Icon className={compact ? 'size-4' : 'size-1/4 min-h-5 min-w-5'} />
      <span
        className={cx('font-display leading-none font-semibold', compact ? 'text-xs' : 'text-2xl')}
      >
        {firstLetter(item.title)}
      </span>
    </div>
  )
}
