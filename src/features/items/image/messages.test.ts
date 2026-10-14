import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from '../../../lib/api'
import { describeImageError } from './messages'

function apiError(
  status: number,
  code: string,
  extra: Partial<ConstructorParameters<typeof ApiError>[0]> = {},
) {
  return new ApiError({ status, code, title: code, raw: null, ...extra })
}

describe('AT-06 describeImageError', () => {
  it('412 is a conflict', () => {
    const failure = describeImageError(apiError(412, 'version_conflict'), 'upload')
    expect(failure.stale).toBe('conflict')
    expect(failure.message).toMatch(/Someone else changed this item/)
  })

  it('404 means the item is gone', () => {
    const failure = describeImageError(apiError(404, 'not_found'), 'remove')
    expect(failure.stale).toBe('gone')
    expect(failure.message).toMatch(/deleted or moved to Trash/)
  })

  it('413 mentions the 10 MiB limit and is not stale', () => {
    expect(describeImageError(apiError(413, 'payload_too_large'), 'upload')).toEqual({
      message: 'The image is larger than 10 MiB.',
    })
  })

  it('415 says the type is wrong', () => {
    expect(describeImageError(apiError(415, 'unsupported_media_type'), 'upload')).toEqual({
      message: 'The file is not a JPEG, PNG or WebP image.',
    })
  })

  it('422 on a file includes the server message for `file`', () => {
    const error = apiError(422, 'validation_failed', {
      errors: [{ field: 'file', message: 'is corrupt' }],
    })
    expect(describeImageError(error, 'upload').message).toBe('The image was rejected: is corrupt.')
  })

  it('422 on a URL includes the server message for `url`', () => {
    const error = apiError(422, 'validation_failed', {
      errors: [{ field: 'url', message: 'host is not allowed' }],
    })
    expect(describeImageError(error, 'url').message).toBe(
      'The image address was rejected: host is not allowed.',
    )
  })

  it('422 without field errors falls back to a generic reason', () => {
    expect(describeImageError(apiError(422, 'validation_failed'), 'url').message).toBe(
      'The image address was rejected: it is not valid.',
    )
    expect(describeImageError(apiError(422, 'validation_failed'), 'upload').message).toBe(
      'The image was rejected: the file is not a valid image.',
    )
  })

  it('5xx says nothing was changed', () => {
    for (const status of [500, 502, 503]) {
      const failure = describeImageError(apiError(status, 'internal'), 'upload')
      expect(failure.message).toBe('The server had a problem. Nothing was changed. Try again.')
      expect(failure.stale).toBeUndefined()
    }
  })

  it('other 4xx use the problem detail, then the title', () => {
    expect(describeImageError(apiError(400, 'bad', { detail: 'Bad thing' }), 'url').message).toBe(
      'Bad thing',
    )
    expect(describeImageError(apiError(400, 'bad'), 'url').message).toBe('bad')
  })

  it('a NetworkError says the server could not be reached', () => {
    expect(describeImageError(new NetworkError(), 'upload')).toEqual({
      message: 'The server could not be reached. Nothing was changed. Try again.',
    })
  })

  it('anything else is a generic message', () => {
    expect(describeImageError(new Error('boom'), 'upload')).toEqual({
      message: 'Something went wrong. Nothing was changed.',
    })
    expect(describeImageError(undefined, 'remove').message).toMatch(/Something went wrong/)
  })
})
