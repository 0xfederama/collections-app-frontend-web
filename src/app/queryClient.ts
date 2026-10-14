import { QueryClient } from '@tanstack/react-query'
import { ApiError, NetworkError } from '../lib/api'

// Retry only what can plausibly succeed again: a dropped connection or a 5xx, once.
// 4xx answers (including a 412 conflict) are final: the user decides what happens next (UI_SPEC §9).
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false
  return error instanceof NetworkError || (error instanceof ApiError && error.status >= 500)
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // One user and no live updates, so data only changes through this app: 30 s avoids refetch churn.
      queries: { staleTime: 30_000, retry: shouldRetry },
      // Writes are never retried automatically.
      mutations: { retry: false },
    },
  })
}
