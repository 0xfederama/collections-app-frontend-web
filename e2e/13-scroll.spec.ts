import { expect, test, type Page } from '@playwright/test'
import { createItem, createList, uniqueName } from './helpers'

// F016: the shell's scroll containers (`main`, the item panel) must be positioned, or a visually
// hidden (absolute) label inside a long list escapes their clip and makes the whole document scroll.
const documentOverflow = (page: Page) =>
  page.evaluate(() => {
    const doc = document.scrollingElement ?? document.documentElement
    return doc.scrollHeight - doc.clientHeight
  })

test.describe('F016 only the content area scrolls', () => {
  test('Home with many recent items and a long list do not scroll the page', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Long list'), 'movie')
    for (let index = 0; index < 30; index += 1) {
      await createItem(request, list.id, uniqueName(`Item ${index}`))
    }
    await page.setViewportSize({ width: 1280, height: 600 })

    await page.goto('/')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('main').getByRole('link').first()).toBeVisible()
    expect(await documentOverflow(page)).toBeLessThanOrEqual(1)

    await page.goto(`/lists/${list.id}`)
    await expect(
      page.getByRole('list', { name: 'Items' }).getByRole('listitem').first(),
    ).toBeVisible()
    expect(await documentOverflow(page)).toBeLessThanOrEqual(1)
  })
})
