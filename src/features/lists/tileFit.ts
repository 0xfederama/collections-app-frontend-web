/** Pure sizing for the row tile strip (F-025): how many service or store tiles fit in a width. */

/** Gap between tiles in px (`gap-1.5`). */
export const TILE_GAP = 6

/** Room for the `$` badge of a paid tile, which sticks out 4 px at the right and bottom. */
export const BADGE_ROOM = 4

/** Width of `total` tiles side by side. */
export const naturalWidth = (tileSize: number, gap: number, total: number): number =>
  total <= 0 ? 0 : total * tileSize + (total - 1) * gap

/**
 * How many of `total` tiles to draw in `available` px. When they all fit, all of them; otherwise one
 * slot is kept for the "+N" tile, so the answer is one less than what fits. Never negative.
 */
export function visibleCount(
  available: number,
  tileSize: number,
  gap: number,
  total: number,
): number {
  if (total <= 0 || available <= 0) return 0
  const fit = Math.floor((available + gap) / (tileSize + gap))
  if (fit >= total) return total
  return Math.max(0, fit - 1)
}
