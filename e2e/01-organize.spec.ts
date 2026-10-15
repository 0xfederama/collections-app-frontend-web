import { expect, test, type Page } from '@playwright/test'
import { createList, createViaSidebar, drag, sidebarTree, uniqueName } from './helpers'

const row = (page: Page, name: string) =>
  sidebarTree(page).getByRole('treeitem').filter({ hasText: name })

/** The given list names, in the order the sidebar shows them (read from the rows). */
async function orderOf(page: Page, names: string[]) {
  const texts = await sidebarTree(page)
    .getByRole('treeitem')
    .evaluateAll((els) => els.map((el) => el.textContent ?? ''))
  return texts
    .map((text) => names.find((n) => text.includes(n)))
    .filter((n): n is string => n !== undefined)
}

test.describe('AT-03 organize folders and lists', () => {
  test('create a folder and a Movie list, move the list root -> folder -> root', async ({
    page,
  }) => {
    const folder = uniqueName('Folder')
    const list = uniqueName('Movies')
    await page.goto('/')
    await createViaSidebar(page, 'folder', folder)
    await expect(row(page, folder)).toHaveCount(1)
    await createViaSidebar(page, 'list', list, 'Movie')
    await expect(page.getByRole('heading', { level: 1, name: list })).toBeVisible()
    await expect(row(page, list)).toHaveAttribute('aria-level', '1')

    await sidebarTree(page)
      .getByRole('button', { name: `More actions for ${list}` })
      .click()
    await page.getByRole('menuitem', { name: 'Move…' }).click()
    const move = page.getByRole('dialog', { name: `Move “${list}”` })
    await move.getByRole('radio', { name: folder }).check()
    await move.getByRole('button', { name: 'Move' }).click()
    await expect(row(page, list)).toHaveAttribute('aria-level', '2')

    await sidebarTree(page)
      .getByRole('button', { name: `More actions for ${list}` })
      .click()
    await page.getByRole('menuitem', { name: 'Move…' }).click()
    await move.getByRole('radio', { name: 'Top level' }).check()
    await move.getByRole('button', { name: 'Move' }).click()
    await expect(row(page, list)).toHaveAttribute('aria-level', '1')
    // A moved list is appended last.
    await expect(sidebarTree(page).getByRole('treeitem').last()).toContainText(list)
  })

  test('reorder lists by drag and by keyboard, and the order persists', async ({
    page,
    request,
  }) => {
    const [a, b, c] = [uniqueName('Alpha'), uniqueName('Bravo'), uniqueName('Charlie')] as [
      string,
      string,
      string,
    ]
    for (const name of [a, b, c]) await createList(request, name)
    await page.goto('/')
    await expect.poll(() => orderOf(page, [a, b, c])).toEqual([a, b, c])

    // Drag: Charlie onto Alpha.
    await drag(page, row(page, c), row(page, a))
    await expect.poll(() => orderOf(page, [a, b, c])).toEqual([c, a, b])
    await page.reload()
    await expect.poll(() => orderOf(page, [a, b, c])).toEqual([c, a, b])

    // Keyboard: focus Alpha's row, pick up with Space, ArrowDown, drop with Space.
    await row(page, a).focus()
    await page.keyboard.press('Space')
    const live = page.locator('[aria-live]').filter({ hasText: a })
    await expect(live).toContainText(a)
    const before = await live.innerText()
    await page.keyboard.press('ArrowDown')
    await expect(live).not.toHaveText(before)
    await page.keyboard.press('Space')
    await expect.poll(() => orderOf(page, [a, b, c])).toEqual([c, b, a])
    await page.reload()
    await expect.poll(() => orderOf(page, [a, b, c])).toEqual([c, b, a])
  })
})
