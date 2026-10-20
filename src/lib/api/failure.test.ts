import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from './errors'
import { failureKind } from './failure'

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
