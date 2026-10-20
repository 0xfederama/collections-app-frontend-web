import type { Ref } from 'react'
import { IconButton, Menu } from '../../components/ui'
import { ArrowDown, ArrowUp, Ellipsis } from '../../components/ui/icons'
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
}

const controlButton =
  'relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-border hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring pointer-coarse:size-11 [&_svg]:size-5'

export function entryControls(title: string, reorder: EntryReorder) {
  return {
    menu: (
      <Menu
        trigger={
          <IconButton
            aria-label={`Actions for ${title}`}
            className={cx(
              controlButton,
              'bg-surface/80 opacity-0 transition-opacity duration-150 group-focus-within/entry:opacity-100 group-hover/entry:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100',
            )}
          >
            <Ellipsis aria-hidden />
          </IconButton>
        }
        items={[
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
        ]}
      />
    ),
  }
}
