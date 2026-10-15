import { SegmentedControl } from '../../components/ui'
import { Monitor, Moon, Sun } from '../../components/ui/icons'
import { useThemePreference, type ThemePreference } from '../../lib/theme'

const options = [
  { value: 'system', label: 'System', icon: <Monitor /> },
  { value: 'light', label: 'Light', icon: <Sun /> },
  { value: 'dark', label: 'Dark', icon: <Moon /> },
]

/**
 * Theme override. It is a per-device choice kept in `localStorage` (not part of the workspace
 * settings), so it applies at once and has no Save button, no ETag and no conflicts.
 */
export function ThemeSection() {
  const { preference, setPreference } = useThemePreference()
  return (
    <div className="flex flex-col gap-1.5">
      <SegmentedControl
        aria-label="Theme"
        options={options}
        value={preference}
        onValueChange={(value) => setPreference(value as ThemePreference)}
      />
      <p className="text-xs text-text-muted">
        Applies at once, on this device only. System follows your device’s light or dark setting.
      </p>
    </div>
  )
}
