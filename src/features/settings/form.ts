import type { FieldError } from '../../lib/api'
import type { Settings, UpdateSettingsRequest } from './api'
import { joinStoreKeys, parseStoreKeys } from '../stores/providers'

/** API.md Settings: `markdown_history_limit` is 0–200, the name 1–200 characters. */
export const HISTORY_LIMIT_MAX = 200
export const NAME_MAX = 200
/** The contract's limit on preferred stores (F016-W4). */
export const PREFERRED_STORES_MAX = 6

/** What the inputs hold, as strings. Keys are the API field names, so a 422 finds its input. */
export interface SettingsDraft {
  workspace_name: string
  streaming_country_code: string
  metadata_language: string
  markdown_history_limit: string
  trash_retention_days: string
  /** Comma-separated store keys, in the order chosen (the same text rule as a book's stores). */
  preferred_stores: string
}

export type SettingsField = keyof SettingsDraft
export type ErrorMap = Partial<Record<SettingsField, string>>

/** Page order: where focus goes when several fields are invalid. */
export const FIELD_ORDER: SettingsField[] = [
  'workspace_name',
  'streaming_country_code',
  'metadata_language',
  'trash_retention_days',
  'markdown_history_limit',
  'preferred_stores',
]

export const inputId = (field: SettingsField) => `settings-${field.replaceAll('_', '-')}`

export const FIELD_LABELS: Record<SettingsField, string> = {
  workspace_name: 'Workspace name',
  streaming_country_code: 'Streaming country',
  metadata_language: 'Metadata language',
  trash_retention_days: 'Delete trash automatically',
  markdown_history_limit: 'Description history limit',
  preferred_stores: 'Where to get it',
}

export function draftFromSettings(settings: Settings): SettingsDraft {
  return {
    workspace_name: settings.workspace_name,
    streaming_country_code: settings.streaming_country_code,
    metadata_language: settings.metadata_language,
    markdown_history_limit: String(settings.markdown_history_limit),
    trash_retention_days:
      settings.trash_retention_days === null ? 'off' : String(settings.trash_retention_days),
    preferred_stores: joinStoreKeys(settings.preferred_stores),
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
    metadata_language: draft.metadata_language,
    markdown_history_limit: parseLimit(draft.markdown_history_limit),
    trash_retention_days:
      draft.trash_retention_days === 'off' ? null : Number(draft.trash_retention_days),
    preferred_stores: parseStoreKeys(draft.preferred_stores),
  }
}

/** Same keys in the same order: the stores are an ordered list, so order is a change. */
const sameKeys = (a: readonly string[], b: readonly string[]) =>
  JSON.stringify(a) === JSON.stringify(b)

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
  if (!['en-US', 'it-IT', 'fr-FR', 'de-DE', 'es-ES'].includes(value.metadata_language)) {
    errors.metadata_language = 'Choose a language.'
  }
  if (value.preferred_stores.length > PREFERRED_STORES_MAX) {
    errors.preferred_stores = `Choose at most ${PREFERRED_STORES_MAX} stores.`
  }
  if (value.markdown_history_limit === null || value.markdown_history_limit > HISTORY_LIMIT_MAX) {
    errors.markdown_history_limit = `Enter a whole number from 0 to ${HISTORY_LIMIT_MAX}.`
  }
  return errors
}

/** Only the fields saved by the form; retention is saved immediately in its own PATCH. */
export function buildPatch(base: Settings, draft: SettingsDraft): UpdateSettingsRequest {
  const value = normalized(draft)
  const patch: UpdateSettingsRequest = {}
  if (value.workspace_name !== base.workspace_name) patch.workspace_name = value.workspace_name
  if (value.streaming_country_code !== base.streaming_country_code) {
    patch.streaming_country_code = value.streaming_country_code
  }
  if (value.metadata_language !== base.metadata_language) {
    patch.metadata_language = value.metadata_language as UpdateSettingsRequest['metadata_language']
  }
  if (
    value.markdown_history_limit !== null &&
    value.markdown_history_limit !== base.markdown_history_limit
  ) {
    patch.markdown_history_limit = value.markdown_history_limit
  }
  if (!sameKeys(value.preferred_stores, base.preferred_stores)) {
    patch.preferred_stores = value.preferred_stores as UpdateSettingsRequest['preferred_stores']
  }
  return patch
}

/** True when the draft differs from the stored settings; an unparsable limit counts as a change. */
export function isDirty(base: Settings, draft: SettingsDraft): boolean {
  const value = normalized(draft)
  return (
    value.workspace_name !== base.workspace_name ||
    value.streaming_country_code !== base.streaming_country_code ||
    value.metadata_language !== base.metadata_language ||
    value.markdown_history_limit !== base.markdown_history_limit ||
    value.trash_retention_days !== base.trash_retention_days ||
    !sameKeys(value.preferred_stores, base.preferred_stores)
  )
}

/** The Save settings button covers only the fields saved by that action. */
export function isFormDirty(base: Settings, draft: SettingsDraft): boolean {
  const value = normalized(draft)
  return (
    value.workspace_name !== base.workspace_name ||
    value.streaming_country_code !== base.streaming_country_code ||
    value.metadata_language !== base.metadata_language ||
    value.markdown_history_limit !== base.markdown_history_limit ||
    !sameKeys(value.preferred_stores, base.preferred_stores)
  )
}

export function isRetentionDirty(base: Settings, draft: SettingsDraft): boolean {
  const value = normalized(draft)
  return value.trash_retention_days !== base.trash_retention_days
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
  if (value.metadata_language !== base.metadata_language) {
    lines.push(`${FIELD_LABELS.metadata_language}: ${value.metadata_language}`)
  }
  if (draft.markdown_history_limit.trim() !== String(base.markdown_history_limit)) {
    lines.push(`${FIELD_LABELS.markdown_history_limit}: ${draft.markdown_history_limit.trim()}`)
  }
  if (!sameKeys(value.preferred_stores, base.preferred_stores)) {
    lines.push(`${FIELD_LABELS.preferred_stores}: ${value.preferred_stores.join(', ') || 'None'}`)
  }
  if (value.trash_retention_days !== base.trash_retention_days) {
    lines.push(
      `${FIELD_LABELS.trash_retention_days}: ${value.trash_retention_days === null ? 'Off' : `${value.trash_retention_days} days`}`,
    )
  }
  return lines.join('\n')
}
