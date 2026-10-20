import { ApiError, failureKind, type FieldError } from '../../lib/api'

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
  switch (failureKind(error)) {
    case 'precondition':
      return {
        kind: 'conflict',
        message: `Someone else changed this ${noun} while you were editing. Your changes have not been saved.`,
        fieldErrors: [],
      }
    case 'conflict':
      if (error instanceof ApiError && error.code === 'cycle_detected') {
        return {
          kind: 'cycle',
          message: 'A folder can’t be moved into itself or one of its own subfolders.',
          fieldErrors: [],
        }
      }
      return {
        kind: 'unavailable',
        message:
          'That destination no longer exists or is in Trash. The folders and lists were refreshed, please choose again.',
        fieldErrors: [],
      }
    case 'not_found':
      return {
        kind: 'not_found',
        message: `This ${noun} no longer exists. The folders and lists were refreshed.`,
        fieldErrors: [],
      }
    case 'validation':
      if (error instanceof ApiError) {
        return {
          kind: 'validation',
          message:
            error.errors?.[0]?.message ?? error.detail ?? 'Please check the highlighted field.',
          fieldErrors: error.errors ?? [],
        }
      }
      return serverOrGenericError(error)
    case 'too_large':
      return {
        kind: 'other',
        message: 'This is too large for the server. Shorten the text and try again.',
        fieldErrors: [],
      }
    case 'unavailable':
      return networkError()
    case 'other':
      return serverOrGenericError(error)
  }
}

const networkError = (): TreeError => ({
  kind: 'network',
  message: 'The server could not be reached. Your input is kept, so you can try again.',
  fieldErrors: [],
})

/** The server's own text when the failure came from HTTP, else the generic message. */
const serverOrGenericError = (error: unknown): TreeError =>
  error instanceof ApiError
    ? { kind: 'other', message: error.detail ?? error.title, fieldErrors: [] }
    : { kind: 'other', message: 'Something went wrong. Please try again.', fieldErrors: [] }

/** Failures after which the tree on screen may be wrong, so it should be refetched. 412 is excluded on purpose. */
export const shouldRefreshTree = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 409)
