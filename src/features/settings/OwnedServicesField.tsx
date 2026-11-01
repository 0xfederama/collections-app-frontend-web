import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ServiceIcon } from '../../components/ServiceIcon'
import { STREAMING_OFFERED, serviceLabel } from '../../components/serviceIcons/owned'
import { Check, ChevronDown } from '../../components/ui/icons'
import { controlBase, controlBorder } from '../../components/ui/fieldStyles'
import { describedBy, FieldShell } from '../../components/ui/TextField'
import { cx } from '../../lib/cx'
import { inputId } from './form'

const HINT = 'Only these are shown on items. Leave empty to show all.'

const itemClass =
  'flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-ui outline-none data-[highlighted]:bg-accent-tint pointer-coarse:min-h-11'

export interface OwnedServicesFieldProps {
  /** Provider keys of the owned services; empty shows every service. */
  value: string[]
  onChange: (keys: string[]) => void
  error?: string
  disabled?: boolean
}

/**
 * F-022-W3: "My streaming services", a multi-choice dropdown over the streaming registry entries. It
 * stores registry keys (what the API takes), shows each service's mark and name, and keeps the menu open
 * while several are ticked, like the item's platform picker.
 */
export function OwnedServicesField({ value, onChange, error, disabled }: OwnedServicesFieldProps) {
  const id = inputId('owned_streaming_services')
  const chosen = (key: string) => value.includes(key)
  const toggle = (key: string) =>
    onChange(chosen(key) ? value.filter((picked) => picked !== key) : [...value, key])

  return (
    <FieldShell id={id} label="My streaming services" hint={HINT} error={error}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-describedby={describedBy(id, HINT, error)}
            className={cx(
              controlBase,
              controlBorder(!!error),
              'flex min-h-10 items-center justify-between gap-2 px-3 text-left focus:border-accent pointer-coarse:min-h-11',
              value.length === 0 ? 'text-text-muted' : 'text-text',
            )}
          >
            <span className="min-w-0 flex-1 truncate">
              {value.length === 0 ? 'All services' : value.map(serviceLabel).join(', ')}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {value.slice(0, 4).map((key) => (
                <ServiceIcon key={key} name={key} size={20} />
              ))}
              {value.length > 4 && (
                <span className="font-mono text-secondary text-text-muted">
                  +{value.length - 4}
                </span>
              )}
              <ChevronDown aria-hidden className="size-4 text-text-muted" />
            </span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="bg-surface-raised z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-(--radix-dropdown-menu-trigger-width) overflow-y-auto rounded-lg p-1.5 text-text shadow-float"
          >
            {STREAMING_OFFERED.map((entry) => {
              const on = chosen(entry.key)
              return (
                <DropdownMenu.CheckboxItem
                  key={entry.key}
                  checked={on}
                  // Keep the menu open so several services can be ticked in a row.
                  onSelect={(event) => {
                    event.preventDefault()
                    toggle(entry.key)
                  }}
                  className={itemClass}
                >
                  <span
                    aria-hidden
                    className={cx(
                      'grid size-4 shrink-0 place-items-center rounded-sm border',
                      on ? 'border-accent bg-accent text-accent-fg' : 'border-border-strong',
                    )}
                  >
                    {on && <Check className="size-3" />}
                  </span>
                  {/* The name is the text beside the mark; the mark's own label would say it twice. */}
                  <span aria-hidden className="flex shrink-0">
                    <ServiceIcon name={entry.key} size={20} />
                  </span>
                  <span className="truncate">{entry.label}</span>
                </DropdownMenu.CheckboxItem>
              )
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </FieldShell>
  )
}
