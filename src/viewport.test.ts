import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// F-025 W1: iOS Safari must not zoom when a form field gets focus. The fix is the
// viewport's maximum-scale (iOS still allows pinch zoom), not bigger form fonts.
describe('F-025 W1 viewport', () => {
  it('caps the focus zoom with maximum-scale=1', () => {
    const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8')
    const meta = /<meta name="viewport" content="([^"]+)"/.exec(html)?.[1] ?? ''
    expect(meta).toContain('width=device-width')
    expect(meta).toContain('maximum-scale=1')
    expect(meta).not.toContain('user-scalable=no')
  })
})
