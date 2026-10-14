import * as RadixSelect from '@radix-ui/react-select'
import { useId } from 'react'
import { cx } from '../../lib/cx'
import { controlBase, controlBorder } from './fieldStyles'
import { Check, ChevronDown } from './icons'
import { FieldShell, describedBy, type FieldChromeProps } from './TextField'

export interface SelectOption {
  /** Must not be an empty string (Radix reserves it for "no selection"). */
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends FieldChromeProps {
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
  className?: string
}

export function Select({
  label,
  hint,
  error,
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  disabled,
  required,
  name,
  id: idProp,
  className,
}: SelectProps) {
  const generated = useId()
  const id = idProp ?? generated
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <RadixSelect.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
        required={required}
      >
        <RadixSelect.Trigger
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cx(
            controlBase,
            controlBorder(!!error),
            'flex h-10 items-center justify-between gap-2 px-3 text-left focus:border-accent data-[placeholder]:text-text-muted pointer-coarse:min-h-11',
            className,
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown aria-hidden className="size-4 text-text-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-border bg-surface-raised text-text shadow-lg data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="relative flex h-9 cursor-pointer select-none items-center rounded-sm pr-3 pl-8 text-sm outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-border pointer-coarse:min-h-11"
                >
                  <RadixSelect.ItemIndicator className="absolute left-2">
                    <Check aria-hidden className="size-4 text-accent-text" />
                  </RadixSelect.ItemIndicator>
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </FieldShell>
  )
}
