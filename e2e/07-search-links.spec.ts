import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, uniqueId, uniqueName } from './helpers'

test.describe('AT-12 search and AT-13 external links', () => {
  test('search opens an item from the dropdown and from the results page', async ({
    page,
    request,
  }) => {
    const token = uniqueId()
    const list = await createList(request, uniqueName('Searchable'), 'generic')
    const first = `The Matrix ${token}`
    const second = `Matrix Reloaded ${token}`
    await createItem(request, list.id, first)
    await createItem(request, list.id, second)
    await page.goto('/')
    const search = page.getByRole('combobox', { name: 'Search' })

    // Case-insensitive substring, from the dropdown.
    await search.fill(`mATRIx ${token}`.toLowerCase())
    await page.getByRole('option', { name: new RegExp(first) }).click()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}/items/`))
    await expect(itemPanel(page).getByRole('heading', { level: 1, name: first })).toBeVisible()

    // Enter with nothing highlighted goes to the results page.
    await search.fill(second)
    await search.press('Enter')
    await expect(page).toHaveURL(/\/search\?q=/)
    await page
      .getByRole('list', { name: 'Search results' })
      .getByRole('link', { name: new RegExp(second) })
      .click()
    await expect(itemPanel(page).getByRole('heading', { level: 1, name: second })).toBeVisible()
  })

  test('three external links: order, encoding, disabled Website', async ({ page, request }) => {
    const token = uniqueId()
    const list = await createList(request, uniqueName('Links'), 'movie')
    const title = `Tom & Jerry #${token} "Cut"`
    const website = `https://example.com/${token}`
    const withSite = await createItem(request, list.id, title, {
      website,
      metadata: { release_year: 1999 },
    })
    const without = await createItem(request, list.id, uniqueName('No site'))

    await page.goto(`/lists/${list.id}/items/${withSite.id}`)
    let group = itemPanel(page).getByRole('group', { name: 'External links' })
    const controls = group.locator('a, button')
    await expect(controls).toHaveCount(3)
    await expect(controls).toHaveText([/^Google/, /^Reddit/, /^Website/])
    const query = `Tom+%26+Jerry+%23${token}+%22Cut%22+1999+film`
    await expect(controls.nth(0)).toHaveAttribute(
      'href',
      `https://www.google.com/search?q=${query}`,
    )
    await expect(controls.nth(1)).toHaveAttribute(
      'href',
      `https://www.google.com/search?q=${query}+site%3Areddit.com`,
    )
    await expect(controls.nth(2)).toHaveAttribute('href', website)
    for (const index of [0, 1, 2]) {
      await expect(controls.nth(index)).toHaveAttribute('target', '_blank')
      await expect(controls.nth(index)).toHaveAttribute('rel', 'noopener noreferrer')
    }

    await page.goto(`/lists/${list.id}/items/${without.id}`)
    group = itemPanel(page).getByRole('group', { name: 'External links' })
    await expect(group.locator('a, button')).toHaveText([/^Google/, /^Reddit/, /^No website/])
    const disabled = group.getByRole('button', { name: 'No website' })
    await expect(disabled).toHaveAttribute('aria-disabled', 'true')
    await expect(group.getByRole('link')).toHaveCount(2)
  })
})
