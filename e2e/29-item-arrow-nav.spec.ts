import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, uniqueName } from './helpers'

// Roadmap 40 (web 3.7.0): with an item open in the side panel (>= 1280 px), ArrowUp / ArrowDown open
// the previous / next item of the list as shown, stopping at the first and last.

test.use({ viewport: { width: 1400, height: 900 } })

test.describe('roadmap 40 arrow keys between items', () => {
  test('ArrowDown and ArrowUp change the open item and the URL, and stop at the ends', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Arrows'), null)
    const titles = ['Alpha one', 'Bravo two', 'Charlie three']
    const created: { id: string }[] = []
    for (const title of titles) created.push(await createItem(request, list.id, title))
    const urlOf = (index: number) =>
      new RegExp(`/lists/${list.id}/items/${created[index]!.id}(\\?|$)`)

    await page.goto(`/lists/${list.id}?sort=title`)
    await page.getByRole('link', { name: 'Bravo two' }).click()
    await expect(itemPanel(page).getByRole('heading', { name: 'Bravo two' })).toBeVisible()

    await page.keyboard.press('ArrowDown')
    await expect(page).toHaveURL(urlOf(2))
    await expect(page).toHaveURL(/\?sort=title$/)
    await expect(itemPanel(page).getByRole('heading', { name: 'Charlie three' })).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await expect(page).toHaveURL(urlOf(2))

    await page.keyboard.press('ArrowUp')
    await expect(page).toHaveURL(urlOf(1))
    await page.keyboard.press('ArrowUp')
    await expect(page).toHaveURL(urlOf(0))
    await expect(itemPanel(page).getByRole('heading', { name: 'Alpha one' })).toBeVisible()
    await page.keyboard.press('ArrowUp')
    await expect(page).toHaveURL(urlOf(0))
  })
})
