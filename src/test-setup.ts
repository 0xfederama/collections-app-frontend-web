import './test-polyfills'
import { createElement } from 'react'
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'
import { resetViewport } from './test-utils'

// CodeMirror is slow to load and unreliable in jsdom, so every test sees a plain textarea instead
// (W-10). MarkdownEditor.test.tsx opts out with vi.unmock to test the real editor.
vi.mock('./features/items/content/MarkdownEditor', () => ({
  default: ({
    value,
    onChange,
    label,
  }: {
    value: string
    onChange: (value: string) => void
    label: string
  }) =>
    createElement('textarea', {
      'aria-label': label,
      value,
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    }),
}))

// Every test talks to the spec-example mocks; anything unmocked fails loudly.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetViewport()
  localStorage.clear()
})
afterAll(() => server.close())
