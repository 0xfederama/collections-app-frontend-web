import { setupWorker } from 'msw/browser'
import { devHandlers } from './devData'
import { devItemDetailHandlers } from './devItemDetail'
import { devItemHandlers } from './devItems'
import { devSearchHandlers } from './devSearch'
import { devTrashHandlers } from './devTrash'
import { handlers } from './handlers'

/** Dev-only worker, started by main.tsx when VITE_API_MOCKS=1. `devHandlers` override the spec examples. */
export const worker = setupWorker(
  ...devItemDetailHandlers,
  ...devSearchHandlers,
  ...devTrashHandlers,
  ...devItemHandlers,
  ...devHandlers,
  ...handlers,
)
