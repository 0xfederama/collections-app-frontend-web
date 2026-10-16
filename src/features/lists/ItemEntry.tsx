import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router'
import { IconButton, Menu } from '../../components/ui'
import { ArrowDown, ArrowUp, Ellipsis } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import type { DisplayMode, ItemSummary } from './api'
import { ItemThumb } from './ItemThumb'
import { pinnedPlacements, pinnedTexts, streamingOf, type PinnedKeys } from './pinned'
import { ServiceIcon } from '../../components/ServiceIcon'
import type { ItemKind } from '../items/api'

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

export interface ItemEntryProps {
  item: ItemSummary
  mode: DisplayMode
  /** Query string of the list (`?q=…&sort=…`), carried to the item URL so the view survives. */
  search: string
  /** Called on click, before navigating (the list saves its scroll position). */
  onOpen: () => void
  reorder?: EntryReorder
  /** The fields shown beside the title and in the corner (the list's, else the kind default). */
  pinned: PinnedKeys
  kind: ItemKind
}

const linkClass =
  'rounded-sm font-semibold text-text after:absolute after:inset-0 after:rounded-[inherit] after:content-[""] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'

/** Whole row or card is the click target (the title link stretches over it); hover and focus show on the shell. */
const surface =
  'border border-border bg-surface shadow-sm transition-shadow hover:shadow-md hover:bg-surface-raised has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-focus-ring'

/** One placement of the pinned fields: text pieces joined with ` · `, streaming as service icons. */
function PinnedSlot({
  keys,
  item,
  kind,
  iconSize,
  className,
}: {
  keys: readonly string[]
  item: ItemSummary
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
  const slots = { item: item, kind }
  // F009-W3: the first pinned field reads next to the title, the second in the right corner.
  const { first, second } = pinnedPlacements(pinned)

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
    'group/entry relative list-none [-webkit-touch-callout:none]',
    surface,
    reorder?.isDragging && 'z-20 shadow-lg ring-2 ring-focus-ring',
  )

  if (mode === 'compact') {
    return (
      <li
        ref={reorder?.rowRef}
        {...reorder?.rowProps}
        className={cx(shell, 'flex items-center gap-3 rounded-md py-1.5 pr-3 pl-1.5')}
      >
        <ItemThumb item={item} decorative className="size-9 shrink-0 rounded-sm" />
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <span className="min-w-0 shrink-0 truncate sm:max-w-[60%]">{title}</span>
          <PinnedSlot
            keys={first}
            {...slots}
            iconSize={20}
            className="hidden min-w-0 text-sm text-text-muted sm:flex"
          />
        </div>
        <PinnedSlot keys={second} {...slots} iconSize={22} className="shrink-0 text-sm" />
        {controls?.menu}
      </li>
    )
  }

  if (mode === 'thumbnail') {
    return (
      <li
        ref={reorder?.rowRef}
        {...reorder?.rowProps}
        className={cx(shell, 'flex items-center gap-3.5 rounded-lg p-1.5 pr-4')}
      >
        <ItemThumb
          item={item}
          decorative
          className="aspect-square w-14 shrink-0 rounded-[12px] sm:w-16"
        />
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <span className="min-w-0 truncate">{title}</span>
          <PinnedSlot
            keys={first}
            {...slots}
            iconSize={20}
            className="shrink-0 text-sm text-text-muted"
          />
        </div>
        <PinnedSlot keys={second} {...slots} iconSize={26} className="shrink-0 text-sm" />
        {controls?.menu}
      </li>
    )
  }

  return (
    <li
      ref={reorder?.rowRef}
      {...reorder?.rowProps}
      className={cx(shell, 'flex flex-col rounded-lg p-1.5 pb-3')}
    >
      <ItemThumb item={item} decorative className="aspect-4/3 w-full rounded-[13px]" />
      <div className="flex flex-1 flex-col gap-1 px-2 pt-2.5">
        {title}
        <PinnedSlot keys={first} {...slots} iconSize={20} className="text-xs text-text-muted" />
        {/* The corner placement ends the card's text block. */}
        <PinnedSlot keys={second} {...slots} iconSize={20} className="self-end text-sm" />
      </div>
      {controls && <div className="absolute top-2.5 right-2.5">{controls.menu}</div>}
    </li>
  )
}

const controlButton =
  'relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-border hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring pointer-coarse:size-11 [&_svg]:size-5'

function entryControls(title: string, reorder: EntryReorder) {
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
