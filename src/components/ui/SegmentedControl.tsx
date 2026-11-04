import { useId, type ReactNode } from 'react'
import { cx } from '../../lib/cx'

interface SegmentedOption {
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
  /**
   * `toolbar`: the tray is exactly the height of the list toolbar's icon buttons (36 px, 44 px on
   * touch) and the segments are near-square, for icon-only options.
   */
  size?: 'default' | 'toolbar'
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
  size = 'default',
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
        'inline-flex gap-0.5 rounded-md bg-fill p-0.5',
        size === 'toolbar' && 'h-9 items-stretch pointer-coarse:h-11',
        className,
      )}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={cx(
            'relative flex cursor-pointer select-none items-center rounded-sm text-ui',
            size === 'toolbar'
              ? 'w-8 justify-center pointer-coarse:w-10'
              : 'h-8 gap-1.5 px-3 pointer-coarse:min-h-11',
            'font-medium text-text-muted transition-colors has-[:checked]:bg-surface has-[:checked]:text-text has-[:checked]:shadow-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring not-has-[:checked]:not-has-[:disabled]:hover:bg-fill-hover not-has-[:checked]:not-has-[:disabled]:hover:text-text',
          )}
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
