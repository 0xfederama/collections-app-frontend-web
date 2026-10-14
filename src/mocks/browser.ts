import { setupWorker } from 'msw/browser'
import { devHandlers } from './devData'
import { devItemHandlers } from './devItems'
import { handlers } from './handlers'

/** Dev-only worker, started by main.tsx when VITE_API_MOCKS=1. `devHandlers` override the spec examples. */
export const worker = setupWorker(...devItemHandlers, ...devHandlers, ...handlers)
