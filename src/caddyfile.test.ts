import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// D-150: the home network is always the owner. The web image never redirects by Host, and the backend decides
// LAN vs tunnel from the Cloudflare headers, so the proxy must pass them through untouched.
// The live check against the built image is scripts/proxy-headers-check.mjs (run by docker:build).
describe('D-150 LAN served as the owner', () => {
  const caddyfile = readFileSync(resolve(__dirname, '../Caddyfile'), 'utf8')
  const code = caddyfile
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n')

  it('has no LAN redirect and reads no PUBLIC_URL / LAN_OWNER_FALLBACK', () => {
    expect(code).not.toMatch(/\bredir\b/)
    expect(code).not.toMatch(/PUBLIC_URL|LAN_OWNER_FALLBACK/)
    expect(code).not.toMatch(/http\.request\.host/)
  })

  it('never rewrites or strips the Cloudflare headers', () => {
    expect(code).not.toMatch(/cf-(ray|connecting-ip|access-jwt-assertion)/i)
    expect(code).not.toMatch(/\bheader_up\b|\brequest_header\b/)
  })

  it('proxies /api and /readyz to the API upstream', () => {
    expect(code).toMatch(/@api path \/api \/api\/\* \/readyz/)
    expect(code).toMatch(/reverse_proxy \{\$API_UPSTREAM:api:8080\}/)
  })
})
