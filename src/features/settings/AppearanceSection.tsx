import { SegmentedControl } from '../../components/ui'
import { Monitor, Moon, Sun } from '../../components/ui/icons'
import { useThemePreference, type ThemePreference } from '../../lib/theme'

const options = [
  { value: 'system', label: 'System default', icon: <Monitor /> },
  { value: 'light', label: 'Light', icon: <Sun /> },
  { value: 'dark', label: 'Dark', icon: <Moon /> },
]

/**
 * Theme choice (F008 rework). It is per device, kept in `localStorage` and not part of the workspace
 * settings, so it applies at once: no Save, ETag or conflicts, and no request.
 */
export function AppearanceSection() {
  const { preference, setPreference } = useThemePreference()
  return (
    <SegmentedControl
      aria-label="Theme"
      options={options}
      value={preference}
      onValueChange={(value) => setPreference(value as ThemePreference)}
    />
  )
}
