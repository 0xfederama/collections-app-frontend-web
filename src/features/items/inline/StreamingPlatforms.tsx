import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useState } from 'react'
import { ServiceIcon, STREAMING_SERVICES } from '../../../components/ServiceIcon'
import { Button, focusRing, TextField } from '../../../components/ui'
import { Check, Plus } from '../../../components/ui/icons'
import { cx } from '../../../lib/cx'

const itemClass =
  'flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-accent/10 pointer-coarse:min-h-11'

/** The backend stores platform names unique case-insensitively, so they are compared that way. */
const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export interface StreamingPlatformsProps {
  /** The chosen platforms, in the order they were picked. */
  value: string[]
  onChange: (next: string[]) => void
  error?: string
}

/**
 * The streaming platforms (F011-W2): a dropdown where several services can be ticked, plus a field
 * for a service we ship no logo for. The country is not asked here — it comes from Settings.
 */
export function StreamingPlatforms({ value, onChange, error }: StreamingPlatformsProps) {
  const [typed, setTyped] = useState('')
  const chosen = (name: string) => value.some((picked) => sameName(picked, name))
  const toggle = (name: string) =>
    onChange(chosen(name) ? value.filter((picked) => !sameName(picked, name)) : [...value, name])

  const addTyped = () => {
    const name = typed.trim()
    if (!name || chosen(name)) return setTyped('')
    onChange([...value, name])
    setTyped('')
  }

  // Services we have a logo for, plus whatever else this item already carries.
  const others = value.filter((name) => !STREAMING_SERVICES.some((known) => sameName(known, name)))

  const tick = (key: string, name: string) => {
    const on = chosen(name)
    return (
      <DropdownMenu.CheckboxItem
        key={key}
        checked={on}
        // Keep the menu open so several services can be ticked in a row.
        onSelect={(event) => {
          event.preventDefault()
          toggle(name)
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
        <ServiceIcon name={name} size={20} />
        <span className="truncate">{name}</span>
      </DropdownMenu.CheckboxItem>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={cx(
              'flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-3 text-ui',
              focusRing,
              value.length === 0 ? 'text-text-muted' : 'text-text',
            )}
          >
            <span className="truncate">
              {value.length === 0 ? 'Choose platforms' : value.join(', ')}
            </span>
            {value.length > 0 && (
              <span className="flex shrink-0 items-center gap-1.5">
                {value.slice(0, 4).map((name) => (
                  <ServiceIcon key={name} name={name} size={20} />
                ))}
                {value.length > 4 && (
                  <span className="font-mono text-secondary text-text-muted">
                    +{value.length - 4}
                  </span>
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
            {STREAMING_SERVICES.map((name) => tick(name, name))}
            {others.length > 0 && (
              <>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                {others.map((name) => tick(`other-${name}`, name))}
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* A service we have no logo for is typed here; it still gets the letter tile in the row. */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            label="Another service"
            autoComplete="off"
            placeholder="Not listed above"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addTyped()
              }
            }}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={addTyped} disabled={!typed.trim()}>
          <Plus aria-hidden className="size-4" />
          Add
        </Button>
      </div>

      {error && <p className="text-secondary text-danger-text">{error}</p>}
    </div>
  )
}
