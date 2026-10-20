import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { exampleResponses } from '../../generated/examples'
import { problemResponse, server } from '../../test-utils'
import { api, unwrap } from './client'
import { ApiError, NetworkError } from './errors'

const ID = '0b9f2b6e-6c1c-4d58-9a55-3f1d3a0e2a11'
const url = `${location.origin}/api/v1/items/:id`
const getItem = (init?: { signal?: AbortSignal }) =>
  api.GET('/api/v1/items/{id}', { params: { path: { id: ID } }, ...init })

async function caught(promise: Promise<unknown>) {
  try {
    await promise
  } catch (e) {
    return e
  }
  throw new Error('expected rejection')
}

describe('api client errors', () => {
  it.each([
    [400, 'malformed_request'],
    [404, 'not_found'],
    [409, 'destination_unavailable'],
    [428, 'precondition_required'],
  ])('throws ApiError for %s %s', async (status, code) => {
    server.use(http.get(url, () => problemResponse(status, code, { detail: 'why' })))
    const err = await caught(getItem())
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status, code, title: code, detail: 'why' })
  })

  it('exposes current_version on 412', async () => {
    server.use(
      http.get(url, () => problemResponse(412, 'version_conflict', { current_version: 8 })),
    )
    const err = (await caught(getItem())) as ApiError
    expect(err).toMatchObject({ status: 412, code: 'version_conflict', currentVersion: 8 })
  })

  it('exposes field errors on 422', async () => {
    const errors = [{ field: 'name', message: 'must not be empty' }]
    server.use(http.get(url, () => problemResponse(422, 'validation_failed', { errors })))
    const err = (await caught(getItem())) as ApiError
    expect(err).toMatchObject({ status: 422, code: 'validation_failed' })
    expect(err.errors).toEqual(errors)
  })

  it('reads requestId from the X-Request-Id header', async () => {
    server.use(
      http.get(url, () =>
        problemResponse(
          404,
          'not_found',
          { request_id: 'from-body' },
          { 'X-Request-Id': 'req-123' },
        ),
      ),
    )
    expect(((await caught(getItem())) as ApiError).requestId).toBe('req-123')
  })

  it('falls back to the problem request_id without the header', async () => {
    server.use(http.get(url, () => problemResponse(500, 'internal', { request_id: 'from-body' })))
    const err = (await caught(getItem())) as ApiError
    expect(err).toMatchObject({ status: 500, code: 'internal', requestId: 'from-body' })
  })

  it('keeps the parsed problem in raw', async () => {
    server.use(http.get(url, () => problemResponse(404, 'not_found', { detail: 'gone' })))
    const err = (await caught(getItem())) as ApiError
    expect(err.raw).toMatchObject({ status: 404, code: 'not_found', detail: 'gone' })
  })

  it('turns a plain-text error into code unknown and keeps the status', async () => {
    server.use(http.get(url, () => new HttpResponse('upstream down', { status: 502 })))
    const err = (await caught(getItem())) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 502, code: 'unknown', raw: 'upstream down' })
  })

  it('turns an HTML error into code unknown', async () => {
    const html = '<html><body>Bad Gateway</body></html>'
    server.use(
      http.get(
        url,
        () => new HttpResponse(html, { status: 502, headers: { 'Content-Type': 'text/html' } }),
      ),
    )
    const err = (await caught(getItem())) as ApiError
    expect(err).toMatchObject({ status: 502, code: 'unknown', raw: html })
  })
})

describe('api client transport', () => {
  it('returns data on success', async () => {
    const { data } = await api.GET('/api/v1/settings')
    expect(data).toEqual(exampleResponses.getSettings.body)
  })

  it('rejects with NetworkError, keeping the cause, on a network failure', async () => {
    server.use(http.get(url, () => HttpResponse.error()))
    const err = await caught(getItem())
    expect(err).toBeInstanceOf(NetworkError)
    expect(err).not.toBeInstanceOf(ApiError)
    expect((err as NetworkError).cause).toBeDefined()
  })

  it('rejects with the original AbortError when aborted before sending', async () => {
    const controller = new AbortController()
    controller.abort()
    const err = await caught(getItem({ signal: controller.signal }))
    expect(err).not.toBeInstanceOf(NetworkError)
    expect((err as Error).name).toBe('AbortError')
  })

  it('rejects with the original AbortError when aborted while pending', async () => {
    server.use(
      http.get(url, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return HttpResponse.json({})
      }),
    )
    const controller = new AbortController()
    const pending = caught(getItem({ signal: controller.signal }))
    setTimeout(() => controller.abort(), 10)
    const err = await pending
    expect(err).not.toBeInstanceOf(NetworkError)
    expect((err as Error).name).toBe('AbortError')
  })

  it('resolves a 204 without throwing', async () => {
    const res = await api.PUT('/api/v1/folders/order', {
      body: { parent_folder_id: null, ids: [] },
    })
    expect(res.response.status).toBe(204)
    expect(res.data).toBeUndefined()
  })
})

describe('unwrap', () => {
  it('returns the data of a successful call', async () => {
    const data = await unwrap(api.GET('/api/v1/settings'))
    expect(data).toEqual(exampleResponses.getSettings.body)
  })

  it('throws on an empty 2xx body', async () => {
    await expect(
      unwrap(api.PUT('/api/v1/folders/order', { body: { parent_folder_id: null, ids: [] } })),
    ).rejects.toThrow('empty response')
  })

  it('propagates ApiError', async () => {
    server.use(http.get(url, () => problemResponse(404, 'not_found')))
    await expect(unwrap(getItem())).rejects.toBeInstanceOf(ApiError)
  })
})
