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
