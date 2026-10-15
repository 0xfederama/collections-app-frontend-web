import './test-polyfills'
import { createElement } from 'react'
import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { server } from './mocks/server'
import { preloadRoutes, resetViewport } from './test-utils'

// The first render of a file is cold (route code, Radix, JIT): ~0.8 s alone, several times that
// with all workers busy. The 1 s default made `findBy*` flaky on loaded machines; passing queries
// return as soon as they match, so a larger ceiling only slows failures.
configure({ asyncUtilTimeout: 4000 })

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
beforeAll(async () => {
  server.listen({ onUnhandledFrame: 'error' })
  await preloadRoutes()
})
afterEach(() => {
  server.resetHandlers()
  resetViewport()
  localStorage.clear()
})
afterAll(() => server.close())
