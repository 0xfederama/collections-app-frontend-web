import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'
import { resetViewport } from './test-utils'

// jsdom lacks these browser APIs; Radix Select/Menu/Popover need them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

// Every test talks to the spec-example mocks; anything unmocked fails loudly.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetViewport()
  localStorage.clear()
})
afterAll(() => server.close())
