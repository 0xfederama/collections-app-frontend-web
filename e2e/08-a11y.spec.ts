import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import {
  createFolder,
  createItem,
  createList,
  itemPanel,
  itemUrl,
  sidebarTree,
  trashFolder,
  uniqueName,
} from './helpers'

async function seed(request: APIRequestContext) {
  const listName = uniqueName('Axe list')
  const itemTitle = uniqueName('Axe item')
  const trashed = uniqueName('Axe trashed')
  const list = await createList(request, listName, 'movie')
  const item = await createItem(request, list.id, itemTitle, { metadata: { release_year: 1999 } })
  await trashFolder(request, await createFolder(request, trashed))
  return { list, item, listName, itemTitle, trashed }
}

async function expectNoSeriousIssues(page: Page) {
  // Same guard as 09-list-icons: axe misreads the contrast of text that is still fading in.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  )
  const { violations } = await new AxeBuilder({ page }).analyze()
  const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`)).toEqual([])
}

test.describe('AT-14 axe: no serious or critical issues (light and dark, 375 and 1440)', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [375, 1440]) {
      test(`${theme} theme at ${width}px`, async ({ page, request }) => {
        const { list, item, listName, itemTitle, trashed } = await seed(request)
        await page.setViewportSize({ width, height: 900 })
        await page.addInitScript((value) => localStorage.setItem('collection:theme', value), theme)

        await page.goto('/')
        // Phones: Home is the workspace name (F-025 W14), no "Home" heading.
        await expect(
          page.getByRole('heading', { level: 1, name: width === 375 ? undefined : 'Home' }),
        ).toBeVisible()
        await expect(page.getByText(itemTitle).first()).toBeVisible()
        await expectNoSeriousIssues(page)

        await page.goto(`/lists/${list.id}`)
        await expect(page.getByRole('heading', { level: 1, name: listName })).toBeVisible()
        await expect(
          page.getByRole('list', { name: 'Items' }).getByRole('link', { name: itemTitle }),
        ).toBeVisible()
        await expectNoSeriousIssues(page)

        await page.goto(itemUrl(list.id, item.id))
        await expect(page.getByRole('heading', { level: 1, name: itemTitle })).toBeVisible()
        await expect(page.getByRole('group', { name: 'External links' })).toBeVisible()
        await expectNoSeriousIssues(page)

        await page.goto('/trash')
        await expect(page.getByRole('heading', { level: 1, name: 'Trash' })).toBeVisible()
        await expect(page.getByText(trashed).first()).toBeVisible()
        await expectNoSeriousIssues(page)
      })
    }
  }
})

test.describe('AT-22 unsaved changes guard', () => {
  test('leaving an item with an open field asks first: keep editing keeps the edits, discard leaves', async ({
    page,
    request,
  }) => {
    const otherName = uniqueName('Elsewhere target')
    const target = await createList(request, otherName, null)
    const list = await createList(request, uniqueName('Editing'), null)
    const item = await createItem(request, list.id, uniqueName('Draft'))

    await page.goto(itemUrl(list.id, item.id))
    await itemPanel(page).getByRole('button', { name: 'Edit title' }).click()
    const title = itemPanel(page).getByRole('textbox', { name: 'Title' })
    await title.fill('Changed title')
    const dialog = page.getByRole('alertdialog', { name: 'Discard changes?' })

    await sidebarTree(page).getByText(otherName).click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Keep editing' }).click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}/items/${item.id}$`))
    await expect(title).toHaveValue('Changed title')

    await sidebarTree(page).getByText(otherName).click()
    await dialog.getByRole('button', { name: 'Discard changes' }).click()
    await expect(page).toHaveURL(new RegExp(`/lists/${target.id}$`))
    await expect(page.getByRole('heading', { level: 1, name: otherName })).toBeVisible()
  })
})
