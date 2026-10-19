import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { createItem, createList, itemPanel, itemUrl, uniqueName } from './helpers'

// The test stack serves one deterministic Open Library work for "[mock] book name" (D-090, D-096):
// "Mock Book Title" by "Mock Author", 2002, 321 pages, ISBN 9780000000002, with a cover.
const FIXTURE_QUERY = '[mock] book name'
const FIXTURE_TITLE = 'Mock Book Title'

async function expectNoSeriousIssues(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`)).toEqual([])
}

/** A book with its writer, pages and two stores, seeded through the API. */
async function seedBook(request: APIRequestContext, listId: string, title: string) {
  return createItem(request, listId, title, {
    lookup: false,
    metadata: { author: 'Ada Writer', pages: 321, stores: ['openlibrary', 'kobo'] },
  })
}

test.describe('F016-W2 book lookup fixture', () => {
  test('typing a title and pressing Enter fills the writer, pages, ISBN, store and cover from the first result', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Books'), 'book')
    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()

    const panel = itemPanel(page)
    // Books have no title picker: a plain text input, looked up when the title is committed.
    const title = panel.getByRole('textbox', { name: 'Title' })
    await expect(panel.getByRole('combobox')).toHaveCount(0)
    await title.fill(FIXTURE_QUERY)
    await title.press('Enter')

    // The server answers after the lookup, which can take a few seconds: wait generously. The
    // backend replaces the typed title with the first result's title (the fixture's).
    await expect(panel.getByRole('heading', { level: 1, name: FIXTURE_TITLE })).toBeVisible({
      timeout: 30_000,
    })

    // Populated fields are part of the detail by default: writer, pages, ISBN and the store.
    await expect(panel.getByText('Mock Author', { exact: true })).toBeVisible()
    await expect(panel.getByText('321', { exact: true })).toBeVisible()
    await expect(panel.getByText('9780000000002', { exact: true })).toBeVisible()
    await expect(panel.getByRole('img', { name: 'Open Library' }).first()).toBeVisible()
    // The cover became the item image.
    await expect(panel.getByRole('img', { name: FIXTURE_TITLE }).first()).toBeVisible()
  })
})

test.describe('F016-W3 book row layout', () => {
  for (const width of [1440, 375]) {
    test(`writer and pages beside the title, store tiles at the far right, no overflow at ${width}px`, async ({
      page,
      request,
    }) => {
      const list = await createList(request, uniqueName('Shelf'), 'book')
      const title = uniqueName('Dune')
      await seedBook(request, list.id, title)

      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/lists/${list.id}`)
      // Thumbnail rows show the pinned fields at every width (compact rows hide them below 640 px).
      await page.getByRole('radio', { name: 'Thumbnail rows' }).check({ force: true })
      const row = page.getByRole('list', { name: 'Items' }).getByRole('listitem').filter({
        hasText: title,
      })
      await expect(row).toBeVisible()

      const titleBox = await row.getByRole('link', { name: title }).boundingBox()
      const besideBox = await row.getByText('Ada Writer · 321', { exact: true }).boundingBox()
      const storeBox = await row.getByRole('img', { name: 'Kobo' }).boundingBox()
      const rowBox = await row.boundingBox()
      expect(Math.abs(besideBox!.y - titleBox!.y)).toBeLessThan(24)
      expect(storeBox!.x).toBeGreaterThan(besideBox!.x + besideBox!.width / 2)
      expect(rowBox!.x + rowBox!.width - (storeBox!.x + storeBox!.width)).toBeLessThan(40)

      const overflow = await page
        .getByRole('main')
        .evaluate((main) => main.scrollWidth - main.clientWidth)
      expect(overflow).toBe(0)
    })
  }
})

test.describe('F016-W4 stores', () => {
  test('edits the stores of an item from the dropdown and saves them', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Reading'), 'book')
    const title = uniqueName('Stores book')
    const item = await seedBook(request, list.id, title)

    await page.goto(itemUrl(list.id, item.id))
    const panel = itemPanel(page)
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await panel.getByRole('button', { name: 'Edit where to get it' }).click()
    await panel
      .getByRole('button', { name: /^Where to get it/ })
      .first()
      .click()
    await page.getByRole('menuitemcheckbox', { name: /Bookshop/ }).click()
    await page.getByRole('menuitemcheckbox', { name: /Kobo/ }).click()
    await page.keyboard.press('Escape')
    await panel.getByRole('button', { name: 'Save Where to get it' }).click()

    await expect(panel.getByRole('img', { name: 'Bookshop.org' })).toBeVisible()
    await expect(panel.getByRole('img', { name: 'Kobo' })).toHaveCount(0)
  })

  test('preferred stores in Settings: saved from Media, credited in About', async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/settings')
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.getByRole('button', { name: 'Media' }).click()
    await settings.getByRole('button', { name: /Where to get it/ }).click()
    await page.getByRole('menuitemcheckbox', { name: /Kobo/ }).click()
    await page.keyboard.press('Escape')
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' && response.url().endsWith('/api/v1/settings'),
    )
    await settings.getByRole('button', { name: 'Close' }).click()
    await saved
    await expect
      .poll(async () => (await (await request.get('/api/v1/settings')).json()).preferred_stores)
      .toContain('kobo')

    // Reset the workspace setting so other specs see the default (no preferred stores).
    const current = await (await request.get('/api/v1/settings')).json()
    const reset = await request.patch('/api/v1/settings', {
      headers: { 'If-Match': `"s-${current.version}"` },
      data: { preferred_stores: [] },
    })
    expect(reset.status()).toBe(200)

    await page.goto('/settings')
    await page
      .getByRole('dialog', { name: 'Settings' })
      .getByRole('button', { name: 'About' })
      .click()
    await expect(page.getByText('Book details and covers come from')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open Library' })).toHaveAttribute(
      'href',
      'https://openlibrary.org/',
    )
  })
})

test.describe('AT-14 axe for books: no serious or critical issues (light and dark, 375 and 1440)', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [375, 1440]) {
      test(`${theme} theme at ${width}px`, async ({ page, request }) => {
        const list = await createList(request, uniqueName('Axe books'), 'book')
        const title = uniqueName('Axe book')
        const item = await seedBook(request, list.id, title)
        await page.setViewportSize({ width, height: 900 })
        await page.addInitScript((value) => localStorage.setItem('collection:theme', value), theme)

        await page.goto(`/lists/${list.id}`)
        await expect(
          page.getByRole('list', { name: 'Items' }).getByRole('link', { name: title }),
        ).toBeVisible()
        await expectNoSeriousIssues(page)

        await page.goto(itemUrl(list.id, item.id))
        await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
        await expectNoSeriousIssues(page)
      })
    }
  }
})
