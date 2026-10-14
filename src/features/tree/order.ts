import type { SortableSlot } from '../../components/ui/sortable'
import type { Folder, List, TreeData, TreeIndex, TreeNode } from './api'

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

/** Counts of everything below a folder: nested lists and the items in them. */
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
  if (node.kind === 'folder') node.children.forEach(visit)
  else visit(node)
  return total
}
