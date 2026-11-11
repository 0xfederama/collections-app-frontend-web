import type { ReactNode } from 'react'
import { IconButton, Menu, type MenuItem } from '../../components/ui'
import {
  Ellipsis,
  FolderInput,
  FolderPlus,
  ListPlus,
  LogOut,
  Users,
  Pencil,
  Smile,
  Trash2,
} from '../../components/ui/icons'
import type { TreeNode } from './api'
import { folderRights } from './sharing/rights'
import type { TreeActions } from './useTreeDialogs'

const icon = (node: ReactNode) => node

/**
 * Menu entries for one folder or list. Reordering is the drag handle (F007-W3), not the menu.
 * "Change icon" is offered only where `changeIcon` is set (the sidebar row, F018-W1), not in the list header.
 */
function nodeMenuItems(
  node: TreeNode,
  actions: TreeActions,
  { changeIcon = false, meId }: { changeIcon?: boolean; meId?: string } = {},
): MenuItem[] {
  const id = node.id
  const items: MenuItem[] = []
  // Sharing rules apply to folders only; lists (and the list header menu, which passes no `meId`) keep every entry.
  const rights = node.kind === 'folder' ? folderRights(node.folder, meId) : undefined
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
  if (rights?.canShare)
    items.push({ label: 'Share…', icon: icon(<Users />), onSelect: () => actions.share(id) })
  if (rights?.canLeave)
    items.push({ label: 'People…', icon: icon(<Users />), onSelect: () => actions.share(id) })
  if (rights?.canMove ?? true)
    items.push({ label: 'Move…', icon: icon(<FolderInput />), onSelect: () => actions.move(id) })
  if (rights?.canLeave)
    items.push(
      { type: 'separator' },
      {
        label: 'Leave folder',
        icon: icon(<LogOut />),
        destructive: true,
        onSelect: () => actions.leave(id),
      },
    )
  if (rights?.canDelete ?? true)
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
  meId,
}: {
  node: TreeNode
  actions: TreeActions
  name: string
  className?: string
  /** Entries before the standard ones, e.g. a list's Type (list header only). */
  leading?: MenuItem[]
  /** Offer "Change icon" for a list (sidebar row only). */
  changeIcon?: boolean
  /** The signed-in user: hides what they may not do to a top-level folder (sidebar row only). */
  meId?: string
}) {
  return (
    <Menu
      trigger={
        <IconButton aria-label={`More actions for ${name}`} className={className}>
          <Ellipsis aria-hidden />
        </IconButton>
      }
      items={[...(leading ?? []), ...nodeMenuItems(node, actions, { changeIcon, meId })]}
    />
  )
}
