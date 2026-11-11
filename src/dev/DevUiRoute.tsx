import type { ReactNode } from 'react'
import { SegmentedControl, ToastProvider } from '../components/ui'
import { Monitor, Moon, Sun } from '../components/ui/icons'
import { useThemePreference, type ThemePreference } from '../lib/theme'
import { ButtonsSection } from './sections/ButtonsSection'
import { DisplaySection } from './sections/DisplaySection'
import { FeedbackSection } from './sections/FeedbackSection'
import { FieldsSection } from './sections/FieldsSection'
import { MaterialsSection } from './sections/MaterialsSection'
import { NavigationSection } from './sections/NavigationSection'
import { OverlaysSection } from './sections/OverlaysSection'
import { SelectionSection } from './sections/SelectionSection'
import { ServiceIconsSection } from './sections/ServiceIconsSection'
import { UserAvatarSection } from './sections/UserAvatarSection'

const sections = [
  'buttons',
  'fields',
  'selection',
  'overlays',
  'feedback',
  'service-icons',
  'user-avatar',
  'display',
  'materials',
  'navigation',
] as const

const themeOptions: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'System', icon: <Monitor /> },
  { value: 'light', label: 'Light', icon: <Sun /> },
  { value: 'dark', label: 'Dark', icon: <Moon /> },
]

export function DevUiRoute() {
  const { preference, resolved, setPreference } = useThemePreference()
  return (
    <ToastProvider>
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-6 sm:px-6">
        <header className="sticky top-0 z-30 -mx-4 flex flex-col gap-3 material-strong px-4 py-3 shadow-sm sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-heading font-semibold">UI gallery</h1>
            <SegmentedControl
              aria-label="Theme"
              value={preference}
              onValueChange={(v) => setPreference(v as ThemePreference)}
              options={themeOptions}
            />
          </div>
          <nav aria-label="Gallery sections">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-ui">
              {sections.map((id) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="text-accent-text underline-offset-2 hover:underline"
                  >
                    {id}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <p className="sr-only" aria-live="polite">
            Theme: {resolved}
          </p>
        </header>
        <ButtonsSection />
        <FieldsSection />
        <SelectionSection />
        <OverlaysSection />
        <FeedbackSection />
        <ServiceIconsSection />
        <UserAvatarSection />
        <DisplaySection />
        <MaterialsSection />
        <NavigationSection />
      </div>
    </ToastProvider>
  )
}
