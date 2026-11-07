import { describe, expect, it } from 'vitest'
import { faviconUrl, siteHost } from './favicon'

describe('roadmap 28 siteHost', () => {
  it.each([
    ['https://www.ducati.com/', 'www.ducati.com'],
    ['http://example.org/path?q=1', 'example.org'],
    ['https://www.instagram.com/some.account/', 'www.instagram.com'],
    ['https://example.com:8443/x', 'example.com:8443'],
  ])('roadmap 28 %s shows host %s', (url, host) => {
    expect(siteHost(url)).toBe(host)
  })

  it.each(['javascript:alert(1)', 'ftp://example.com/', 'not a url', ''])(
    'roadmap 28 rejects %j',
    (url) => {
      expect(siteHost(url)).toBeNull()
    },
  )
})

describe('roadmap 28 faviconUrl', () => {
  // TODO(roadmap 28): the endpoint is not ready, so every site gets no favicon yet.
  it.each(['https://www.ducati.com/', 'http://example.org/', 'https://www.instagram.com/x/'])(
    'roadmap 28 returns null for %s until the backend endpoint exists',
    (url) => {
      expect(faviconUrl(url)).toBeNull()
    },
  )
})
