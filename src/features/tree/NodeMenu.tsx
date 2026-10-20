import type { ReactNode } from 'react'
import { IconButton, Menu, type MenuItem } from '../../components/ui'
import {
  Ellipsis,
  FolderInput,
  FolderPlus,
  ListPlus,
  Pencil,
  Smile,
  Trash2,
} from '../../components/ui/icons'
import type { TreeNode } from './api'
import type { TreeActions } from './useTreeDialogs'

const icon = (node: ReactNode) => node

/**
 * Menu entries for one folder or list. Reordering is the drag handle (F007-W3), not the menu.
 * "Change icon" is offered only where `changeIcon` is set (the sidebar row, F018-W1), not in the list header.
 */
function nodeMenuItems(
  node: TreeNode,
  actions: TreeActions,
  { changeIcon = false }: { changeIcon?: boolean } = {},
): MenuItem[] {
  const id = node.id
  const items: MenuItem[] = []
  if (node.kind === 'folder') {
    items.push(
      {
        label: 'New folder inside',
        icon: icon(<FolderPlus />),
        onSelect: () => actions.createFolder(id),
      },
      {
        label: 'New list inside',
        icon: icon(<ListPlus />),
        onSelect: () => actions.createList(id),
      },
      { type: 'separator' },
    )
  }
  items.push({ label: 'Rename', icon: icon(<Pencil />), onSelect: () => actions.rename(id) })
  if (changeIcon && node.kind === 'list')
    items.push({
      label: 'Change icon',
      icon: icon(<Smile />),
      onSelect: () => actions.changeIcon(id),
    })
  items.push({ label: 'Move…', icon: icon(<FolderInput />), onSelect: () => actions.move(id) })
  items.push(
    { type: 'separator' },
    {
      label: 'Delete',
      icon: icon(<Trash2 />),
      destructive: true,
      onSelect: () => actions.remove(id),
    },
  )
  return items
}

/** The "More" button of a row (or a list header) with its menu. */
export function NodeMenu({
  node,
  actions,
  name,
  className,
  leading,
  changeIcon,
}: {
  node: TreeNode
  actions: TreeActions
  name: string
  className?: string
  /** Entries before the standard ones, e.g. a list's Type (list header only). */
  leading?: MenuItem[]
  /** Offer "Change icon" for a list (sidebar row only). */
  changeIcon?: boolean
}) {
  return (
    <Menu
      trigger={
        <IconButton aria-label={`More actions for ${name}`} className={className}>
          <Ellipsis aria-hidden />
        </IconButton>
      }
      items={[...(leading ?? []), ...nodeMenuItems(node, actions, { changeIcon })]}
    />
  )
}
