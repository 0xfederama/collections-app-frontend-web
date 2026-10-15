import type { ReactNode } from 'react'
import { Button, IconButton, Menu } from '../../components/ui'
import { FolderPlus, ListPlus, Plus } from '../../components/ui/icons'
import type { TreeNode } from './api'
import { NodeMenu } from './NodeMenu'
import { useTreeActions } from './TreeActionsContext'

/** Right side of the "Library" heading above the tree: the "+" menu (new folder / list). */
export function TreeHeaderActions(): ReactNode {
  const actions = useTreeActions()
  return (
    <Menu
      trigger={
        <IconButton
          aria-label="New folder or list"
          title="New folder or list"
          className="size-8 pointer-coarse:size-11">
          <Plus aria-hidden />
        </IconButton>
      }
      items={[
        { label: 'New folder', icon: <FolderPlus />, onSelect: () => actions.createFolder(null) },
        { label: 'New list', icon: <ListPlus />, onSelect: () => actions.createList(null) },
      ]}
    />
  )
}

/**
 * End of each row: the "More" menu. The row selects on click, so this wrapper stops the click
 * (React bubbles it through the menu's portal too) before it reaches the row.
 */
export function TreeRowActions({ node }: { node: TreeNode }): ReactNode {
  const actions = useTreeActions()
  const name = node.kind === 'folder' ? node.folder.name : node.list.name
  return (
    <span onClick={(event) => event.stopPropagation()} className="flex shrink-0">
      <NodeMenu
        node={node}
        actions={actions}
        name={name}
        className="size-8 pointer-coarse:size-11"
      />
    </span>
  )
}

/** Primary action of the "No lists yet" empty state. */
export function TreeEmptyAction(): ReactNode {
  const actions = useTreeActions()
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button onClick={() => actions.createList(null)}>New list</Button>
      <Button variant="secondary" onClick={() => actions.createFolder(null)}>
        New folder
      </Button>
    </div>
  )
}
