import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from './errors'
import { errorMessage, failureKind, isDuplicateTitle } from './failure'

const apiError = (status: number) =>
  new ApiError({ status, code: 'unknown', title: 'T', raw: undefined })

describe('failureKind', () => {
  it.each([
    [400, 'other'],
    [401, 'other'],
    [403, 'other'],
    [404, 'not_found'],
    [409, 'conflict'],
    [412, 'precondition'],
    [413, 'too_large'],
    [422, 'validation'],
    [500, 'unavailable'],
    [503, 'unavailable'],
  ] as const)('maps HTTP %i to %s', (status, kind) => {
    expect(failureKind(apiError(status))).toBe(kind)
  })

  it('maps a network failure to unavailable', () => {
    expect(failureKind(new NetworkError())).toBe('unavailable')
  })

  it.each([
    ['a plain Error', new Error('boom')],
    ['a string', 'boom'],
    ['null', null],
  ])('maps %s to other', (_label, value) => {
    expect(failureKind(value)).toBe('other')
  })
})

describe('errorMessage', () => {
  it.each([
    {
      name: 'ApiError with detail shows the detail',
      caught: new ApiError({
        status: 422,
        code: 'validation',
        title: 'Invalid',
        detail: 'Too long',
        raw: null,
      }),
      expected: 'Too long',
    },
    {
      name: 'ApiError without detail shows the title',
      caught: new ApiError({ status: 500, code: 'unknown', title: 'Server error', raw: null }),
      expected: 'Server error',
    },
    {
      name: 'plain Error is generic',
      caught: new Error('boom'),
      expected: 'Something went wrong.',
    },
    { name: 'a string is generic', caught: 'boom', expected: 'Something went wrong.' },
    { name: 'undefined is generic', caught: undefined, expected: 'Something went wrong.' },
  ])('$name', ({ caught, expected }) => {
    expect(errorMessage(caught)).toBe(expected)
  })

  it('uses the given fallback for a non-ApiError', () => {
    expect(errorMessage(new NetworkError(), 'Nothing was saved.')).toBe('Nothing was saved.')
  })
})

describe('F-026 W7 isDuplicateTitle', () => {
  const problem = (status: number, code: string) =>
    new ApiError({ status, code, title: 'T', raw: undefined })

  it.each([
    [problem(409, 'duplicate_title'), true],
    [problem(409, 'type_mismatch'), false],
    [problem(422, 'duplicate_title'), false],
    [new NetworkError(), false],
    [new Error('duplicate_title'), false],
  ])('%#', (error, expected) => {
    expect(isDuplicateTitle(error)).toBe(expected)
  })
})
