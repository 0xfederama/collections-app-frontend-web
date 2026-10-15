import { IconButton, SegmentedControl, Tooltip } from '../components/ui'
import { Monitor, Moon, Sun } from '../components/ui/icons'
import { useThemePreference, type ThemePreference } from '../lib/theme'

const options = [
  { value: 'system', label: 'System', icon: <Monitor />, iconOnly: true },
  { value: 'light', label: 'Light', icon: <Sun />, iconOnly: true },
  { value: 'dark', label: 'Dark', icon: <Moon />, iconOnly: true },
]

const order: ThemePreference[] = ['system', 'light', 'dark']
const labels: Record<ThemePreference, string> = { system: 'System', light: 'Light', dark: 'Dark' }
const icons = { system: <Monitor />, light: <Sun />, dark: <Moon /> }

/**
 * Theme override in the sidebar footer (F007-W6). It is a per-device choice kept in
 * `localStorage` (not part of the workspace settings), so it applies at once, with no Save, ETag
 * or conflicts. The tablet icon rail has no room for three options, so it shows one button that
 * cycles System, Light, Dark.
 */
export function ThemeToggle({ rail = false }: { rail?: boolean }) {
  const { preference, setPreference } = useThemePreference()
  if (rail) {
    const next = order[(order.indexOf(preference) + 1) % order.length]!
    return (
      <Tooltip content={`Theme: ${labels[preference]}`} side="right">
        <IconButton
          aria-label={`Theme: ${labels[preference]}. Switch to ${labels[next]}`}
          onClick={() => setPreference(next)}
        >
          <span aria-hidden className="inline-flex">
            {icons[preference]}
          </span>
        </IconButton>
      </Tooltip>
    )
  }
  return (
    <SegmentedControl
      aria-label="Theme"
      options={options}
      value={preference}
      onValueChange={(value) => setPreference(value as ThemePreference)}
      className="self-start"
    />
  )
}
