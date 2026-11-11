import { http, HttpResponse } from 'msw/http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { api } from './client'
import { AUTH_RELOAD_COOLDOWN_MS, reloadForLogin } from './authReload'

describe('F-027 W1 401 reloads for login', () => {
  const reload = vi.fn()
  beforeEach(() => {
    sessionStorage.clear()
    reload.mockClear()
    vi.stubGlobal('location', { ...window.location, origin: window.location.origin, reload })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  const me = () => api.GET('/api/v1/me').catch(() => undefined)
  const unauthenticated = () =>
    server.use(
      http.get(`${location.origin}/api/v1/me`, () => problemResponse(401, 'unauthenticated')),
    )

  it('reloads once on a 401', async () => {
    unauthenticated()
    await me()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload again within 30 s', async () => {
    unauthenticated()
    await me()
    await me()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads again after 30 s (injected clock)', () => {
    expect(reloadForLogin(1_000)).toBe(true)
    expect(reloadForLogin(1_000 + AUTH_RELOAD_COOLDOWN_MS - 1)).toBe(false)
    expect(reloadForLogin(1_000 + AUTH_RELOAD_COOLDOWN_MS)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it.each([403, 404, 500])('never reloads on %i', async (status) => {
    server.use(http.get(`${location.origin}/api/v1/me`, () => problemResponse(status, 'not_found')))
    await me()
    expect(reload).not.toHaveBeenCalled()
  })

  it('a 401 from /readyz is unaffected (not under /api/v1)', async () => {
    server.use(http.get(`${location.origin}/readyz`, () => new HttpResponse('x', { status: 401 })))
    await api.GET('/readyz', { parseAs: 'text' }).catch(() => undefined)
    expect(reload).not.toHaveBeenCalled()
  })
})
