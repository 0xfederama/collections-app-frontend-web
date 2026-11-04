import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { BADGE_ROOM, naturalWidth, TILE_GAP, visibleCount } from './tileFit'

/**
 * The service or store tiles of a row (F-025): one line that never overlaps its neighbours. The
 * strip is as wide as all the tiles want (an invisible sizer), shrinks to the room the row leaves it,
 * and draws as many tiles as fit followed by a "+N" tile for the rest. Unmeasured (no layout, as in
 * jsdom) it draws every tile.
 */
export function TileStrip({
  tiles,
  size,
  noun,
}: {
  tiles: ReactNode[]
  size: number
  /** What the "+N" tile counts: `services` or `stores`. */
  noun: 'services' | 'stores'
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [available, setAvailable] = useState<number | null>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setAvailable(element.clientWidth > 0 ? element.clientWidth : null)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const total = tiles.length
  const shown =
    available === null ? total : visibleCount(available - BADGE_ROOM, size, TILE_GAP, total)
  const rest = total - shown
  const room = available === null ? true : available - BADGE_ROOM >= size
  return (
    <span
      ref={ref}
      className="relative flex max-w-full min-w-0 shrink overflow-hidden"
      style={{ height: size + BADGE_ROOM }}
    >
      <span
        aria-hidden
        className="invisible block shrink-0"
        style={{ width: naturalWidth(size, TILE_GAP, total) + BADGE_ROOM }}
      />
      <span className="absolute inset-y-0 left-0 flex items-start gap-1.5">
        {tiles.slice(0, shown)}
        {rest > 0 && room && (
          <span
            role="img"
            aria-label={`${rest} more ${noun}`}
            title={`${rest} more ${noun}`}
            style={{ width: size, height: size }}
            className="inline-flex shrink-0 items-center justify-center rounded-sm border border-border bg-fill text-label text-text-muted tabular-nums"
          >
            +{rest}
          </span>
        )}
      </span>
    </span>
  )
}
