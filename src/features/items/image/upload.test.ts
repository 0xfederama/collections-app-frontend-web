import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError } from '../../../lib/api'
import { putImageFile } from './upload'

class FakeXhr {
  static instances: FakeXhr[] = []
  method = ''
  url = ''
  headers: Record<string, string> = {}
  body: unknown
  responseType = ''
  status = 0
  statusText = ''
  responseText = ''
  responseHeaders: Record<string, string> = {}
  aborted = false
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onabort: (() => void) | null = null

  constructor() {
    FakeXhr.instances.push(this)
  }
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }
  getResponseHeader(name: string) {
    return this.responseHeaders[name] ?? null
  }
  send(body: unknown) {
    this.body = body
  }
  abort() {
    this.aborted = true
    this.onabort?.()
  }
  respond(status: number, body: unknown, statusText = '') {
    this.status = status
    this.statusText = statusText
    this.responseText = typeof body === 'string' ? body : JSON.stringify(body)
    this.onload?.()
  }
  progress(loaded: number, total: number, lengthComputable = true) {
    this.upload.onprogress?.({ loaded, total, lengthComputable } as ProgressEvent)
  }
}

const ITEM = 'item-1'
const file = () => new File(['abc'], 'photo.png', { type: 'image/png' })
const last = () => FakeXhr.instances[FakeXhr.instances.length - 1]!

beforeEach(() => {
  FakeXhr.instances = []
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
})
afterEach(() => vi.unstubAllGlobals())

describe('AT-06 putImageFile', () => {
  it('PUTs multipart to the image endpoint with If-Match "i-3"', () => {
    const f = file()
    void putImageFile({ itemId: ITEM, version: 3, file: f })
    const xhr = last()
    expect(xhr.method).toBe('PUT')
    expect(xhr.url).toBe(`${location.origin}/api/v1/items/${ITEM}/image`)
    expect(xhr.headers['If-Match']).toBe('"i-3"')
    expect(xhr.headers.Accept).toBe('application/json')
    expect(xhr.body).toBeInstanceOf(FormData)
    expect((xhr.body as FormData).get('file')).toBe(f)
    // No Content-Type: the browser sets the multipart boundary.
    expect(xhr.headers['Content-Type']).toBeUndefined()
  })

  it('reports progress as fractions and ignores non-computable events', () => {
    const onProgress = vi.fn()
    void putImageFile({ itemId: ITEM, version: 3, file: file(), onProgress })
    const xhr = last()
    xhr.progress(25, 100)
    xhr.progress(100, 100)
    xhr.progress(10, 0)
    xhr.progress(10, 100, false)
    expect(onProgress.mock.calls).toEqual([[0.25], [1]])
  })

  it('resolves the parsed Item on 2xx', async () => {
    const promise = putImageFile({ itemId: ITEM, version: 3, file: file() })
    last().respond(200, { id: ITEM, version: 4, image: null })
    await expect(promise).resolves.toEqual({ id: ITEM, version: 4, image: null })
  })

  it('rejects with an ApiError carrying status and code for a problem body', async () => {
    const promise = putImageFile({ itemId: ITEM, version: 3, file: file() })
    last().respond(415, {
      type: 'x',
      title: 'Unsupported',
      status: 415,
      code: 'unsupported_media_type',
    })
    const error = await promise.catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 415, code: 'unsupported_media_type' })
  })

  it('keeps 422 field errors and X-Request-Id', async () => {
    const promise = putImageFile({ itemId: ITEM, version: 3, file: file() })
    last().responseHeaders['X-Request-Id'] = 'req-1'
    last().respond(422, {
      title: 'Invalid',
      status: 422,
      code: 'validation_failed',
      errors: [{ field: 'file', message: 'is corrupt' }],
    })
    const error = (await promise.catch((e: unknown) => e)) as ApiError
    expect(error.errors).toEqual([{ field: 'file', message: 'is corrupt' }])
    expect(error.requestId).toBe('req-1')
  })

  it('a non-JSON error body becomes an ApiError with code unknown', async () => {
    const promise = putImageFile({ itemId: ITEM, version: 3, file: file() })
    last().respond(502, 'Bad Gateway', 'Bad Gateway')
    const error = await promise.catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, code: 'unknown' })
  })

  it('rejects with NetworkError on a network failure', async () => {
    const promise = putImageFile({ itemId: ITEM, version: 3, file: file() })
    last().onerror?.()
    await expect(promise).rejects.toBeInstanceOf(NetworkError)
  })

  it('rejects with NetworkError on timeout', async () => {
    const promise = putImageFile({ itemId: ITEM, version: 3, file: file() })
    last().ontimeout?.()
    await expect(promise).rejects.toBeInstanceOf(NetworkError)
  })

  it('aborting the signal aborts the request and rejects with AbortError', async () => {
    const controller = new AbortController()
    const promise = putImageFile({
      itemId: ITEM,
      version: 3,
      file: file(),
      signal: controller.signal,
    })
    controller.abort()
    expect(last().aborted).toBe(true)
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('an already-aborted signal rejects at once without sending', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      putImageFile({ itemId: ITEM, version: 3, file: file(), signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(FakeXhr.instances).toHaveLength(0)
  })
})
