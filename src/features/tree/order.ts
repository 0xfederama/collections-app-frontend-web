import type { SortableSlot } from '../../components/ui/sortable'
import type { Folder, List, TreeData, TreeIndex, TreeNode } from './api'
import { folderRights } from './sharing/rights'

export type SiblingKind = 'folder' | 'list'

export interface SiblingGroup {
  kind: SiblingKind
  /** Parent folder id, `null` = root. */
  parentId: string | null
  /** Ids in display order. */
  ids: string[]
}

export const groupKey = (kind: SiblingKind, parentId: string | null) =>
  `${kind}:${parentId ?? 'root'}`

export const parentIdOf = (node: TreeNode): string | null =>
  node.kind === 'folder' ? node.folder.parent_folder_id : node.list.folder_id

const nameOf = (node: TreeNode) => (node.kind === 'folder' ? node.folder.name : node.list.name)

/**
 * Walks the tree once and returns the sibling groups (folders among folders, lists among lists,
 * per parent) and each node's slot in its group, ready for the drag layer.
 */
export function buildSortable(nodes: readonly TreeNode[]) {
  const groups = new Map<string, SiblingGroup>()
  const slots = new Map<string, SortableSlot>()

  const visit = (siblings: readonly TreeNode[], parentId: string | null) => {
    for (const kind of ['folder', 'list'] as const) {
      const same = siblings.filter((n) => n.kind === kind)
      const group = groupKey(kind, parentId)
      groups.set(group, { kind, parentId, ids: same.map((n) => n.id) })
      same.forEach((node, index) =>
        slots.set(node.id, { group, index, size: same.length, label: nameOf(node) }),
      )
    }
    for (const node of siblings) if (node.kind === 'folder') visit(node.children, node.id)
  }
  visit(nodes, null)
  return { groups, slots }
}

/**
 * Whether dropping `sourceId` (a folder or a list) onto folder `folderId` is a real move: not onto
 * itself, not into its own descendants (the server refuses a cycle), not where it already is, and
 * not a folder `meId` may not move (someone else's, or one with members: F-027).
 */
export function canDropInto(
  index: TreeIndex,
  sourceId: string,
  folderId: string,
  meId?: string,
): boolean {
  if (sourceId === folderId) return false
  const folder = index.folders.get(sourceId)
  if (folder && !folderRights(folder, meId).canMove) return false
  const list = index.lists.get(sourceId)
  if (!folder && !list) return false
  if ((folder ? folder.parent_folder_id : list?.folder_id) === folderId) return false
  return !index.ancestorsOf(folderId).some((a) => a.id === sourceId)
}

/**
 * Whether `sourceId` (a folder or a list) can be dragged out to the top level: it is nested now, and
 * a folder must be one `meId` may move (nested folders always are: F-027 rights live on the box).
 */
export function canDropToTop(index: TreeIndex, sourceId: string, meId?: string): boolean {
  const folder = index.folders.get(sourceId)
  if (folder) return folder.parent_folder_id !== null && folderRights(folder, meId).canMove
  const list = index.lists.get(sourceId)
  return !!list && list.folder_id !== null
}

/** The tree with `ids` (all siblings of one kind under one parent) renumbered `0..n-1` in that order. */
export function applyOrder(data: TreeData, kind: SiblingKind, ids: readonly string[]): TreeData {
  const position = new Map(ids.map((id, i) => [id, i]))
  const renumber = <T extends Folder | List>(item: T): T => {
    const sort_order = position.get(item.id)
    return sort_order === undefined ? item : { ...item, sort_order }
  }
  return kind === 'folder'
    ? { ...data, folders: data.folders.map(renumber) }
    : { ...data, lists: data.lists.map(renumber) }
}

/** Every folder in display order with its depth, for the move picker. */
export function flattenFolders(index: TreeIndex) {
  const out: { folder: Folder; depth: number }[] = []
  const visit = (nodes: readonly TreeNode[], depth: number) => {
    for (const node of nodes) {
      if (node.kind !== 'folder') continue
      out.push({ folder: node.folder, depth })
      visit(node.children, depth + 1)
    }
  }
  visit(index.nodes, 0)
  return out
}

/** Counts of a deletion, the root included like the server's Trash `counts` (D-065): folders, lists, items. */
export function subtreeCounts(node: TreeNode): { lists: number; folders: number; items: number } {
  const total = { lists: 0, folders: 0, items: 0 }
  const visit = (n: TreeNode) => {
    if (n.kind === 'list') {
      total.lists += 1
      total.items += n.list.item_count
    } else {
      total.folders += 1
      n.children.forEach(visit)
    }
  }
  visit(node)
  return total
}
