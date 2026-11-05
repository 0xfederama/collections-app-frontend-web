import { ApiError, failureKind, isDuplicateTitle } from '../../lib/api'
import type { ItemType } from './api'
import { duplicateTitleMessage } from './duplicate'

type ItemErrorKind = 'conflict' | 'unavailable' | 'not_found' | 'duplicate' | 'network' | 'other'

export interface ItemError {
  kind: ItemErrorKind
  message: string
}

/** Turns a failed move or delete into the message UI_SPEC §9 asks for. */
export function classifyItemError(error: unknown, type?: ItemType): ItemError {
  const kind = failureKind(error)
  if (kind === 'precondition') {
    return {
      kind: 'conflict',
      message:
        'Someone else changed this item. The latest version was loaded, please check it and try again.',
    }
  }
  // Checked before the status, whatever it is: the code names the cause (the contract sends it with 409).
  if (error instanceof ApiError && error.code === 'type_mismatch') {
    return {
      kind: 'unavailable',
      message:
        'That list holds another type of item. Items can only move to lists of the same type.',
    }
  }
  if (isDuplicateTitle(error)) {
    return { kind: 'duplicate', message: duplicateTitleMessage(type) }
  }
  switch (kind) {
    case 'conflict':
      return {
        kind: 'unavailable',
        message: 'That list no longer exists or is in Trash. Please choose another one.',
      }
    case 'not_found':
      return { kind: 'not_found', message: 'This item no longer exists.' }
    case 'unavailable':
      return networkError()
    case 'too_large':
    case 'validation':
    case 'other':
      return error instanceof ApiError
        ? { kind: 'other', message: error.detail ?? error.title }
        : { kind: 'other', message: 'Something went wrong. Please try again.' }
  }
}

const networkError = (): ItemError => ({
  kind: 'network',
  message: 'The server could not be reached. Nothing was changed, so you can try again.',
})
