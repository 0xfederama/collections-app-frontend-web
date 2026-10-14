import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/** Dev-only worker, started by main.tsx when VITE_API_MOCKS=1. */
export const worker = setupWorker(...handlers)
