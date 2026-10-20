import { ApiError, NetworkError } from './errors'

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
