import type { Folder, TreeIndex } from '../api'

/** The top-level folder holding `id` (a folder or list), or the folder itself when it is top level. */
function boxOf(index: TreeIndex, id: string): Folder | undefined {
  return index.ancestorsOf(id)[0] ?? index.folders.get(id)
}

/**
 * The shared folder a move takes `sourceId` (a folder, a list, or for an item its list) out of, or
 * `null` when nothing is lost (F-027 decisions 5 and 10). `destinationFolderId` is the folder it
 * lands in (`null` = my top level). A top-level folder is its own box and can't be moved while
 * shared, so it never asks; moving within the same box, or into a box from outside, never asks.
 */
export function leavesSharedBox(
  index: TreeIndex,
  sourceId: string,
  destinationFolderId: string | null,
): Folder | null {
  const source = index.ancestorsOf(sourceId)[0]
  if (!source?.shared) return null
  const destination = destinationFolderId ? boxOf(index, destinationFolderId) : undefined
  return destination?.id === source.id ? null : source
}
