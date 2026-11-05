import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, uniqueName } from './helpers'

// F-026 W4 (availability filter on movie/TV lists) and W7 (duplicate_title shown inline).
test.describe('F-026 availability filter and duplicate titles', () => {
  test('W7 a duplicate title in the new-item draft shows inline and keeps the draft', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Dup list'), 'wishlist')
    const title = uniqueName('Same thing')
    await createItem(request, list.id, title)
    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).first().click()

    const field = itemPanel(page).getByRole('textbox', { name: 'Title' })
    await field.fill(title.toLowerCase())
    await field.press('Enter')
    await expect(
      itemPanel(page).getByText('An item with this title is already in this list.'),
    ).toBeVisible()
    await expect(field).toHaveValue(title.toLowerCase())
  })

  test('W4 a movie list offers the availability filter, a generic list does not', async ({
    page,
    request,
  }) => {
    const movies = await createList(request, uniqueName('Avail movies'), 'movie')
    await createItem(request, movies.id, uniqueName('Film'))
    await page.goto(`/lists/${movies.id}`)
    await page.getByRole('button', { name: 'Filter' }).click()
    await expect(page.getByRole('button', { name: 'Available', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Available, not paid' }).click()
    await expect(page).toHaveURL(/availability=included/)
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('button', { name: 'Remove filter Available, not paid' }),
    ).toBeVisible()

    const wishes = await createList(request, uniqueName('Avail wishes'), 'wishlist')
    await createItem(request, wishes.id, uniqueName('Thing'))
    await page.goto(`/lists/${wishes.id}`)
    await page.getByRole('button', { name: 'Filter' }).click()
    await expect(page.getByRole('combobox', { name: 'Filter field' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Available', exact: true })).toHaveCount(0)
  })
})
