import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { components } from '../../generated/schema'
import { treeKeys } from '../../data/keys'
import { api, unwrap } from '../../lib/api'
import type { TreeNodeBase } from '../../components/ui'

export type Folder = components['schemas']['Folder']
export type List = components['schemas']['List']
/**
 * The tree as the screens read it. The API sends `null` for an empty slice (a Go nil slice), so
 * the query normalizes it to `[]` once, here; nothing downstream checks for `null`.
 */
export type TreeData = { folders: Folder[]; lists: List[] }

export function useTree() {
  return useQuery({
    queryKey: treeKeys.tree,
    queryFn: async ({ signal }): Promise<TreeData> => {
      const tree = await unwrap(api.GET('/api/v1/tree', { signal }))
      return { folders: tree.folders ?? [], lists: tree.lists ?? [] }
    },
  })
}

export interface FolderNode extends TreeNodeBase {
  kind: 'folder'
  folder: Folder
  children: TreeNode[]
}

interface ListNode extends TreeNodeBase {
  kind: 'list'
  list: List
}

export type TreeNode = FolderNode | ListNode

type Ordered = { sort_order: number; id: string }
const bySortOrder = (a: Ordered, b: Ordered) =>
  a.sort_order - b.sort_order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Nests folders and lists by `parent_folder_id` / `folder_id` (null = root). Inside each parent,
 * sub-folders come first, then lists, each by `(sort_order, id)` (UI_SPEC §2). A folder or list
 * whose parent is not in the data is left out, as is anything in a parent cycle.
 */
export function buildTree(folders: readonly Folder[], lists: readonly List[]): TreeNode[] {
  const folderNodes = new Map<string, FolderNode>()
  for (const folder of folders) {
    folderNodes.set(folder.id, { kind: 'folder', id: folder.id, folder, children: [] })
  }

  const roots: TreeNode[] = []
  const place = (node: TreeNode, parentId: string | null) => {
    if (parentId === null) roots.push(node)
    else folderNodes.get(parentId)?.children.push(node)
  }
  for (const folder of [...folders].sort(bySortOrder)) {
    const node = folderNodes.get(folder.id)
    if (node) place(node, folder.parent_folder_id)
  }
  // Lists go in after all folders, so each parent already holds its sub-folders.
  for (const list of [...lists].sort(bySortOrder)) {
    place({ kind: 'list', id: list.id, list }, list.folder_id)
  }
  return roots
}

export interface TreeIndex {
  /** Root nodes in display order. */
  nodes: TreeNode[]
  folders: ReadonlyMap<string, Folder>
  lists: ReadonlyMap<string, List>
  /** Folders above a folder or list, root first, without the node itself. Unknown id: `[]`. */
  ancestorsOf: (id: string) => Folder[]
}

export function createTreeIndex(data: TreeData): TreeIndex {
  const folders = new Map(data.folders.map((f) => [f.id, f]))
  const lists = new Map(data.lists.map((l) => [l.id, l]))
  return {
    nodes: buildTree(data.folders, data.lists),
    folders,
    lists,
    ancestorsOf(id) {
      const path: Folder[] = []
      const seen = new Set<string>()
      let parentId = folders.get(id)?.parent_folder_id ?? lists.get(id)?.folder_id ?? null
      while (parentId !== null && !seen.has(parentId)) {
        seen.add(parentId)
        const parent = folders.get(parentId)
        if (!parent) break
        path.unshift(parent)
        parentId = parent.parent_folder_id
      }
      return path
    },
  }
}

export type TreeIndexResult =
  | { status: 'pending' }
  | { status: 'error'; refetch: () => void }
  | { status: 'success'; index: TreeIndex }

/** The tree query plus its derived index (memoized per response). */
export function useTreeIndex(): TreeIndexResult {
  const { status, data, refetch } = useTree()
  const index = useMemo(() => (data ? createTreeIndex(data) : undefined), [data])
  if (index) return { status: 'success', index }
  if (status === 'error') return { status: 'error', refetch: () => void refetch() }
  return { status: 'pending' }
}
