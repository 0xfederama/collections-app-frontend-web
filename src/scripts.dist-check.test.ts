import { describe, expect, it } from 'vitest'
// @ts-expect-error -- plain ESM script without types, the only export is isForbiddenName
import { isForbiddenName } from '../scripts/dist-check-lib.mjs'

describe('dist-check dev-only file names', () => {
  it('flags the MSW worker and the dev gallery, with or without a Vite hash', () => {
    expect(isForbiddenName('mockServiceWorker.js')).toBe(true)
    expect(isForbiddenName('DevUiRoute-ab12cd34.js')).toBe(true)
    expect(isForbiddenName('msw.js')).toBe(true)
  })

  it('does not flag a hash that happens to contain "msw" or "DevUi"', () => {
    expect(isForbiddenName('Foo-AbMswZ9q.js')).toBe(false)
    expect(isForbiddenName('items-BqjJwan8.js')).toBe(false)
  })
})
