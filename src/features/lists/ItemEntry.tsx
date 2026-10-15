import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router'
import { IconButton, Menu } from '../../components/ui'
import { ArrowDown, ArrowUp, Ellipsis, GripVertical } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import type { DisplayMode, ItemSummary } from './api'
import { ItemThumb } from './ItemThumb'
import { pinnedTexts, streamingOf, type PinnedItem, type PinnedSlots } from './pinned'
import { ServiceIcon } from '../../components/ServiceIcon'
import type { ItemKind } from '../items/api'

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
  /** Fields shown under the title and on the right (the list's, else the kind default). */
  pinned: PinnedSlots
  kind: ItemKind
}

const linkClass =
  'rounded-sm font-semibold text-text after:absolute after:inset-0 after:rounded-[inherit] after:content-[""] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'

/** Whole row or card is the click target (the title link stretches over it); hover and focus show on the shell. */
const surface =
  'border border-border bg-surface shadow-sm transition-shadow hover:shadow-md hover:bg-surface-raised has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-focus-ring'

/** One slot of pinned fields: text pieces joined with ` · `, streaming as service icons, in slot order. */
function PinnedSlot({
  keys,
  item,
  kind,
  iconSize,
  className,
}: {
  keys: readonly string[]
  item: PinnedItem
  kind: ItemKind
  iconSize: number
  className?: string
}) {
  const parts: ReactNode[] = []
  let run: string[] = []
  const flush = () => {
    const texts = pinnedTexts(run, item, kind)
    if (texts.length) {
      parts.push(
        <span key={`t${parts.length}`} className="whitespace-nowrap tabular-nums">
          {texts.join(' · ')}
        </span>,
      )
    }
    run = []
  }
  for (const key of keys) {
    if (key !== 'streaming') {
      run.push(key)
      continue
    }
    flush()
    const services = streamingOf(item)
    if (services.length) {
      parts.push(
        <span key={`s${parts.length}`} className="inline-flex items-center gap-1.5">
          {services.map((s) => (
            <ServiceIcon key={s.name} name={s.name} paid={s.paid} size={iconSize} />
          ))}
        </span>,
      )
    }
  }
  flush()
  if (parts.length === 0) return null
  return <div className={cx('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>{parts}</div>
}

/** One item of the list in the given display mode: a row (compact, thumbnail) or a card (grid). */
export function ItemEntry({ item, mode, search, onOpen, reorder, pinned, kind }: ItemEntryProps) {
  const to = { pathname: `/lists/${item.list_id}/items/${item.id}`, search }
  const slots = { item: item as PinnedItem, kind }

  const title = (
    <Link
      to={to}
      onClick={onOpen}
      className={cx(linkClass, mode === 'grid' ? 'line-clamp-2' : 'truncate')}
    >
      {item.title}
    </Link>
  )
  const controls = reorder && entryControls(item.title, reorder)

  const shell = cx(
    'relative list-none',
    surface,
    reorder?.isDragging && 'z-20 shadow-lg ring-2 ring-focus-ring',
  )

  if (mode === 'compact') {
    return (
      <li
        ref={reorder?.rowRef}
        className={cx(shell, 'flex items-center gap-3 rounded-md py-1.5 pr-3 pl-1.5')}
      >
        {controls?.handle}
        <ItemThumb item={item} compact decorative className="size-9 shrink-0 rounded-sm" />
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <span className="min-w-0 shrink-0 truncate sm:max-w-[60%]">{title}</span>
          <PinnedSlot
            keys={pinned.under}
            {...slots}
            iconSize={20}
            className="hidden min-w-0 text-sm text-text-muted sm:flex"
          />
        </div>
        <PinnedSlot keys={pinned.right} {...slots} iconSize={22} className="shrink-0 text-sm" />
        {controls?.menu}
      </li>
    )
  }

  if (mode === 'thumbnail') {
    return (
      <li
        ref={reorder?.rowRef}
        className={cx(shell, 'flex items-center gap-3.5 rounded-lg p-1.5 pr-4')}
      >
        {controls?.handle}
        <ItemThumb
          item={item}
          decorative
          className="aspect-square w-14 shrink-0 rounded-[12px] sm:w-16"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {title}
          <PinnedSlot
            keys={pinned.under}
            {...slots}
            iconSize={20}
            className="text-sm text-text-muted"
          />
        </div>
        <PinnedSlot keys={pinned.right} {...slots} iconSize={26} className="shrink-0 text-sm" />
        {controls?.menu}
      </li>
    )
  }

  return (
    <li ref={reorder?.rowRef} className={cx(shell, 'flex flex-col rounded-lg p-1.5 pb-3')}>
      <ItemThumb item={item} decorative className="aspect-4/3 w-full rounded-[13px]" />
      <div className="flex flex-1 flex-col gap-1 px-2 pt-2.5">
        {title}
        <PinnedSlot
          keys={pinned.under}
          {...slots}
          iconSize={20}
          className="text-xs text-text-muted"
        />
        <PinnedSlot keys={pinned.right} {...slots} iconSize={20} className="text-sm" />
      </div>
      {controls && (
        <div className="absolute inset-x-2.5 top-2.5 flex justify-between">
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
