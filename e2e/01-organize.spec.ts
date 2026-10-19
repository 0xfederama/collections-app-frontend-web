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

test.describe('F010-W1 the folder path of a new list', () => {
  test('choose the folder in the dialog; the next list remembers it for the session', async ({
    page,
  }) => {
    const folderName = uniqueName('Shelf')
    await page.goto('/')
    await createViaSidebar(page, 'folder', folderName)
    await expect(row(page, folderName)).toBeVisible()

    const first = uniqueName('Vinyl')
    // F011-W6: the folder is a dropdown beside the Type one, opening on the top level.
    const newList = () => page.getByRole('dialog', { name: 'New list' })
    const folderSelect = () => newList().getByRole('combobox', { name: 'Folder' })
    await page.getByRole('button', { name: 'New', exact: true }).click()
    await page.getByRole('menuitem', { name: 'List', exact: true }).click()
    await expect(folderSelect()).toHaveText('Top level')
    await expect(newList().getByText('It will be created at the top level.')).toBeVisible()

    // Pick the folder: the description follows the choice and the list lands there.
    await folderSelect().click()
    await page.getByRole('option', { name: folderName, exact: true }).click()
    await expect(newList().getByText(`It will be created inside “${folderName}”.`)).toBeVisible()
    await newList().getByRole('textbox', { name: 'Name' }).fill(first)
    await newList().getByRole('button', { name: 'Create' }).click()
    await expect(newList()).toBeHidden()
    await expect(row(page, first)).toHaveAttribute('aria-level', '2')

    // The next list in the same session opens on the same folder.
    const second = uniqueName('Cassettes')
    await page.getByRole('button', { name: 'New', exact: true }).click()
    await page.getByRole('menuitem', { name: 'List', exact: true }).click()
    await expect(folderSelect()).toHaveText(folderName)
    await newList().getByRole('textbox', { name: 'Name' }).fill(second)
    await newList().getByRole('button', { name: 'Create' }).click()
    await expect(newList()).toBeHidden()
    await expect(row(page, second)).toHaveAttribute('aria-level', '2')

    // It is remembered in sessionStorage only: a new session starts at the top level again.
    const stored = await page.evaluate(() => sessionStorage.getItem('collection:list-folder'))
    expect(stored).not.toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('collection:list-folder'))).toBeNull()

    await page.reload()
    await page.getByRole('button', { name: 'New', exact: true }).click()
    await page.getByRole('menuitem', { name: 'List', exact: true }).click()
    await expect(folderSelect()).toHaveText(folderName)

    // Picking "Top level" again is remembered too.
    await folderSelect().click()
    await page.getByRole('option', { name: 'Top level' }).click()
    await newList().getByRole('textbox', { name: 'Name' }).fill(uniqueName('Loose'))
    await newList().getByRole('button', { name: 'Create' }).click()
    await expect(newList()).toBeHidden()
    expect(await page.evaluate(() => sessionStorage.getItem('collection:list-folder'))).toBe('null')
  })
})

test.describe('AT-03 organize folders and lists', () => {
  test('create a folder and a Movie list, move the list root -> folder -> root', async ({
    page,
  }) => {
    const folder = uniqueName('Folder')
    const list = uniqueName('Movies')
    await page.goto('/')
    await createViaSidebar(page, 'folder', folder)
    await expect(row(page, folder)).toHaveCount(1)
    await createViaSidebar(page, 'list', list, 'Movies')
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
