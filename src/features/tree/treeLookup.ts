import type { TreeIndex, TreeNode } from './api'

export const nameOf = (node: TreeNode) =>
  node.kind === 'folder' ? node.folder.name : node.list.name

export function findNode(nodes: readonly TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.kind === 'folder') {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

/** Whether the open list is the folder `id` itself or sits somewhere inside it. */
export function isOpenWithin(index: TreeIndex, activeListId: string | null, id: string): boolean {
  return (
    activeListId !== null &&
    (activeListId === id || index.ancestorsOf(activeListId).some((a) => a.id === id))
  )
}

/**
 * Whether `id` is a shared top-level folder or sits inside one (F-027, the two-person badge). A
 * nested folder or list is shared through its top-level folder; a top-level list never is.
 */
export function isInSharedFolder(index: TreeIndex, id: string): boolean {
  const root = index.ancestorsOf(id)[0] ?? index.folders.get(id)
  return root?.shared === true
}
