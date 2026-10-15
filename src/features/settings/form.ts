import type { FieldError } from '../../lib/api'
import type { Settings, UpdateSettingsRequest } from './api'

/** API.md Settings: `markdown_history_limit` is 0–200, the name 1–200 characters. */
export const HISTORY_LIMIT_MAX = 200
export const NAME_MAX = 200

/** What the inputs hold, as strings. Keys are the API field names, so a 422 finds its input. */
export interface SettingsDraft {
  workspace_name: string
  streaming_country_code: string
  markdown_history_limit: string
}

export type SettingsField = keyof SettingsDraft
export type ErrorMap = Partial<Record<SettingsField, string>>

/** Page order: where focus goes when several fields are invalid. */
export const FIELD_ORDER: SettingsField[] = [
  'workspace_name',
  'streaming_country_code',
  'markdown_history_limit',
]

export const inputId = (field: SettingsField) => `settings-${field.replaceAll('_', '-')}`

export const FIELD_LABELS: Record<SettingsField, string> = {
  workspace_name: 'Workspace name',
  streaming_country_code: 'Streaming country',
  markdown_history_limit: 'Description history limit',
}

export function draftFromSettings(settings: Settings): SettingsDraft {
  return {
    workspace_name: settings.workspace_name,
    streaming_country_code: settings.streaming_country_code,
    markdown_history_limit: String(settings.markdown_history_limit),
  }
}

/** The history limit as a number, or `null` when the text is not a whole number. */
function parseLimit(text: string): number | null {
  const trimmed = text.trim()
  return /^\d{1,6}$/.test(trimmed) ? Number(trimmed) : null
}

/** Normalized values, ready to compare with the stored ones or to send. */
function normalized(draft: SettingsDraft) {
  return {
    workspace_name: draft.workspace_name.trim(),
    streaming_country_code: draft.streaming_country_code,
    markdown_history_limit: parseLimit(draft.markdown_history_limit),
  }
}

export function validate(draft: SettingsDraft): ErrorMap {
  const errors: ErrorMap = {}
  const value = normalized(draft)
  if (value.workspace_name === '') errors.workspace_name = 'Enter a name.'
  else if (value.workspace_name.length > NAME_MAX) {
    errors.workspace_name = `Use at most ${NAME_MAX} characters.`
  }
  if (!/^[A-Z]{2}$/.test(value.streaming_country_code)) {
    errors.streaming_country_code = 'Choose a country.'
  }
  if (value.markdown_history_limit === null || value.markdown_history_limit > HISTORY_LIMIT_MAX) {
    errors.markdown_history_limit = `Enter a whole number from 0 to ${HISTORY_LIMIT_MAX}.`
  }
  return errors
}

/** Only the fields that differ from the stored settings (a no-op PATCH is avoided by `isDirty`). */
export function buildPatch(base: Settings, draft: SettingsDraft): UpdateSettingsRequest {
  const value = normalized(draft)
  const patch: UpdateSettingsRequest = {}
  if (value.workspace_name !== base.workspace_name) patch.workspace_name = value.workspace_name
  if (value.streaming_country_code !== base.streaming_country_code) {
    patch.streaming_country_code = value.streaming_country_code
  }
  if (
    value.markdown_history_limit !== null &&
    value.markdown_history_limit !== base.markdown_history_limit
  ) {
    patch.markdown_history_limit = value.markdown_history_limit
  }
  return patch
}

/** True when the draft differs from the stored settings; an unparsable limit counts as a change. */
export function isDirty(base: Settings, draft: SettingsDraft): boolean {
  const value = normalized(draft)
  return (
    value.workspace_name !== base.workspace_name ||
    value.streaming_country_code !== base.streaming_country_code ||
    value.markdown_history_limit !== base.markdown_history_limit
  )
}

const isField = (name: string): name is SettingsField => name in FIELD_LABELS

/** Server field errors onto inputs; anything that matches no input is returned as plain messages. */
export function mapServerErrors(errors: readonly FieldError[]): {
  fields: ErrorMap
  other: string[]
} {
  const result: { fields: ErrorMap; other: string[] } = { fields: {}, other: [] }
  for (const error of errors) {
    if (isField(error.field)) {
      const known = result.fields[error.field]
      result.fields[error.field] = known ? `${known} ${error.message}` : error.message
    } else {
      result.other.push(error.field ? `${error.field}: ${error.message}` : error.message)
    }
  }
  return result
}

export const firstInvalid = (errors: ErrorMap) => FIELD_ORDER.find((field) => errors[field])

/** A readable dump of the changed fields, for "Copy my draft". */
export function draftDump(base: Settings, draft: SettingsDraft): string {
  const value = normalized(draft)
  const lines: string[] = []
  if (value.workspace_name !== base.workspace_name) {
    lines.push(`${FIELD_LABELS.workspace_name}: ${value.workspace_name}`)
  }
  if (value.streaming_country_code !== base.streaming_country_code) {
    lines.push(`${FIELD_LABELS.streaming_country_code}: ${value.streaming_country_code}`)
  }
  if (draft.markdown_history_limit.trim() !== String(base.markdown_history_limit)) {
    lines.push(`${FIELD_LABELS.markdown_history_limit}: ${draft.markdown_history_limit.trim()}`)
  }
  return lines.join('\n')
}
