import { useId, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { LayoutGrid, List as ListIcon, Rows3 } from '../../components/ui/icons'
import type { DisplayMode } from './api'
import { toolbarIconControl } from './toolbarStyles'

const modes: { value: DisplayMode; label: string; icon: ReactNode }[] = [
  { value: 'compact', label: 'Compact rows', icon: <ListIcon /> },
  { value: 'thumbnail', label: 'Thumbnail rows', icon: <Rows3 /> },
  { value: 'grid', label: 'Grid', icon: <LayoutGrid /> },
]

/**
 * The display-mode switch (F-025 W12): three native radios drawn as the toolbar's icon buttons, so each
 * segment is the same square as Filter and Sort (36 px, 44 px on touch). The selected one is not
 * colour-only: it has a thicker accent border and an accent fill, and the radio stays checked for
 * assistive tech. Arrow keys move the selection, as in any radio group.
 */
export function DisplayModeControl({
  value,
  onChange,
}: {
  value: DisplayMode
  onChange: (mode: DisplayMode) => void
}) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label="Display mode" className="flex shrink-0 gap-2">
      {modes.map((mode) => (
        <label
          key={mode.value}
          className={cx(
            toolbarIconControl,
            'relative cursor-pointer has-[:checked]:border-2 has-[:checked]:border-accent has-[:checked]:bg-accent-tint has-[:checked]:text-accent-text has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring',
          )}
        >
          <input
            type="radio"
            name={name}
            value={mode.value}
            checked={mode.value === value}
            onChange={() => onChange(mode.value)}
            className="peer sr-only"
          />
          <span aria-hidden className="inline-flex [&_svg]:size-4">
            {mode.icon}
          </span>
          <span className="sr-only">{mode.label}</span>
        </label>
      ))}
    </div>
  )
}
