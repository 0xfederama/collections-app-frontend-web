import * as Popover from '@radix-ui/react-popover'
import { useId, useState, type KeyboardEvent } from 'react'
import { cx } from '../../lib/cx'
import { controlBase, controlBorder } from './fieldStyles'
import { Check, ChevronDown } from './icons'
import { FieldShell, describedBy, type FieldChromeProps } from './TextField'
import type { SelectOption } from './Select'

export interface ComboboxProps extends FieldChromeProps {
  options: SelectOption[]
  value?: string | null
  onValueChange?: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  required?: boolean
  id?: string
  /** Shows only the option's value (e.g. `EUR`) when not typing; the list is wider and keeps the full labels. */
  compact?: boolean
}

/** Filterable select: ARIA 1.2 combobox (input + listbox) in a Radix Popover; focus stays in the input. */
export function Combobox({
  label,
  hint,
  error,
  options,
  value = null,
  onValueChange,
  placeholder,
  emptyMessage = 'No matches',
  disabled,
  required,
  id: idProp,
  compact,
}: ComboboxProps) {
  const generated = useId()
  const id = idProp ?? generated
  const listId = `${id}-listbox`
  const optionId = (index: number) => `${id}-option-${index}`

  const selected = options.find((o) => o.value === value)
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState<string | null>(null) // null: show the selected label, no filtering
  const [active, setActive] = useState(0)

  const query = typed ?? ''
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options
  const activeIndex = Math.min(active, Math.max(filtered.length - 1, 0))

  const close = () => {
    setOpen(false)
    setTyped(null)
  }
  const choose = (option: SelectOption) => {
    if (option.disabled) return
    onValueChange?.(option.value)
    close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) setOpen(true)
        else setActive(Math.min(activeIndex + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!open) setOpen(true)
        else setActive(Math.max(activeIndex - 1, 0))
        break
      case 'Home':
        if (open) {
          event.preventDefault()
          setActive(0)
        }
        break
      case 'End':
        if (open) {
          event.preventDefault()
          setActive(filtered.length - 1)
        }
        break
      case 'Enter': {
        const option = filtered[activeIndex]
        if (open) {
          event.preventDefault()
          if (option) choose(option)
        }
        break
      }
      case 'Escape':
        if (open) {
          event.preventDefault()
          event.stopPropagation()
          close()
        }
        break
      case 'Tab':
        close()
        break
    }
  }

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <Popover.Root
        open={open && !disabled}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <Popover.Anchor asChild>
          <div
            className={cx(
              controlBase,
              controlBorder(!!error),
              'flex h-10 items-center gap-2 px-3 focus-within:border-accent pointer-coarse:min-h-11',
            )}
          >
            <input
              id={id}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                open && filtered[activeIndex] ? optionId(activeIndex) : undefined
              }
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy(id, hint, error)}
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
              required={required}
              placeholder={placeholder}
              value={typed ?? (compact ? selected?.value : selected?.label) ?? ''}
              onChange={(e) => {
                setTyped(e.target.value)
                setActive(0)
                setOpen(true)
              }}
              // Select the shown label so typing replaces it instead of being appended to it.
              onFocus={(e) => e.currentTarget.select()}
              onClick={() => !disabled && setOpen(true)}
              onKeyDown={onKeyDown}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-muted disabled:cursor-not-allowed"
            />
            <ChevronDown aria-hidden className="size-4 shrink-0 text-text-muted" />
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            align={compact ? 'end' : 'start'}
            sideOffset={4}
            collisionPadding={8}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              if ((e.target as HTMLElement | null)?.id === id) e.preventDefault()
            }}
            className={cx(
              'z-50 max-h-72 bg-surface-raised overflow-y-auto rounded-lg p-1.5 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in',
              // A compact trigger is too narrow for "EUR · Euro": the list opens wider, to its left.
              compact ? 'w-80 max-w-[calc(100vw-1rem)]' : 'w-(--radix-popover-trigger-width)',
            )}
          >
            <ul id={listId} role="listbox" aria-label={label}>
              {filtered.map((option, index) => (
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- a pointer shortcut; the keyboard picks options from the input (onKeyDown, aria-activedescendant)
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(option)}
                  className={cx(
                    'relative flex min-h-9 cursor-pointer py-1 items-center rounded-md pr-3 pl-8 text-sm aria-disabled:cursor-not-allowed aria-disabled:opacity-50 pointer-coarse:min-h-11',
                    index === activeIndex && 'bg-accent/10',
                  )}
                >
                  {option.value === value && (
                    <Check aria-hidden className="absolute left-2 size-4 text-accent-text" />
                  )}
                  {option.label}
                </li>
              ))}
            </ul>
            {filtered.length === 0 && (
              <p role="status" className="px-3 py-2 text-sm text-text-muted">
                {emptyMessage}
              </p>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FieldShell>
  )
}
