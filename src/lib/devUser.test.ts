import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { devUserCookie, switchDevUser } from './devUser'

const clearCookie = () => {
  document.cookie = 'dev_user=; Path=/; Max-Age=0'
}

describe('F-027 W7 dev user cookie', () => {
  beforeEach(clearCookie)
  afterEach(() => {
    vi.unstubAllGlobals()
    clearCookie()
  })

  it('encodes the e-mail and sets the path, SameSite and a 30 day max age', () => {
    expect(devUserCookie('alice@dev.test')).toBe(
      'dev_user=alice%40dev.test; Path=/; SameSite=Lax; Max-Age=2592000',
    )
  })

  it('writes the cookie and reloads the page', () => {
    const reload = vi.fn()
    switchDevUser('bob@dev.test', reload)
    expect(document.cookie).toContain('dev_user=bob%40dev.test')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads through location.reload by default', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, origin: window.location.origin, reload })
    switchDevUser('alice@dev.test')
    expect(document.cookie).toContain('dev_user=alice%40dev.test')
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
