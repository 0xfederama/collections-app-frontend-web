import type { ReactNode } from 'react'
import { Select, TextField } from '../../components/ui'
import {
  HISTORY_LIMIT_MAX,
  inputId,
  type ErrorMap,
  type SettingsDraft,
  type ScalarSettingsField,
} from './form'

/** The General pane: trash retention (saved on change), history limit, appearance. */
export function CollectionFields({
  hidden,
  draft,
  errors,
  isPending,
  set,
  onRetentionChange,
  appearance,
}: {
  hidden: boolean
  draft: SettingsDraft
  errors: ErrorMap
  isPending: boolean
  set: (field: ScalarSettingsField, value: string) => void
  onRetentionChange: (value: string) => void
  /** The per-device theme choice, shown at the end of the General pane. */
  appearance?: ReactNode
}) {
  return (
    <section
      aria-labelledby="settings-general"
      hidden={hidden}
      className={`flex flex-col gap-4 ${hidden ? 'hidden' : ''}`}
    >
      <h2 id="settings-general" className="font-display text-section text-text">
        General
      </h2>
      <Select
        id={inputId('trash_retention_days')}
        label="Delete trash automatically"
        hint="Automatically and permanently delete trashed items after the selected number of days. This runs daily; it doesn’t empty the trash immediately."
        value={draft.trash_retention_days}
        onValueChange={onRetentionChange}
        error={errors.trash_retention_days}
        disabled={isPending}
        options={[
          { value: 'off', label: 'Off' },
          { value: '7', label: '7 days' },
          { value: '30', label: '30 days' },
          { value: '90', label: '90 days' },
          ...(!['off', '7', '30', '90'].includes(draft.trash_retention_days)
            ? [
                {
                  value: draft.trash_retention_days,
                  label: `Current: ${draft.trash_retention_days} days`,
                },
              ]
            : []),
        ]}
      />
      <TextField
        id={inputId('markdown_history_limit')}
        label="Description history limit"
        inputMode="numeric"
        autoComplete="off"
        hint={`How many earlier versions of an item's description to keep, 0 to ${HISTORY_LIMIT_MAX}. Lowering it removes the extra versions the next time each description is saved.`}
        value={draft.markdown_history_limit}
        onChange={(event) => set('markdown_history_limit', event.target.value)}
        error={errors.markdown_history_limit}
      />
      {appearance}
    </section>
  )
}
