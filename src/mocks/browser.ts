import { setupWorker } from 'msw/browser'
import { devContentHandlers } from './devContent'
import { devHandlers } from './devData'
import { devImageHandlers } from './devImages'
import { devItemDetailHandlers } from './devItemDetail'
import { devItemHandlers } from './devItems'
import { devSearchHandlers } from './devSearch'
import { devTrashHandlers } from './devTrash'
import { handlers } from './handlers'

/** Dev-only worker, started by main.tsx when VITE_API_MOCKS=1. `devHandlers` override the spec examples. */
export const worker = setupWorker(
  ...devImageHandlers,
  ...devContentHandlers,
  ...devItemDetailHandlers,
  ...devSearchHandlers,
  ...devTrashHandlers,
  ...devItemHandlers,
  ...devHandlers,
  ...handlers,
)
