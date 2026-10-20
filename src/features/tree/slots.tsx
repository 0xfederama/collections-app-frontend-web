import type { ReactNode } from 'react'
import { Button, Menu } from '../../components/ui'
import { FolderPlus, ListPlus, Plus } from '../../components/ui/icons'
import type { TreeNode } from './api'
import { NodeMenu } from './NodeMenu'
import { useTreeActions } from './TreeActionsContext'

/** The single "＋ New" button after the last list: a menu with Folder and List (both at the top level). */
export function TreeNewButton(): ReactNode {
  const actions = useTreeActions()
  return (
    <Menu
      align="start"
      trigger={
        <Button
          variant="ghost"
          className="w-full justify-start text-text-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring focus-visible:bg-fill-hover"
        >
          <Plus aria-hidden className="size-4" />
          New
        </Button>
      }
      items={[
        { label: 'Folder', icon: <FolderPlus />, onSelect: () => actions.createFolder(null) },
        { label: 'List', icon: <ListPlus />, onSelect: () => actions.createList(null) },
      ]}
    />
  )
}

/**
 * End of each row: the "More" menu, shown on hover and focus-within (always on touch, and while its
 * menu is open). The row selects on click, so this wrapper stops the click (React bubbles it through
 * the menu's portal too) before it reaches the row.
 */
export function TreeRowActions({ node }: { node: TreeNode }): ReactNode {
  const actions = useTreeActions()
  const name = node.kind === 'folder' ? node.folder.name : node.list.name
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stops a click on the row's menu from selecting the row; the menu button inside is the keyboard path
    <span
      onClick={(event) => event.stopPropagation()}
      className="flex shrink-0 opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <NodeMenu
        node={node}
        actions={actions}
        name={name}
        changeIcon
        // No hover fill of its own: inside a hovered row it drew a second box as big as the row, so
        // the button just darkens its glyph (F011-W4).
        className="size-8 pointer-coarse:size-11 hover:bg-transparent hover:text-text"
      />
    </span>
  )
}
