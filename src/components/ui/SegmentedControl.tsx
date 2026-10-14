import { useId, type ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface SegmentedOption {
  value: string
  label: string
  icon?: ReactNode
  /** Hides the visible label (it stays available to assistive tech). */
  iconOnly?: boolean
  disabled?: boolean
}

export interface SegmentedControlProps {
  /** Accessible name of the group. */
  'aria-label': string
  options: SegmentedOption[]
  value: string
  onValueChange: (value: string) => void
  name?: string
  className?: string
}

/**
 * Native radio group: arrow keys, selection and form semantics come from the browser,
 * so Radix ToggleGroup is not needed (D-038).
 */
export function SegmentedControl({
  options,
  value,
  onValueChange,
  name,
  className,
  ...rest
}: SegmentedControlProps) {
  const generated = useId()
  const groupName = name ?? generated
  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      className={cx(
        'inline-flex gap-0.5 rounded-md border border-border-strong bg-surface p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="relative flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-sm px-3 text-sm font-medium text-text-muted transition-colors has-[:checked]:bg-accent has-[:checked]:text-accent-fg has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring not-has-[:checked]:not-has-[:disabled]:hover:bg-border not-has-[:checked]:not-has-[:disabled]:hover:text-text pointer-coarse:min-h-11"
        >
          <input
            type="radio"
            name={groupName}
            value={option.value}
            checked={option.value === value}
            disabled={option.disabled}
            onChange={() => onValueChange(option.value)}
            className="peer sr-only"
          />
          {option.icon && (
            <span aria-hidden className="inline-flex [&_svg]:size-4">
              {option.icon}
            </span>
          )}
          <span className={cx(option.iconOnly && 'sr-only')}>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
