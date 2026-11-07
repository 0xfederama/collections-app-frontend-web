import * as Popover from '@radix-ui/react-popover'
import { useState } from 'react'
import { cx } from '../../lib/cx'
import { LIST_ICON_COLORS, type ListIconColor } from './iconModel'

const COLOR_LABELS: Record<ListIconColor, string> = {
  red: 'Red',
  orange: 'Orange',
  amber: 'Amber',
  green: 'Green',
  teal: 'Teal',
  blue: 'Blue',
  indigo: 'Indigo',
  purple: 'Purple',
  pink: 'Pink',
  gray: 'Gray',
}

const SWATCH_CLASSES: Record<ListIconColor, string> = {
  red: 'bg-list-icon-red',
  orange: 'bg-list-icon-orange',
  amber: 'bg-list-icon-amber',
  green: 'bg-list-icon-green',
  teal: 'bg-list-icon-teal',
  blue: 'bg-list-icon-blue',
  indigo: 'bg-list-icon-indigo',
  purple: 'bg-list-icon-purple',
  pink: 'bg-list-icon-pink',
  gray: 'bg-list-icon-gray',
}

const swatchFocus =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring'

/**
 * The colour swatch in the icon popover's header. It opens a second small popover with the named
 * colours (and "None"); choosing one applies it and closes that panel. Built-in icons only.
 */
export function IconColorPopover({
  color,
  enabled,
  disabled,
  onPick,
}: {
  color: ListIconColor | null
  /** Colours apply to built-in icons only. */
  enabled: boolean
  disabled: boolean
  onPick: (color: ListIconColor | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover.Root open={open && enabled} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={color ? `Icon color: ${COLOR_LABELS[color]}` : 'Icon color'}
          disabled={!enabled || disabled}
          onClick={(event) => {
            // Open only, never toggle: a touch browser can deliver a second, delayed click for one
            // tap (the old 300 ms click), and Radix's toggle would close the panel again at once.
            event.preventDefault()
            setOpen(true)
          }}
          title={enabled ? undefined : 'Colors apply to built-in icons'}
          className={cx(
            'grid size-10 shrink-0 place-items-center rounded-md border border-border-strong bg-surface hover:bg-fill-hover disabled:opacity-50',
            swatchFocus,
          )}
        >
          <span
            aria-hidden
            className={cx(
              'size-5 rounded-full border border-border-strong',
              color ? SWATCH_CLASSES[color] : 'bg-fill',
            )}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={16}
          // Focus moving (the outer panel taking it back on touch, a menu returning it) must not
          // dismiss a panel the user just opened; Esc and a press elsewhere still do.
          onFocusOutside={(event) => event.preventDefault()}
          className="bg-surface-raised z-50 w-[min(15rem,calc(100vw-2rem))] rounded-lg p-2 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        >
          <div role="group" aria-label="Icon color" className="grid grid-cols-5 gap-1">
            <button
              type="button"
              aria-label="None"
              aria-pressed={color === null}
              onClick={() => {
                onPick(null)
                setOpen(false)
              }}
              className={cx(
                'grid size-10 place-items-center rounded-md text-secondary text-text-muted hover:bg-fill-hover aria-pressed:bg-accent-tint',
                swatchFocus,
              )}
            >
              —
            </button>
            {LIST_ICON_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={COLOR_LABELS[swatch]}
                aria-pressed={color === swatch}
                onClick={() => {
                  onPick(swatch)
                  setOpen(false)
                }}
                className={cx(
                  'grid size-10 place-items-center rounded-md hover:bg-fill-hover aria-pressed:bg-accent-tint',
                  swatchFocus,
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    'size-5 rounded-full border border-border-strong',
                    SWATCH_CLASSES[swatch],
                  )}
                />
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
