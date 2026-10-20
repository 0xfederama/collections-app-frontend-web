import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw/http'
import { devTree } from '../../mocks/devData'
import { createTrashBackend, devTrash } from '../../mocks/devTrash'
import { server } from '../../mocks/server'
import { createTestQueryClient, renderAt } from '../../test-utils'
import { installTreeBackend } from '../tree/testing'
import type { TrashEntry } from './api'

/** Shared setup for the W-12 trash tests (not a test file itself). */

const origin = () => globalThis.location.origin

/** Ids of the `devTrash` entries (see `src/mocks/devTrash.ts`). */
const trashId = (n: number) => `7c1e5a10-0000-4000-8000-${String(n + 4000).padStart(12, '0')}`
export const T = {
  crime: trashId(101), // list "Crime", restorable
  heat: trashId(102), // item "Heat", blocked by Crime (its entry is present)
  oldMedia: trashId(103), // folder, restorable
  tenet: trashId(104), // item "Tenet", blocked, parent not among entries
  cameras: trashId(105), // list, restorable
} as const

export interface Recorded {
  method: string
  path: string
  search: URLSearchParams
  body: unknown
}

export function entry(n: number, overrides: Partial<TrashEntry> = {}): TrashEntry {
  return {
    id: trashId(900 + n),
    root_type: 'list',
    root_id: trashId(800 + n),
    root_name: `Entry ${n}`,
    former_path: [],
    // Newer for smaller n, so the default order is by n.
    deleted_at: new Date(Date.UTC(2026, 9, 14, 12, 0) - n * 60_000).toISOString(),
    counts: { folders: 0, lists: 1, items: 0 },
    restorable_in_place: true,
    ...overrides,
  }
}

/** Installs the trash fake (and the dev tree for the picker) with a recorder in front of them. */
export function installTrash(entries: readonly TrashEntry[] = devTrash) {
  const backend = createTrashBackend(entries)
  installTreeBackend(structuredClone(devTree))
  const requests: Recorded[] = []
  const recorder = http.all(`${origin()}/api/v1/trash*`, async ({ request }) => {
    const text = await request.clone().text()
    const url = new URL(request.url)
    requests.push({
      method: request.method,
      path: url.pathname,
      search: url.searchParams,
      body: text ? JSON.parse(text) : undefined,
    })
    return undefined
  })
  // Later `server.use` calls take precedence, so put the recorder and the fake together up front.
  server.use(recorder, ...backend.handlers)
  return {
    ...backend,
    requests,
    /** The `index`th recorded call of a method (throws when there is none). */
    call: (method: string, index = 0): Recorded => {
      const found = requests.filter((r) => r.method === method)[index]
      if (!found) throw new Error(`No ${method} call #${index}`)
      return found
    },
    calls: (method: string, path?: string | RegExp) =>
      requests.filter(
        (r) =>
          r.method === method &&
          (path === undefined || (typeof path === 'string' ? r.path === path : path.test(r.path))),
      ),
  }
}

/** Opens `/trash` in the real app and waits for the page heading. */
export async function openTrash(entries: readonly TrashEntry[] = devTrash) {
  const trash = installTrash(entries)
  const user = userEvent.setup()
  const client = createTestQueryClient()
  const view = renderAt('/trash', client)
  await screen.findByRole('heading', { level: 1, name: 'Trash' })
  return { user, client, trash, ...view }
}

/** The `<li>` of the entry called `name` (waits for it to appear). */
export async function rowOf(name: string) {
  const main = within(await screen.findByRole('main'))
  return waitFor(() => {
    const item = main
      .getAllByRole('listitem')
      .find((li) => li.querySelector('span.truncate')?.textContent === name)
    if (!item) throw new Error(`No Trash row for ${name}`)
    return within(item)
  })
}

export const waitForRows = async () =>
  within(await screen.findByRole('main')).findAllByRole('listitem')

/**
 * Accessible name of a row button: the visible label plus the hidden “name” suffix. jsdom drops
 * the space before the visually hidden suffix, a real browser keeps it, hence `\s*`.
 */
export const buttonName = (label: string, name: string) =>
  new RegExp(`^${label.replace(/[.*+?^${'$'}{}()|[\\]\\\\]/g, '\\$&')}\\s*“${name}”${'$'}`)
