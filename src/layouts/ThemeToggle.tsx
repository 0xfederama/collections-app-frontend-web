import { Button, Menu } from '../components/ui'
import { Check, Monitor, Moon, Sun } from '../components/ui/icons'
import { useThemePreference, type ThemePreference } from '../lib/theme'

const order: ThemePreference[] = ['system', 'light', 'dark']
const labels: Record<ThemePreference, string> = { system: 'System', light: 'Light', dark: 'Dark' }
const icons = { system: <Monitor />, light: <Sun />, dark: <Moon /> }

/**
 * Theme selector at the far right of the top bar (F008-W1). It is a per-device choice kept in
 * `localStorage` (not part of the workspace settings), so it applies at once, with no Save, ETag
 * or conflicts. The button names the current choice ("System" by default); below `sm` only the
 * icon shows, so the bar stays on one row.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useThemePreference()
  return (
    <Menu
      trigger={
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Theme: ${labels[preference]}`}
          className="shrink-0 max-sm:size-11 max-sm:px-0"
        >
          <span aria-hidden className="inline-flex [&_svg]:size-4">
            {icons[preference]}
          </span>
          <span className="max-sm:hidden">{labels[preference]}</span>
        </Button>
      }
      items={order.map((value) => ({
        label: labels[value],
        icon: preference === value ? <Check /> : icons[value],
        onSelect: () => setPreference(value),
      }))}
    />
  )
}
