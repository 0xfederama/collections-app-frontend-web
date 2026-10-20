import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { api } from './client'
import { etag, ifMatch } from './etag'

describe('etag', () => {
  it('builds quoted per-resource ETags from the version', () => {
    expect(etag('folder', 1)).toBe('"f-1"')
    expect(etag('list', 2)).toBe('"l-2"')
    expect(etag('item', 3)).toBe('"i-3"')
    expect(etag('content', 0)).toBe('"c-0"')
    expect(etag('settings', 4)).toBe('"s-4"')
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid version %s', (v) => {
    expect(() => etag('item', v)).toThrow(RangeError)
  })

  it('ifMatch returns the If-Match header', () => {
    expect(ifMatch('item', 3)).toEqual({ 'If-Match': '"i-3"' })
  })

  it('sends If-Match on a PATCH through the api client', async () => {
    const id = '0b9f2b6e-6c1c-4d58-9a55-3f1d3a0e2a11'
    let seen: string | null = null
    server.use(
      http.patch(`${location.origin}/api/v1/items/:id`, ({ request }) => {
        seen = request.headers.get('If-Match')
        return HttpResponse.json({}, { status: 200 })
      }),
    )
    await api.PATCH('/api/v1/items/{id}', {
      params: { path: { id }, header: ifMatch('item', 3) },
      body: {},
    })
    expect(seen).toBe('"i-3"')
  })
})
