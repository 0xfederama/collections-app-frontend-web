import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, itemUrl, uniqueName } from './helpers'

test.describe('AT-09 concurrent edit', () => {
  test('the second save of a field shows the conflict banner and keeps the draft', async ({
    page,
    browser,
    baseURL,
    request,
  }) => {
    const list = await createList(request, uniqueName('Shared'), 'generic')
    const item = await createItem(request, list.id, uniqueName('Same item'))
    const url = itemUrl(list.id, item.id)

    const other = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } })
    try {
      const second = await other.newPage()
      await page.goto(url)
      await second.goto(url)
      const first = itemPanel(page)
      const later = itemPanel(second)
      await expect(first.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(later.getByRole('heading', { level: 1 })).toBeVisible()

      // Both open the title; the first saves.
      await first.getByRole('button', { name: 'Edit title' }).click()
      await first.getByRole('textbox', { name: 'Title' }).fill('First title')
      await later.getByRole('button', { name: 'Edit title' }).click()
      const draft = 'Second title'
      await later.getByRole('textbox', { name: 'Title' }).fill(draft)
      await first.getByRole('button', { name: 'Save title' }).click()
      await expect(first.getByRole('heading', { level: 1, name: 'First title' })).toBeVisible()

      await later.getByRole('button', { name: 'Save title' }).click()
      await expect(
        later.getByRole('alert').filter({ hasText: 'Someone else changed this item' }),
      ).toBeVisible()
      await expect(later.getByRole('textbox', { name: 'Title' })).toHaveValue(draft)
      await expect(later.getByRole('button', { name: 'Copy draft' })).toBeVisible()
      await expect(later.getByRole('button', { name: 'Reload latest' })).toBeVisible()
    } finally {
      await other.close()
    }
  })
})
