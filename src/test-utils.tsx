import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from './app/router'
import { ToastProvider } from './components/ui'

// Re-exported for lib tests, which may not import mocks (F020 boundaries): the shared Node server and
// the Problem helper. test-setup.ts still starts the server for every test.
export { problemResponse } from './mocks/problems'
export { server } from './mocks/server'

/** A fresh client per render, with no retries and no cache sharing between tests. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

export function renderWithProviders(ui: ReactElement, client = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  )
}

/**
 * Loads the lazy route modules (routes, item page, Markdown renderer) ahead of the tests.
 * Without it the first `findBy*` of a file pays for the cold dynamic imports and times out (1 s)
 * when many workers compete for the CPU. Runs in a `beforeAll`, whose timeout is 10 s.
 */
export async function preloadRoutes() {
  await Promise.all([
    import('./routes/ListRoute'),
    import('./routes/SearchRoute'),
    import('./routes/SettingsRoute'),
    import('./routes/TrashRoute'),
    import('./routes/ItemRoute'),
    import('./features/items/ItemPage'),
    // The description editor's lazy chunk (a textarea stand-in in tests, see test-setup.ts): the
    // edit form's first render waits on it.
    import('./features/items/content/MarkdownEditor'),
  ])
}

/** Renders the real routes (app shell included) at a path. */
export function renderAt(path: string, client = createTestQueryClient()) {
  return renderWithProviders(<RouterProvider router={createTestRouter([path])} />, client)
}

/**
 * Makes `matchMedia` answer `(min-width: Npx)` queries for a viewport of `width` px (jsdom has no
 * `matchMedia`). Call it again to resize: listeners registered by `useBreakpoint` are notified.
 * `test-setup.ts` removes the mock after each test, so unmocked tests see jsdom's 1024 px.
 */
export function mockViewport(width: number) {
  currentWidth = width
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
  window.matchMedia = ((query: string) => {
    const min = /\(min-width:\s*(\d+)px\)/.exec(query)
    const list = {
      media: query,
      get matches() {
        return min ? currentWidth >= Number(min[1]) : false
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }
    return list as unknown as MediaQueryList
  }) as typeof window.matchMedia
  act(() => listeners.forEach((listener) => listener()))
}

export function resetViewport() {
  listeners.clear()
  currentWidth = 1024
  // @ts-expect-error: restore jsdom, which has no matchMedia
  delete window.matchMedia
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 })
}

let currentWidth = 1024
const listeners = new Set<() => void>()
