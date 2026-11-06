import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { createFolder, createList, drag, sidebarTree, uniqueName } from './helpers'

const row = (page: Page, name: string) =>
  sidebarTree(page).getByRole('treeitem').filter({ hasText: name })

/** The folder a list sits in, read from the API (null = top level). */
async function folderOf(request: APIRequestContext, listId: string) {
  const response = await request.get('/api/v1/tree')
  expect(response.status(), 'GET tree').toBe(200)
  const tree = (await response.json()) as { lists: { id: string; folder_id: string | null }[] }
  const list = tree.lists.find((l) => l.id === listId)
  expect(list, 'list in tree').toBeDefined()
  return list?.folder_id ?? null
}

test.describe('F008-W4 drag into a folder', () => {
  test('dropping a list onto a folder moves it inside, and it stays there after reload', async ({
    page,
    request,
  }) => {
    const parentName = uniqueName('Drop parent')
    const folderName = uniqueName('Drop folder')
    const listName = uniqueName('Drop list')
    // Both rows live in their own parent folder, so they sit next to each other however long the
    // shared dev tree has grown (top-level lists come after every top-level folder, which put the
    // list thousands of pixels below the folder; the drag helper cannot scroll mid-drag).
    const parent = await createFolder(request, parentName)
    const folder = await createFolder(request, folderName, parent.id)
    const list = await createList(request, listName, 'movie', parent.id)
    await page.setViewportSize({ width: 1440, height: 4000 })
    await page.goto('/')
    await row(page, parentName).scrollIntoViewIfNeeded()
    await row(page, parentName).click()
    await expect(row(page, listName)).toHaveAttribute('aria-level', '2')

    await drag(page, row(page, listName), row(page, folderName))

    await expect.poll(() => folderOf(request, list.id)).toBe(folder.id)
    // The folder opens to show what it received.
    await expect(row(page, listName)).toHaveAttribute('aria-level', '3')
    await page.reload()
    await expect.poll(() => folderOf(request, list.id)).toBe(folder.id)
  })

  test('a folder cannot be dropped into itself: nothing moves', async ({ page, request }) => {
    const parentName = uniqueName('Outer')
    const childName = uniqueName('Inner')
    const parent = await createFolder(request, parentName)
    await createFolder(request, childName, parent.id)
    // A tall viewport keeps both rows on screen in a long shared tree (the drag helper cannot scroll mid-drag).
    await page.setViewportSize({ width: 1440, height: 4000 })
    await page.goto('/')
    await row(page, parentName).scrollIntoViewIfNeeded()
    await row(page, parentName).click()
    await expect(row(page, childName)).toHaveAttribute('aria-level', '2')

    await drag(page, row(page, parentName), row(page, childName))

    await expect(row(page, parentName)).toHaveAttribute('aria-level', '1')
    await expect(row(page, childName)).toHaveAttribute('aria-level', '2')
  })
})
