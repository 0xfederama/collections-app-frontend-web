import { ApiError, failureKind, type FieldError } from '../../lib/api'
import { serviceLabel } from '../../components/serviceIcons/owned'
import type { Settings, UpdateSettingsRequest } from './api'

/** API.md Settings: `markdown_history_limit` is 0–200. */
export const HISTORY_LIMIT_MAX = 200

/**
 * What the inputs hold: strings, and the owned streaming services as a list of provider keys. Keys are
 * the API field names, so a 422 finds its input.
 */
export interface SettingsDraft {
  streaming_country_code: string
  metadata_language: string
  markdown_history_limit: string
  trash_retention_days: string
  /** One store key (the workspace default store, never empty). */
  preferred_store: string
  /** F-022-W3: provider keys of the services the user owns; empty shows every service. */
  owned_streaming_services: string[]
}

export type SettingsField = keyof SettingsDraft
/** The fields whose input holds a single string (all but the owned-services list). */
export type ScalarSettingsField = Exclude<SettingsField, 'owned_streaming_services'>
export type ErrorMap = Partial<Record<SettingsField, string>>

/** Page order: where focus goes when several fields are invalid. */
const FIELD_ORDER: SettingsField[] = [
  'streaming_country_code',
  'metadata_language',
  'trash_retention_days',
  'markdown_history_limit',
  'preferred_store',
  'owned_streaming_services',
]

export const inputId = (field: SettingsField) => `settings-${field.replaceAll('_', '-')}`

const FIELD_LABELS: Record<SettingsField, string> = {
  streaming_country_code: 'Country',
  metadata_language: 'Metadata language',
  trash_retention_days: 'Delete trash automatically',
  markdown_history_limit: 'Description history limit',
  preferred_store: 'Default store',
  owned_streaming_services: 'My streaming services',
}

export const metadataLanguageOptions = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'it-IT', label: 'Italiano (Italia)' },
  { value: 'fr-FR', label: 'Français (France)' },
  { value: 'de-DE', label: 'Deutsch (Deutschland)' },
  { value: 'es-ES', label: 'Español (España)' },
]

/** Why the last save did not go through, other than field errors. */
export type Failure = { kind: 'conflict' | 'network' } | { kind: 'other'; message: string }

export function draftFromSettings(settings: Settings): SettingsDraft {
  return {
    streaming_country_code: settings.streaming_country_code,
    metadata_language: settings.metadata_language,
    markdown_history_limit: String(settings.markdown_history_limit),
    trash_retention_days:
      settings.trash_retention_days === null ? 'off' : String(settings.trash_retention_days),
    preferred_store: settings.preferred_store,
    owned_streaming_services: [...settings.owned_streaming_services],
  }
}

/** Same keys in any order (the picker keeps the order it was ticked in; the server may not). */
const sameKeys = (a: readonly string[], b: readonly string[]) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

/** The history limit as a number, or `null` when the text is not a whole number. */
function parseLimit(text: string): number | null {
  const trimmed = text.trim()
  return /^\d{1,6}$/.test(trimmed) ? Number(trimmed) : null
}

/** Normalized values, ready to compare with the stored ones or to send. */
function normalized(draft: SettingsDraft) {
  return {
    streaming_country_code: draft.streaming_country_code,
    metadata_language: draft.metadata_language,
    markdown_history_limit: parseLimit(draft.markdown_history_limit),
    trash_retention_days:
      draft.trash_retention_days === 'off' ? null : Number(draft.trash_retention_days),
    preferred_store: draft.preferred_store,
    owned_streaming_services: draft.owned_streaming_services,
  }
}

export function validate(draft: SettingsDraft): ErrorMap {
  const errors: ErrorMap = {}
  const value = normalized(draft)
  if (!/^[A-Z]{2}$/.test(value.streaming_country_code)) {
    errors.streaming_country_code = 'Choose a country.'
  }
  if (!['en-US', 'it-IT', 'fr-FR', 'de-DE', 'es-ES'].includes(value.metadata_language)) {
    errors.metadata_language = 'Choose a language.'
  }
  if (value.preferred_store === '') errors.preferred_store = 'Choose a store.'
  if (value.markdown_history_limit === null || value.markdown_history_limit > HISTORY_LIMIT_MAX) {
    errors.markdown_history_limit = `Enter a whole number from 0 to ${HISTORY_LIMIT_MAX}.`
  }
  return errors
}

/** Only the fields saved by the form; retention is saved immediately in its own PATCH. */
export function buildPatch(base: Settings, draft: SettingsDraft): UpdateSettingsRequest {
  const value = normalized(draft)
  const patch: UpdateSettingsRequest = {}
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
  if (value.preferred_store !== base.preferred_store) {
    patch.preferred_store = value.preferred_store
  }
  if (!sameKeys(value.owned_streaming_services, base.owned_streaming_services)) {
    patch.owned_streaming_services = value.owned_streaming_services
  }
  return patch
}

/** True when the draft differs from the stored settings; an unparsable limit counts as a change. */
export function isDirty(base: Settings, draft: SettingsDraft): boolean {
  const value = normalized(draft)
  return (
    value.streaming_country_code !== base.streaming_country_code ||
    value.metadata_language !== base.metadata_language ||
    value.markdown_history_limit !== base.markdown_history_limit ||
    value.trash_retention_days !== base.trash_retention_days ||
    value.preferred_store !== base.preferred_store ||
    !sameKeys(value.owned_streaming_services, base.owned_streaming_services)
  )
}

/** The Save settings button covers only the fields saved by that action. */
export function isFormDirty(base: Settings, draft: SettingsDraft): boolean {
  const value = normalized(draft)
  return (
    value.streaming_country_code !== base.streaming_country_code ||
    value.metadata_language !== base.metadata_language ||
    value.markdown_history_limit !== base.markdown_history_limit ||
    value.preferred_store !== base.preferred_store ||
    !sameKeys(value.owned_streaming_services, base.owned_streaming_services)
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

/**
 * What a failed save shows. A 422 with field errors is not a banner: `fields` (mapped onto the inputs)
 * and `other` (plain messages) are set and `failure` is null. Every other case sets `failure` only.
 */
export function classifySaveFailure(caught: unknown): {
  failure: Failure | null
  fields: ErrorMap | null
  other: string[] | null
} {
  switch (failureKind(caught)) {
    case 'precondition':
      return { failure: { kind: 'conflict' }, fields: null, other: null }
    case 'validation':
      if (caught instanceof ApiError && caught.errors?.length) {
        const mapped = mapServerErrors(caught.errors)
        return { failure: null, fields: mapped.fields, other: mapped.other }
      }
      return { failure: serverOrGenericFailure(caught), fields: null, other: null }
    case 'unavailable':
      return { failure: { kind: 'network' }, fields: null, other: null }
    case 'not_found':
    case 'conflict':
    case 'too_large':
    case 'other':
      return { failure: serverOrGenericFailure(caught), fields: null, other: null }
  }
}

/** The server's own text when the failure came from HTTP, else the generic message. */
const serverOrGenericFailure = (caught: unknown): Failure =>
  caught instanceof ApiError
    ? { kind: 'other', message: caught.detail ?? caught.title }
    : { kind: 'other', message: 'Something went wrong. Your changes are kept.' }

/** A readable dump of the changed fields, for "Copy my draft". */
export function draftDump(base: Settings, draft: SettingsDraft): string {
  const value = normalized(draft)
  const lines: string[] = []
  if (value.streaming_country_code !== base.streaming_country_code) {
    lines.push(`${FIELD_LABELS.streaming_country_code}: ${value.streaming_country_code}`)
  }
  if (value.metadata_language !== base.metadata_language) {
    lines.push(`${FIELD_LABELS.metadata_language}: ${value.metadata_language}`)
  }
  if (draft.markdown_history_limit.trim() !== String(base.markdown_history_limit)) {
    lines.push(`${FIELD_LABELS.markdown_history_limit}: ${draft.markdown_history_limit.trim()}`)
  }
  if (value.preferred_store !== base.preferred_store) {
    lines.push(`${FIELD_LABELS.preferred_store}: ${value.preferred_store}`)
  }
  if (!sameKeys(value.owned_streaming_services, base.owned_streaming_services)) {
    const names = value.owned_streaming_services.map(serviceLabel).join(', ') || 'All services'
    lines.push(`${FIELD_LABELS.owned_streaming_services}: ${names}`)
  }
  if (value.trash_retention_days !== base.trash_retention_days) {
    lines.push(
      `${FIELD_LABELS.trash_retention_days}: ${value.trash_retention_days === null ? 'Off' : `${value.trash_retention_days} days`}`,
    )
  }
  return lines.join('\n')
}
