import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

/** A short alphanumeric token, unique per call, safe in URLs and in search queries. */
export const uniqueId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** A readable unique name, e.g. `Movies k3j2x9ab`. */
export const uniqueName = (label: string) => `${label} ${uniqueId()}`

/** The five built-in types (F018) plus "No type" (null). */
export type ItemType = 'book' | 'movie' | 'tv_show' | 'vehicle' | 'wishlist' | null

interface Created {
  id: string
  version: number
}

async function post(request: APIRequestContext, url: string, data: object): Promise<Created> {
  const response = await request.post(url, { data })
  expect(response.status(), `POST ${url}`).toBe(201)
  return (await response.json()) as Created
}

// Seeding through the real API keeps a spec short when creating the data is not what it tests.
export const createFolder = (
  request: APIRequestContext,
  name: string,
  parentId: string | null = null,
) => post(request, '/api/v1/folders', { name, parent_folder_id: parentId })

export const createList = (
  request: APIRequestContext,
  name: string,
  type: ItemType = 'movie',
  folderId: string | null = null,
) => post(request, '/api/v1/lists', { name, type, folder_id: folderId })

export const createItem = (
  request: APIRequestContext,
  listId: string,
  title: string,
  extra: { website?: string; metadata?: object; lookup?: boolean; tmdb_id?: number } = {},
) => post(request, `/api/v1/lists/${listId}/items`, { lookup: false, title, ...extra })

/** Moves a folder (and everything in it) to Trash. */
export async function trashFolder(request: APIRequestContext, folder: Created) {
  const response = await request.delete(`/api/v1/folders/${folder.id}`, {
    headers: { 'If-Match': `"f-${folder.version}"` },
  })
  expect(response.status(), 'DELETE folder').toBe(204)
}

export const itemUrl = (listId: string, itemId: string) => `/lists/${listId}/items/${itemId}`

/** The sidebar tree. */
export const sidebarTree = (page: Page) => page.getByRole('tree', { name: 'Folders and lists' })

/** The item panel / page (the shell renders it in `aside` at >= 1280). */
export const itemPanel = (page: Page) => page.getByRole('complementary', { name: 'Item details' })

/** Dialog "New folder" or "New list" from the sidebar "＋ New" menu (Folder / List). */
export async function createViaSidebar(
  page: Page,
  what: 'folder' | 'list',
  name: string,
  type?: string,
  /** Create list only: the folder to put it in, by its exact name in the dialog's picker. */
  folder?: string,
) {
  // The sidebar "New" row only exists once something does (F008-W2); an empty workspace starts
  // from the buttons in the middle of Home.
  const sidebarNew = page.getByRole('button', { name: 'New', exact: true })
  const startButton = page
    .getByRole('main')
    .getByRole('button', { name: what === 'folder' ? 'New folder' : 'New list', exact: true })
  await expect(sidebarNew.or(startButton).first()).toBeVisible()
  if (await sidebarNew.isVisible()) {
    await sidebarNew.click()
    await page
      .getByRole('menuitem', { name: what === 'folder' ? 'Folder' : 'List', exact: true })
      .click()
  } else {
    await startButton.click()
  }
  const dialog = page.getByRole('dialog', { name: what === 'folder' ? 'New folder' : 'New list' })
  await dialog.getByRole('textbox', { name: 'Name' }).fill(name)
  if (folder) {
    await dialog.getByRole('combobox', { name: 'Folder' }).click()
    await page.getByRole('option', { name: folder, exact: true }).click()
  }
  if (type) {
    await dialog.getByRole('combobox', { name: 'Type' }).click()
    await page.getByRole('option', { name: type, exact: true }).click()
  }
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(dialog).toBeHidden()
}

/** Center of an element, after scrolling it into view. */
async function center(locator: Locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (!box) throw new Error('element has no box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** dnd-kit needs real pointer moves: press, a small nudge to start the drag, then a stepped move. */
export async function drag(page: Page, handle: Locator, target: Locator) {
  const from = await center(handle)
  const to = await center(target)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x, from.y + (to.y < from.y ? -8 : 8), { steps: 4 })
  await page.mouse.move(to.x, to.y, { steps: 20 })
  await page.mouse.up()
}

/** Where on a row a drag is dropped (web 3.3.0): the top part, the middle band of a folder, the bottom part. */
export type DropPart = 'above' | 'into' | 'below'
const PART_Y = { above: 0.1, into: 0.5, below: 0.9 } as const

/** The point of `part` of `target`, after scrolling it into view. */
async function pointOf(target: Locator, part: DropPart) {
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  if (!box) throw new Error('target has no box')
  return { x: box.x + box.width / 2, y: box.y + box.height * PART_Y[part] }
}

/** The empty space below the last row of the sidebar tree: dropping there means the end of the top level. */
async function treeEndPoint(page: Page) {
  const area = await sidebarTree(page).locator('xpath=..').boundingBox()
  if (!area) throw new Error('the tree area has no box')
  return { x: area.x + area.width / 2, y: area.y + area.height - 6 }
}

async function mouseDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  release = true,
) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x, from.y + (to.y < from.y ? -8 : 8), { steps: 4 })
  await page.mouse.move(to.x, to.y, { steps: 20 })
  if (release) await page.mouse.up()
}

/**
 * Like `drag`, but drops at a part of the target row: `above` (top) lands before it, `below`
 * (bottom) after it (the first child of an open folder), `into` (middle) is a folder's "drop into".
 */
export async function dragTo(page: Page, handle: Locator, target: Locator, where: DropPart) {
  await mouseDrag(page, ...(await endpoints(handle, () => pointOf(target, where))))
}

/**
 * Both ends of a drag, read after every scroll: scrolling the target into view can move the handle,
 * so a handle position read first goes stale once the tree is taller than the window (the old flake).
 */
async function endpoints(
  handle: Locator,
  target: () => Promise<{ x: number; y: number }>,
): Promise<[{ x: number; y: number }, { x: number; y: number }]> {
  await handle.scrollIntoViewIfNeeded()
  const to = await target()
  const box = await handle.boundingBox()
  if (!box) throw new Error('handle has no box')
  const vh = handle.page().viewportSize()?.height ?? Infinity
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  if (from.y < 0 || from.y > vh) throw new Error('handle and target do not fit in one viewport')
  return [from, to]
}

/** Drags `handle` below the last row of the tree. */
export async function dragToEnd(page: Page, handle: Locator) {
  await mouseDrag(page, ...(await endpoints(handle, () => treeEndPoint(page))))
}

/** Drags to a part of `target` and stops there with the button still down; the caller releases. */
export async function dragHold(page: Page, handle: Locator, target: Locator, where: DropPart) {
  const [from, to] = await endpoints(handle, () => pointOf(target, where))
  await mouseDrag(page, from, to, false)
}

/**
 * A press-and-hold touch drag (dnd-kit starts it after 250 ms) with real touch input through the
 * Chrome DevTools Protocol, so the app sees pointerType "touch". Chromium only: WebKit has no CDP.
 */
export async function touchDragTo(page: Page, handle: Locator, target: Locator, where: DropPart) {
  const from = await center(handle)
  const to = await pointOf(target, where)
  const cdp = await page.context().newCDPSession(page)
  const touch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    points: { x: number; y: number }[],
  ) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map((p) => ({ ...p, id: 1 })),
    })
  await touch('touchStart', [from])
  // The hold: nothing moves, so the page does not scroll and the drag activates. Wait for the drag's
  // own announcement, not a fixed time: under load 400 ms was sometimes not enough (D-161).
  await expect(page.getByText(/^Picked up /)).toBeAttached()
  const steps = 20
  for (let i = 1; i <= steps; i++)
    await touch('touchMove', [
      { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps },
    ])
  await touch('touchEnd', [])
  await cdp.detach()
}

interface TreeNode {
  id: string
  version: number
  created_at: string
  parent_folder_id?: string | null
  folder_id?: string | null
}

/**
 * Trashes every top-level folder and list created since `since` (best effort: a folder someone else
 * owns stays). The drag specs call it after each test so the shared tree stays shorter than the
 * window: once it is taller, a drag starts or ends off screen and the sidebar scrolls under the
 * pointer, which was the flaky drag-reorder e2e (web 3.5.0, D-161).
 */
export async function trashCreatedSince(request: APIRequestContext, since: number) {
  const tree = (await (await request.get('/api/v1/tree')).json()) as {
    folders: TreeNode[]
    lists: TreeNode[]
  }
  const fresh = (n: TreeNode) => Date.parse(n.created_at) >= since - 1000
  for (const f of tree.folders.filter((n) => n.parent_folder_id === null && fresh(n)))
    await request.delete(`/api/v1/folders/${f.id}`, { headers: { 'If-Match': `"f-${f.version}"` } })
  for (const l of tree.lists.filter((n) => n.folder_id === null && fresh(n)))
    await request.delete(`/api/v1/lists/${l.id}`, { headers: { 'If-Match': `"l-${l.version}"` } })
}
