import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Roadmap 30 (D-144): behind Cloudflare Access every request needs the CF_Authorization cookie.
// Browsers fetch the web app manifest without credentials unless the link says otherwise.
describe('Roadmap 30 remote access', () => {
  const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8')

  it('fetches the manifest with credentials', () => {
    const link = /<link\s+rel="manifest"[^>]*>/.exec(html)?.[0] ?? ''
    expect(link).toContain('href="/manifest.webmanifest"')
    expect(link).toContain('crossorigin="use-credentials"')
  })

  it('loads nothing else from index.html with crossorigin="anonymous" or an absolute host', () => {
    expect(html).not.toMatch(/crossorigin="anonymous"/)
    expect(html).not.toMatch(/(href|src)="https?:\/\//)
  })
})
