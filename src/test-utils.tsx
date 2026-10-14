import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from './app/router'

/** A fresh client per render, with no retries and no cache sharing between tests. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

export function renderWithProviders(ui: ReactElement, client = createTestQueryClient()) {
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

/** Renders the real routes (app shell included) at a path. */
export function renderAt(path: string, client = createTestQueryClient()) {
  return renderWithProviders(<RouterProvider router={createTestRouter([path])} />, client)
}
