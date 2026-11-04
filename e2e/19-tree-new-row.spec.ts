import { expect, test } from '@playwright/test'
import { createFolder, createList, sidebarTree, uniqueName } from './helpers'

// F-025 polish: the sidebar "New" row lines up with the rows above it.
test.describe('F-025 tree New row alignment', () => {
  test('icon and text columns match a top-level list row and a folder row', async ({
    page,
    request,
  }) => {
    const listName = uniqueName('Aligned list')
    const folderName = uniqueName('Aligned folder')
    await createList(request, listName, 'movie')
    await createFolder(request, folderName)
    await page.goto('/')
    const tree = sidebarTree(page)
    const listRow = tree.getByRole('treeitem', { name: new RegExp(listName) })
    const folderRow = tree.getByRole('treeitem', { name: new RegExp(folderName) })
    await expect(listRow).toBeVisible()
    const newButton = page.getByRole('button', { name: 'New', exact: true })
    const left = (l: ReturnType<typeof page.locator>) =>
      l.evaluate((n) => n.getBoundingClientRect().left)
    const textLeft = (l: ReturnType<typeof page.locator>) =>
      l.evaluate((n) => {
        const range = document.createRange()
        const walker = document.createTreeWalker(n, NodeFilter.SHOW_TEXT)
        let node = walker.nextNode()
        while (node && !node.textContent?.trim()) node = walker.nextNode()
        if (!node) return 0
        range.selectNodeContents(node)
        return range.getBoundingClientRect().left
      })
    const newIcon = await left(newButton.locator('span[aria-hidden]').first())
    const newText = await textLeft(newButton)
    for (const row of [listRow, folderRow]) {
      const icon = await left(row.locator('span[aria-hidden]').first())
      expect(Math.abs(icon - newIcon)).toBeLessThanOrEqual(1)
      const text = await textLeft(row.locator('span.truncate').first())
      expect(Math.abs(text - newText)).toBeLessThanOrEqual(1)
    }
  })
})
