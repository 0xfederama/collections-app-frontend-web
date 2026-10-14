import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from '../lib/api'
import { createQueryClient, shouldRetry } from './queryClient'

const apiError = (status: number) =>
  new ApiError({ status, code: 'unknown', title: `HTTP ${status}`, raw: null })

describe('shouldRetry', () => {
  it.each([400, 404, 412, 422])('never retries ApiError %s', (status) => {
    for (const count of [0, 1, 2]) expect(shouldRetry(count, apiError(status))).toBe(false)
  })

  it.each([500, 503])('retries ApiError %s once', (status) => {
    expect(shouldRetry(0, apiError(status))).toBe(true)
    expect(shouldRetry(1, apiError(status))).toBe(false)
  })

  it('retries a NetworkError once', () => {
    expect(shouldRetry(0, new NetworkError())).toBe(true)
    expect(shouldRetry(1, new NetworkError())).toBe(false)
  })

  it('does not retry unrelated errors', () => {
    expect(shouldRetry(0, new Error('boom'))).toBe(false)
  })
})

describe('createQueryClient', () => {
  it('never retries mutations and uses shouldRetry for queries', () => {
    const defaults = createQueryClient().getDefaultOptions()
    expect(defaults.mutations?.retry).toBe(false)
    expect(defaults.queries?.retry).toBe(shouldRetry)
  })
})
