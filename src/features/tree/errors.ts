import { ApiError, NetworkError, type FieldError } from '../../lib/api'

type TreeErrorKind =
  | 'conflict' // 412: someone else changed it
  | 'unavailable' // 409 destination_unavailable
  | 'cycle' // 409 cycle_detected
  | 'not_found' // 404
  | 'validation' // 422
  | 'network' // no answer, or 5xx
  | 'other'

export interface TreeError {
  kind: TreeErrorKind
  message: string
  /** 422 only: the first message for the `name` / `description` field, if the server named one. */
  fieldErrors: FieldError[]
}

/**
 * Turns a failed tree write into the message UI_SPEC §9 asks for. `noun` is what was being
 * edited ("folder" / "list") and only shapes the wording.
 */
export function classifyError(error: unknown, noun: 'folder' | 'list'): TreeError {
  if (error instanceof ApiError) {
    if (error.status === 412) {
      return {
        kind: 'conflict',
        message: `Someone else changed this ${noun} while you were editing. Your changes have not been saved.`,
        fieldErrors: [],
      }
    }
    if (error.status === 409 && error.code === 'cycle_detected') {
      return {
        kind: 'cycle',
        message: 'A folder can’t be moved into itself or one of its own subfolders.',
        fieldErrors: [],
      }
    }
    if (error.status === 409) {
      return {
        kind: 'unavailable',
        message:
          'That destination no longer exists or is in Trash. The folders and lists were refreshed, please choose again.',
        fieldErrors: [],
      }
    }
    if (error.status === 404) {
      return {
        kind: 'not_found',
        message: `This ${noun} no longer exists. The folders and lists were refreshed.`,
        fieldErrors: [],
      }
    }
    if (error.status === 422) {
      return {
        kind: 'validation',
        message:
          error.errors?.[0]?.message ?? error.detail ?? 'Please check the highlighted field.',
        fieldErrors: error.errors ?? [],
      }
    }
    if (error.status === 413) {
      return {
        kind: 'other',
        message: 'This is too large for the server. Shorten the text and try again.',
        fieldErrors: [],
      }
    }
    if (error.status >= 500) return networkError()
    return { kind: 'other', message: error.detail ?? error.title, fieldErrors: [] }
  }
  if (error instanceof NetworkError) return networkError()
  return { kind: 'other', message: 'Something went wrong. Please try again.', fieldErrors: [] }
}

const networkError = (): TreeError => ({
  kind: 'network',
  message: 'The server could not be reached. Your input is kept, so you can try again.',
  fieldErrors: [],
})

/** Failures after which the tree on screen may be wrong, so it should be refetched. 412 is excluded on purpose. */
export const shouldRefreshTree = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 409)
