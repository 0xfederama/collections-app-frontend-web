import type { ReactNode, RefObject } from 'react'
import { Button } from '../components/ui'
import type { SettingsCloseRequestRef, useSettings } from '../features/settings'
import {
  AboutSection,
  AccountSection,
  AppearanceSection,
  ConnectionSection,
  SettingsForm,
} from '../features/settings/screens'
import { WorkspaceSkeleton } from './SettingsSkeleton'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="font-display text-section text-text">
        {title}
      </h2>
      {children}
    </section>
  )
}

interface Props {
  pane: string
  onPaneChange: (pane: string) => void
  settings: ReturnType<typeof useSettings>
  closeRequestRef: RefObject<SettingsCloseRequestRef['current']>
}

/** The Settings panes: loaded lazily inside the already open Settings dialog. */
export default function SettingsPanes({ pane, onPaneChange, settings, closeRequestRef }: Props) {
  return (
    <>
      <div hidden={pane !== 'Account'}>
        <Section id="settings-account" title="Account">
          <AccountSection />
        </Section>
      </div>
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
          onPaneChange={onPaneChange}
          appearance={<AppearanceSection />}
        />
      )}
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
    </>
  )
}
