import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

/** A short alphanumeric token, unique per call, safe in URLs and in search queries. */
export const uniqueId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** A readable unique name, e.g. `Movies k3j2x9ab`. */
export const uniqueName = (label: string) => `${label} ${uniqueId()}`

export type ItemKind = 'generic' | 'movie' | 'tv_show' | 'motorcycle' | 'car' | 'camera'

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
  kind: ItemKind = 'movie',
  folderId: string | null = null,
) => post(request, '/api/v1/lists', { name, kind, folder_id: folderId })

export const createItem = (
  request: APIRequestContext,
  listId: string,
  title: string,
  extra: { website?: string; metadata?: object } = {},
) => post(request, `/api/v1/lists/${listId}/items`, { title, ...extra })

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
  kind?: string,
) {
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page
    .getByRole('menuitem', { name: what === 'folder' ? 'Folder' : 'List', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: what === 'folder' ? 'New folder' : 'New list' })
  await dialog.getByRole('textbox', { name: 'Name' }).fill(name)
  if (kind) {
    await dialog.getByRole('combobox', { name: 'Kind' }).click()
    await page.getByRole('option', { name: kind, exact: true }).click()
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
