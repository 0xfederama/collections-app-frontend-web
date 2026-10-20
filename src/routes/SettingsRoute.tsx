import { lazy, Suspense, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button, Dialog, Skeleton } from '../components/ui'
import { useSettings, type SettingsCloseRequestRef } from '../features/settings'

// The panes are not in the settings barrel: the shell and the items/lists screens import it eagerly
// or lazily, so re-exporting them would pull them into those chunks (F020-W3). The route loads them.
const AboutSection = lazy(() =>
  import('../features/settings/AboutSection').then((m) => ({ default: m.AboutSection })),
)
const AppearanceSection = lazy(() =>
  import('../features/settings/AppearanceSection').then((m) => ({ default: m.AppearanceSection })),
)
const ConnectionSection = lazy(() =>
  import('../features/settings/ConnectionSection').then((m) => ({ default: m.ConnectionSection })),
)
const SettingsForm = lazy(() =>
  import('../features/settings/SettingsForm').then((m) => ({ default: m.SettingsForm })),
)
const TypesFieldsPane = lazy(() =>
  import('../features/settings/TypesFieldsPane').then((m) => ({ default: m.TypesFieldsPane })),
)

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-sm font-semibold text-text-muted">
        {title}
      </h2>
      {children}
    </section>
  )
}

const PANES = ['General', 'Media', 'Types & fields', 'About']

function WorkspaceSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Loading settings</span>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} aria-hidden className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10" />
        </div>
      ))}
    </div>
  )
}

/**
 * `/settings` (UI_SPEC §8): a large pane over the page it was opened from (the shell renders that
 * page behind it). Closing goes back there, or to Home on a deep link. The form validates and saves
 * its draft before allowing the pane to close.
 */
export function SettingsRoute() {
  const location = useLocation()
  const [pane, setPane] = useState(() =>
    new URLSearchParams(location.search).get('pane') === 'types' ? 'Types & fields' : 'General',
  )
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
            className={`shrink-0 rounded-md px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${pane === name ? 'bg-accent text-accent-fg' : 'text-text-muted hover:bg-fill hover:text-text'}`}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 py-1">
        <Suspense fallback={<WorkspaceSkeleton />}>
          {settings.isPending ? (
            <div hidden={pane !== 'General'}>
              <Section id="settings-general" title="General">
                <WorkspaceSkeleton />
                <AppearanceSection />
              </Section>
            </div>
          ) : settings.isError || !settings.data ? (
            <div hidden={pane !== 'General'}>
              <Section id="settings-general" title="General">
                <div role="alert" className="flex flex-col items-start gap-2">
                  <p>Couldn’t load the settings.</p>
                  <Button variant="secondary" onClick={() => void settings.refetch()}>
                    Retry
                  </Button>
                </div>
                <AppearanceSection />
              </Section>
            </div>
          ) : (
            <SettingsForm
              closeRequestRef={closeRequestRef}
              settings={settings.data}
              pane={pane}
              onPaneChange={setPane}
              appearance={<AppearanceSection />}
            />
          )}
          <div hidden={pane !== 'Types & fields'}>
            <Section id="settings-types-fields" title="Types & fields">
              <TypesFieldsPane />
            </Section>
          </div>
          <div hidden={pane !== 'About'}>
            <Section id="settings-connection" title="Connection">
              <ConnectionSection />
            </Section>
            <div className="mt-4">
              <Section id="settings-about" title="About">
                <AboutSection />
              </Section>
            </div>
          </div>
        </Suspense>
      </div>
    </Dialog>
  )
}
