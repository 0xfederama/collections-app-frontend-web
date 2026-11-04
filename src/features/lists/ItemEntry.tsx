import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '../../lib/cx'
import type { DisplayMode, ItemSummary } from './api'
import { ItemThumb } from './ItemThumb'
import { pinnedPlacements, type PinnedKeys } from './pinned'
import type { ItemType, TypeDefinition } from '../items'
import { PinnedSlot } from './ItemPinned'
import { entryMenu, type EntryReorder } from './ItemControls'
import { focusRing } from '../../components/ui'
import { useLongPress } from '../../lib/useLongPress'
import { useItemActions } from '../items'

export interface ItemEntryProps {
  item: ItemSummary
  mode: DisplayMode
  /** Query string of the list (`?q=…&sort=…`), carried to the item URL so the view survives. */
  search: string
  /** Called on click, before navigating (the list saves its scroll position). */
  onOpen: () => void
  reorder?: EntryReorder
  /** The fields shown beside the title and in the corner (the list's, else the type default). */
  pinned: PinnedKeys
  type: ItemType
  definition: TypeDefinition
}

const linkClass = `rounded-sm font-display text-row text-text after:absolute after:inset-0 after:rounded-[inherit] after:content-[""] ${focusRing}`

/** Whole row or card is the click target (the title link stretches over it); hover and focus show on the shell. */
const surface =
  'border border-border bg-surface transition-colors hover:bg-surface-raised has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-focus-ring'

/** Medium rows (F021) are not cards: hairline dividers between them, no border or fill of their own. */
const rowFrame =
  'border-b border-border-soft transition-colors hover:bg-surface has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-focus-ring'

/** One item of the list in the given display mode: a row (compact, thumbnail) or a card (grid). */
export function ItemEntry(props: ItemEntryProps) {
  const { item, reorder } = props
  const actions = useItemActions(item)
  const [open, setOpen] = useState(false)
  // F-025 W5: a touch hold starts the drag at 250 ms (sortable.tsx); holding still until 500 ms
  // abandons that drag and opens the menu instead. Holding and moving, or swiping, never gets here.
  const press = useLongPress({
    onLongPress: () => {
      reorder?.cancelDrag()
      setOpen(true)
    },
  })
  const menu = entryMenu(
    item.title,
    { open, onOpenChange: setOpen, onMove: actions.move, onDelete: actions.remove },
    reorder,
  )
  return (
    <>
      <EntryRow {...props} menu={menu} press={press} />
      {actions.dialogs}
    </>
  )
}

function EntryRow({
  item,
  mode,
  search,
  onOpen,
  reorder,
  pinned,
  definition,
  menu,
  press,
}: ItemEntryProps & {
  menu: ReactNode
  press: ReturnType<typeof useLongPress>
}) {
  const to = { pathname: `/lists/${item.list_id}/items/${item.id}`, search }
  const slots = { item, definition }
  // F009-W3 / F016-W3: one pin reads next to the title, two add one in the right corner, three put
  // the first two next to the title and the third in the corner.
  const { first, second, third } = pinnedPlacements(pinned)
  const beside = third.length ? [...first, ...second] : first
  const corner = third.length ? third : second

  const title = (
    <Link
      to={to}
      onClick={onOpen}
      className={cx(linkClass, mode === 'grid' ? 'line-clamp-2' : 'truncate')}
    >
      {item.title}
    </Link>
  )

  const shell = cx(
    'group/entry relative list-none [-webkit-touch-callout:none] pointer-coarse:select-none',
    mode === 'thumbnail' ? rowFrame : surface,
    reorder?.isDragging && 'z-20 shadow-lg ring-2 ring-focus-ring',
  )

  if (mode === 'compact') {
    return (
      <li
        ref={reorder?.rowRef}
        {...reorder?.rowProps}
        {...press}
        className={cx(shell, 'flex items-center gap-3 rounded-md py-1.5 pr-3 pl-1.5')}
      >
        <ItemThumb item={item} decorative className="size-9 shrink-0 rounded-sm" />
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <span className="min-w-0 shrink-0 truncate sm:max-w-[60%]">{title}</span>
          <PinnedSlot
            keys={beside}
            {...slots}
            iconSize={20}
            className="hidden max-w-[55%] min-w-0 overflow-hidden text-ui text-text-muted sm:flex"
          />
        </div>
        <PinnedSlot
          keys={corner}
          {...slots}
          iconSize={22}
          className="max-w-[45%] shrink-0 justify-end text-ui"
        />
        {menu}
      </li>
    )
  }

  if (mode === 'thumbnail') {
    return (
      <li
        ref={reorder?.rowRef}
        {...reorder?.rowProps}
        {...press}
        className={cx(shell, 'flex items-center gap-3.5 px-2 py-[9px]')}
      >
        <ItemThumb
          item={item}
          decorative
          className="aspect-[36/50] w-9 shrink-0 rounded-sm border border-border"
        />
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* The first pinned field sits under the title; the second one is on the right (F021). */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="min-w-0 truncate">{title}</span>
            <PinnedSlot
              keys={beside}
              {...slots}
              iconSize={18}
              className="min-w-0 overflow-hidden text-secondary text-text-muted"
            />
          </div>
        </div>
        <PinnedSlot
          keys={corner}
          {...slots}
          iconSize={22}
          className="max-w-[45%] shrink-0 justify-end font-mono text-secondary"
        />
        {menu}
      </li>
    )
  }

  return (
    <li
      ref={reorder?.rowRef}
      {...reorder?.rowProps}
      {...press}
      className={cx(shell, 'flex flex-col rounded-lg p-1.5 pb-3')}
    >
      <ItemThumb item={item} decorative className="aspect-4/3 w-full rounded-lg" />
      <div className="flex flex-1 flex-col gap-1 px-2 pt-2.5">
        {title}
        <PinnedSlot
          keys={beside}
          {...slots}
          iconSize={20}
          className="text-secondary text-text-muted"
        />
        {/* The corner placement ends the card's text block. */}
        <PinnedSlot keys={corner} {...slots} iconSize={20} className="self-end text-ui" />
      </div>
      <div className="absolute top-2.5 right-2.5">{menu}</div>
    </li>
  )
}
