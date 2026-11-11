import {
  ApiError,
  NetworkError,
  errorMessage,
  isFolderNotTopLevel,
  isForbidden,
} from '../../../lib/api'
import type { TreeError } from '../errors'

export const OWN_EMAIL_MESSAGE = 'That’s your own email.'
const UNKNOWN_EMAIL_MESSAGE =
  'No one with this email has signed in to Collections yet. Ask them to open Collections once, then try again.'
const NETWORK_MESSAGE = 'The server could not be reached. Your input is kept, so you can try again.'

export const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

const failure = (kind: TreeError['kind'], message: string): TreeError => ({
  kind,
  message,
  fieldErrors: [],
})

/**
 * The message for a failed share / remove / leave call, or `null` when the folder is gone (404:
 * the dialog closes). `typedEmail` and `meEmail` tell the two 422 cases apart.
 */
export function sharingFailure(
  error: unknown,
  ctx: { folderName: string; typedEmail?: string; meEmail?: string },
): TreeError | null {
  if (error instanceof NetworkError) return failure('network', NETWORK_MESSAGE)
  if (error instanceof ApiError) {
    if (error.status === 404) return null
    if (error.status === 422) {
      const own = ctx.typedEmail && ctx.meEmail && sameEmail(ctx.typedEmail, ctx.meEmail)
      return failure('validation', own ? OWN_EMAIL_MESSAGE : UNKNOWN_EMAIL_MESSAGE)
    }
    if (isForbidden(error))
      return failure(
        'other',
        `Only the owner of ‘${ctx.folderName}’ can change who it’s shared with.`,
      )
    if (isFolderNotTopLevel(error)) return failure('other', 'Only top-level folders can be shared.')
    if (error.status >= 500) return failure('network', NETWORK_MESSAGE)
  }
  return failure('other', errorMessage(error))
}
