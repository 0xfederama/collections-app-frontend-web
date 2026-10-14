import type { ReactNode } from 'react'
import { IconButton, Menu, type MenuItem } from '../../components/ui'
import {
  ArrowDown,
  ArrowUp,
  Ellipsis,
  FileText,
  FolderInput,
  FolderPlus,
  ListPlus,
  Pencil,
  Trash2,
} from '../../components/ui/icons'
import type { TreeNode } from './api'
import type { TreeActions } from './useTreeDialogs'

const icon = (node: ReactNode) => node

/** Menu entries for one folder or list. `reorder` adds Move up / Move down (the drag fallback). */
export function nodeMenuItems(node: TreeNode, actions: TreeActions, reorder: boolean): MenuItem[] {
  const id = node.id
  const position = actions.position(id)
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
  if (node.kind === 'list') {
    items.push({
      label: 'Edit description',
      icon: icon(<FileText />),
      onSelect: () => actions.editDescription(id),
    })
  }
  items.push({ label: 'Move…', icon: icon(<FolderInput />), onSelect: () => actions.move(id) })
  if (reorder) {
    items.push(
      {
        label: 'Move up',
        icon: icon(<ArrowUp />),
        disabled: !position || position.index === 0,
        onSelect: () => actions.nudge(id, -1),
      },
      {
        label: 'Move down',
        icon: icon(<ArrowDown />),
        disabled: !position || position.index >= position.size - 1,
        onSelect: () => actions.nudge(id, 1),
      },
    )
  }
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
  reorder = true,
  className,
}: {
  node: TreeNode
  actions: TreeActions
  name: string
  reorder?: boolean
  className?: string
}) {
  return (
    <Menu
      trigger={
        <IconButton aria-label={`More actions for ${name}`} className={className}>
          <Ellipsis aria-hidden />
        </IconButton>
      }
      items={nodeMenuItems(node, actions, reorder)}
    />
  )
}
