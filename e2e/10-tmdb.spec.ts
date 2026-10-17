import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, uniqueName } from './helpers'

test.describe('F013 TMDB lookup fixture', () => {
  test('movie title suggestions select the deterministic match and fill its director', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('TMDB films'), 'movie')
    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()

    const panel = itemPanel(page)
    const title = panel.getByRole('combobox', { name: 'Title' })
    await title.fill('[mock] movie name')
    const suggestions = panel.getByRole('listbox', { name: 'TMDB title suggestions' })
    await expect(suggestions.getByRole('option', { name: /\[mock\] movie name/ })).toBeVisible()
    await expect(suggestions).toContainText('2001')

    // Enter selects the active suggestion; a second Enter commits the draft.
    await title.press('ArrowDown')
    await title.press('Enter')
    await title.press('Enter')
    await expect(panel.getByRole('heading', { level: 1, name: '[mock] movie name' })).toBeVisible()

    // The lookup-populated director is visible by default in expanded item details.
    await expect(panel.getByText('Mock Director', { exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Edit director' })).toBeVisible()
  })
})

test.describe('F013-W3 director filter and sort', () => {
  test('filters movies by director and sorts by director', async ({ page, request }) => {
    const list = await createList(request, uniqueName('Director films'), 'movie')
    const zetaTitle = uniqueName('Zeta')
    const alphaTitle = uniqueName('Alpha')
    await createItem(request, list.id, zetaTitle, {
      lookup: false,
      metadata: { director: 'Zed Zee' },
    })
    await createItem(request, list.id, alphaTitle, {
      lookup: false,
      metadata: { director: 'Ada Auteur' },
    })

    await page.goto(`/lists/${list.id}`)
    const rows = page.getByRole('list', { name: 'Items' }).getByRole('link')
    await expect(rows).toHaveText([zetaTitle, alphaTitle])

    const filter = page.getByRole('searchbox', { name: 'Filter items by title or director' })
    await filter.fill('Ada Auteur')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText(alphaTitle)

    await filter.fill('')
    // The list filter is debounced.  Wait for its query state to clear before
    // setting the independent sort parameter, rather than racing the two URL
    // updates.
    await expect(rows).toHaveCount(2)
    await page.getByRole('combobox', { name: 'Sort' }).click()
    await page.getByRole('option', { name: 'Director' }).click()
    await expect(page).toHaveURL(/sort=director/)
    await expect(rows.first()).toContainText(alphaTitle)
    await expect(rows.nth(1)).toContainText(zetaTitle)
  })
})
