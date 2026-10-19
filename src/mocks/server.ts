import { setupServer } from 'msw/node'
import { handlers } from './handlers'
import { typeHandlers } from './types'

/** Node server for Vitest (started in src/test-setup.ts). Override per test with `server.use(...)`. */
export const server = setupServer(...typeHandlers, ...handlers)
