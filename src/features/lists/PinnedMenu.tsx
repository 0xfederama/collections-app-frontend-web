import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, SlidersHorizontal } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import type { PinnedFields } from './api'
import { toolbarControl } from './toolbarStyles'
import { MAX_PINNED, pinnableFields, resolvePinned } from './pinned'
import type { List } from './api'
import type { TypeDefinition } from '../items/types'

const itemClass =
  'flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-accent/10 pointer-coarse:min-h-11 [&_svg]:size-4'

/**
 * Toolbar menu "Pinned fields" (F009-W3): a checklist of the fields the list's type offers, in
 * order: the first pinned field reads next to the title, the last in the right corner (with three
 * pins, the first two sit beside the title). It shows
 * the effective selection (the type default when the list has none) and its order. A toggle saves
 * at once; ticking a field appends it, unticking removes it (so the second becomes the first), and
 * at most three can be pinned. "Reset to default" sends `null`.
 */
export function PinnedMenu({
  list,
  definition,
  onChange,
  onReset,
}: {
  list: Pick<List, 'type' | 'pinned_fields'>
  definition: TypeDefinition
  onChange: (pinned: PinnedFields) => void
  onReset: () => void
}) {
  const current = resolvePinned(list, definition)
  const fields = pinnableFields(definition)

  const toggle = (key: string) => {
    const next = current.includes(key)
      ? current.filter((pinned) => pinned !== key)
      : [...current, key]
    onChange(next)
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Pinned fields"
          className={cx(
            toolbarControl,
            '@max-[44rem]:w-9 @max-[44rem]:px-0 pointer-coarse:@max-[44rem]:w-11',
          )}
        >
          <SlidersHorizontal aria-hidden className="size-4" />
          {/* The name stays "Pinned fields" for assistive tech; the bar shows the short word, and only the icon when narrow. */}
          <span aria-hidden className="@max-[44rem]:hidden">
            Pinned
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="bg-surface-raised z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-60 overflow-y-auto rounded-lg p-1.5 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        >
          <DropdownMenu.Label className="px-3 pt-2 pb-1 text-xs font-semibold text-text-muted">
            Up to three, in order
          </DropdownMenu.Label>
          {fields.map((field) => {
            const position = current.indexOf(field.key)
            const checked = position !== -1
            return (
              <DropdownMenu.CheckboxItem
                key={field.key}
                checked={checked}
                disabled={!checked && current.length >= MAX_PINNED}
                // The position is the order, so it is described, not only drawn.
                aria-description={checked ? `Pinned ${position + 1} of ${MAX_PINNED}` : undefined}
                // Keep the menu open so several fields can be ticked in a row.
                onSelect={(event) => {
                  event.preventDefault()
                  toggle(field.key)
                }}
                className={itemClass}
              >
                <span
                  aria-hidden
                  className={cx(
                    'grid size-4 shrink-0 place-items-center rounded-[5px] border border-border-strong',
                    checked && 'border-accent bg-accent text-accent-fg',
                  )}
                >
                  {checked && <Check className="size-3" />}
                </span>
                {field.label}
                {checked && (
                  <span
                    aria-hidden
                    className="ml-auto text-xs font-semibold text-text-muted tabular-nums"
                  >
                    {position + 1}
                  </span>
                )}
              </DropdownMenu.CheckboxItem>
            )
          })}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item onSelect={onReset} className={itemClass}>
            Reset to default
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
