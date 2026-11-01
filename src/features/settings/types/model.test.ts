import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from '../../../lib/api'
import { errorText, fieldTypeWord } from './model'

const apiError = (init: Partial<ConstructorParameters<typeof ApiError>[0]> = {}) =>
  new ApiError({ status: 400, code: 'invalid', title: 'Bad request', raw: null, ...init })

describe('F020 types model', () => {
  describe('fieldTypeWord', () => {
    it.each([
      ['text', 'text'],
      ['number', 'number'],
      ['boolean', 'boolean'],
      ['stores', 'Stores'],
    ] as const)('shows %s as %s', (type, word) => {
      expect(fieldTypeWord(type)).toBe(word)
    })
  })

  describe('errorText', () => {
    it.each([
      [
        'a 412 names the conflict',
        apiError({ status: 412, code: 'version_conflict', title: 'Conflict' }),
        'This definition changed while you were editing. Reload the latest version and try again.',
      ],
      [
        'a 412 wins over field errors',
        apiError({
          status: 412,
          code: 'version_conflict',
          title: 'Conflict',
          errors: [{ field: 'label', message: 'Ignored.' }],
        }),
        'This definition changed while you were editing. Reload the latest version and try again.',
      ],
      [
        'field errors are joined',
        apiError({
          status: 422,
          code: 'validation',
          title: 'Invalid',
          errors: [
            { field: 'label', message: 'Label is required.' },
            { field: 'type', message: 'Unknown type.' },
          ],
        }),
        'Label is required. Unknown type.',
      ],
      [
        'the detail wins over the title',
        apiError({ status: 409, code: 'conflict', title: 'Conflict', detail: 'Field is in use.' }),
        'Field is in use.',
      ],
      [
        'the title is the fallback',
        apiError({ status: 500, code: 'internal', title: 'Internal error' }),
        'Internal error',
      ],
      [
        'a network failure keeps the draft',
        new NetworkError(),
        'Could not reach the server. Your changes are still here; try again.',
      ],
      [
        'anything else is generic',
        new Error('boom'),
        'Something went wrong. Your changes are still here; try again.',
      ],
    ])('%s', (_label, error, text) => {
      expect(errorText(error)).toBe(text)
    })
  })
})
