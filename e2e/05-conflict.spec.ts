import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, itemUrl, uniqueName } from './helpers'

test.describe('AT-09 concurrent edit', () => {
  test('the second save shows the conflict banner and keeps the draft', async ({
    page,
    browser,
    baseURL,
    request,
  }) => {
    const list = await createList(request, uniqueName('Shared'), 'generic')
    const item = await createItem(request, list.id, uniqueName('Same item'))
    const url = itemUrl(list.id, item.id, true)

    const other = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } })
    try {
      const second = await other.newPage()
      await page.goto(url)
      await second.goto(url)
      const first = itemPanel(page)
      const later = itemPanel(second)
      await expect(first.getByRole('textbox', { name: 'Title', exact: true })).toBeVisible()
      await expect(later.getByRole('textbox', { name: 'Title', exact: true })).toBeVisible()

      await first
        .getByRole('textbox', { name: 'Website', exact: true })
        .fill('https://example.com/first')
      await first.getByRole('button', { name: 'Save changes' }).click()
      await expect(page).not.toHaveURL(/edit=1/)

      const draft = 'https://example.com/second'
      await later.getByRole('textbox', { name: 'Website', exact: true }).fill(draft)
      await later.getByRole('button', { name: 'Save changes' }).click()
      await expect(
        later.getByRole('alert').filter({ hasText: 'Someone else changed this item' }),
      ).toBeVisible()
      await expect(later.getByRole('textbox', { name: 'Website', exact: true })).toHaveValue(draft)
      await expect(later.getByRole('button', { name: 'Copy my draft' })).toBeVisible()
      await expect(later.getByRole('button', { name: 'Reload latest' })).toBeVisible()
    } finally {
      await other.close()
    }
  })
})
