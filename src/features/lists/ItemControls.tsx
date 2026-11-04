import type { Ref } from 'react'
import { focusRing, IconButton, Menu, type MenuItem } from '../../components/ui'
import { ArrowDown, ArrowUp, Ellipsis, FolderInput, Trash2 } from '../../components/ui/icons'
import { cx } from '../../lib/cx'

/** What an entry needs to be reorderable. Absent when reordering is not available. */
export interface EntryReorder {
  rowRef: Ref<HTMLLIElement>
  /** Extra attributes for the row element (the keyboard instructions). */
  rowProps: { 'aria-describedby'?: string }
  isDragging: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveBy: (delta: -1 | 1) => void
  /** Abandons the touch drag that a hold has already started (a long press opens the menu instead). */
  cancelDrag: () => void
}

const controlButton = `relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-border hover:text-text ${focusRing} pointer-coarse:size-11 [&_svg]:size-5`

export interface EntryMenuState {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMove: () => void
  onDelete: () => void
}

/**
 * The actions menu of a list entry: Move up / down while the list is manually sorted, then Move and
 * Delete. The "…" button opens it, and so does a long press on the row (`useLongPress`). Without
 * reordering there is no visible button (the rows stay as they were): the menu then hangs from an
 * invisible anchor, reachable by long press only.
 */
export function entryMenu(title: string, state: EntryMenuState, reorder?: EntryReorder) {
  const items: MenuItem[] = [
    ...(reorder
      ? ([
          {
            label: 'Move up',
            icon: <ArrowUp />,
            disabled: !reorder.canMoveUp,
            onSelect: () => reorder.onMoveBy(-1),
          },
          {
            label: 'Move down',
            icon: <ArrowDown />,
            disabled: !reorder.canMoveDown,
            onSelect: () => reorder.onMoveBy(1),
          },
          { type: 'separator' },
        ] satisfies MenuItem[])
      : []),
    { label: 'Move', icon: <FolderInput />, onSelect: state.onMove },
    { label: 'Delete', icon: <Trash2 />, destructive: true, onSelect: state.onDelete },
  ]
  const trigger = reorder ? (
    <IconButton
      aria-label={`Actions for ${title}`}
      className={cx(
        controlButton,
        'bg-surface/80 opacity-0 transition-opacity duration-150 group-focus-within/entry:opacity-100 group-hover/entry:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100',
      )}
    >
      <Ellipsis aria-hidden />
    </IconButton>
  ) : (
    <button
      type="button"
      aria-hidden
      tabIndex={-1}
      className="pointer-events-none absolute top-1/2 right-3 size-px opacity-0"
    />
  )
  return (
    <Menu trigger={trigger} items={items} open={state.open} onOpenChange={state.onOpenChange} />
  )
}
