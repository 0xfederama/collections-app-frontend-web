import type { ReactNode } from 'react'
import type { TreeNode } from './api'

/**
 * Extension points for W-05 (tree actions). Each renders nothing today. W-05 fills them in this
 * file (and new files under `src/features/tree/`) without touching `src/layouts/*` or
 * `src/routes/*`.
 */

/** Right side of the "Collections" heading above the tree: the "+" menu (new folder / list). */
export function TreeHeaderActions(): ReactNode {
  return null
}

/**
 * End of each row: the context menu (rename / move / delete). The row itself selects on click and
 * Enter, so interactive content here must stop click propagation.
 */
export function TreeRowActions({ node }: { node: TreeNode }): ReactNode {
  void node
  return null
}

/** Primary action of the "no collections yet" empty state (create the first folder or list). */
export function TreeEmptyAction(): ReactNode {
  return null
}
