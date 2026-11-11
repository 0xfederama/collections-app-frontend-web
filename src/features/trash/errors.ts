import {
  ApiError,
  failureKind,
  isDestinationUnavailable,
  isFolderShared,
  isForbidden,
} from '../../lib/api'

type TrashErrorKind =
  | 'gone' // 404: already restored or purged elsewhere
  | 'parent_in_trash' // 409: the parent was trashed since the list loaded
  | 'cycle' // 409 cycle_detected
  | 'forbidden' // 403: restoring a shared top-level folder to a new place is owner-only
  | 'shared' // 409 folder_shared
  | 'unavailable' // 409 destination_unavailable
  | 'validation' // 422
  | 'network' // no answer, or 5xx
  | 'other'

export interface TrashError {
  kind: TrashErrorKind
  message: string
}

export const GONE_MESSAGE =
  'That entry is no longer in Trash. It may have been restored or deleted elsewhere.'

/** Turns a failed restore or purge into the message UI_SPEC §9 asks for. `name` is the entry's root. */
export function classifyTrashError(error: unknown, name?: string): TrashError {
  if (isForbidden(error)) {
    return {
      kind: 'forbidden',
      message: `Only the owner of ‘${name ?? 'this entry'}’ can do that.`,
    }
  }
  if (isFolderShared(error)) {
    return { kind: 'shared', message: 'A shared folder can’t go inside another folder.' }
  }
  if (isDestinationUnavailable(error)) {
    return {
      kind: 'unavailable',
      message: 'That place is no longer available. Pick another one.',
    }
  }
  switch (failureKind(error)) {
    case 'not_found':
      return { kind: 'gone', message: GONE_MESSAGE }
    case 'conflict':
      if (error instanceof ApiError && error.code === 'parent_in_trash') {
        return {
          kind: 'parent_in_trash',
          message: 'Its parent is in Trash, so it can’t go back there. Choose where to restore it.',
        }
      }
      if (error instanceof ApiError && error.code === 'cycle_detected') {
        return {
          kind: 'cycle',
          message: 'A folder can’t be restored into itself or one of its own subfolders.',
        }
      }
      return {
        kind: 'unavailable',
        message:
          'That destination no longer exists or is in Trash. The list of destinations was refreshed, please choose again.',
      }
    case 'validation':
      if (error instanceof ApiError) {
        return {
          kind: 'validation',
          message: error.errors?.[0]?.message ?? error.detail ?? 'The destination is not valid.',
        }
      }
      return serverOrGenericError(error)
    case 'unavailable':
      return networkError()
    // Trash has no wording for 412 or 413: they show the server's text, like any other failure.
    case 'precondition':
    case 'too_large':
    case 'other':
      return serverOrGenericError(error)
  }
}

const networkError = (): TrashError => ({
  kind: 'network',
  message: 'The server could not be reached. Nothing was changed, so you can try again.',
})

/** The server's own text when the failure came from HTTP, else the generic message. */
const serverOrGenericError = (error: unknown): TrashError =>
  error instanceof ApiError
    ? { kind: 'other', message: error.detail ?? error.title }
    : { kind: 'other', message: 'Something went wrong. Please try again.' }
