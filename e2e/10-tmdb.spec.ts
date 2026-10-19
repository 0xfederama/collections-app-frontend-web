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

    // Selecting the active suggestion immediately creates the item.
    await title.press('ArrowDown')
    await title.press('Enter')
    await expect(panel.getByRole('heading', { level: 1, name: '[mock] movie name' })).toBeVisible()

    // The lookup-populated director is visible by default in expanded item details.
    await expect(panel.getByText('Mock Director', { exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Edit director' })).toBeVisible()
  })
})

test.describe('F013-W3 director data and F014-W4 field filter', () => {
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

    await page.goto(`/lists/${list.id}?sort=manual`)
    const rows = page.getByRole('list', { name: 'Items' }).getByRole('link')
    await expect(rows).toHaveText([zetaTitle, alphaTitle])

    await page.getByRole('combobox', { name: 'Filter field' }).click()
    await page.getByRole('option', { name: 'Director' }).click()
    const filter = page.getByRole('searchbox', { name: 'Filter Director' })
    await filter.fill('Ada Auteur')
    await expect(page).toHaveURL(/filter_field=director.*filter_value=Ada\+Auteur/)
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText(alphaTitle)

    await page.getByRole('button', { name: 'Clear field filter' }).click()
    await expect(rows).toHaveCount(2)
    await page.getByRole('combobox', { name: 'Sort' }).click()
    await page.getByRole('option', { name: 'Director' }).click()
    await expect(page).toHaveURL(/sort=director/)
    await expect(rows.first()).toContainText(alphaTitle)
    await expect(rows.nth(1)).toContainText(zetaTitle)
  })
})

test.describe('F016 streaming tiles in a row open JustWatch', () => {
  test('the tile links to the JustWatch page the lookup stored, in a new tab', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Streaming films'), 'movie')
    const created = await createItem(request, list.id, '[mock] movie name', { lookup: true })
    const found = await (await request.get(`/api/v1/items/${created.id}`)).json()
    const streaming = { ...found.metadata.streaming, platforms: ['Netflix'] }
    const patched = await request.patch(`/api/v1/items/${created.id}`, {
      headers: { 'If-Match': `"i-${found.version}"` },
      data: { metadata: { ...found.metadata, streaming } },
    })
    expect(patched.status(), 'PATCH item').toBe(200)

    await page.goto(`/lists/${list.id}`)
    await page.getByRole('radio', { name: 'Thumbnail rows' }).check({ force: true })
    const row = page.getByRole('list', { name: 'Items' }).getByRole('listitem')
    const tile = row.getByRole('link', { name: 'Netflix on JustWatch (opens in a new tab)' })
    await expect(tile).toHaveAttribute(
      'href',
      /^https:\/\/www\.justwatch\.com\/[a-z]{2}\/movie\/mock$/,
    )
    await expect(tile).toHaveAttribute('target', '_blank')
  })
})
