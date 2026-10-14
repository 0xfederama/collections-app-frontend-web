import { ApiError, NetworkError } from '../../lib/api'

export type ItemErrorKind = 'conflict' | 'unavailable' | 'not_found' | 'network' | 'other'

export interface ItemError {
  kind: ItemErrorKind
  message: string
}

/** Turns a failed move or delete into the message UI_SPEC §9 asks for. */
export function classifyItemError(error: unknown): ItemError {
  if (error instanceof ApiError) {
    if (error.status === 412) {
      return {
        kind: 'conflict',
        message:
          'Someone else changed this item. The latest version was loaded, please check it and try again.',
      }
    }
    if (error.status === 409) {
      return {
        kind: 'unavailable',
        message: 'That list no longer exists or is in Trash. Please choose another one.',
      }
    }
    if (error.status === 404) {
      return { kind: 'not_found', message: 'This item no longer exists.' }
    }
    if (error.status >= 500) return networkError()
    return { kind: 'other', message: error.detail ?? error.title }
  }
  if (error instanceof NetworkError) return networkError()
  return { kind: 'other', message: 'Something went wrong. Please try again.' }
}

const networkError = (): ItemError => ({
  kind: 'network',
  message: 'The server could not be reached. Nothing was changed, so you can try again.',
})
