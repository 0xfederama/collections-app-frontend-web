import type { ReactNode } from 'react'
import { Button, Skeleton } from '../components/ui'
import { useSettings } from '../features/settings/api'
import { ConnectionSection } from '../features/settings/ConnectionSection'
import { SettingsForm } from '../features/settings/SettingsForm'

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

/** `/settings` (UI_SPEC §8): the workspace settings form and the connection info (the theme toggle lives in the sidebar). */
export function SettingsRoute() {
  const settings = useSettings()
  return (
    <div className="flex max-w-xl flex-col gap-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
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
      <Section id="settings-connection" title="Connection">
        <ConnectionSection />
      </Section>
    </div>
  )
}
