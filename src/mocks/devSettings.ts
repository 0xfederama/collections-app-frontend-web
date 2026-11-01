import { http, HttpResponse } from 'msw/http'
import type { components } from '../generated/schema'
import { problemResponse } from './problems'

type Settings = components['schemas']['Settings']
/** The request types `preferred_store` as a plain string; `validationError` narrows it to a store key. */
type UpdateSettingsRequest = components['schemas']['UpdateSettingsRequest']
type StoreKey = Settings['preferred_store']
type SettingsChange = Omit<UpdateSettingsRequest, 'preferred_store'> & {
  preferred_store?: StoreKey
}

const STORE_KEYS: readonly StoreKey[] = [
  'amazon',
  'bookshop',
  'apple_books',
  'google_play_books',
  'kobo',
]
const isStoreKey = (value: string): value is StoreKey => STORE_KEYS.some((key) => key === value)

const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`

const initial = (): Settings => ({
  workspace_name: 'Our Collection',
  streaming_country_code: 'IT',
  metadata_language: 'en-US',
  lookup_available: false,
  book_lookup_available: true,
  preferred_store: 'amazon',
  markdown_history_limit: 20,
  trash_retention_days: null,
  owned_streaming_services: [],
  version: 1,
})

const invalid = (field: string, message: string) =>
  problemResponse(422, 'validation_failed', { errors: [{ field, message }] })

/** F-022-W3: provider keys, at most 64, no duplicates (API.md Settings). */
const PROVIDER_KEY = /^[a-z][a-z0-9_]{0,63}$/
const OWNED_MAX = 64

/** The first validation error of a PATCH body, in the shape of the backend's 422 (API.md). */
function validationError(body: UpdateSettingsRequest) {
  const {
    workspace_name: name,
    streaming_country_code: country,
    metadata_language: metadataLanguage,
  } = body
  if (name !== undefined && (name.trim() === '' || name.trim().length > 200)) {
    return invalid('workspace_name', 'must be 1 to 200 characters')
  }
  if (country !== undefined && !/^[A-Z]{2}$/.test(country)) {
    return invalid('streaming_country_code', 'must be an ISO 3166-1 alpha-2 code')
  }
  if (metadataLanguage !== undefined && !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(metadataLanguage)) {
    return invalid(
      'metadata_language',
      'must be an ISO 639-1 language code with an optional region',
    )
  }
  const limit = body.markdown_history_limit
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 0 || limit > 200)) {
    return invalid('markdown_history_limit', 'must be between 0 and 200')
  }
  const retention = body.trash_retention_days
  if (
    retention !== undefined &&
    retention !== null &&
    (!Number.isInteger(retention) || retention < 1 || retention > 365)
  ) {
    return invalid('trash_retention_days', 'must be between 1 and 365')
  }
  const store = body.preferred_store
  if (store !== undefined && !isStoreKey(store)) {
    return invalid('preferred_store', 'must be one of the store providers')
  }
  const owned = body.owned_streaming_services
  if (owned !== undefined) {
    if (owned.length > OWNED_MAX) return invalid('owned_streaming_services', 'at most 64 services')
    if (owned.some((key) => !PROVIDER_KEY.test(key))) {
      return invalid('owned_streaming_services', 'each must be a provider key')
    }
    if (new Set(owned).size !== owned.length) {
      return invalid('owned_streaming_services', 'must not repeat a service')
    }
  }
  return null
}

/**
 * Stateful fake of `GET`/`PATCH /api/v1/settings` with the backend's rules: `If-Match: "s-N"`
 * (428 without it, 412 when stale), a PATCH that changes nothing keeps the version (D-059), and
 * 422 on invalid values. `bumpExternally()` simulates another client saving (to force a 412).
 */
export function createSettingsBackend(start: Settings = initial()) {
  let settings = { ...start }
  const respond = (status = 200) =>
    HttpResponse.json(settings, { status, headers: { ETag: `"s-${settings.version}"` } })

  const handlers = [
    http.get(url('/api/v1/settings'), () => respond()),
    http.patch(url('/api/v1/settings'), async ({ request }) => {
      const sent = request.headers.get('If-Match')
      if (!sent || sent === '*') return problemResponse(428, 'precondition_required')
      if (sent !== `"s-${settings.version}"`) return problemResponse(412, 'version_conflict')
      const body = (await request.json()) as UpdateSettingsRequest
      const bad = validationError(body)
      if (bad) return bad
      const { preferred_store: store, ...rest } = body
      const next: Settings = {
        ...settings,
        ...rest,
        ...(store !== undefined && isStoreKey(store) && { preferred_store: store }),
        ...(body.workspace_name !== undefined && { workspace_name: body.workspace_name.trim() }),
      }
      // Arrays compare by value: a PATCH that repeats the stored list changes nothing (D-059).
      const changed = (Object.keys(next) as (keyof Settings)[]).some(
        (key) => key !== 'version' && JSON.stringify(next[key]) !== JSON.stringify(settings[key]),
      )
      if (changed) settings = { ...next, version: settings.version + 1 }
      return respond()
    }),
  ]
  return {
    handlers,
    get settings() {
      return settings
    },
    bumpExternally: (change: SettingsChange = {}) => {
      settings = { ...settings, ...change, version: settings.version + 1 }
    },
  }
}

const devSettings = createSettingsBackend()
export const devSettingsHandlers = devSettings.handlers
