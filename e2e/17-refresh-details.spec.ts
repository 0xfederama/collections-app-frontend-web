import { expect, test } from '@playwright/test'
import { createItem, createList, uniqueName } from './helpers'

test.describe('F025-W11 Refresh details', () => {
  test('a movie list offers "Refresh details" and shows a result toast', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Refresh films'), 'movie')
    await createItem(request, list.id, uniqueName('Film'), { lookup: false })
    await page.goto(`/lists/${list.id}`)

    await page
      .getByRole('main')
      .getByRole('button', { name: /^More actions for/ })
      .click()
    await page.getByRole('menuitem', { name: 'Refresh details' }).click()

    // TMDB may be off in the dev stack: either the counts or the "turned off" message is a result.
    await expect(
      page.getByText(/^\d+ updated|Details lookup is turned off on the server/).first(),
    ).toBeVisible({ timeout: 30_000 })
  })

  test('a book list does not offer it', async ({ page, request }) => {
    const list = await createList(request, uniqueName('Refresh books'), 'book')
    await createItem(request, list.id, uniqueName('Book'), { lookup: false })
    await page.goto(`/lists/${list.id}`)
    await page
      .getByRole('main')
      .getByRole('button', { name: /^More actions for/ })
      .click()
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Refresh details' })).toHaveCount(0)
  })
})
