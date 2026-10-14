import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw/http'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../app/router'
import { ToastProvider } from '../../components/ui'
import { devTree } from '../../mocks/devData'
import { createTreeBackend } from '../../mocks/devTree'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import type { TreeData } from './api'

/** Shared setup for the W-05 tree write tests (not a test file itself). */

const origin = () => globalThis.location.origin
export const apiUrl = (path: string) => `${origin()}${path}`

/** Ids of `devTree` (see `src/mocks/devData.ts`). */
export const id = (n: number) => `7c1e5a10-0000-4000-8000-${String(n).padStart(12, '0')}`
export const ID = {
  media: id(1),
  movies: id(2),
  festival: id(3),
  tv: id(4),
  vehicles: id(5),
  gear: id(6),
  empty: id(7),
  watchlist: id(11),
  seen: id(12),
  cannes: id(13),
  motorbikes: id(15),
  cars: id(16),
  wishlist: id(18),
  ideas: id(19),
} as const

/** `devTree` with a few versions above 1, so `If-Match` assertions prove the version is used. */
export function seedTree(): TreeData {
  const tree = structuredClone(devTree)
  const bump = (list: { id: string; version: number }[], target: string, version: number) => {
    list.find((x) => x.id === target)!.version = version
  }
  bump(tree.folders, ID.media, 3)
  bump(tree.folders, ID.vehicles, 4)
  bump(tree.lists, ID.watchlist, 2)
  bump(tree.lists, ID.wishlist, 5)
  return tree
}

export interface RecordedRequest {
  method: string
  path: string
  ifMatch: string | null
  body: unknown
}

/**
 * Installs the stateful tree backend plus a recorder in front of it. The recorder reads a clone
 * of each `/api/v1/*` write and falls through, so the backend still answers.
 */
export function installTreeBackend(tree: TreeData = seedTree()) {
  const backend = createTreeBackend(tree)
  const requests: RecordedRequest[] = []
  const recorder = http.all(apiUrl('/api/v1/*'), async ({ request }) => {
    if (request.method === 'GET') return undefined
    const text = await request.clone().text()
    requests.push({
      method: request.method,
      path: new URL(request.url).pathname,
      ifMatch: request.headers.get('If-Match'),
      body: text ? JSON.parse(text) : undefined,
    })
    return undefined
  })
  server.use(recorder, ...backend.handlers)
  return {
    ...backend,
    requests,
    /** Writes recorded so far, optionally narrowed to a method and path. */
    writes: (method?: string, path?: string) =>
      requests.filter((r) => (!method || r.method === method) && (!path || r.path === path)),
  }
}

/** Opens every folder in the sidebar (persisted state the tree reads on mount). */
export function expandAll(tree: TreeData) {
  localStorage.setItem('collection:tree-expanded', JSON.stringify(tree.folders.map((f) => f.id)))
}

/** Renders the real app at `path`; hands back the router so tests can read the location. */
export function renderRouter(path: string) {
  const router = createTestRouter([path])
  const utils = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { router, ...utils }
}

export const sidebar = () => screen.getByRole('navigation', { name: 'Collections' })

/** Waits for the tree to load, then resolves the user and router for the test. */
export async function openTree(path = '/', tree?: TreeData) {
  const backend = installTreeBackend(tree)
  expandAll(tree ?? backend.state)
  const user = userEvent.setup()
  const view = renderRouter(path)
  await within(sidebar()).findByRole('tree')
  return { user, backend, ...view }
}

/** Opens the "More actions for <name>" menu of a row and picks an entry. */
export async function pickRowAction(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  entry: string | RegExp,
) {
  await user.click(
    await within(sidebar()).findByRole('button', { name: `More actions for ${name}` }),
  )
  await user.click(await screen.findByRole('menuitem', { name: entry }))
}

/** Opens the header "+" menu and picks an entry. */
export async function pickHeaderAction(user: ReturnType<typeof userEvent.setup>, entry: string) {
  await user.click(within(sidebar()).getByRole('button', { name: 'New folder or list' }))
  await user.click(await screen.findByRole('menuitem', { name: entry }))
}

/** Names of the treeitems in display order (the leading text of each row). */
export function rowNames() {
  return within(sidebar())
    .getAllByRole('treeitem')
    .map((el) => el.querySelector('span.truncate')?.textContent ?? '')
}
