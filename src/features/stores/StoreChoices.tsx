import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useId } from 'react'
import { ServiceIcon } from '../../components/ServiceIcon'
import { focusRing } from '../../components/ui'
import { Check } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import type { StoreProvider } from './api'
import { storeName } from './providers'

const itemClass =
  'flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-accent/10 pointer-coarse:min-h-11'

export interface StoreChoicesProps {
  /** The chosen store keys, in the order they were picked. */
  value: string[]
  onChange: (next: string[]) => void
  /** Every store offered, in display order (`useStoreProviders`). */
  providers: readonly StoreProvider[] | undefined
  /** The visible caption, also the name of the dropdown. */
  label: string
  hint?: string
  error?: string
}

/**
 * A multi-choice dropdown over the fixed store list (F016-W4): the same shape as the streaming
 * platforms (`inline/StreamingPlatforms.tsx`), but only the stores the API offers can be ticked.
 * Several can be ticked in a row; each one is shown as its icon tile with the display name.
 */
export function StoreChoices({
  value,
  onChange,
  providers,
  label,
  hint,
  error,
}: StoreChoicesProps) {
  const captionId = useId()
  const hintId = useId()
  const valueId = useId()
  const names = value.map((key) => storeName(providers, key))
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((picked) => picked !== key) : [...value, key])

  return (
    <div className="flex flex-col gap-1.5">
      <p id={captionId} className="text-sm text-text">
        {label}
      </p>
      {hint && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props -- aria-invalid marks the error state on this trigger; its error text is not linked to it yet (flagged for review) */}
          <button
            type="button"
            aria-labelledby={`${captionId} ${valueId}`}
            aria-describedby={hint ? hintId : undefined}
            aria-invalid={error ? true : undefined}
            className={cx(
              'flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-3 text-start text-sm',
              focusRing,
              value.length === 0 ? 'text-text-muted' : 'text-text',
            )}
          >
            <span id={valueId} className="truncate">
              {value.length === 0 ? 'Choose stores' : names.join(', ')}
            </span>
            {value.length > 0 && (
              <span className="flex shrink-0 items-center gap-1.5">
                {value.slice(0, 4).map((key, index) => (
                  <ServiceIcon key={key} name={key} label={names[index]} size={20} />
                ))}
                {value.length > 4 && (
                  <span className="text-xs text-text-muted">+{value.length - 4}</span>
                )}
              </span>
            )}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="bg-surface-raised z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-64 overflow-y-auto rounded-lg p-1.5 text-text shadow-float"
          >
            {(providers ?? []).map((provider) => {
              const on = value.includes(provider.key)
              return (
                <DropdownMenu.CheckboxItem
                  key={provider.key}
                  checked={on}
                  // Keep the menu open so several stores can be ticked in a row.
                  onSelect={(event) => {
                    event.preventDefault()
                    toggle(provider.key)
                  }}
                  className={itemClass}
                >
                  <span
                    aria-hidden
                    className={cx(
                      'grid size-4 shrink-0 place-items-center rounded-[5px] border',
                      on ? 'border-accent bg-accent text-accent-fg' : 'border-border-strong',
                    )}
                  >
                    {on && <Check className="size-3" />}
                  </span>
                  <ServiceIcon name={provider.key} label={provider.name} size={20} />
                  <span className="truncate">{provider.name}</span>
                </DropdownMenu.CheckboxItem>
              )
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  )
}
