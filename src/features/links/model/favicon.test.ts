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
  const base = `${location.origin}/api/v1/favicon?url=`

  it.each([
    ['https://www.ducati.com/', 'https://www.ducati.com'],
    ['http://example.org/path?q=1#x', 'http://example.org'],
    ['https://example.com:8443/x', 'https://example.com:8443'],
  ])('roadmap 28 %s asks the server for the origin %s', (url, origin) => {
    expect(faviconUrl(url)).toBe(`${base}${encodeURIComponent(origin)}`)
  })

  it.each(['javascript:alert(1)', 'ftp://example.com/', 'not a url', ''])(
    'roadmap 28 returns null for %j',
    (url) => {
      expect(faviconUrl(url)).toBeNull()
    },
  )
})
