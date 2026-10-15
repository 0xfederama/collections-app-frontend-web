import type { Ref } from 'react'
import { Link } from 'react-router'
import { IconButton, Menu } from '../../components/ui'
import { ArrowDown, ArrowUp, Ellipsis, GripVertical } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import type { DisplayMode, ItemSummary } from './api'
import { ItemThumb } from './ItemThumb'
import { formatPrice } from './price'

/** What an entry needs to be reorderable. Absent when reordering is not available. */
export interface EntryReorder {
  rowRef: Ref<HTMLLIElement>
  handleRef: Ref<HTMLButtonElement>
  isDragging: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveBy: (delta: -1 | 1) => void
}

export interface ItemEntryProps {
  item: ItemSummary
  mode: DisplayMode
  /** Query string of the list (`?q=…&sort=…`), carried to the item URL so the view survives. */
  search: string
  /** Called on click, before navigating (the list saves its scroll position). */
  onOpen: () => void
  reorder?: EntryReorder
}

const linkClass =
  'rounded-sm font-medium text-text after:absolute after:inset-0 after:content-[""] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'

/** One item of the list in the given display mode: a row (compact, thumbnail) or a card (grid). */
export function ItemEntry({ item, mode, search, onOpen, reorder }: ItemEntryProps) {
  const price = formatPrice(item.price)
  const to = { pathname: `/lists/${item.list_id}/items/${item.id}`, search }

  const title = (
    <Link
      to={to}
      onClick={onOpen}
      className={cx(linkClass, mode === 'grid' ? 'line-clamp-2' : 'truncate')}
    >
      {item.title}
    </Link>
  )
  const priceText = price ? (
    <span className="text-sm whitespace-nowrap tabular-nums">{price}</span>
  ) : null
  const controls = reorder && entryControls(item.title, reorder)

  const shell = cx(
    'relative list-none bg-surface',
    reorder?.isDragging && 'z-20 shadow-lg ring-2 ring-focus-ring',
  )

  if (mode === 'compact') {
    return (
      <li
        ref={reorder?.rowRef}
        className={cx(shell, 'flex items-center gap-3 px-2 py-1.5 hover:bg-border/40')}
      >
        {controls?.handle}
        <ItemThumb item={item} compact className="size-10 shrink-0 rounded-sm" />
        <div className="min-w-0 flex-1">{title}</div>
        {priceText}
        {controls?.menu}
      </li>
    )
  }

  if (mode === 'thumbnail') {
    return (
      <li
        ref={reorder?.rowRef}
        className={cx(shell, 'flex items-start gap-3 p-3 hover:bg-border/40')}
      >
        {controls?.handle}
        <ItemThumb item={item} className="aspect-4/3 w-24 shrink-0 rounded-md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {title}
          <div className="mt-1 flex flex-wrap items-center gap-2">{priceText}</div>
        </div>
        {controls?.menu}
      </li>
    )
  }

  return (
    <li
      ref={reorder?.rowRef}
      className={cx(
        shell,
        'flex flex-col overflow-hidden rounded-lg border border-border shadow-sm hover:shadow-md',
      )}
    >
      <ItemThumb item={item} className="aspect-4/3 w-full" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        {title}
        <div className="mt-auto flex flex-wrap items-center gap-2">{priceText}</div>
      </div>
      {controls && (
        <div className="absolute inset-x-1 top-1 flex justify-between">
          {controls.handle}
          {controls.menu}
        </div>
      )}
    </li>
  )
}

const controlButton =
  'relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-border hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring pointer-coarse:size-11 [&_svg]:size-5'

function entryControls(title: string, reorder: EntryReorder) {
  return {
    handle: (
      <button
        ref={reorder.handleRef}
        type="button"
        aria-label={`Reorder ${title}`}
        className={cx(controlButton, 'cursor-grab touch-none bg-surface/80 active:cursor-grabbing')}
      >
        <GripVertical aria-hidden />
      </button>
    ),
    menu: (
      <Menu
        trigger={
          <IconButton
            aria-label={`Actions for ${title}`}
            className={cx(controlButton, 'bg-surface/80')}
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
