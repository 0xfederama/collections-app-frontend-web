import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Button } from '../../components/ui'
import { Check, ChevronDown, SlidersHorizontal } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import type { PinnedFields } from './api'
import { MAX_PINNED_PER_SLOT, pinnableFields, resolvePinned, type PinnedSlots } from './pinned'
import type { List } from './api'

type Slot = keyof PinnedSlots

const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'under', label: 'Under the title' },
  { slot: 'right', label: 'On the right' },
]

const itemClass =
  'flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-accent/10 pointer-coarse:min-h-11 [&_svg]:size-4'

/**
 * Toolbar menu "Pinned fields" (F-002): per slot a checklist of the fields the list's kind offers.
 * It shows the effective selection (the kind default when the list has none). A toggle saves at
 * once; ticking a field already in the other slot moves it, a slot holds at most 6, and the order
 * is the order of ticking. "Reset to default" sends `null`.
 */
export function PinnedMenu({
  list,
  onChange,
  onReset,
}: {
  list: Pick<List, 'kind' | 'pinned_fields'>
  onChange: (pinned: PinnedFields) => void
  onReset: () => void
}) {
  const current = resolvePinned(list)
  const fields = pinnableFields(list.kind)

  const toggle = (slot: Slot, key: string) => {
    const other: Slot = slot === 'under' ? 'right' : 'under'
    const next: PinnedSlots = { under: [...current.under], right: [...current.right] }
    if (next[slot].includes(key)) next[slot] = next[slot].filter((k) => k !== key)
    else {
      next[other] = next[other].filter((k) => k !== key)
      next[slot].push(key)
    }
    onChange(next)
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {/* Narrow toolbars (container below 44rem) show the icon only; the name stays. */}
        <Button
          variant="secondary"
          className="h-9 @max-[44rem]:w-9 @max-[44rem]:px-0 pointer-coarse:@max-[44rem]:w-11"
        >
          <SlidersHorizontal aria-hidden className="size-4 @[44rem]:hidden" />
          <span className="@max-[44rem]:sr-only">Pinned fields</span>
          <ChevronDown aria-hidden className="size-4 @max-[44rem]:hidden" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="bg-surface-raised z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-60 overflow-y-auto rounded-lg p-1.5 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        >
          {SLOTS.map(({ slot, label }) => (
            <DropdownMenu.Group key={slot}>
              <DropdownMenu.Label className="px-3 pt-2 pb-1 text-xs font-semibold text-text-muted">
                {label}
              </DropdownMenu.Label>
              {fields.map((field) => {
                const checked = current[slot].includes(field.key)
                return (
                  <DropdownMenu.CheckboxItem
                    key={field.key}
                    checked={checked}
                    disabled={!checked && current[slot].length >= MAX_PINNED_PER_SLOT}
                    // Keep the menu open so several fields can be ticked in a row.
                    onSelect={(event) => {
                      event.preventDefault()
                      toggle(slot, field.key)
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
                  </DropdownMenu.CheckboxItem>
                )
              })}
            </DropdownMenu.Group>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item onSelect={onReset} className={itemClass}>
            Reset to default
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
