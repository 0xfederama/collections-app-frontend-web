import { ApiError, NetworkError } from '../../../lib/api'

export interface ImageFailure {
  message: string
  /** The item changed or disappeared under the user: the form shows its conflict banner. */
  stale?: 'conflict' | 'gone'
}

const fieldMessage = (error: ApiError, field: string) =>
  error.errors?.find((e) => e.field === field)?.message

/** Turns a failed image request into one sentence for the user. Codes are API §5. */
export function describeImageError(
  error: unknown,
  action: 'upload' | 'url' | 'remove',
): ImageFailure {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 412:
        return {
          message: 'Someone else changed this item, so the image was not changed.',
          stale: 'conflict',
        }
      case 404:
        return {
          message: 'This item was deleted or moved to Trash, so the image was not changed.',
          stale: 'gone',
        }
      case 413:
        return { message: 'The image is larger than 10 MiB.' }
      case 415:
        return { message: 'The file is not a JPEG, PNG or WebP image.' }
      case 422: {
        const detail = fieldMessage(error, 'file') ?? fieldMessage(error, 'url')
        if (action === 'url')
          return { message: `The image address was rejected: ${detail ?? 'it is not valid'}.` }
        return { message: `The image was rejected: ${detail ?? 'the file is not a valid image'}.` }
      }
    }
    if (error.status >= 500)
      return { message: 'The server had a problem. Nothing was changed. Try again.' }
    return { message: error.detail ?? error.title }
  }
  if (error instanceof NetworkError) {
    return { message: 'The server could not be reached. Nothing was changed. Try again.' }
  }
  return { message: 'Something went wrong. Nothing was changed.' }
}
