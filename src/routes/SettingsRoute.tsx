import { useRef, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button, Dialog, Skeleton } from '../components/ui'
import { AboutSection } from '../features/settings/AboutSection'
import { AppearanceSection } from '../features/settings/AppearanceSection'
import { useSettings } from '../features/settings/api'
import { ConnectionSection } from '../features/settings/ConnectionSection'
import { SettingsForm, type SettingsCloseRequestRef } from '../features/settings/SettingsForm'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-lg bg-surface p-5 shadow-md"
    >
      <h2 id={id} className="text-sm font-semibold text-text-muted">
        {title}
      </h2>
      {children}
    </section>
  )
}

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
  const settings = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
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
      className="max-h-[90dvh] w-[min(90vw,720px)]! max-w-none! gap-6"
    >
      <Section id="settings-appearance" title="Appearance">
        <AppearanceSection />
      </Section>
      {settings.isPending ? (
        <Section id="settings-collection" title="Collection">
          <WorkspaceSkeleton />
        </Section>
      ) : settings.isError || !settings.data ? (
        <Section id="settings-collection" title="Collection">
          <div role="alert" className="flex flex-col items-start gap-2">
            <p>Couldn’t load the settings.</p>
            <Button variant="secondary" onClick={() => void settings.refetch()}>
              Retry
            </Button>
          </div>
        </Section>
      ) : (
        <SettingsForm closeRequestRef={closeRequestRef} settings={settings.data} />
      )}
      <Section id="settings-connection" title="Connection">
        <ConnectionSection />
      </Section>
      <Section id="settings-about" title="About">
        <AboutSection />
      </Section>
    </Dialog>
  )
}
