import { useId } from 'react'
import { Tooltip } from '../../components/ui'
import { cx } from '../../lib/cx'

export interface DestinationOption {
  /** Unique within the picker. */
  key: string
  name: string
  depth: number
  /** Why it can't be chosen. Undefined = valid. */
  reason?: string
  /** A label with no radio (e.g. the folder that holds the lists below it). */
  group?: boolean
}

export interface DestinationPickerProps {
  options: readonly DestinationOption[]
  /** Key of the chosen option, if any. */
  value: string | undefined
  onChange: (key: string) => void
  /** Accessible name of the radio group. */
  label?: string
}

/**
 * The destination list of the move and restore dialogs: options as radios (indented by depth),
 * invalid ones disabled with a visible reason (UI_SPEC §5).
 */
export function DestinationPicker({
  options,
  value,
  onChange,
  label = 'Destination',
}: DestinationPickerProps) {
  const id = useId()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border p-1"
    >
      {options.map((option) => {
        const indent = { paddingInlineStart: `${option.depth * 16 + 8}px` }
        if (option.group) {
          return (
            <div
              key={option.key}
              className="flex min-h-9 items-center truncate pr-2 text-ui text-text-muted"
              style={indent}
            >
              {option.name}
            </div>
          )
        }
        const reasonId = `${id}-reason-${option.key}`
        const row = (
          <label
            className={cx(
              'flex min-h-9 items-center gap-2 rounded-md pr-2 text-ui pointer-coarse:min-h-11',
              option.reason
                ? 'cursor-not-allowed text-text-muted'
                : 'cursor-pointer hover:bg-border',
              value === option.key && 'bg-border font-medium',
            )}
            style={indent}
          >
            <input
              type="radio"
              name={id}
              className="size-4 accent-[var(--accent)]"
              checked={value === option.key}
              disabled={!!option.reason}
              aria-describedby={option.reason ? reasonId : undefined}
              onChange={() => onChange(option.key)}
            />
            <span className="min-w-0 flex-1 truncate">{option.name}</span>
            {option.reason && (
              <span id={reasonId} className="text-secondary">
                {option.reason}
              </span>
            )}
          </label>
        )
        // The reason is always visible (and read out); the tooltip repeats it for hover.
        return (
          <div key={option.key}>
            {option.reason ? <Tooltip content={option.reason}>{row}</Tooltip> : row}
          </div>
        )
      })}
    </div>
  )
}
