import { lazy, Suspense, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Dialog, focusRing } from '../components/ui'
import { useSettings, type SettingsCloseRequestRef } from '../features/settings'
import { WorkspaceSkeleton } from './SettingsSkeleton'

// The panes (and their form code) load after the dialog is already on screen, so opening
// Settings is instant; the settings request starts at the same time, from this component.
const SettingsPanes = lazy(() => import('./SettingsPanes'))

const PANES = ['Account', 'General', 'Media', 'About']

/**
 * `/settings` (UI_SPEC §8): a large pane over the page it was opened from (the shell renders that
 * page behind it). Closing goes back there, or to Home on a deep link. The form validates and saves
 * its draft before allowing the pane to close.
 */
export function SettingsRoute() {
  const location = useLocation()
  const [pane, setPane] = useState('General')
  const settings = useSettings()
  const navigate = useNavigate()
  const closeRequestRef = useRef<SettingsCloseRequestRef['current']>(null)
  const hasBackground = Boolean((location.state as { background?: unknown } | null)?.background)
  const closeNow = () => void (hasBackground ? navigate(-1) : navigate('/', { replace: true }))
  const close = () => {
    if (closeRequestRef.current) closeRequestRef.current(closeNow)
    else closeNow()
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && close()}
      title="Settings"
      className="top-[clamp(1rem,15dvh,9rem)]! max-h-[calc(100dvh-clamp(1rem,15dvh,9rem)-1rem)]! w-[min(calc(100vw-2rem),720px)]! max-w-none! translate-y-0! gap-4 overflow-hidden! p-4 sm:gap-6 sm:p-6"
    >
      <nav
        aria-label="Settings panes"
        className="-mx-1 flex shrink-0 gap-1 overflow-x-auto px-1 pb-1"
      >
        {PANES.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={pane === name}
            onClick={() => setPane(name)}
            className={`shrink-0 rounded-md px-3 py-2 text-ui ${focusRing} ${pane === name ? 'bg-accent text-accent-fg' : 'text-text-muted hover:bg-fill hover:text-text'}`}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 py-1">
        <Suspense fallback={<WorkspaceSkeleton />}>
          <SettingsPanes
            pane={pane}
            onPaneChange={setPane}
            settings={settings}
            closeRequestRef={closeRequestRef}
          />
        </Suspense>
      </div>
    </Dialog>
  )
}
