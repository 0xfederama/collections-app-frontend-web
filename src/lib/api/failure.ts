import { ApiError, NetworkError, type FieldError } from './errors'

/**
 * What went wrong with a failed API call, independent of the wording. Features switch on this and
 * add their own copy and sub-codes (e.g. `cycle_detected`), so the HTTP mapping lives in one place.
 */
export type FailureKind =
  | 'precondition' // 412: the resource changed since it was loaded
  | 'not_found' // 404
  | 'conflict' // 409
  | 'too_large' // 413
  | 'validation' // 422
  | 'unavailable' // 5xx, or no answer at all
  | 'other'

/** The one place that maps an HTTP failure (or a network failure) to a `FailureKind`. */
export function failureKind(error: unknown): FailureKind {
  if (error instanceof ApiError) {
    if (error.status === 412) return 'precondition'
    if (error.status === 404) return 'not_found'
    if (error.status === 409) return 'conflict'
    if (error.status === 413) return 'too_large'
    if (error.status === 422) return 'validation'
    if (error.status >= 500) return 'unavailable'
    return 'other'
  }
  if (error instanceof NetworkError) return 'unavailable'
  return 'other'
}

/** Shown when a call answered 401 and the page did not (or could not) reload for the login. */
const SIGNED_OUT_MESSAGE = 'You’re signed out. Reload the page to sign in.'

/**
 * The message to show for a failed call: the server's `detail` (or `title`) for an ApiError,
 * otherwise `fallback`. Only for failures whose copy is not written per status.
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (isUnauthenticated(error)) return SIGNED_OUT_MESSAGE
  if (error instanceof ApiError && error.status === 422) return validationMessage(error)
  return error instanceof ApiError ? (error.detail ?? error.title) : fallback
}

/** `body.metadata.power_hp` -> `Power hp`: the last path segment, readable. Empty when there is none. */
function fieldName(path: string): string {
  const last =
    path
      .replace(/\[\d+\]/g, '')
      .split('.')
      .pop() ?? ''
  const words = last.replaceAll('_', ' ').trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
}

/**
 * The text for a 422 that has no input to sit on: the field errors (`Director: too long`), else the
 * server's `detail` (it names up to 3 fields), else the title. Never just "Validation failed" when the
 * server said more.
 */
export function validationMessage(error: ApiError): string {
  const lines = (error.errors ?? []).filter((e) => e.message).map(fieldErrorText)
  if (lines.length) return lines.join(' ')
  return error.detail ?? error.title
}

/** One field error as a sentence: `Director: must be at most 100 characters`. */
export function fieldErrorText(error: FieldError): string {
  const name = fieldName(error.field)
  return name ? `${name}: ${error.message}` : error.message
}

/** 409 `duplicate_title`: the title (or provider id) is already in the list. Features add the wording. */
export function isDuplicateTitle(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && error.code === 'duplicate_title'
}

/** 401: the Cloudflare Access session ended. The client reloads for the login; if it could not, say so. */
export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}
