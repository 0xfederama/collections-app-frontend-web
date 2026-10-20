import { type ReactNode } from 'react'
import { type Settings } from './api'
import { useSettingsForm, type SettingsCloseRequestRef } from './useSettingsForm'
import { CollectionFields } from './CollectionFields'
import { CopyDraftDialog, SettingsBanners } from './SettingsBanners'
import { MediaFields } from './MediaFields'
import { ReloadDialog } from './ReloadDialog'
import { DiscardChangesDialog } from './DiscardChangesDialog'

/**
 * The workspace settings form (UI_SPEC §8, §9). Like the item form it edits a snapshot taken when it
 * opened: `If-Match` comes from that snapshot, so a refetch in the background can never turn into a
 * silent overwrite. Whatever goes wrong, the draft stays. The state machine lives in useSettingsForm.
 */
export type { SettingsCloseRequestRef } from './useSettingsForm'

export function SettingsForm({
  settings,
  closeRequestRef,
  pane,
  onPaneChange,
  appearance,
}: {
  settings: Settings
  closeRequestRef: SettingsCloseRequestRef
  pane: string
  onPaneChange: (pane: string) => void
  /** The per-device theme choice, shown at the end of the General pane. */
  appearance?: ReactNode
}) {
  const form = useSettingsForm({ settings, closeRequestRef, onPaneChange })
  const blocker = form.blocker

  return (
    <form onSubmit={(event) => event.preventDefault()} noValidate className="flex flex-col gap-4">
      <SettingsBanners
        failure={form.failure}
        otherErrors={form.otherErrors}
        reloadFailed={form.reloadFailed}
        isPending={form.isPending}
        onCopyDraft={() => void form.copyDraft()}
        onReload={() => form.setDialog('reload')}
        onRetry={() => form.retryAction.current()}
      />
      <CollectionFields
        hidden={pane !== 'General'}
        draft={form.draft}
        errors={form.errors}
        isPending={form.isPending}
        set={form.set}
        onRetentionChange={(value) => void form.saveRetention(value)}
        appearance={appearance}
      />
      <MediaFields
        hidden={pane !== 'Media'}
        draft={form.draft}
        errors={form.errors}
        isPending={form.isPending}
        set={form.set}
        providers={form.providers.data ?? []}
      />

      {blocker.state === 'blocked' && (
        <DiscardChangesDialog
          onKeepEditing={() => blocker.reset()}
          onDiscard={() => blocker.proceed()}
        />
      )}
      {form.dialog === 'reload' && (
        <ReloadDialog
          reloading={form.reloading}
          onClose={() => form.setDialog(null)}
          onConfirm={() => void form.reloadLatest()}
        />
      )}
      <CopyDraftDialog
        copyFallback={form.copyFallback}
        copyRef={form.copyRef}
        onClose={() => form.setCopyFallback(null)}
      />
    </form>
  )
}
