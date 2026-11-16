import { expect, test } from '@playwright/test'
import { createItem, createList, uniqueName } from './helpers'

// Roadmap 39 (web 3.6.1, D-166): a list over the 200-item page cap shows every item, with no
// "Load more", on desktop (chromium) and on the phone (mobile-webkit), and in every sort.

const COUNT = 205

test.describe('roadmap 39 every item is shown', () => {
  test('a 205-item list shows all of them, sorted by title too', async ({ page, request }) => {
    test.setTimeout(120_000)
    const name = uniqueName('Big')
    const list = await createList(request, name, null)
    // Titles padded so the title sort is predictable; created in batches to keep the seed quick.
    const titles = Array.from({ length: COUNT }, (_, i) => `Row ${String(i + 1).padStart(3, '0')}`)
    for (let i = 0; i < titles.length; i += 20) {
      await Promise.all(titles.slice(i, i + 20).map((title) => createItem(request, list.id, title)))
    }

    await page.goto(`/lists/${list.id}`)
    const items = page.getByRole('list', { name: 'Items' })
    await expect(items.getByRole('listitem')).toHaveCount(COUNT)
    await expect(page.getByRole('main').getByText(`${COUNT} items`, { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Load more/ })).toHaveCount(0)

    await page.goto(`/lists/${list.id}?sort=title`)
    await expect(items.getByRole('listitem')).toHaveCount(COUNT)
    await expect(items.getByRole('link').last()).toHaveText(`Row ${COUNT}`)
    await expect(page.getByRole('button', { name: /Load more/ })).toHaveCount(0)
  })
})
