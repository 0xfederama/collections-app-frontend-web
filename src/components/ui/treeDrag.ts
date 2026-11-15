/*
 * Geometry and shapes of a tree drag (web 3.3.0, D-158). Pure: the dnd-kit side lives in
 * `sortable.tsx`, the state in `useTreeDrag.tsx`, and what a target means (parents, kinds, rights)
 * in the owning feature.
 */

/** Where over the tree a drag is: a part of one row, or the empty space below the last row. */
export type TreeHit = { rowId: string; zone: 'before' | 'into' | 'after' } | { end: true }

/** What the drag layer draws for a target: an insertion line at a depth, or a highlighted row. */
export type TreeIndicator =
  | { kind: 'line'; rowId: string; edge: 'before' | 'after'; level: number }
  | { kind: 'into'; rowId: string }

/**
 * A projected drop, as the feature describes it. `indicator` is `null` for a drop that changes
 * nothing (the row's own place): nothing is drawn and nothing is sent. `key` identifies the target,
 * so the tree redraws only when it changes.
 */
export interface TreeDrop {
  key: string
  indicator: TreeIndicator | null
  /** Read out to screen reader users while the drop target changes. */
  description: string
}

/** A visible row's vertical extent (viewport px) and whether it can take children. */
export interface TreeHitRow {
  id: string
  top: number
  bottom: number
  container: boolean
}

export interface TreeHitArea {
  left: number
  right: number
  top: number
  bottom: number
}

/** Share of a container row's height that is the "before" band, and again the "after" band. */
const EDGE = 0.25

/**
 * Which part of which row the point is over. The top of a row is "before", the bottom "after"; a
 * container row (a folder) keeps its middle half for "into". The gap between rows belongs to the row
 * above. Above the first row is "before" it, below the last row (inside `area`) is `{ end: true }`.
 * Only the vertical position counts: there is no horizontal offset.
 */
export function hitTest(
  rows: readonly TreeHitRow[],
  area: TreeHitArea,
  point: { x: number; y: number },
): TreeHit | null {
  const first = rows[0]
  const last = rows[rows.length - 1]
  if (!first || !last) return null
  if (point.x < area.left || point.x > area.right || point.y < area.top || point.y > area.bottom)
    return null
  if (point.y < first.top) return { rowId: first.id, zone: 'before' }
  if (point.y >= last.bottom) return { end: true }
  const at = rows.findIndex((row, i) => point.y < (rows[i + 1]?.top ?? row.bottom))
  const row = rows[at]
  if (!row) return null
  const share = (point.y - row.top) / Math.max(row.bottom - row.top, 1)
  if (!row.container) return { rowId: row.id, zone: share < 0.5 ? 'before' : 'after' }
  if (share < EDGE) return { rowId: row.id, zone: 'before' }
  if (share > 1 - EDGE) return { rowId: row.id, zone: 'after' }
  return { rowId: row.id, zone: 'into' }
}
