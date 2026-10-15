import { expect, test } from '@playwright/test'
import { createFolder, createItem, createList, sidebarTree, uniqueName } from './helpers'

test.describe('AT-11 trash', () => {
  test('delete a folder with content, it leaves the tree and search, then restore it', async ({
    page,
    request,
  }) => {
    const folderName = uniqueName('Doomed')
    const itemTitle = uniqueName('Keepsake')
    const folder = await createFolder(request, folderName)
    const list = await createList(request, uniqueName('Inside'), 'generic', folder.id)
    await createItem(request, list.id, itemTitle)

    await page.goto('/')
    const folderRow = sidebarTree(page).getByRole('treeitem').filter({ hasText: folderName })
    const search = page.getByRole('combobox', { name: 'Search' })
    await expect(folderRow).toHaveCount(1)
    await search.fill(itemTitle)
    await expect(page.getByRole('option', { name: new RegExp(itemTitle) })).toBeVisible()

    await page.getByRole('button', { name: `More actions for ${folderName}` }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Move to Trash' }).click()
    await expect(folderRow).toHaveCount(0)

    await search.fill('')
    await search.fill(itemTitle)
    await expect(page.getByText(`No results for “${itemTitle}”`)).toBeVisible()

    await page.getByRole('link', { name: 'Trash', exact: true }).click()
    await page.getByRole('button', { name: `Restore “${folderName}”`, exact: true }).click()
    await expect(folderRow).toHaveCount(1)

    await search.fill('')
    await search.fill(itemTitle)
    await expect(page.getByRole('option', { name: new RegExp(itemTitle) })).toBeVisible()
  })
})
