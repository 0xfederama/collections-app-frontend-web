import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from './errors'
import {
  errorMessage,
  failureKind,
  isUnauthenticated,
  fieldErrorText,
  isDuplicateTitle,
  validationMessage,
} from './failure'

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

describe('validationMessage', () => {
  const problem = (init: { detail?: string; errors?: { field: string; message: string }[] }) =>
    new ApiError({
      status: 422,
      code: 'validation_failed',
      title: 'Validation failed',
      raw: undefined,
      ...init,
    })

  it.each([
    [
      'one field error',
      { errors: [{ field: 'body.metadata.director', message: 'is too long' }] },
      'Director: is too long',
    ],
    [
      'snake_case and index',
      { errors: [{ field: 'metadata.power_hp[0]', message: 'must be a number' }] },
      'Power hp: must be a number',
    ],
    ['no field name', { errors: [{ field: '', message: 'Bad request.' }] }, 'Bad request.'],
    [
      'several errors',
      {
        errors: [
          { field: 'title', message: 'is required' },
          { field: 'metadata.pages', message: 'must be positive' },
        ],
      },
      'Title: is required Pages: must be positive',
    ],
    ['detail only', { detail: 'director is too long' }, 'director is too long'],
    [
      'errors beat detail',
      { detail: 'x', errors: [{ field: 'title', message: 'is required' }] },
      'Title: is required',
    ],
    ['nothing else', {}, 'Validation failed'],
  ])('%s', (_name, init, expected) => {
    expect(validationMessage(problem(init))).toBe(expected)
  })

  it('errorMessage uses it for a 422 only', () => {
    expect(errorMessage(problem({ errors: [{ field: 'title', message: 'is required' }] }))).toBe(
      'Title: is required',
    )
    expect(
      errorMessage(
        new ApiError({ status: 400, code: 'x', title: 'Bad', detail: 'd', raw: undefined }),
      ),
    ).toBe('d')
  })

  it('fieldErrorText', () => {
    expect(fieldErrorText({ field: 'metadata.director', message: 'is too long' })).toBe(
      'Director: is too long',
    )
  })
})

describe('F-027 W1 unauthenticated', () => {
  it('isUnauthenticated is true for a 401 only', () => {
    expect(isUnauthenticated(apiError(401))).toBe(true)
    expect(isUnauthenticated(apiError(403))).toBe(false)
    expect(isUnauthenticated(new NetworkError())).toBe(false)
  })

  it('errorMessage tells the user to reload and sign in on a 401', () => {
    expect(errorMessage(apiError(401))).toBe('You’re signed out. Reload the page to sign in.')
  })
})
