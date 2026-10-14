import './test-polyfills'
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'
import { resetViewport } from './test-utils'

// Every test talks to the spec-example mocks; anything unmocked fails loudly.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetViewport()
  localStorage.clear()
})
afterAll(() => server.close())
