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

/**
 * Like `drag`, but drops at a point of the target row: `above` / `below` reorder (top or bottom
 * fifth of the row), `into` is the middle (a folder's "drop into" zone).
 */
export async function dragTo(
  page: Page,
  handle: Locator,
  target: Locator,
  where: 'above' | 'below' | 'into',
) {
  const from = await center(handle)
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  if (!box) throw new Error('target has no box')
  const y = box.y + box.height * (where === 'above' ? 0.1 : where === 'below' ? 0.9 : 0.5)
  const x = box.x + box.width / 2
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x, from.y + (y < from.y ? -8 : 8), { steps: 4 })
  await page.mouse.move(x, y, { steps: 20 })
  await page.mouse.up()
}

/**
 * Presses on `handle`, moves until `zone` shows up, and drops in its middle. On a long tree the zone
 * starts below the fold: holding the pointer at the bottom edge auto-scrolls to it, as a user would.
 */
export async function dragToZone(page: Page, handle: Locator, zone: Locator) {
  const from = await center(handle)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x, from.y + 8, { steps: 4 })
  await expect(zone).toBeVisible()
  // The zone's scroll container (the sidebar's tree area): its bottom edge is where auto-scroll starts.
  const bottom = await zone.evaluate((el) => {
    let node = el.parentElement
    while (node && getComputedStyle(node).overflowY !== 'auto') node = node.parentElement
    return (node ?? document.documentElement).getBoundingClientRect().bottom
  })
  for (let i = 0; i < 60 && !(await isInView(zone, bottom)); i++)
    await page.mouse.move(from.x, bottom - 6 - (i % 2), { steps: 2 })
  const box = await zone.boundingBox()
  if (!box) throw new Error('zone has no box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 })
  await page.mouse.up()
}

async function isInView(locator: Locator, bottom: number) {
  const box = await locator.boundingBox()
  return !!box && box.y >= 0 && box.y + box.height <= bottom
}
