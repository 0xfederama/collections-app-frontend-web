import { describe, expect, it } from 'vitest'
import { ApiError, toApiError } from './errors'

describe('toApiError', () => {
  it('maps a problem document', () => {
    const body = { code: 'version_conflict', title: 'Conflict', current_version: 8 }
    const err = toApiError(
      new Response(null, { status: 412, headers: { 'X-Request-Id': 'r1' } }),
      body,
    )
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({
      status: 412,
      code: 'version_conflict',
      currentVersion: 8,
      requestId: 'r1',
    })
    expect(err.raw).toBe(body)
  })

  it('falls back to unknown for non-problem bodies', () => {
    const err = toApiError(new Response(null, { status: 502 }), 'Bad Gateway')
    expect(err).toMatchObject({
      status: 502,
      code: 'unknown',
      detail: 'Bad Gateway',
      raw: 'Bad Gateway',
    })
    expect(err.requestId).toBeUndefined()
  })

  it('ignores a JSON array body', () => {
    expect(toApiError(new Response(null, { status: 500 }), [1]).code).toBe('unknown')
  })

  it('uses detail as message, else title', () => {
    const res = new Response(null, { status: 400 })
    expect(toApiError(res, { code: 'malformed_request', title: 'T', detail: 'D' }).message).toBe(
      'D',
    )
    expect(toApiError(res, { code: 'malformed_request', title: 'T' }).message).toBe('T')
  })
})
