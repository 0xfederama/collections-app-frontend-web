import type { TreeDrop, TreeHit, TreeIndicator } from '../../../components/ui'
import type { TreeIndex, TreeNode } from '../api'
import { folderRights } from '../sharing/rights'

/*
 * Where a dragged folder or list lands (web 3.3.0, D-158). Pure: the tree UI reports which part of
 * which visible row the pointer is over (`TreeHit`) and this decides the target, or refuses it.
 *
 *   top of a row                      -> before that row, in its parent
 *   bottom of a list / closed folder  -> after it, in its parent
 *   bottom of an open folder          -> its first child
 *   middle of a folder                -> into it, at the end
 *   below the last row                -> the end of the top level
 *
 * Folders come before lists in a parent and are ordered apart, so a slot of the wrong kind snaps to
 * the nearest slot of the dragged kind in that parent (a folder after the last folder, a list before
 * the first list). A drop that changes nothing has `indicator: null`; a forbidden one is `null`.
 */

type DropKind = 'folder' | 'list'

export interface TreeDropResult extends TreeDrop {
  id: string
  kind: DropKind
  /** The folder it lands in, `null` = top level. */
  parentId: string | null
  /** The same-kind sibling it lands before, `null` = after the last one of its kind. */
  beforeId: string | null
}

export interface DropContext {
  index: TreeIndex
  /** Ids of the open folders in the sidebar. */
  expanded: ReadonlySet<string>
  /** The signed-in user, for the folders they may not move (F-027). */
  meId?: string
}

interface Layout {
  node: Map<string, TreeNode>
  parent: Map<string, string | null>
  /** Children of a folder (`null` = top level), folders first, in display order. */
  children: Map<string | null, readonly TreeNode[]>
}

const layouts = new WeakMap<TreeIndex, Layout>()

function layoutOf(index: TreeIndex): Layout {
  const cached = layouts.get(index)
  if (cached) return cached
  const layout: Layout = { node: new Map(), parent: new Map(), children: new Map() }
  const visit = (nodes: readonly TreeNode[], parentId: string | null) => {
    layout.children.set(parentId, nodes)
    for (const node of nodes) {
      layout.node.set(node.id, node)
      layout.parent.set(node.id, parentId)
      if (node.kind === 'folder') visit(node.children, node.id)
    }
  }
  visit(index.nodes, null)
  layouts.set(index, layout)
  return layout
}

interface Row {
  id: string
  parentId: string | null
  level: number
}

/** The rows the sidebar shows: a folder's children only while it is open. */
function visibleRows(layout: Layout, expanded: ReadonlySet<string>): Row[] {
  const rows: Row[] = []
  const visit = (parentId: string | null, level: number) => {
    for (const node of layout.children.get(parentId) ?? []) {
      rows.push({ id: node.id, parentId, level })
      if (isOpen(node, expanded)) visit(node.id, level + 1)
    }
  }
  visit(null, 1)
  return rows
}

const isOpen = (node: TreeNode, expanded: ReadonlySet<string>) =>
  node.kind === 'folder' && node.children.length > 0 && expanded.has(node.id)

const nameOf = (node: TreeNode | undefined) =>
  !node ? '' : node.kind === 'folder' ? node.folder.name : node.list.name

const parentOf = (node: TreeNode) =>
  node.kind === 'folder' ? node.folder.parent_folder_id : node.list.folder_id

const isWithin = (layout: Layout, id: string, ancestorId: string) => {
  for (let at = layout.parent.get(id); at != null; at = layout.parent.get(at))
    if (at === ancestorId) return true
  return false
}

/** The line to draw for a drop that lands `beforeId` (or last of its kind) in `parentId`. */
function lineFor(
  layout: Layout,
  rows: readonly Row[],
  source: TreeNode,
  parentId: string | null,
  beforeId: string | null,
): TreeIndicator | null {
  const level = parentId === null ? 1 : (rows.find((r) => r.id === parentId)?.level ?? 0) + 1
  const before = (id: string): TreeIndicator | null =>
    rows.some((r) => r.id === id) ? { kind: 'line', rowId: id, edge: 'before', level } : null
  if (beforeId) return before(beforeId)
  // Last of its folders: right above the parent's first list, when it has one.
  if (source.kind === 'folder') {
    const firstList = (layout.children.get(parentId) ?? []).find(
      (n) => n.kind === 'list' && n.id !== source.id,
    )
    if (firstList) return before(firstList.id)
  }
  // Otherwise below everything the parent shows.
  const inside = rows.filter((r) => parentId === null || isWithin(layout, r.id, parentId))
  const last = inside[inside.length - 1]
  return last ? { kind: 'line', rowId: last.id, edge: 'after', level } : null
}

function describe(layout: Layout, parentId: string | null, beforeId: string | null, into: boolean) {
  const where = parentId === null ? 'the top level' : `“${nameOf(layout.node.get(parentId))}”`
  if (into) return `Into ${where}.`
  if (beforeId) return `Before “${nameOf(layout.node.get(beforeId))}”, in ${where}.`
  return `At the end of ${where}.`
}

/**
 * Builds the drop for `source` landing in `parentId` before the mixed-kind child `rawBefore` (`null` =
 * the end), snapping to its kind. `into` marks a drop on a folder's middle (it draws the folder, not a line).
 */
function buildDrop(
  ctx: DropContext,
  layout: Layout,
  rows: readonly Row[],
  source: TreeNode,
  parentId: string | null,
  rawBefore: string | null,
  into: boolean,
): TreeDropResult | null {
  const here = parentOf(source)
  if (source.kind === 'folder') {
    // Never into itself or one of its own subfolders (the server refuses a cycle).
    if (parentId !== null && (parentId === source.id || isWithin(layout, parentId, source.id)))
      return null
    // A folder someone else owns, or one with members, can't change parent (403 / 409 folder_shared).
    if (parentId !== here && !folderRights(source.folder, ctx.meId).canMove) return null
  }
  const siblings = (layout.children.get(parentId) ?? []).filter((n) => n.kind === source.kind)
  const others = siblings.filter((n) => n.id !== source.id).map((n) => n.id)
  let at: number
  if (rawBefore !== null && others.includes(rawBefore)) at = others.indexOf(rawBefore)
  else if (rawBefore === null) at = others.length
  else if (rawBefore === source.id) at = siblings.findIndex((n) => n.id === source.id)
  else at = source.kind === 'folder' ? others.length : 0 // a slot of the other kind: snap
  const order = [...others.slice(0, at), source.id, ...others.slice(at)]
  const beforeId = order[at + 1] ?? null
  const unchanged =
    parentId === here &&
    order.length === siblings.length &&
    order.every((id, i) => id === siblings[i]?.id)
  const base = { id: source.id, kind: source.kind, parentId, beforeId }
  if (unchanged)
    return { ...base, key: 'unchanged', indicator: null, description: 'Back in its place.' }
  const indicator: TreeIndicator | null =
    into && parentId !== null
      ? { kind: 'into', rowId: parentId }
      : (lineFor(layout, rows, source, parentId, beforeId) ??
        (parentId !== null ? { kind: 'into', rowId: parentId } : null))
  if (!indicator) return null
  return {
    ...base,
    key: `${indicator.kind}|${parentId ?? 'root'}|${beforeId ?? 'end'}`,
    indicator,
    description: describe(layout, parentId, beforeId, indicator.kind === 'into'),
  }
}

/** The drop for a pointer over `hit`, or `null` when that target is not allowed. */
export function projectDrop(
  ctx: DropContext,
  sourceId: string,
  hit: TreeHit,
): TreeDropResult | null {
  const layout = layoutOf(ctx.index)
  const source = layout.node.get(sourceId)
  if (!source) return null
  const rows = visibleRows(layout, ctx.expanded)
  const build = (parentId: string | null, before: string | null, into = false) =>
    buildDrop(ctx, layout, rows, source, parentId, before, into)
  if ('end' in hit) return build(null, null)
  const row = rows.find((r) => r.id === hit.rowId)
  const node = layout.node.get(hit.rowId)
  if (!row || !node) return null
  if (hit.zone === 'before') return build(row.parentId, row.id)
  if (hit.zone === 'into') return node.kind === 'folder' ? build(row.id, null, true) : null
  if (node.kind === 'folder' && isOpen(node, ctx.expanded))
    return build(row.id, node.children[0]?.id ?? null)
  const siblings = layout.children.get(row.parentId) ?? []
  return build(row.parentId, siblings[siblings.indexOf(node) + 1]?.id ?? null)
}

/**
 * What the arrow keys walk through for a picked-up row: every place among its own siblings (same
 * parent and kind), top to bottom, its current place included (`indicator: null`). Moving to another
 * folder from the keyboard is the Move dialog's job.
 */
export function dropSteps(ctx: DropContext, sourceId: string): TreeDropResult[] {
  const layout = layoutOf(ctx.index)
  const source = layout.node.get(sourceId)
  if (!source) return []
  const rows = visibleRows(layout, ctx.expanded)
  const others = (layout.children.get(parentOf(source)) ?? [])
    .filter((n) => n.kind === source.kind && n.id !== sourceId)
    .map((n) => n.id)
  const steps: TreeDropResult[] = []
  for (let at = 0; at <= others.length; at++) {
    const step = buildDrop(ctx, layout, rows, source, parentOf(source), others[at] ?? null, false)
    if (step) steps.push(step)
  }
  return steps
}
