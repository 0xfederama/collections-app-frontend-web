import * as Popover from '@radix-ui/react-popover'
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { controlBase, controlBorder } from '../../components/ui/fieldStyles'
import { Search } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import { IconGrid, type IconGridCell, type IconGridHandle } from './IconGrid'
import { IconColorPopover } from './IconColorPopover'
import { searchListIcons, type IconChoice, type ListIconColor } from './iconModel'

type Tab = 'icons' | 'emoji'
const TABS: { id: Tab; label: string }[] = [
  { id: 'icons', label: 'Icons' },
  { id: 'emoji', label: 'Emoji' },
]

/** Phones and tablets: do not pull the keyboard up until the user taps the search field. */
const isTouchDevice = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches

export interface ListIconPopoverProps {
  value: IconChoice
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Applies a choice. Resolve `false` (or throw) to keep the popover open, e.g. after a failed
   * save. A colour change never closes it; an icon, an emoji or "Remove" does after success.
   */
  onChange: (choice: IconChoice) => Promise<boolean | void> | boolean | void
  /** The button that opens the popover (it becomes the Radix trigger and gets the focus back). */
  children?: ReactNode
  /** Opens beside an existing element when there is no trigger (a menu item opened it). */
  anchorEl?: HTMLElement | null
  /** Runs when the popover has closed; `preventDefault()` takes over where focus goes next. */
  onCloseAutoFocus?: (event: Event) => void
  /** Shown above the grid, e.g. a save error with its Reload action. */
  notice?: ReactNode
  /** Disables every choice while a write is in flight. */
  pending?: boolean
}

/**
 * Notion-style list icon chooser: search, an Icons / Emoji tab, a grid, "Remove", and a colour
 * swatch that opens its own small panel. Choices apply at once; the caller decides what that means.
 */
export function ListIconPopover({
  value,
  open,
  onOpenChange,
  onChange,
  children,
  anchorEl,
  onCloseAutoFocus,
  notice,
  pending = false,
}: ListIconPopoverProps) {
  const openedAt = useRef(0)
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {children && <Popover.Trigger asChild>{children}</Popover.Trigger>}
      {!children && anchorEl && <Popover.Anchor virtualRef={{ current: anchorEl }} />}
      <Popover.Portal>
        <Popover.Content
          aria-label="Choose list icon"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          onCloseAutoFocus={onCloseAutoFocus}
          onFocusOutside={(event) => {
            // A menu item opened us; the menu then gives focus back to its trigger as it closes.
            // That is not the user leaving, so ignore focus moves in the first moments.
            if (Date.now() - openedAt.current < 400) event.preventDefault()
          }}
          onOpenAutoFocus={(event) => {
            openedAt.current = Date.now()
            // The body decides: search on a pointer device, the panel itself on touch.
            event.preventDefault()
          }}
          className="bg-surface-raised z-50 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2 rounded-lg p-2 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        >
          <PopoverBody
            value={value}
            onChange={onChange}
            onClose={() => onOpenChange(false)}
            notice={notice}
            pending={pending}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function PopoverBody({
  value,
  onChange,
  onClose,
  notice,
  pending,
}: {
  value: IconChoice
  onChange: ListIconPopoverProps['onChange']
  onClose: () => void
  notice: ReactNode
  pending: boolean
}) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('icons')
  const [busy, setBusy] = useState(false)
  const search = useRef<HTMLInputElement>(null)
  const grid = useRef<IconGridHandle>(null)
  const tabButtons = useRef<Record<Tab, HTMLButtonElement | null>>({ icons: null, emoji: null })
  const disabled = pending || busy

  // Mounted when the popover opens: focus the search field, except on touch.
  const focused = useRef(false)
  const focusOnOpen = (element: HTMLDivElement | null) => {
    if (!element || focused.current) return
    focused.current = true
    if (isTouchDevice()) element.focus()
    else search.current?.focus()
  }

  const matches = useMemo(() => searchListIcons(query), [query])
  const selected = value.icon?.startsWith('i:') ? value.icon.slice(2) : null
  const cells: IconGridCell[] =
    tab === 'icons'
      ? matches.builtins.map(({ key, name, Icon }) => ({
          key,
          label: name,
          pressed: selected === key,
          content: <Icon aria-hidden className="size-5" />,
        }))
      : matches.emoji.map(([emoji, keywords]) => ({
          key: emoji,
          label: `${emoji} ${keywords.split(' ')[0]}`,
          pressed: value.icon === emoji,
          content: emoji,
          text: true,
        }))

  /** One write at a time: a second tap while one is in flight is ignored. */
  const apply = async (choice: IconChoice, closeAfter: boolean) => {
    if (disabled) return
    setBusy(true)
    let ok: boolean | void
    try {
      ok = await onChange(choice)
    } catch {
      ok = false
    } finally {
      setBusy(false)
    }
    if (ok !== false && closeAfter) onClose()
  }

  const onTabKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    if (!next) return
    setTab(next.id)
    tabButtons.current[next.id]?.focus()
  }

  const empty = tab === 'icons' ? 'No matching icons.' : 'No matching emoji.'

  return (
    <div ref={focusOnOpen} tabIndex={-1} className="flex flex-col gap-2 outline-none">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
          />
          <input
            ref={search}
            type="text"
            aria-label="Search icons and emoji"
            placeholder="Search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && cells.length > 0) {
                event.preventDefault()
                grid.current?.focusFirst()
              }
            }}
            className={cx(controlBase, controlBorder(false), 'h-10 pr-3 pl-9')}
          />
        </div>
        <IconColorPopover
          color={value.icon_color as ListIconColor | null}
          enabled={selected !== null}
          disabled={disabled}
          onPick={(color) => void apply({ icon: value.icon, icon_color: color }, false)}
        />
      </div>
      <div className="flex items-center gap-2">
        <div
          role="tablist"
          aria-label="Icon kind"
          className="flex gap-0.5 rounded-md bg-fill p-0.5"
        >
          {TABS.map(({ id, label }, index) => (
            <button
              key={id}
              ref={(element) => {
                tabButtons.current[id] = element
              }}
              type="button"
              role="tab"
              id={`icon-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="icon-tabpanel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={cx(
                'h-9 rounded-sm px-3 text-ui focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring pointer-coarse:h-10',
                tab === id ? 'bg-surface font-medium text-text' : 'text-text-muted hover:text-text',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={disabled || value.icon === null}
          onClick={() => void apply({ icon: null, icon_color: null }, true)}
          className="ml-auto h-9 rounded-md px-3 text-ui text-text-muted hover:bg-fill-hover hover:text-text disabled:opacity-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring pointer-coarse:h-10"
        >
          Remove
        </button>
      </div>
      {notice}
      <div
        role="tabpanel"
        id="icon-tabpanel"
        aria-labelledby={`icon-tab-${tab}`}
        className="max-h-[min(15rem,45dvh)] overflow-y-auto overscroll-contain"
      >
        {cells.length > 0 ? (
          <IconGrid
            key={`${tab}:${query}`}
            ref={grid}
            label={tab === 'icons' ? 'Icons' : 'Emoji'}
            cells={cells}
            disabled={disabled}
            onPick={(key) =>
              void apply(
                tab === 'icons'
                  ? { icon: `i:${key}`, icon_color: value.icon_color }
                  : { icon: key, icon_color: null },
                true,
              )
            }
          />
        ) : (
          <p className="px-2 py-4 text-ui text-text-muted">{empty}</p>
        )}
      </div>
    </div>
  )
}
