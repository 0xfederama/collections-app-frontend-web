import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button, Dialog, Skeleton } from '../components/ui'
import { AppearanceSection } from '../features/settings/AppearanceSection'
import { useSettings } from '../features/settings/api'
import { ConnectionSection } from '../features/settings/ConnectionSection'
import { SettingsForm } from '../features/settings/SettingsForm'

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
 * page behind it). Closing goes back there, or to Home on a deep link. The form keeps its own
 * unsaved-changes guard, so closing with edits asks first.
 */
export function SettingsRoute() {
  const settings = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const hasBackground = Boolean((location.state as { background?: unknown } | null)?.background)
  const close = () => void (hasBackground ? navigate(-1) : navigate('/', { replace: true }))
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && close()}
      title="Settings"
      className="max-h-[90dvh] w-[min(90vw,720px)]! max-w-none! gap-6"
    >
      <Section id="settings-workspace" title="Workspace">
        {settings.isPending ? (
          <WorkspaceSkeleton />
        ) : settings.isError || !settings.data ? (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p>Couldn’t load the settings.</p>
            <Button variant="secondary" onClick={() => void settings.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <SettingsForm settings={settings.data} />
        )}
      </Section>
      <Section id="settings-appearance" title="Appearance">
        <AppearanceSection />
      </Section>
      <Section id="settings-connection" title="Connection">
        <ConnectionSection />
      </Section>
    </Dialog>
  )
}
